import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CalendarCheck, Dices, Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { CITIES, MONTHS, bestSeasonLabel, surpriseDestination } from "@/lib/cities";

const FIT_COPY = {
  peak: { label: "Perfect season", className: "bg-emerald-500 text-white" },
  shoulder: { label: "Shoulder season", className: "bg-sun text-ink" },
  off: { label: "Off-season", className: "bg-coral text-white" },
};

/**
 * "Surprise me" picker: choose month, days and budget, spin, and get a destination that
 * suits the season and the budget. `onAccept(pick, settings)` hands the result back.
 */
export default function SurpriseMe({ open, onOpenChange, initial, onAccept }) {
  const [settings, setSettings] = useState(() => ({
    monthIndex: Math.max(0, MONTHS.indexOf(initial?.month)),
    days: initial?.days || 5,
    budget: initial?.budget || 15000,
  }));
  const [reel, setReel] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [pick, setPick] = useState(null);
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (!open) {
      timers.current.forEach(clearTimeout);
      setSpinning(false);
    }
  }, [open]);

  const spin = () => {
    const result = surpriseDestination({ ...settings, exclude: pick ? [pick.city.name] : [] });
    if (!result) return;
    setPick(null);
    setSpinning(true);
    timers.current.forEach(clearTimeout);
    timers.current = [];
    // Decelerating reel: each tick waits a little longer, then lands on the pick.
    const steps = 18;
    let elapsed = 0;
    for (let i = 0; i < steps; i++) {
      elapsed += 55 + i * i * 2.2;
      timers.current.push(setTimeout(() => setReel((r) => (r + 1) % CITIES.length), elapsed));
    }
    timers.current.push(
      setTimeout(() => {
        setReel(CITIES.findIndex((c) => c.name === result.city.name));
        setPick(result);
        setSpinning(false);
      }, elapsed + 140)
    );
  };

  const shown = CITIES[reel];
  const perDay = Math.round(settings.budget / settings.days);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto rounded-[2rem] border-0 p-0">
        {/* Reel */}
        <div className="relative h-56 overflow-hidden bg-ink">
          <AnimatePresence initial={false}>
            <motion.img
              key={shown.name}
              src={shown.img}
              alt=""
              initial={{ y: "-100%" }}
              animate={{ y: "0%" }}
              exit={{ y: "100%" }}
              transition={{ duration: spinning ? 0.12 : 0.4, ease: "easeOut" }}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6">
            {pick ? (
              <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                <span className={`mb-2 inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold ${FIT_COPY[pick.fit].className}`}>
                  {FIT_COPY[pick.fit].label}
                </span>
                <p className="font-display text-4xl font-bold text-white">{pick.city.name}</p>
                <p className="text-sm text-white/70">{pick.city.tagline}</p>
              </motion.div>
            ) : (
              <p className="font-display text-3xl font-bold text-white/90">{spinning ? shown.name : "Where to next?"}</p>
            )}
          </div>
          {spinning && <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(255,255,255,0.08)_50%,transparent_100%)] animate-shimmer [background-size:100%_300%]" />}
        </div>

        <div className="space-y-6 p-6">
          <div>
            <DialogTitle className="font-display text-2xl font-bold text-ink">Surprise me</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              We'll pick a destination that's in season and fits your budget.
            </DialogDescription>
          </div>

          {pick && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 rounded-2xl bg-secondary/70 p-4 text-sm">
              <p className="flex items-start gap-2 text-ink/80">
                <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-sunset" />
                Best season: <b className="text-ink">{bestSeasonLabel(pick.city)}</b>
              </p>
              <p className="flex items-start gap-2 text-ink/80">
                <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-sunset" />
                ~₹{pick.city.avgBudget.toLocaleString("en-IN")}/day typical vs your ₹{perDay.toLocaleString("en-IN")}/day
                {pick.fitsBudget ? " ✓" : " — a little tight"}
              </p>
            </motion.div>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Month</p>
            <div className="grid grid-cols-6 gap-1.5">
              {MONTHS.map((m, i) => (
                <button
                  key={m}
                  onClick={() => setSettings((s) => ({ ...s, monthIndex: i }))}
                  className={`rounded-xl py-2 text-xs font-semibold transition ${settings.monthIndex === i ? "bg-ink text-white" : "bg-secondary/70 text-ink/70 hover:bg-secondary"}`}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-3 flex justify-between text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Days <span className="text-ink">{settings.days}</span>
              </p>
              <Slider value={[settings.days]} min={1} max={14} step={1} onValueChange={([v]) => setSettings((s) => ({ ...s, days: v }))} />
            </div>
            <div>
              <p className="mb-3 flex justify-between text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Budget <span className="text-ink">₹{settings.budget.toLocaleString("en-IN")}</span>
              </p>
              <Slider value={[settings.budget]} min={1000} max={50000} step={500} onValueChange={([v]) => setSettings((s) => ({ ...s, budget: v }))} />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={spin}
              disabled={spinning}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-ink py-3.5 text-sm font-semibold text-white transition hover:bg-ink/90 disabled:opacity-60"
            >
              <motion.span animate={spinning ? { rotate: 360 } : { rotate: 0 }} transition={spinning ? { repeat: Infinity, duration: 0.6, ease: "linear" } : {}}>
                <Dices className="h-4 w-4" />
              </motion.span>
              {pick ? "Spin again" : spinning ? "Spinning…" : "Spin"}
            </motion.button>
            {pick && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onAccept(pick, settings)}
                className="btn-sunset flex flex-1 items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold"
              >
                Plan {pick.city.name} <ArrowRight className="h-4 w-4" />
              </motion.button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
