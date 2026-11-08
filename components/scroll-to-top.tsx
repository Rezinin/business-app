"use client";

import { useState, useEffect } from "react";
import { ArrowUp, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 220);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 800);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40 pointer-events-auto flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* 1-Tap Back to Top */}
      <button
        type="button"
        onClick={scrollToTop}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 dark:bg-slate-800/90 backdrop-blur-md text-white border border-lime-500/80 shadow-lg hover:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 transition-all text-xs font-semibold"
        title="Scroll smoothly back to top"
      >
        <ArrowUp className="w-3.5 h-3.5 text-lime-400 animate-bounce" />
        <span>Top</span>
      </button>

      {/* 1-Tap Quick Data Refresh (no browser reload) */}
      <button
        type="button"
        onClick={handleRefresh}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-gray-800 dark:text-gray-200 border border-border shadow-lg hover:bg-gray-100 dark:hover:bg-slate-800 active:scale-95 transition-all text-xs font-medium"
        title="Refresh data without reloading the browser"
      >
        <RefreshCw className={`w-3.5 h-3.5 text-lime-600 ${refreshing ? "animate-spin text-lime-500" : ""}`} />
        <span className="hidden sm:inline">Refresh</span>
      </button>
    </div>
  );
}
