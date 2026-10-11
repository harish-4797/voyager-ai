import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Square app icon (dark tile) — works on both light and dark backgrounds. */
export function LogoMark({ className = undefined }) {
  return (
    <img
      src="/logo-icon.png"
      alt=""
      aria-hidden
      className={cn(
        "h-10 w-10 shrink-0 rounded-[0.8rem] shadow-lg shadow-ink/25 transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-105",
        className
      )}
    />
  );
}

/** "VoyagerAI" wordmark, optionally with the brand tagline underneath. */
export function Wordmark({ light = false, tagline = false, className = undefined }) {
  return (
    <span className={cn("flex flex-col leading-none", className)}>
      <span className={cn("font-brand text-lg font-bold tracking-tight", light ? "text-white" : "text-ink")}>
        Voyager
        <span className="bg-gradient-to-b from-[#FF8A3D] to-[#FF5A36] bg-clip-text text-transparent">AI</span>
      </span>
      {tagline && (
        <span className={cn("mt-1.5 font-brand text-[9px] font-medium uppercase tracking-[0.28em]", light ? "text-white/50" : "text-ink/50")}>
          AI travel itinerary generator
        </span>
      )}
    </span>
  );
}

/** Full-screen branded loader: the V mark gently pulsing above a progress shimmer. */
export function BrandLoader({ label = "Loading" }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background">
      <motion.img
        src="/logo-mark.png"
        alt=""
        className="h-24 w-auto"
        animate={{ scale: [1, 1.06, 1], y: [0, -6, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="h-1 w-28 overflow-hidden rounded-full bg-ink/10">
        <motion.div
          className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#FF8A3D] to-[#FF5A36]"
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">{label}</p>
    </div>
  );
}
