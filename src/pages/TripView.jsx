import React, { useState, useEffect, useRef, useCallback } from "react";
import { voyager } from "@/api/voyagerClient";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft, Calendar, CalendarDays, MapPin, Wallet, Tag, Download, Loader2, Sparkles, MessageCircle, Luggage, ArrowLeftRight, CloudRain,
  Database, BadgeCheck, CloudSun, BookOpen, ExternalLink
} from "lucide-react";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import DayCard from "@/components/trip/DayCard";
import BudgetBreakdown from "@/components/trip/BudgetBreakdown";
import PackingChecklist from "@/components/trip/PackingChecklist";
import ShareTripModal from "@/components/trip/ShareTripModal";
import { exportTripToPdf } from "@/components/trip/exportPdf";
import { EASE, Reveal, SplitText } from "@/components/motion/primitives";
import { BrandLoader } from "@/components/common/Brand";
import { MONTHS, getCityImage } from "@/lib/cities";
import { generateItinerary, isOutdoor, PERIODS, suggestReplacement, withActivity } from "@/lib/itinerary";
import { getTripWeather, parseISODate } from "@/lib/weather";
import RearrangeBoard from "@/components/trip/RearrangeBoard";
import WeatherBadge from "@/components/trip/WeatherBadge";

const STATUS_COLORS = {
  planning: "bg-sun text-ink",
  confirmed: "bg-emerald-500 text-white",
  completed: "bg-ocean text-white",
  cancelled: "bg-white/80 text-ink/60",
};

const STAGE_LABELS = {
  retrieve: "Retrieving places…",
  rank: "Ranking places…",
  enrich: "Reading Wikipedia…",
  weather: "Checking weather…",
  generate: "Writing plan…",
  ground: "Verifying stops…",
};

