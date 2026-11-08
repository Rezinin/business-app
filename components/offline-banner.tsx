"use client";

import { useEffect, useState } from "react";
import {
  isDeviceOnline,
  getOfflineSales,
  syncAllOfflineSales,
  subscribeToOfflineQueue,
  type OfflineSale,
} from "@/lib/offline-sync";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

export function OfflineBanner() {
  const [online, setOnline] = useState<boolean>(true);
  const [queue, setQueue] = useState<OfflineSale[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    setOnline(isDeviceOnline());
    setQueue(getOfflineSales());

    const handleOnline = async () => {
      setOnline(true);
      // Auto-sync when coming back online
      const currentQueue = getOfflineSales();
      if (currentQueue.length > 0) {
        setIsSyncing(true);
        setSyncStatus("Connection restored. Syncing offline sales...");
        const result = await syncAllOfflineSales();
        setIsSyncing(false);
        if (result.failedCount === 0) {
          setSyncStatus(`Successfully synced ${result.successCount} sale(s)!`);
          setTimeout(() => setSyncStatus(null), 4000);
        } else {
          setSyncStatus(`Synced ${result.successCount}, failed ${result.failedCount}. Click to retry.`);
        }
      }
    };

    const handleOffline = () => {
      setOnline(false);
      setSyncStatus("Offline mode active. Sales will be saved locally.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const unsubscribe = subscribeToOfflineQueue((updatedQueue) => {
      setQueue(updatedQueue);
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      unsubscribe();
    };
  }, []);

  const handleManualSync = async () => {
    if (isSyncing || queue.length === 0) return;
    setIsSyncing(true);
    setSyncStatus("Syncing offline sales to server...");
    try {
      const res = await syncAllOfflineSales();
      if (res.failedCount === 0) {
        setSyncStatus(`Synced all ${res.successCount} offline sales!`);
        setTimeout(() => setSyncStatus(null), 4000);
      } else {
        setSyncStatus(`Synced ${res.successCount}, ${res.failedCount} failed.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      setSyncStatus(`Sync error: ${msg}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Network & Queue Status Badge */}
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-sm ${
              !online
                ? "bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700 animate-pulse"
                : queue.length > 0
                ? "bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
            }`}
            title="Click to view offline queue status"
          >
            {!online ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Offline Mode</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Online</span>
              </>
            )}

            {queue.length > 0 && (
              <span className="ml-1 bg-amber-600 text-white font-bold px-1.5 py-0.2 rounded-full text-[10px]">
                {queue.length} queued
              </span>
            )}
          </button>
        </DialogTrigger>

        <DialogContent className="max-w-md w-[95vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {!online ? (
                <WifiOff className="w-5 h-5 text-amber-600" />
              ) : (
                <Wifi className="w-5 h-5 text-emerald-600" />
              )}
              Network & Offline Sales Queue
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800 border text-sm">
              <p className="font-semibold text-gray-800 dark:text-gray-200">
                Connection Status:{" "}
                <span className={online ? "text-emerald-600" : "text-amber-600"}>
                  {online ? "Connected to Internet" : "Offline / Unstable Connection"}
                </span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                When offline, sales are saved securely on this device and receipts are printed immediately. When internet reconnects, sales auto-sync to the database.
              </p>
            </div>

            {queue.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-sm">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                All sales are fully synchronized with the cloud!
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs text-gray-500 font-semibold px-1">
                  <span>QUEUED SALES ({queue.length})</span>
                  <span>TOTAL AMOUNT</span>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {queue.map((sale) => (
                    <div
                      key={sale.id}
                      className="p-3 border rounded-lg bg-white dark:bg-slate-900 flex justify-between items-start text-xs"
                    >
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {sale.receiptNumber}
                        </div>
                        <div className="text-gray-500">
                          {sale.items.length} item(s) • {sale.customerName || "Walk-in"}
                        </div>
                        {sale.syncError && (
                          <div className="text-red-500 flex items-center gap-1 mt-1 text-[11px]">
                            <AlertCircle className="w-3 h-3" />
                            {sale.syncError}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-gray-900 dark:text-gray-100">
                          ₵{sale.totalPrice.toFixed(2)}
                        </span>
                        <div className="text-gray-400 text-[10px]">
                          {new Date(sale.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={handleManualSync}
                  disabled={isSyncing || !online}
                  className="w-full bg-lime-600 hover:bg-lime-700 text-white mt-3"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                  {isSyncing ? "Syncing to Cloud..." : "Sync All Sales Now"}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick sync button if sales are queued and online */}
      {queue.length > 0 && online && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleManualSync}
          disabled={isSyncing}
          className="h-8 px-2.5 text-xs border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200"
          title="Sync offline sales now"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Syncing..." : `Sync (${queue.length})`}
        </Button>
      )}

      {/* Temporary toast / status banner */}
      {syncStatus && (
        <span className="text-xs text-lime-700 dark:text-lime-300 font-medium animate-fadeIn">
          {syncStatus}
        </span>
      )}
    </div>
  );
}
