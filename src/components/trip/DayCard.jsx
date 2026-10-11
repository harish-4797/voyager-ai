import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sun, Cloud, Moon, MapPin, Clock, Lightbulb, Shuffle, StickyNote, Undo2, CloudRain, Loader2, Sparkles, Check, X, Map as MapIcon, BadgeCheck,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EASE } from "@/components/motion/primitives";
import { isOutdoor } from "@/lib/itinerary";
import { parseISODate } from "@/lib/weather";
import DayMap from "@/components/trip/DayMap";
import WeatherBadge from "@/components/trip/WeatherBadge";

const PERIOD_CONFIG = {
  morning: { icon: Sun, color: "from-sun to-sunset", text: "text-sunset", label: "Morning" },
  afternoon: { icon: Cloud, color: "from-sunset to-coral", text: "text-coral", label: "Afternoon" },
  evening: { icon: Moon, color: "from-ocean to-ink", text: "text-ocean", label: "Evening" },
};

const QUICK_HINTS = [
  { label: "Surprise me", hint: "" },
  { label: "Cheaper", hint: "a cheaper option" },
  { label: "Indoor", hint: "an indoor, rain-friendly option" },
  { label: "More local", hint: "something local and off the tourist trail" },
  { label: "Food", hint: "a food-focused experience" },
  { label: "Relaxed", hint: "something relaxed and low-effort" },
];

