import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, CloudRain, Thermometer } from "lucide-react";
import { CITIES, MONTHS, bestSeasonLabel, bestSeasonMonths, seasonFit } from "@/lib/cities";
import { getMonthClimate } from "@/lib/weather";

const FIT = {
  peak: { title: "Great time to go", className: "border-emerald-500/25 bg-emerald-500/10", badge: "bg-emerald-500 text-white" },
  shoulder: { title: "Shoulder season", className: "border-sun/40 bg-sun/10", badge: "bg-sun text-ink" },
  off: { title: "Off-season", className: "border-coral/25 bg-coral/10", badge: "bg-coral text-white" },
};

/** Best-season verdict and typical weather for the chosen city and month. */
export default function SeasonInsight({ cityName, month, onPickMonth }) {
  const city = CITIES.find((c) => c.name === cityName);
  const monthIndex = MONTHS.indexOf(month);
  const [climate, setClimate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cityName || monthIndex < 0) return;
    let cancelled = false;
    setLoading(true);
    setClimate(null);
    getMonthClimate(cityName, monthIndex)
      .then((c) => !cancelled && setClimate(c))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [cityName, monthIndex]);

  if (!cityName || monthIndex < 0) return null;
  const fit = city ? seasonFit(city, monthIndex) : null;
  const style = fit ? FIT[fit] : { className: "border-ink/10 bg-white/60" };
  const best = city ? bestSeasonMonths(city) : [];

  return (
    <motion.div
      key={`${cityName}-${month}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl border p-5 ${style.className}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {fit && <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${style.badge}`}>{style.title}</span>}
        <p className="text-sm font-semibold text-ink">
          {cityName} in {month}
        </p>
      </div>

      {city && (
        <p className="mt-3 flex items-start gap-2 text-sm text-ink/80">
          <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-sunset" />
          <span>
            Best season: <b className="text-ink">{bestSeasonLabel(city)}</b>
            {fit === "shoulder" && ". Just outside it, so expect fewer crowds but less reliable weather."}
            {fit === "off" && ". Expect harsher weather; plan more indoor time."}
          </span>
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink/80">
        {loading ? (
          <span className="skeleton h-4 w-56 rounded-full" />
        ) : climate ? (
          <>
            <span className="flex items-center gap-1.5">
              <Thermometer className="h-4 w-4 text-sunset" />
              Typically {Math.round(climate.tmin)}°–{Math.round(climate.tmax)}°C
            </span>
            <span className="flex items-center gap-1.5">
              <CloudRain className="h-4 w-4 text-ocean" />~{Math.round(climate.rainyDays)} rainy day{Math.round(climate.rainyDays) === 1 ? "" : "s"}
            </span>
          </>
        ) : null}
      </div>

      {fit && fit !== "peak" && best.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-ink/60">Try instead:</span>
          {best.map((m) => (
            <button
              key={m}
              onClick={() => onPickMonth(MONTHS[m])}
              className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-ink shadow-soft transition hover:bg-ink hover:text-white"
            >
              {MONTHS[m].slice(0, 3)}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
