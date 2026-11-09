"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Camera, Barcode, CheckCircle2, AlertCircle, RefreshCw, Link as LinkIcon, Search, Plus, Lock } from "lucide-react";
import { assignProductBarcode, createProduct } from "@/app/actions";

/** Barcode detector interface used by both native and polyfill implementations */
interface BarcodeDetectorLike {
  detect: (el: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
}

const BARCODE_FORMATS = [
  "qr_code",
  "ean_13",
  "ean_8",
  "code_128",
  "code_39",
  "code_93",
  "codabar",
  "itf",
  "upc_a",
  "upc_e",
  "data_matrix",
] as const;

/**
 * Get a BarcodeDetector instance — uses the native browser API if available,
 * otherwise falls back to the JS polyfill (barcode-detector package) which
 * works on all platforms including Windows Chrome.
 */
async function getBarcodeDetector(): Promise<BarcodeDetectorLike | null> {
  // 1. Try native BarcodeDetector (macOS Chrome, Android, ChromeOS)
  if ("BarcodeDetector" in window) {
    try {
      type BarcodeDetectorConstructor = new (opts: { formats: readonly string[] }) => BarcodeDetectorLike;
      const NativeDetector = (window as unknown as { BarcodeDetector: BarcodeDetectorConstructor }).BarcodeDetector;
      return new NativeDetector({ formats: BARCODE_FORMATS });
    } catch {
      // native failed, fall through to polyfill
    }
  }

  // 2. Polyfill fallback (works everywhere including Windows Chrome)
  try {
    const { BarcodeDetector: PolyfillDetector, setZXingModuleOverrides } = await import("barcode-detector");
    if (typeof window !== "undefined") {
      setZXingModuleOverrides({
        locateFile: (file: string) => `/zxing/${file}`,
      });
    }
    return new PolyfillDetector({ formats: [...BARCODE_FORMATS] });
  } catch (err) {
    console.error("Failed to load barcode-detector polyfill:", err);
    return null;
  }
}

/**
 * Play a crisp POS feedback beep using the Web Audio API
 */
export function playScannerBeep(success = true) {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = success ? 1760 : 350; // A6 note for success, low tone for fail
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (success ? 0.12 : 0.25));

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (success ? 0.12 : 0.25));
  } catch {
    // Audio restricted or uninitialized
  }
}

export interface ScannedProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  description?: string;
}

interface BarcodeScannerHookProps<T extends ScannedProduct = ScannedProduct> {
  inventory: T[];
  onProductScanned: (product: T) => void;
  onUnknownBarcodeScanned?: (barcode: string) => void;
  maxKeystrokeIntervalMs?: number; // Scanner keystroke interval (scanners send keys < 50ms)
}

/**
 * Global Hardware HID Barcode Scanner Hook
 * Listens for rapid USB/Bluetooth scanner input anywhere on the screen
 * Automatically transitions to any real barcode scanner gun without setup!
 */
export function useHardwareBarcodeScanner<T extends ScannedProduct = ScannedProduct>({
  inventory,
  onProductScanned,
  onUnknownBarcodeScanned,
  maxKeystrokeIntervalMs = 60,
}: BarcodeScannerHookProps<T>) {
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);
  const [lastScannedName, setLastScannedName] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept single control keys
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Handle Enter (hardware scanner finishing signal)
      if (e.key === "Enter") {
        const barcode = bufferRef.current.trim();
        bufferRef.current = "";

        if (barcode.length >= 2) {
          // Look up matching product in inventory by SKU (case-insensitive) or exact ID
          const match = inventory.find(
            (item) =>
              (item.sku && item.sku.toLowerCase() === barcode.toLowerCase()) ||
              item.id === barcode ||
              (item.name && item.name.toLowerCase() === barcode.toLowerCase())
          );

          if (match) {
            playScannerBeep(true);
            onProductScanned(match);
            setLastScannedName(match.name);
            setTimeout(() => setLastScannedName(null), 3000);
            e.preventDefault();
            e.stopPropagation();
          } else {
            // New / Unlinked barcode detected
            if (barcode.length >= 3) {
              playScannerBeep(false);
              if (onUnknownBarcodeScanned) {
                onUnknownBarcodeScanned(barcode);
              }
            }
          }
        }
        return;
      }

      // Check key character
      if (e.key.length === 1) {
        // If the gap between keys is longer than maxKeystrokeIntervalMs, it's a human typing, reset buffer
        if (timeDiff > maxKeystrokeIntervalMs && bufferRef.current.length > 0) {
          bufferRef.current = "";
        }
        bufferRef.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [inventory, onProductScanned, onUnknownBarcodeScanned, maxKeystrokeIntervalMs]);

  return { lastScannedName };
}

