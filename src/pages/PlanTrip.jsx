import React, { useState, useEffect } from "react";
import { voyager } from "@/api/voyagerClient";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Slider } from "@/components/ui/slider";
import { Loader2, ArrowRight, ArrowLeft, Sparkles, MapPin, Calendar, Wallet, Heart, Check, Plane, Dices, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CitySelector from "@/components/planner/CitySelector";
import InterestPicker from "@/components/planner/InterestPicker";
import BudgetSlider from "@/components/planner/BudgetSlider";
import PageHeader from "@/components/common/PageHeader";
import { AnimatedNumber, EASE, Magnetic } from "@/components/motion/primitives";
import { generateItinerary as requestItinerary } from "@/lib/itinerary";
import { warmupEmbeddings } from "@/lib/rag/embeddings";
import { useAuth } from "@/lib/AuthContext";

// Lets a signed-out visitor finish the planner, sign in, and come back with choices intact.
const PENDING_PLAN_KEY = "voyager_pending_plan";
import { CITIES, bestSeasonMonths } from "@/lib/cities";
import { parseISODate, toISODate } from "@/lib/weather";
import SurpriseMe from "@/components/planner/SurpriseMe";
import SeasonInsight from "@/components/planner/SeasonInsight";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const STEPS = [
  { id: "city", label: "Destination", icon: MapPin },
  { id: "details", label: "Trip Details", icon: Calendar },
  { id: "budget", label: "Budget", icon: Wallet },
  { id: "interests", label: "Interests", icon: Heart },
];

export default function PlanTrip() {
  const navigate = useNavigate();
  const { isCloud, isAuthenticated } = useAuth();
  const needsLogin = isCloud && !isAuthenticated;
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [surpriseOpen, setSurpriseOpen] = useState(false);
  const [genStage, setGenStage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    city: "",
    days: 5,
    month: "April",
    budget: 15000,
    interests: [],
    start_date: "",
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const city = params.get("city");
    if (params.get("surprise")) setSurpriseOpen(true);
    if (params.get("resume")) {
      try {
        const saved = JSON.parse(sessionStorage.getItem(PENDING_PLAN_KEY));
        if (saved?.city) {
          setForm((f) => ({ ...f, ...saved }));
          setStep(3);
        }
      } catch {
        /* nothing to resume */
      }
      sessionStorage.removeItem(PENDING_PLAN_KEY);
    }
    if (city) setForm((f) => ({ ...f, city }));
    // Start downloading the embedding model in the background so it's ready by "Generate".
    const warm = setTimeout(warmupEmbeddings, 1500);
    return () => clearTimeout(warm);
  }, []);

  const canProceed = () => {
    if (step === 0) return !!form.city;
    if (step === 1) return form.days > 0 && !!form.month;
    if (step === 2) return form.budget >= 1000;
    if (step === 3) return form.interests.length > 0;
    return true;
  };

  const generateItinerary = async () => {
    if (needsLogin) {
      sessionStorage.setItem(PENDING_PLAN_KEY, JSON.stringify(form));
      navigate(`${createPageUrl("Login")}?next=${encodeURIComponent(`${createPageUrl("PlanTrip")}?resume=1`)}`);
      return;
    }
    setLoading(true);
    setError(null);
    setGenStage(null);

    try {
      const result = await requestItinerary({ ...form, onStage: (key, info) => setGenStage({ key, info }) });

      const trip = await voyager.entities.Trip.create({
        title: `${form.days}-Day ${form.city} Adventure`,
        city: form.city,
        days: form.days,
        budget: form.budget,
        month: form.month,
        interests: form.interests,
        ...(form.start_date ? { start_date: form.start_date } : {}),
        status: "planning",
        itinerary: result,
      });

      setLoading(false);
      navigate(createPageUrl(`TripView?id=${trip.id}`));
    } catch (err) {
      setLoading(false);
      setError(err.message || "Failed to generate itinerary. Please check your API key.");
      console.error("Itinerary generation error:", err);
    }
  };

  const bestMonths = bestSeasonMonths(CITIES.find((c) => c.name === form.city));

  // Picking a different month clears a start date that no longer matches it.
  const pickMonth = (month) =>
    setForm((f) => ({
      ...f,
      month,
      start_date: f.start_date && MONTHS[parseISODate(f.start_date).getMonth()] !== month ? "" : f.start_date,
    }));

  const pickStartDate = (value) =>
    setForm((f) => ({ ...f, start_date: value, month: value ? MONTHS[parseISODate(value).getMonth()] : f.month }));

  const acceptSurprise = (pick, settings) => {
    setForm((f) => ({
      ...f,
      city: pick.city.name,
      month: MONTHS[settings.monthIndex],
      days: settings.days,
      budget: settings.budget,
      start_date: "",
    }));
    setSurpriseOpen(false);
    setDirection(1);
    setStep(3);
  };

  const goTo = (next) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  return (
    <div className="min-h-screen px-4 pb-20 sm:px-6">
      <AnimatePresence>{loading && <GeneratingOverlay form={form} stage={genStage} />}</AnimatePresence>
      <SurpriseMe open={surpriseOpen} onOpenChange={setSurpriseOpen} initial={form} onAccept={acceptSurprise} />

      <div className="mx-auto max-w-5xl">
        <PageHeader
          eyebrow={`Step ${step + 1} of ${STEPS.length}`}
          title="Plan your"
          accent="trip"
          subtitle="Four quick questions — our AI handles everything else."
        />

        {/* Stepper */}
        <div className="surface mb-6 p-2">
          <div className="grid grid-cols-4 gap-1">
            {STEPS.map((s, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={i > step}
                  onClick={() => done && goTo(i)}
                  className="relative flex items-center justify-center gap-2 rounded-2xl px-2 py-3 text-sm font-medium disabled:cursor-default"
                >
                  {active && (
                    <motion.span
                      layoutId="plan-step"
                      className="absolute inset-0 rounded-2xl bg-ink"
                      transition={{ type: "spring", stiffness: 380, damping: 34 }}
                    />
                  )}
                  <span
                    className={`relative flex h-8 w-8 items-center justify-center rounded-full transition-colors ${active
                      ? "bg-gradient-to-br from-sunset to-coral text-white"
                      : done
                        ? "bg-sunset/15 text-sunset"
                        : "bg-secondary text-ink/35"
                      }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                  </span>
                  <span className={`relative hidden md:inline ${active ? "text-white" : done ? "text-ink" : "text-ink/40"}`}>
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mx-2 mt-2 h-1 overflow-hidden rounded-full bg-secondary">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-sun via-sunset to-coral"
              animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
              transition={{ duration: 0.7, ease: EASE }}
            />
          </div>
        </div>

        {/* Live summary of choices */}
        <div className="mb-8 flex min-h-[32px] flex-wrap gap-2">
          <AnimatePresence>
            {[
              form.city && { key: "city", icon: MapPin, text: form.city },
              step >= 1 && { key: "when", icon: Calendar, text: `${form.days} days · ${form.month}` },
              step >= 2 && { key: "budget", icon: Wallet, text: `₹${form.budget.toLocaleString("en-IN")}` },
              form.interests.length > 0 && { key: "interests", icon: Heart, text: `${form.interests.length} interest${form.interests.length > 1 ? "s" : ""}` },
            ]
              .filter(Boolean)
              .map((chip) => (
                <motion.span
                  key={chip.key}
                  layout
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="chip"
                >
                  <chip.icon className="h-3 w-3 text-sunset" />
                  {chip.text}
                </motion.span>
              ))}
          </AnimatePresence>
        </div>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="rounded-2xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-700 backdrop-blur">
                <p className="mb-1 font-semibold">Error generating itinerary</p>
                <p>{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step content */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: direction * 60, filter: "blur(6px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: direction * -60, filter: "blur(6px)" }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-3xl font-bold text-ink sm:text-4xl">{STEP_COPY[step].title}</h2>
                <p className="mt-1 text-muted-foreground">{STEP_COPY[step].subtitle}</p>
              </div>
              {step === 0 && (
                <motion.button
                  type="button"
                  whileHover={{ rotate: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSurpriseOpen(true)}
                  className="group flex shrink-0 items-center gap-2 self-start rounded-full border-2 border-dashed border-sunset/50 px-5 py-2.5 text-sm font-semibold text-sunset transition hover:border-sunset hover:bg-sunset hover:text-white sm:self-auto"
                >
                  <Dices className="h-4 w-4 transition-transform duration-500 group-hover:rotate-180" />
                  Surprise me
                </motion.button>
              )}
            </div>

            {step === 0 && (
              <CitySelector selected={form.city} onChange={(c) => setForm({ ...form, city: c })} />
            )}

            {step === 1 && (
              <div className="surface space-y-10 p-6 sm:p-10">
                <div>
                  <div className="mb-6 flex items-end justify-between">
                    <label className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Duration</label>
                    <p className="font-display text-5xl font-bold text-ink">
                      <AnimatedNumber value={form.days} />
                      <span className="ml-2 font-serif text-2xl font-normal italic text-sunset">
                        {form.days === 1 ? "day" : "days"}
                      </span>
                    </p>
                  </div>
                  <Slider
                    value={[form.days]}
                    onValueChange={([v]) => setForm({ ...form, days: v })}
                    min={1}
                    max={14}
                    step={1}
                  />
                  <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                    <span>1 day</span>
                    <span>14 days</span>
                  </div>
                </div>
                <div>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <label className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Travel month</label>
                    {bestMonths.length > 0 && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" /> Best season for {form.city}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {MONTHS.map((m, i) => {
                      const active = form.month === m;
                      return (
                        <motion.button
                          key={m}
                          type="button"
                          whileTap={{ scale: 0.94 }}
                          onClick={() => pickMonth(m)}
                          className={`relative rounded-2xl px-3 py-3 text-sm font-medium transition-colors ${active ? "text-white" : "bg-secondary/70 text-ink/70 hover:bg-secondary hover:text-ink"}`}
                        >
                          {active && (
                            <motion.span
                              initial={{ scale: 0.6, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: "spring", stiffness: 420, damping: 28 }}
                              className="absolute inset-0 rounded-2xl bg-ink"
                            />
                          )}
                          <span className="relative">{m.slice(0, 3)}</span>
                          {bestMonths.includes(i) && (
                            <span className={`absolute right-2 top-2 h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-300" : "bg-emerald-500"}`} />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                <SeasonInsight cityName={form.city} month={form.month} onPickMonth={pickMonth} />

                <div>
                  <label className="mb-3 block text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                    Start date <span className="font-normal normal-case tracking-normal">(optional)</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="date"
                      min={toISODate(new Date())}
                      value={form.start_date}
                      onChange={(e) => pickStartDate(e.target.value)}
                      className="h-12 rounded-2xl border border-ink/10 bg-white px-4 text-sm text-ink outline-none transition focus:border-sunset focus:ring-2 focus:ring-sunset/20"
                    />
                    {form.start_date && (
                      <button
                        type="button"
                        onClick={() => pickStartDate("")}
                        className="flex items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold text-ink/60 hover:bg-ink/5"
                      >
                        <X className="h-3.5 w-3.5" /> Clear
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Add exact dates to get a live weather forecast for trips in the next 16 days. Otherwise we show typical weather.
                  </p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="surface p-6 sm:p-10">
                <BudgetSlider value={form.budget} onChange={(v) => setForm({ ...form, budget: v })} />
              </div>
            )}

            {step === 3 && (
              <InterestPicker
                selected={form.interests}
                onChange={(v) => setForm({ ...form, interests: v })}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="mt-10 flex items-center justify-between">
          <button
            type="button"
            onClick={() => goTo(step - 1)}
            disabled={step === 0}
            className="group flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-ink/70 transition hover:bg-ink/5 hover:text-ink disabled:pointer-events-none disabled:opacity-0"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back
          </button>

          {step < STEPS.length - 1 ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => goTo(step + 1)}
              disabled={!canProceed()}
              className="group flex items-center gap-2 rounded-full bg-ink px-8 py-3.5 text-sm font-semibold text-white shadow-lift transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </motion.button>
          ) : (
            <Magnetic>
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={generateItinerary}
                disabled={!canProceed() || loading}
                className="btn-sunset flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? "Generating your trip..." : needsLogin ? "Sign in to generate" : "Generate itinerary"}
              </motion.button>
            </Magnetic>
          )}
        </div>
      </div>
    </div>
  );
}

const STEP_COPY = [
  { title: "Where do you want to go?", subtitle: "Pick the city that's been calling your name." },
  { title: "When and for how long?", subtitle: "We'll factor in the season, weather and local events." },
  { title: "What's your budget?", subtitle: "Every rupee is allocated across stay, food, travel and sights." },
  { title: "What do you love?", subtitle: "Choose at least one — the more you pick, the more personal it gets." },
];

// Real RAG pipeline stages, reported by generateItinerary's onStage callback.
const PIPELINE = [
  { key: "retrieve", short: "Retrieve", text: (f) => `Retrieving real places in ${f.city} from Wikipedia & OpenStreetMap…` },
  {
    key: "embed",
    short: "Embed",
    text: (f, i) => (i?.firstTime ? "Loading the embedding model (first time only)…" : `Embedding ${i?.count ?? ""} places for semantic search…`),
  },
  {
    key: "rank",
    short: "Rank",
    text: (f, i) => `${i?.hybrid ? "Hybrid-ranking" : "Ranking"} ${i?.count ?? ""} places for ${f.interests.slice(0, 2).join(" & ") || "you"}…`,
  },
  { key: "enrich", short: "Enrich", text: () => "Reading Wikipedia notes on the top picks…" },
  { key: "weather", short: "Weather", text: (f) => `Checking ${f.month} weather for your dates…` },
  { key: "generate", short: "Generate", text: () => "Writing your day-by-day plan with AI…" },
  { key: "ground", short: "Verify", text: () => "Verifying every stop against real places…" },
];

function GeneratingOverlay({ form, stage }) {
  const index = Math.max(0, PIPELINE.findIndex((p) => p.key === stage?.key));
  const current = PIPELINE[index];

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-ink/95 px-6 text-center backdrop-blur-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute left-1/4 top-1/4 h-80 w-80 rounded-full bg-sunset/25 blur-[120px] animate-blob" />
      <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-coral/20 blur-[120px] animate-blob [animation-delay:-6s]" />

      <div className="relative mb-12 h-48 w-48">
        {[0, 1, 2].map((ring) => (
          <motion.div
            key={ring}
            className="absolute rounded-full border border-white/10"
            style={{ inset: ring * 22 }}
            animate={{ rotate: ring % 2 ? -360 : 360 }}
            transition={{ duration: 10 + ring * 4, repeat: Infinity, ease: "linear" }}
          >
            <span
              className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full"
              style={{ background: ["#FFB627", "#FF6A2B", "#F0476A"][ring] }}
            />
          </motion.div>
        ))}
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute -top-4 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-white shadow-glow">
            <Plane className="h-4 w-4 rotate-90 text-sunset" />
          </div>
        </motion.div>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.img
            src="/logo-icon.png"
            alt=""
            className="h-16 w-16 rounded-2xl"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>

      <p className="relative mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-sunset">RAG pipeline · step {index + 1} of {PIPELINE.length}</p>
      <div className="relative h-10 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="font-display text-2xl font-semibold text-white sm:text-3xl"
          >
            {current.text(form, stage?.info)}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="relative mt-8 flex gap-2">
        {PIPELINE.map((step, i) => (
          <div key={step.key} className="flex flex-col items-center gap-2">
            <motion.span
              className="h-1.5 rounded-full"
              initial={false}
              animate={{ width: i === index ? 40 : 18, backgroundColor: i <= index ? "#FF6A2B" : "rgba(255,255,255,0.2)" }}
              transition={{ duration: 0.5 }}
            />
            <span className={`text-[10px] font-semibold uppercase tracking-widest ${i <= index ? "text-white/80" : "text-white/30"}`}>
              {step.short}
            </span>
          </div>
        ))}
      </div>
      <p className="relative mt-10 text-sm text-white/40">This usually takes 15–40 seconds</p>
    </motion.div>
  );
}