function RegenerateButton({ trip, onDone }) {
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(null);
  const [error, setError] = useState(null);

  const regenerate = async () => {
    setLoading(true);
    setStage(null);
    setError(null);

    try {
      const result = await generateItinerary({ ...trip, onStage: (key) => setStage(key) });
      const updated = await voyager.entities.Trip.update(trip.id, { itinerary: result });
      onDone(updated);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setError(err.message || "Failed to regenerate. Please check your API key.");
      console.error("Regeneration error:", err);
    }
  };

  return (
    <div>
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={regenerate}
        disabled={loading}
        className="btn-sunset flex h-11 items-center gap-2 rounded-full px-5 text-xs font-semibold disabled:opacity-60 sm:text-sm"
      >
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" />{STAGE_LABELS[stage] || "Regenerating…"}</> : <><Sparkles className="h-4 w-4" />Regenerate</>}
      </motion.button>
      {error && (
        <p className="mt-3 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}

/** Shows how the itinerary was grounded: retrieval stats plus the real sources behind each stop. */
function RagProvenance({ rag }) {
  const [open, setOpen] = useState(false);
  if (!rag?.used) {
    return (
      <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
        <Database className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {rag
          ? "Generated without retrieval (place sources were unavailable). Regenerate to ground this plan in real places."
          : "Created before real-place retrieval was added. Use Regenerate to ground it in real places."}
      </p>
    );
  }
  return (
    <div className="mt-5 rounded-2xl border border-ocean/20 bg-ocean/5 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full bg-ocean px-3 py-1 text-xs font-semibold text-white">
          <Database className="h-3.5 w-3.5" /> RAG-grounded
        </span>
        <span className="chip">
          <MapPin className="h-3 w-3 text-ocean" /> {rag.retrieved} real places retrieved
        </span>
        <span className="chip">
          <BadgeCheck className="h-3 w-3 text-ocean" /> {rag.grounded}/{rag.total} stops verified
        </span>
        {rag.weather && (
          <span className="chip">
            <CloudSun className="h-3 w-3 text-ocean" /> {rag.weather === "forecast" ? "Live forecast" : "Typical weather"} used
          </span>
        )}
        {rag.sources?.length > 0 && (
          <button onClick={() => setOpen((o) => !o)} className="ml-auto text-xs font-semibold text-ocean hover:underline">
            {open ? "Hide sources" : `View ${rag.sources.length} sources`}
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 grid gap-1.5 overflow-hidden sm:grid-cols-2"
          >
            {rag.sources.map((src) => (
              <li key={src.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-2 text-xs">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink">{src.name}</span>
                  <span className="text-muted-foreground">{src.type}</span>
                </span>
                <span className="flex shrink-0 gap-1">
                  {src.wikipedia_url && (
                    <a href={src.wikipedia_url} target="_blank" rel="noreferrer" title="Wikipedia" className="rounded-full p-1.5 text-ink/60 hover:bg-ink/5 hover:text-ink">
                      <BookOpen className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {src.osm_url && (
                    <a href={src.osm_url} target="_blank" rel="noreferrer" title="OpenStreetMap" className="rounded-full p-1.5 text-ink/60 hover:bg-ink/5 hover:text-ink">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function TripHero({ trip, heroImg, hasItinerary, onShare, onDownload, downloadingPdf, onRegenerated, onStartDateChange }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const imgScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.2]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div ref={ref} className="relative flex min-h-[78vh] flex-col justify-end overflow-hidden bg-ink">
      <motion.img
        src={heroImg}
        alt={trip.city}
        style={{ y: imgY, scale: imgScale }}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/30" />

      <motion.div style={{ opacity: contentOpacity }} className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-14 pt-32 sm:px-8">
        <Link
          to={createPageUrl("MyTrips")}
          className="glass-dark group mb-8 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> My trips
        </Link>

        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`mb-4 inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_COLORS[trip.status] || STATUS_COLORS.planning}`}
            >
              {trip.status}
            </motion.span>
            <h1 className="text-4xl font-bold leading-[0.95] text-white sm:text-6xl lg:text-7xl">
              <SplitText text={trip.title} delay={0.2} />
            </h1>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6, ease: EASE }}
              className="mt-6 flex flex-wrap gap-2"
            >
              {[
                { icon: MapPin, text: trip.city },
                { icon: Calendar, text: `${trip.days} days · ${trip.month}` },
                { icon: Wallet, text: `₹${trip.budget?.toLocaleString("en-IN")} budget` },
              ].map((m) => (
                <span key={m.text} className="glass-dark flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm text-white/90">
                  <m.icon className="h-3.5 w-3.5 text-sunset" />
                  {m.text}
                </span>
              ))}
              <label
                title="Set your start date for a live weather forecast"
                className="glass-dark relative flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm text-white/90 transition hover:bg-white/20"
              >
                <CalendarDays className="h-3.5 w-3.5 text-sunset" />
                {trip.start_date
                  ? `From ${parseISODate(trip.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                  : "Add travel dates"}
                <input
                  type="date"
                  aria-label="Trip start date"
                  value={trip.start_date || ""}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.6, ease: EASE }}
            className="flex flex-wrap items-center gap-2.5"
          >
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={onShare}
              className="flex h-11 items-center gap-2 rounded-full bg-emerald-500 px-5 text-xs font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 sm:text-sm"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={onDownload}
              disabled={downloadingPdf}
              className="glass-dark flex h-11 items-center gap-2 rounded-full px-5 text-xs font-semibold text-white transition hover:bg-white/20 sm:text-sm"
            >
              {downloadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              PDF
            </motion.button>
            {hasItinerary && <RegenerateButton trip={trip} onDone={onRegenerated} />}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

export default function TripView() {
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [mainTab, setMainTab] = useState("plan"); // 'plan' | 'rearrange' | 'packing'
  const [weather, setWeather] = useState(null);
  const [swapping, setSwapping] = useState(null); // { dayIndex, period }
  const [swapError, setSwapError] = useState(null); // { dayIndex, period, message }
  const [lastSwap, setLastSwap] = useState(null); // { dayIndex, period, previous }

  // Latest trip for async handlers (swaps and geocoding can resolve after other edits).
  const tripRef = useRef(trip);
  tripRef.current = trip;

  /** Applies `fn` to the latest itinerary, updates the UI and saves to storage. */
  const mutateItinerary = useCallback((fn) => {
    const latest = tripRef.current;
    if (!latest?.itinerary) return;
    const itinerary = fn(latest.itinerary);
    const next = { ...latest, itinerary };
    tripRef.current = next;
    setTrip(next);
    voyager.entities.Trip.update(latest.id, { itinerary }).catch((err) => console.error("Failed to save itinerary:", err));
  }, []);

  const weatherKey = trip ? `${trip.city}|${trip.start_date || ""}|${trip.month}|${trip.days}` : "";
  useEffect(() => {
    if (!tripRef.current) return;
    let cancelled = false;
    setWeather(null);
    getTripWeather(tripRef.current)
      .then((w) => !cancelled && setWeather(w))
      .catch((err) => console.warn("Weather unavailable:", err));
    return () => {
      cancelled = true;
    };
  }, [weatherKey]);

  useEffect(() => {
    if (!lastSwap) return;
    const id = setTimeout(() => setLastSwap(null), 15000);
    return () => clearTimeout(id);
  }, [lastSwap]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id) {
      voyager.entities.Trip.filter({ id }).then((trips) => {
        if (trips.length > 0) {
          setTrip(trips[0]);
          setActiveDay(0);
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return <BrandLoader label="Loading trip" />;
  }

  if (!trip) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="surface max-w-md p-10 text-center">
          <p className="font-display text-3xl font-bold text-ink">Trip not found</p>
          <p className="mt-2 text-muted-foreground">This itinerary may have been deleted.</p>
          <Link
            to={createPageUrl("MyTrips")}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-sunset"
          >
            <ArrowLeft className="h-4 w-4" /> Back to My Trips
          </Link>
        </div>
      </div>
    );
  }

  const itinerary = trip.itinerary;
  const hasItinerary = itinerary?.days?.length > 0;
  const heroImg = getCityImage(trip.city);

  // Packing stats
  const packingCategories = trip.packing_list?.categories || [];
  const allPackingItems = packingCategories.flatMap((c) => c.items || []);
  const packedCount = allPackingItems.filter((i) => i.packed).length;
  const totalPackingCount = allPackingItems.length;

  const handleDownloadPdf = () => {
    setDownloadingPdf(true);
    try {
      exportTripToPdf(trip);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const visibleDays = (activeDay !== null ? [activeDay] : (itinerary?.days || []).map((_, i) => i))
    .map((dayIndex) => ({ dayIndex, day: itinerary?.days?.[dayIndex] }))
    .filter((d) => d.day);

  const dayWeather = (dayIndex) => {
    const wx = weather?.days?.[dayIndex];
    return wx ? { ...wx, hasRealDates: weather.hasRealDates } : null;
  };

  const handleSwap = async (dayIndex, period, hint) => {
    setSwapping({ dayIndex, period });
    setSwapError(null);
    try {
      const previous = tripRef.current.itinerary.days[dayIndex][period];
      const replacement = await suggestReplacement({ trip: tripRef.current, dayIndex, period, hint });
      mutateItinerary((it) => withActivity(it, dayIndex, period, replacement));
      setLastSwap({ dayIndex, period, previous });
    } catch (err) {
      console.error("Swap failed:", err);
      setSwapError({ dayIndex, period, message: err.message || "Couldn't swap — please try again." });
    } finally {
      setSwapping(null);
    }
  };

  const handleUndo = (dayIndex, period) => {
    if (!lastSwap) return;
    mutateItinerary((it) => withActivity(it, dayIndex, period, lastSwap.previous));
    setLastSwap(null);
  };

  const handleNote = (dayIndex, period, note) =>
    mutateItinerary((it) => {
      const activity = { ...it.days[dayIndex][period] };
      if (note) activity.note = note;
      else delete activity.note;
      return withActivity(it, dayIndex, period, activity);
    });

  // Saves geocoded coordinates, but only if the slot still holds the activity that was looked up.
  const handleResolveCoords = (dayIndex, period, point, activityName) =>
    mutateItinerary((it) => {
      const current = it.days[dayIndex]?.[period];
      if (!current || current.activity !== activityName) return it;
      return withActivity(it, dayIndex, period, { ...current, lat: point.lat, lng: point.lng });
    });

  const handleStartDate = async (value) => {
    const patch = value ? { start_date: value, month: MONTHS[parseISODate(value).getMonth()] } : { start_date: null };
    const updated = await voyager.entities.Trip.update(trip.id, patch);
    setTrip(updated);
  };

  const rainyDays = weather?.days?.filter((d) => d.rainy).length || 0;
  const rainyOutdoor = (itinerary?.days || []).reduce(
    (n, day, i) => n + (weather?.days?.[i]?.rainy ? PERIODS.filter((p) => isOutdoor(day[p])).length : 0),
    0
  );

  return (
    <div className="min-h-screen pb-16">
      <TripHero
        trip={trip}
        heroImg={heroImg}
        hasItinerary={hasItinerary}
        onShare={() => setShareModalOpen(true)}
        onDownload={handleDownloadPdf}
        downloadingPdf={downloadingPdf}
        onRegenerated={setTrip}
        onStartDateChange={handleStartDate}
      />

      <div className="relative z-10 mx-auto -mt-8 max-w-7xl px-4 sm:px-8">
        {/* No itinerary fallback */}
        {!hasItinerary && (
          <Reveal className="surface p-10 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sunset to-coral shadow-glow">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h3 className="mb-2 text-2xl font-semibold text-ink">Itinerary not generated yet</h3>
            <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground">
              The AI itinerary for this trip hasn't been created. This can happen if generation was interrupted. You can regenerate it now.
            </p>
            <div className="flex justify-center">
              <RegenerateButton trip={trip} onDone={setTrip} />
            </div>
          </Reveal>
        )}

        {/* Summary card */}
        {itinerary?.summary && (
          <Reveal className="surface mb-8 overflow-hidden p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sunset to-coral shadow-glow">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="eyebrow mb-2">AI summary</p>
                <p className="font-display text-lg leading-relaxed text-ink sm:text-xl">{itinerary.summary}</p>
                {trip.interests?.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {trip.interests.map((i) => (
                      <span key={i} className="chip capitalize">
                        <Tag className="h-3 w-3 text-sunset" />
                        {i}
                      </span>
                    ))}
                  </div>
                )}
                <RagProvenance rag={itinerary.rag} />
              </div>
            </div>
          </Reveal>
        )}

        {/* Main view tabs */}
        {hasItinerary && (
          <div className="mb-8 flex">
            <div className="surface inline-flex gap-1 rounded-full p-1.5">
              {[
                { id: "plan", label: "Itinerary", icon: Calendar },
                { id: "rearrange", label: "Rearrange", icon: ArrowLeftRight },
                { id: "packing", label: "Packing", icon: Luggage },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setMainTab(tab.id)}
                  className={`relative flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${mainTab === tab.id ? "text-white" : "text-ink/55 hover:text-ink"}`}
                >
                  {mainTab === tab.id && (
                    <motion.span
                      layoutId="trip-tab"
                      className="absolute inset-0 rounded-full bg-ink"
                      transition={{ type: "spring", stiffness: 400, damping: 34 }}
                    />
                  )}
                  <tab.icon className="relative h-4 w-4" />
                  <span className="relative">{tab.label}</span>
                  {tab.id === "packing" && totalPackingCount > 0 && (
                    <span
                      className={`relative rounded-full px-1.5 py-0.5 text-[10px] font-bold ${packedCount === totalPackingCount ? "bg-emerald-500 text-white" : "bg-sunset text-white"}`}
                    >
                      {packedCount}/{totalPackingCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* TAB 1: Plan View */}
          {mainTab === "plan" && (
            <motion.div
              key="plan"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="grid grid-cols-1 gap-8 lg:grid-cols-3"
            >
              {/* Left: Days */}
              <div className="space-y-6 lg:col-span-2">
                {itinerary?.days?.length > 1 && (
                  <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
                    {[...itinerary.days.map((d, i) => ({ key: i, label: `Day ${d.day}` })), { key: null, label: "All days" }].map((item) => {
                      const active = activeDay === item.key;
                      return (
                        <button
                          key={String(item.key)}
                          onClick={() => setActiveDay(item.key)}
                          className={`relative shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${active ? "text-white" : "border border-ink/[0.08] bg-white/70 text-ink/60 hover:text-ink"}`}
                        >
                          {active && (
                            <motion.span
                              initial={{ scale: 0.7, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: "spring", stiffness: 420, damping: 28 }}
                              className="absolute inset-0 rounded-full bg-gradient-to-r from-sunset to-coral shadow-glow"
                            />
                          )}
                          <span className="relative">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <AnimatePresence mode="wait">
                  <motion.div
                    key={String(activeDay)}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.35, ease: EASE }}
                    className="space-y-6"
                  >
                    {visibleDays.map(({ day, dayIndex }) => (
                      <DayCard
                        key={dayIndex}
                        day={day}
                        dayIndex={dayIndex}
                        city={trip.city}
                        wx={dayWeather(dayIndex)}
                        swappingPeriod={swapping?.dayIndex === dayIndex ? swapping.period : null}
                        swapError={swapError?.dayIndex === dayIndex ? swapError : null}
                        undoPeriod={lastSwap?.dayIndex === dayIndex ? lastSwap.period : null}
                        onSwap={handleSwap}
                        onUndo={handleUndo}
                        onNote={handleNote}
                        onResolveCoords={handleResolveCoords}
                      />
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Right: Budget breakdown & packing teaser */}
              <div className="space-y-6 lg:sticky lg:top-28 lg:self-start">
                {weather && (
                  <div className="surface p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-ink">Weather</h3>
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-ink/70">
                        {weather.days.some((d) => d.source === "forecast") ? "Live forecast" : `Typical ${trip.month}`}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {weather.days.map((wx, i) => (
                        <button key={i} onClick={() => setActiveDay(i)} className="flex shrink-0 flex-col items-center gap-1 text-[10px] font-semibold text-ink/50">
                          <WeatherBadge wx={wx} compact />
                          Day {i + 1}
                        </button>
                      ))}
                    </div>
                    {rainyDays > 0 ? (
                      <p className="mt-4 flex items-start gap-2 rounded-2xl bg-ocean/10 p-3 text-xs leading-relaxed text-ink/80">
                        <CloudRain className="mt-0.5 h-4 w-4 shrink-0 text-ocean" />
                        <span>
                          <b>{rainyDays} rainy day{rainyDays > 1 ? "s" : ""}</b>
                          {rainyOutdoor > 0 && ` · ${rainyOutdoor} outdoor plan${rainyOutdoor > 1 ? "s" : ""} affected. Look for "Swap for indoor" on those days.`}
                        </span>
                      </p>
                    ) : (
                      <p className="mt-4 text-xs text-muted-foreground">No rain expected, great for outdoor plans.</p>
                    )}
                    {!trip.start_date && (
                      <p className="mt-3 text-[11px] text-muted-foreground">
                        Showing typical weather. Add your travel dates in the header for a live forecast.
                      </p>
                    )}
                  </div>
                )}
                <BudgetBreakdown budget={itinerary?.estimated_budget} userBudget={trip.budget} />

                <div className="relative overflow-hidden rounded-3xl bg-ink p-6 text-white">
                  <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-sunset/30 blur-3xl" />
                  <div className="relative flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sunset to-coral">
                      <Luggage className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Packing for {trip.city}</h4>
                      <p className="text-xs text-white/55">
                        {totalPackingCount > 0
                          ? `${packedCount} of ${totalPackingCount} items packed`
                          : "Tailored packing checklist"}
                      </p>
                    </div>
                  </div>
                  {totalPackingCount > 0 && (
                    <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-sun to-sunset"
                        initial={{ width: 0 }}
                        animate={{ width: `${(packedCount / totalPackingCount) * 100}%` }}
                        transition={{ duration: 1, ease: EASE }}
                      />
                    </div>
                  )}
                  <button
                    onClick={() => setMainTab("packing")}
                    className="relative mt-5 w-full rounded-full bg-white py-2.5 text-sm font-semibold text-ink transition hover:bg-sunset hover:text-white"
                  >
                    {totalPackingCount > 0 ? "Open checklist" : "Generate checklist"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: Rearrange board */}
          {mainTab === "rearrange" && (
            <motion.div
              key="rearrange"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              <RearrangeBoard itinerary={itinerary} weather={weather?.days} onChange={(next) => mutateItinerary(() => next)} />
            </motion.div>
          )}

          {/* TAB 3: Packing View */}
          {mainTab === "packing" && (
            <motion.div
              key="packing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="mx-auto max-w-4xl"
            >
              <PackingChecklist trip={trip} onTripUpdate={setTrip} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Share to WhatsApp Modal */}
      <ShareTripModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        trip={trip}
      />
    </div>
  );
}