/**
 * Camera Barcode Scanner Component
 * Uses the laptop webcam or mobile camera to scan products at the register
 */
export function CameraBarcodeScanner<T extends ScannedProduct = ScannedProduct>({
  inventory,
  onProductScanned,
  onUnknownBarcodeScanned,
}: {
  inventory: T[];
  onProductScanned: (product: T) => void;
  onUnknownBarcodeScanned?: (barcode: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scannedFeedback, setScannedFeedback] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [manualCode, setManualCode] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef<boolean>(false);
  const lastScanTimeRef = useRef<number>(0);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const handleBarcodeFound = useCallback(
    (barcodeRaw: string) => {
      const code = barcodeRaw.trim();
      const match = inventory.find(
        (item) =>
          (item.sku && item.sku.toLowerCase() === code.toLowerCase()) ||
          item.id === code ||
          (item.name && item.name.toLowerCase() === code.toLowerCase())
      );

      if (match) {
        playScannerBeep(true);
        onProductScanned(match);
        setScannedFeedback(`Added: ${match.name}`);
        setTimeout(() => {
          setOpen(false);
          setScannedFeedback(null);
        }, 1200);
      } else {
        playScannerBeep(false);
        if (onUnknownBarcodeScanned) {
          setOpen(false);
          onUnknownBarcodeScanned(code);
        } else {
          setErrorMsg(`Unrecognized barcode: ${code}`);
          setTimeout(() => setErrorMsg(null), 3000);
        }
      }
    },
    [inventory, onProductScanned, onUnknownBarcodeScanned]
  );

  const startCamera = useCallback(async () => {
    setErrorMsg(null);
    setScannedFeedback(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      // Check if we're in a secure context (HTTPS or localhost) — camera requires it
      if (!window.isSecureContext) {
        setErrorMsg(
          "Camera requires HTTPS. Your site is served over HTTP which blocks camera access. " +
          "Use localhost, or deploy with HTTPS to enable camera barcode scanning. " +
          "USB/Bluetooth barcode scanner guns still work on HTTP!"
        );
        return;
      }

      // Check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMsg(
          "Camera API is not available in this browser. Use Google Chrome or Microsoft Edge for webcam scanning. " +
          "USB/Bluetooth barcode scanner guns still work automatically!"
        );
        return;
      }

      // Try requested facingMode first, then fallback to any available camera
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
        });
      } catch (firstErr) {
        // If the specific facingMode failed, try the other one
        const altMode = facingMode === "environment" ? "user" : "environment";
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: altMode },
          });
        } catch {
          // Last resort: try any camera without specifying facingMode
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
            });
          } catch (finalErr) {
            const err = finalErr as DOMException;
            if (err.name === "NotAllowedError") {
              setErrorMsg(
                "Camera permission was denied. Please click the camera/lock icon in your browser's address bar, " +
                "allow camera access for this site, and try again. USB/Bluetooth barcode scanners still work automatically!"
              );
            } else if (err.name === "NotFoundError") {
              setErrorMsg(
                "No camera was found on this device. You can still use a USB or Bluetooth barcode scanner gun — " +
                "just plug it in and scan at any time!"
              );
            } else {
              setErrorMsg(
                `Camera error: ${err.message || "Unknown error"}. ` +
                "USB/Bluetooth barcode scanner guns still work automatically!"
              );
            }
            return;
          }
        }
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const barcodeDetector = await getBarcodeDetector();
      if (barcodeDetector) {
        scanningRef.current = true;
        const SCAN_INTERVAL_MS = 100; // ~10fps check: optimal for wasm decode without lag

        const scanLoop = async () => {
          if (!scanningRef.current || !videoRef.current) return;
          const now = Date.now();
          if (now - lastScanTimeRef.current >= SCAN_INTERVAL_MS) {
            lastScanTimeRef.current = now;
            try {
              if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes && barcodes.length > 0) {
                  const detected = barcodes[0].rawValue;
                  handleBarcodeFound(detected);
                  return;
                }
              }
            } catch (err) {
              console.error("Barcode scan error:", err);
              setErrorMsg(`Scan engine: ${err instanceof Error ? err.message : String(err)}`);
            }
          }
          if (scanningRef.current) {
            requestAnimationFrame(scanLoop);
          }
        };
        requestAnimationFrame(scanLoop);
      } else {
        setErrorMsg(
          "Could not initialize barcode scanner. Please try refreshing the page. " +
          "USB/Bluetooth barcode scanner guns still work automatically!"
        );
      }
    } catch (err: unknown) {
      console.error("Camera access error:", err);
      setErrorMsg(
        "Could not access camera. Please check browser permissions and try again. " +
        "USB/Bluetooth barcode scanner guns still work automatically!"
      );
    }
  }, [facingMode, handleBarcodeFound]);

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open, facingMode, startCamera, stopCamera]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-lime-700 dark:hover:text-lime-400"
          title="Scan barcode with laptop camera / webcam"
        >
          <Barcode className="w-4 h-4" />
          <span className="sr-only">Scan with camera</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md w-[95vw]">
        <DialogHeader>
          <div className="flex items-center justify-between pr-4">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Camera className="w-5 h-5 text-lime-600" />
              Scan Product Barcode
            </DialogTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFacingMode((prev) => (prev === "environment" ? "user" : "environment"))}
              className="text-xs h-7 px-2 gap-1"
              title="Flip between laptop front webcam and back camera"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Flip Cam</span>
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Camera Viewfinder */}
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center border-2 border-lime-500 shadow-inner">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            {/* Viewfinder Target Reticle with Animated Laser Line */}
            <div className="absolute inset-x-8 inset-y-6 sm:inset-x-12 sm:inset-y-8 border-2 border-dashed border-lime-400 rounded-lg pointer-events-none flex flex-col items-center justify-between overflow-hidden">
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-lime-400 to-transparent shadow-[0_0_8px_#a3e635] animate-pulse" />
              <span className="text-[10px] text-lime-200 bg-black/70 px-2.5 py-0.5 rounded backdrop-blur-sm my-auto text-center font-medium">
                Hold barcode 15–20 cm (6–8 in) away & steady
              </span>
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-lime-400 to-transparent shadow-[0_0_8px_#a3e635] animate-pulse" />
            </div>

            {scannedFeedback && (
              <div className="absolute inset-0 bg-emerald-950/85 backdrop-blur-sm flex flex-col items-center justify-center text-white font-bold p-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-2 animate-bounce" />
                <span>{scannedFeedback}</span>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Instant Manual Code Fallback (For Blurry Webcams) */}
          <div className="space-y-1.5 pt-1 border-t border-border/70">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
              <span>Barcode not focusing on webcam? Type digits:</span>
              <span className="text-[10px] text-lime-600 dark:text-lime-400 font-medium">Auto-pairs</span>
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Type barcode digits (e.g. 5000112548167)..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && manualCode.trim()) {
                    e.preventDefault();
                    handleBarcodeFound(manualCode.trim());
                    setManualCode("");
                  }
                }}
                className="h-8 text-xs font-mono bg-white dark:bg-slate-900"
              />
              <Button
                type="button"
                size="sm"
                disabled={!manualCode.trim()}
                onClick={() => {
                  if (manualCode.trim()) {
                    handleBarcodeFound(manualCode.trim());
                    setManualCode("");
                  }
                }}
                className="h-8 px-3 text-xs bg-lime-600 hover:bg-lime-700 text-white shrink-0"
              >
                Scan Code
              </Button>
            </div>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-800/70 p-2.5 rounded-lg space-y-1">
            <p className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
              <span>💡</span> Barcode not in system yet?
            </p>
            <p className="text-[11px] leading-relaxed">
              Don&apos;t worry! When any new barcode is detected, the <strong>Link Barcode</strong> dialog will automatically open so you can pair it to a product in 1 tap.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Quick-Pairing Dialog:
 * When an unlinked barcode is scanned at the register, this lets the cashier
 * link it to an existing product in 1 click and adds it to the cart!
 */