function SwapButton({ onSwap, disabled }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");

  const run = (hint) => {
    setOpen(false);
    setCustom("");
    onSwap(hint);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          className="flex items-center gap-1.5 rounded-full border border-ink/10 bg-white/70 px-3 py-1.5 text-xs font-semibold text-ink/70 transition hover:border-sunset hover:text-sunset disabled:opacity-40"
        >
          <Shuffle className="h-3.5 w-3.5" /> Swap
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 rounded-2xl border-ink/10 p-4">
        <p className="text-sm font-semibold text-ink">Swap this activity</p>
        <p className="mb-3 text-xs text-muted-foreground">The AI will replace just this slot.</p>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {QUICK_HINTS.map((q) => (
            <button
              key={q.label}
              onClick={() => run(q.hint)}
              className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-ink/75 transition hover:bg-ink hover:text-white"
            >
              {q.label}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (custom.trim()) run(custom.trim());
          }}
          className="flex gap-2"
        >
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Or describe it… e.g. sunset cruise"
            className="h-9 min-w-0 flex-1 rounded-full border border-ink/10 bg-white px-3 text-xs outline-none focus:border-sunset"
          />
          <button type="submit" disabled={!custom.trim()} className="btn-sunset flex h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold disabled:opacity-40">
            <Sparkles className="h-3.5 w-3.5" /> Go
          </button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function NoteEditor({ note, onSave, onClose }) {
  const [value, setValue] = useState(note || "");
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="mt-3 rounded-2xl border border-sun/40 bg-[#FFF8E6] p-3">
        <textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={3}
          placeholder="Booking refs, who's coming, things to remember…"
          className="w-full resize-none bg-transparent text-sm text-ink outline-none placeholder:text-ink/35"
        />
        <div className="mt-1 flex justify-end gap-2">
          <button onClick={onClose} className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-ink/60 hover:bg-ink/5">
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
          <button
            onClick={() => {
              onSave(value.trim());
              onClose();
            }}
            className="flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white hover:bg-sunset"
          >
            <Check className="h-3.5 w-3.5" /> Save note
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function ActivityBlock({ period, data, isLast, wx, swapping, swapError, canUndo, onSwap, onUndo, onNote }) {
  const [editingNote, setEditingNote] = useState(false);
  if (!data) return null;
  const config = PERIOD_CONFIG[period];
  const Icon = config.icon;
  const rainRisk = wx?.rainy && isOutdoor(data);

  return (
    <motion.div
      className="relative flex gap-4 sm:gap-5"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: EASE }}
    >
      <div className="relative flex flex-col items-center">
        <div className={`z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${config.color} shadow-lg`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        {!isLast && <div className="mt-2 w-px flex-1 bg-gradient-to-b from-ink/15 to-transparent" />}
      </div>

      <div className="relative flex-1 pb-8">
        {/* Swap in progress overlay */}
        <AnimatePresence>
          {swapping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute -inset-2 z-10 flex items-center justify-center rounded-2xl bg-background/80 backdrop-blur-sm"
            >
              <span className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white shadow-lift">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Finding something new…
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={data.activity}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <span className={`text-xs font-bold uppercase tracking-[0.2em] ${config.text}`}>{config.label}</span>
            <h4 className="mt-1 text-xl font-semibold text-ink">{data.activity}</h4>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{data.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {data.location && (
                <span className="chip">
                  <MapPin className="h-3 w-3" /> {data.location}
                </span>
              )}
              {data.duration && (
                <span className="chip">
                  <Clock className="h-3 w-3" /> {data.duration}
                </span>
              )}
              {data.verified && data.place && (
                <a
                  href={data.place.wikipedia_url || data.place.osm_url}
                  target="_blank"
                  rel="noreferrer"
                  title={`Matched to "${data.place.name}" (${data.place.type}) from ${data.place.source === "wikipedia" ? "Wikipedia" : "OpenStreetMap"}`}
                  className="chip border-ocean/25 bg-ocean/10 font-semibold text-ocean transition hover:bg-ocean hover:text-white"
                >
                  <BadgeCheck className="h-3 w-3" /> Verified place
                </a>
              )}
              {data.verified === false && (
                <span className="chip text-ink/50" title="This stop couldn't be matched to a retrieved real place — double-check it.">
                  AI suggestion · unverified
                </span>
              )}
              {data.estimated_cost > 0 && (
                <span className="chip border-sunset/20 bg-sunset/10 font-semibold text-sunset">₹{data.estimated_cost.toLocaleString("en-IN")}</span>
              )}
            </div>

            {rainRisk && (
              <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-ocean/25 bg-ocean/10 p-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-start gap-2 text-xs leading-relaxed text-ink/80">
                  <CloudRain className="mt-0.5 h-4 w-4 shrink-0 text-ocean" />
                  <span>
                    <span className="font-semibold text-ink">{wx.source === "forecast" ? "Rain is forecast" : "Rain is common"} on this day</span> and this is an
                    outdoor activity.
                  </span>
                </p>
                <button
                  onClick={() => onSwap("an indoor, rain-friendly option")}
                  disabled={swapping}
                  className="shrink-0 rounded-full bg-ocean px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-ink disabled:opacity-50"
                >
                  Swap for indoor
                </button>
              </div>
            )}

            {data.tips && (
              <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-sun/30 bg-sun/10 p-3.5">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-sunset" />
                <p className="text-xs leading-relaxed text-ink/70">
                  <span className="font-semibold text-ink">Local tip · </span>
                  {data.tips}
                </p>
              </div>
            )}

            {data.note && !editingNote && (
              <button
                onClick={() => setEditingNote(true)}
                className="mt-3 flex w-full items-start gap-2.5 rounded-2xl border border-sun/40 bg-[#FFF8E6] p-3.5 text-left transition hover:border-sunset/40"
              >
                <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-sunset" />
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-ink/80">
                  <span className="font-semibold text-ink">My note · </span>
                  {data.note}
                </p>
              </button>
            )}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {editingNote && <NoteEditor note={data.note} onSave={onNote} onClose={() => setEditingNote(false)} />}
        </AnimatePresence>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <SwapButton onSwap={onSwap} disabled={swapping} />
          {!editingNote && (
            <button
              onClick={() => setEditingNote(true)}
              className="flex items-center gap-1.5 rounded-full border border-ink/10 bg-white/70 px-3 py-1.5 text-xs font-semibold text-ink/70 transition hover:border-sunset hover:text-sunset"
            >
              <StickyNote className="h-3.5 w-3.5" /> {data.note ? "Edit note" : "Add note"}
            </button>
          )}
          <AnimatePresence>
            {canUndo && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={onUndo}
                className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-500 hover:text-white"
              >
                <Undo2 className="h-3.5 w-3.5" /> Swapped · Undo
              </motion.button>
            )}
          </AnimatePresence>
          {swapError && <span className="text-xs text-red-500">{swapError}</span>}
        </div>
      </div>
    </motion.div>
  );
}

export default function DayCard({
  day,
  dayIndex,
  city,
  wx,
  swappingPeriod,
  swapError,
  undoPeriod,
  onSwap,
  onUndo,
  onNote,
  onResolveCoords,
}) {
  const [showMap, setShowMap] = useState(true);
  const periods = ["morning", "afternoon", "evening"].filter((p) => day[p]);
  const date = wx?.date && wx.hasRealDates ? parseISODate(wx.date) : null;

  useEffect(() => {
    setShowMap(true);
  }, [dayIndex]);

  return (
    <div className="surface overflow-hidden">
      <div className="flex items-center gap-5 border-b border-ink/[0.06] px-6 py-6 sm:px-8">
        <span className="font-display text-5xl font-extrabold leading-none tracking-tight text-sunset">
          {String(day.day).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Day {day.day}
            {date && ` · ${date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}`}
          </span>
          <h3 className="text-2xl font-bold leading-tight text-ink">{day.theme}</h3>
        </div>
        <WeatherBadge wx={wx} />
      </div>

      <div className="px-6 pt-6 sm:px-8">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            <MapIcon className="h-3.5 w-3.5" /> Today's route
          </p>
          <button onClick={() => setShowMap((s) => !s)} className="text-xs font-semibold text-ink/60 hover:text-sunset">
            {showMap ? "Hide map" : "Show map"}
          </button>
        </div>
        <AnimatePresence initial={false}>
          {showMap && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="overflow-hidden"
            >
              <DayMap day={day} city={city} onResolve={(period, point, name) => onResolveCoords(dayIndex, period, point, name)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="px-6 pt-8 sm:px-8">
        {periods.map((p, i) => (
          <ActivityBlock
            key={p}
            period={p}
            data={day[p]}
            isLast={i === periods.length - 1}
            wx={wx}
            swapping={swappingPeriod === p}
            swapError={swapError?.period === p ? swapError.message : null}
            canUndo={undoPeriod === p}
            onSwap={(hint) => onSwap(dayIndex, p, hint)}
            onUndo={() => onUndo(dayIndex, p)}
            onNote={(note) => onNote(dayIndex, p, note)}
          />
        ))}
      </div>
    </div>
  );
}
