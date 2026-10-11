import React from "react";
import { Slider } from "@/components/ui/slider";
import { AnimatePresence, motion } from "framer-motion";
import { AnimatedNumber } from "@/components/motion/primitives";

const BUDGET_LABELS = [
  { max: 5000, label: "Backpacker", emoji: "🎒" },
  { max: 15000, label: "Comfortable", emoji: "🧳" },
  { max: 30000, label: "Premium", emoji: "✨" },
  { max: 40000, label: "Luxury", emoji: "💎" },
  { max: 50000, label: "Ultra Luxury", emoji: "👑" },
];

export default function BudgetSlider({ value, onChange }) {
  const tier = BUDGET_LABELS.find((b) => value <= b.max) || BUDGET_LABELS[BUDGET_LABELS.length - 1];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Total budget</p>
          <p className="font-display text-5xl font-bold tracking-tight text-ink sm:text-6xl">
            ₹<AnimatedNumber value={value} />
          </p>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={tier.label}
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-sun/20 to-coral/20 px-4 py-2"
          >
            <span className="text-xl">{tier.emoji}</span>
            <span className="text-sm font-semibold text-ink">{tier.label}</span>
          </motion.div>
        </AnimatePresence>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={1000}
        max={50000}
        step={500}
        className="w-full"
      />
      <div className="grid grid-cols-5 gap-1 text-center text-[11px] text-muted-foreground">
        {BUDGET_LABELS.map((b) => (
          <span key={b.label} className={b.label === tier.label ? "font-semibold text-sunset" : undefined}>
            {b.emoji} <span className="hidden sm:inline">{b.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