export function LinkBarcodeDialog<T extends ScannedProduct = ScannedProduct>({
  barcode,
  inventory,
  open,
  onOpenChange,
  onLinkedAndAdded,
  canAddProducts = true,
  canPairBarcodes = true,
}: {
  barcode: string | null;
  inventory: T[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLinkedAndAdded: (product: T) => void;
  canAddProducts?: boolean;
  canPairBarcodes?: boolean;
}) {
  const hasAnyPermission = canPairBarcodes || canAddProducts;
  const initialMode = canPairBarcodes ? "pair" : "create";
  const [mode, setMode] = useState<"pair" | "create">(initialMode);
  const [search, setSearch] = useState("");
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New product form states
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newQuantity, setNewQuantity] = useState("10");
  const [creating, setCreating] = useState(false);

  // Keep mode in sync if permissions change
  useEffect(() => {
    if (!canPairBarcodes && canAddProducts) {
      setMode("create");
    } else if (canPairBarcodes && !canAddProducts) {
      setMode("pair");
    }
  }, [canPairBarcodes, canAddProducts]);

  if (!barcode) return null;

  const filtered = inventory.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleLinkProduct = async (product: T) => {
    setLinking(true);
    setError(null);
    try {
      const res = await assignProductBarcode(product.id, barcode);
      if (!res.success) {
        setError(res.error || "Failed to link barcode");
        return;
      }
      playScannerBeep(true);
      onLinkedAndAdded({ ...product, sku: barcode });
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to link barcode");
    } finally {
      setLinking(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPrice.trim()) {
      setError("Please enter a product name and price");
      return;
    }
    const priceNum = parseFloat(newPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError("Please enter a valid price greater than 0");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("name", newName.trim());
      formData.append("sku", barcode);
      formData.append("price", priceNum.toString());
      formData.append("quantity", (parseInt(newQuantity) || 0).toString());
      formData.append("description", "");

      const res = await createProduct(formData);
      if (!res.success || !res.product) {
        setError(res.error || "Failed to create product");
        return;
      }
      playScannerBeep(true);
      onLinkedAndAdded(res.product as unknown as T);
      onOpenChange(false);
      setNewName("");
      setNewPrice("");
      setNewQuantity("10");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create product");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <LinkIcon className="w-5 h-5 text-lime-600" />
            Unrecognized Barcode Detected
          </DialogTitle>
        </DialogHeader>

        {!hasAnyPermission ? (
          /* Permission Locked View for Non-Authorized Salespersons */
          <div className="space-y-4 py-2">
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-center space-y-2.5">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-amber-950 dark:text-amber-100">
                Authorization Required
              </h3>
              <div className="inline-block bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 px-3 py-1 rounded-md font-mono text-xs font-bold text-amber-950 dark:text-amber-200 shadow-sm">
                {barcode}
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300 max-w-xs mx-auto leading-relaxed">
                This barcode is not linked to any product. Salespersons require Manager permission to pair barcodes or register new goods.
              </p>
              <p className="text-[11px] text-muted-foreground pt-1">
                Please notify a store manager or shift supervisor to add or pair this item.
              </p>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Dismiss
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-1">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-900 dark:text-amber-200">
              <p className="font-semibold">
                Scanned Barcode: <code className="bg-amber-100 dark:bg-amber-900 px-1.5 py-0.5 rounded font-mono font-bold text-amber-950 dark:text-amber-100">{barcode}</code>
              </p>
              <p className="mt-1 text-[11px] text-amber-800 dark:text-amber-300">
                {canPairBarcodes && canAddProducts
                  ? "This barcode is not linked yet. Pair it to an existing product or create a new one!"
                  : canPairBarcodes
                  ? "Pair this barcode to an existing item in your product catalog."
                  : "Create a new product for this barcode."}
              </p>
            </div>

            {/* Mode Switcher Tabs (Only shown if user has BOTH permissions) */}
            {canPairBarcodes && canAddProducts ? (
              <div className="flex border-b border-border text-xs font-medium">
                <button
                  type="button"
                  onClick={() => { setMode("pair"); setError(null); }}
                  className={`flex-1 py-2 text-center border-b-2 transition-colors ${
                    mode === "pair"
                      ? "border-lime-600 text-lime-700 dark:text-lime-400 font-bold"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🔗 Pair to Existing ({inventory.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("create"); setError(null); }}
                  className={`flex-1 py-2 text-center border-b-2 transition-colors ${
                    mode === "create"
                      ? "border-lime-600 text-lime-700 dark:text-lime-400 font-bold"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  ➕ Create as New Product
                </button>
              </div>
            ) : null}

            {error && (
              <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                {error}
              </div>
            )}

            {mode === "pair" && canPairBarcodes ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search existing product name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-9 text-xs"
                    autoFocus
                  />
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                  {filtered.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleLinkProduct(item)}
                      disabled={linking}
                      className="w-full text-left p-2.5 rounded-lg border hover:border-lime-500 hover:bg-lime-50/50 dark:hover:bg-slate-800 transition-colors flex justify-between items-center text-xs group"
                    >
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-lime-700 dark:group-hover:text-lime-400">
                          {item.name}
                        </div>
                        <div className="text-gray-400 text-[10px]">
                          Current SKU: {item.sku || "None (unlinked)"}
                        </div>
                      </div>
                      <div className="font-bold text-lime-700 dark:text-lime-400">
                        ₵{item.price.toFixed(2)}
                      </div>
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      No matching products found.{" "}
                      {canAddProducts && (
                        <button
                          type="button"
                          onClick={() => setMode("create")}
                          className="text-lime-600 font-semibold underline underline-offset-2 ml-1"
                        >
                          Create it as a new product &rarr;
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : mode === "create" && canAddProducts ? (
              <form onSubmit={handleCreateProduct} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">Product Name *</label>
                  <Input
                    placeholder="e.g. Club Beer 625ml, Malt Can..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="h-9 text-xs mt-1"
                    required
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-foreground">Selling Price (₵) *</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      className="h-9 text-xs mt-1 font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground">Initial Stock</label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="10"
                      value={newQuantity}
                      onChange={(e) => setNewQuantity(e.target.value)}
                      className="h-9 text-xs mt-1 font-mono"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={creating}
                  className="w-full h-9 text-xs bg-lime-600 hover:bg-lime-700 text-white font-semibold gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{creating ? "Creating Product..." : "Create Product & Add to Cart"}</span>
                </Button>
              </form>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Barcode Capture Button for Inventory Manager
 * Opens a camera scanner and fills any product SKU input automatically!
 */
export function BarcodeScanCaptureButton({
  onCaptured,
  className,
}: {
  onCaptured: (barcode: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scannedFeedback, setScannedFeedback] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [manualCode, setManualCode] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef<boolean>(false);
  const lastScanTimeRef = useRef<number>(0);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const handleBarcodeCaptured = useCallback(
    (barcodeRaw: string) => {
      const code = barcodeRaw.trim();
      if (code) {
        playScannerBeep(true);
        setScannedFeedback(`Scanned: ${code}`);
        setTimeout(() => {
          onCaptured(code);
          setOpen(false);
          setScannedFeedback(null);
        }, 900);
      }
    },
    [onCaptured]
  );

  const startCamera = useCallback(async () => {
    setErrorMsg(null);
    setScannedFeedback(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      if (!window.isSecureContext) {
        setErrorMsg(
          "Camera requires HTTPS. Use localhost or deploy with HTTPS. USB/Bluetooth scanners still work on HTTP!"
        );
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMsg("Camera API not available. Use Chrome or Edge. USB/Bluetooth scanners still work!");
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
        });
      } catch {
        const altMode = facingMode === "environment" ? "user" : "environment";
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: altMode },
          });
        } catch {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
          } catch (finalErr) {
            const err = finalErr as DOMException;
            if (err.name === "NotAllowedError") {
              setErrorMsg(
                "Camera permission denied. Click the lock/camera icon in the address bar and allow access."
              );
            } else if (err.name === "NotFoundError") {
              setErrorMsg("No camera found on this device.");
            } else {
              setErrorMsg(`Camera error: ${err.message || "Unknown error"}`);
            }
            return;
          }
        }
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const barcodeDetector = await getBarcodeDetector();
      if (barcodeDetector) {
        scanningRef.current = true;
        const SCAN_INTERVAL_MS = 100;

        const scanLoop = async () => {
          if (!scanningRef.current || !videoRef.current) return;
          const now = Date.now();
          if (now - lastScanTimeRef.current >= SCAN_INTERVAL_MS) {
            lastScanTimeRef.current = now;
            try {
              if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes && barcodes.length > 0) {
                  const detected = barcodes[0].rawValue;
                  handleBarcodeCaptured(detected);
                  return;
                }
              }
            } catch (err) {
              console.error("Frame detection error:", err);
              setErrorMsg(`Scan engine: ${err instanceof Error ? err.message : String(err)}`);
            }
          }
          if (scanningRef.current) {
            requestAnimationFrame(scanLoop);
          }
        };
        requestAnimationFrame(scanLoop);
      } else {
        setErrorMsg("Could not initialize barcode scanner. Please try refreshing the page.");
      }
    } catch (err: unknown) {
      console.error("Camera access error:", err);
      setErrorMsg("Could not access camera. Check browser permissions and try again.");
    }
  }, [facingMode, handleBarcodeCaptured]);

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open, facingMode, startCamera, stopCamera]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`h-9 px-2.5 text-xs gap-1.5 border-lime-300 text-lime-800 dark:text-lime-300 hover:bg-lime-50 ${className || ""}`}
          title="Scan product barcode with camera to auto-fill SKU"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Scan Barcode</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md w-[95vw]">
        <DialogHeader>
          <div className="flex items-center justify-between pr-4">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Camera className="w-5 h-5 text-lime-600" />
              Scan Barcode with Camera
            </DialogTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFacingMode((prev) => (prev === "environment" ? "user" : "environment"))}
              className="text-xs h-7 px-2 gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Flip Cam</span>
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center border-2 border-lime-500 shadow-inner">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            {/* Viewfinder Target Reticle with Animated Laser Line */}
            <div className="absolute inset-x-8 inset-y-6 sm:inset-x-12 sm:inset-y-8 border-2 border-dashed border-lime-400 rounded-lg pointer-events-none flex flex-col items-center justify-between overflow-hidden">
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-lime-400 to-transparent shadow-[0_0_8px_#a3e635] animate-pulse" />
              <span className="text-[10px] text-lime-200 bg-black/70 px-2.5 py-0.5 rounded backdrop-blur-sm my-auto text-center font-medium">
                Hold product barcode 15–20 cm away
              </span>
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-lime-400 to-transparent shadow-[0_0_8px_#a3e635] animate-pulse" />
            </div>

            {scannedFeedback && (
              <div className="absolute inset-0 bg-emerald-950/85 backdrop-blur-sm flex flex-col items-center justify-center text-white font-bold p-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-2 animate-bounce" />
                <span>{scannedFeedback}</span>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 text-xs text-red-700 rounded-lg border border-red-200">
              {errorMsg}
            </div>
          )}

          {/* Manual Input Fallback */}
          <div className="space-y-1.5 pt-1 border-t border-border/70">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
              <span>Barcode not focusing on webcam? Type digits:</span>
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Type barcode digits (e.g. 5000112548167)..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && manualCode.trim()) {
                    e.preventDefault();
                    handleBarcodeCaptured(manualCode.trim());
                    setManualCode("");
                  }
                }}
                className="h-8 text-xs font-mono bg-white dark:bg-slate-900"
              />
              <Button
                type="button"
                size="sm"
                disabled={!manualCode.trim()}
                onClick={() => {
                  if (manualCode.trim()) {
                    handleBarcodeCaptured(manualCode.trim());
                    setManualCode("");
                  }
                }}
                className="h-8 px-3 text-xs bg-lime-600 hover:bg-lime-700 text-white shrink-0"
              >
                Use Code
              </Button>
            </div>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Once captured, the barcode number will automatically be placed into the SKU field.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
