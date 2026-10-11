import React from "react";
import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSun, Droplets, Snowflake, Sun } from "lucide-react";
import { weatherKind } from "@/lib/weather";

const ICONS = {
  clear: Sun,
  partly: CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  rain: CloudRain,
  storm: CloudLightning,
  snow: Snowflake,
  unknown: CloudSun,
};

const round = (v) => (typeof v === "number" ? Math.round(v) : "–");

/** Compact weather chip for a single day. */
export default function WeatherBadge({ wx, compact = false }) {
  if (!wx) return null;
  const kind = weatherKind(wx.code);
  const Icon = ICONS[kind];
  const title =
    wx.source === "forecast"
      ? `Forecast${wx.rainChance != null ? ` · ${wx.rainChance}% chance of rain` : ""}`
      : "Typical for these dates (average of the last 3 years)";

  return (
    <div
      title={title}
      className={`flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 ${wx.rainy ? "border-ocean/25 bg-ocean/10" : "border-sun/30 bg-sun/10"}`}
    >
      <Icon className={`h-5 w-5 ${wx.rainy ? "text-ocean" : "text-sunset"}`} />
      <div className="leading-tight">
        <p className="text-sm font-bold text-ink">
          {round(wx.tmax)}° <span className="font-medium text-ink/50">/ {round(wx.tmin)}°</span>
        </p>
        {!compact && (
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-ink/50">
            {wx.precip >= 0.5 && (
              <>
                <Droplets className="h-2.5 w-2.5" /> {wx.precip.toFixed(wx.precip < 10 ? 1 : 0)}mm ·
              </>
            )}
            {wx.source === "forecast" ? "Forecast" : "Typical"}
          </p>
        )}
      </div>
    </div>
  );
}
