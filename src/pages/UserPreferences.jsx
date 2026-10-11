import React, { useState, useEffect } from "react";
import { voyager } from "@/api/voyagerClient";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Plus, Trash2, User, Utensils, Globe, Plane, MapPin, Check, X, LogOut, Mail, BadgeCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { createPageUrl } from "@/utils";
import { AnimatePresence, motion } from "framer-motion";
import PageHeader from "@/components/common/PageHeader";
import { BrandLoader } from "@/components/common/Brand";
import { EASE, Reveal } from "@/components/motion/primitives";

const TRAVEL_STYLES = ["adventure", "luxury", "budget", "cultural", "relaxation", "foodie", "nature", "nightlife", "family", "romantic"];
const DIETARY_OPTIONS = ["vegetarian", "vegan", "gluten-free", "halal", "kosher", "nut-free", "dairy-free", "none"];
const BUDGET_RANGES = ["backpacker", "budget", "mid-range", "luxury", "ultra-luxury"];

export default function UserPreferences() {
  const { isCloud, signOut, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [prefs, setPrefs] = useState({
    full_name: "",
    travel_style: [],
    dietary_restrictions: [],
    preferred_budget_range: "mid-range",
    home_airport: "",
    avoided_activities: [],
    past_trips_summary: [],
  });
  const [newAvoidedActivity, setNewAvoidedActivity] = useState("");
  const [newTrip, setNewTrip] = useState({ city: "", country: "", month: "", year: new Date().getFullYear(), interests: [], rating: 5, notes: "" });

  useEffect(() => {
    voyager.auth.me().then((u) => {
      setUser(u);
      setPrefs({
        full_name: u.full_name || "",
        travel_style: u.travel_style || [],
        dietary_restrictions: u.dietary_restrictions || [],
        preferred_budget_range: u.preferred_budget_range || "mid-range",
        home_airport: u.home_airport || "",
        avoided_activities: u.avoided_activities || [],
        past_trips_summary: u.past_trips_summary || [],
      });
    });
  }, []);

  const toggleStyle = (style) => {
    setPrefs((p) => ({
      ...p,
      travel_style: p.travel_style.includes(style)
        ? p.travel_style.filter((s) => s !== style)
        : [...p.travel_style, style],
    }));
  };

  const toggleDietary = (d) => {
    setPrefs((p) => ({
      ...p,
      dietary_restrictions: p.dietary_restrictions.includes(d)
        ? p.dietary_restrictions.filter((s) => s !== d)
        : [...p.dietary_restrictions, d],
    }));
  };

  const addAvoidedActivity = () => {
    if (!newAvoidedActivity.trim()) return;
    setPrefs((p) => ({ ...p, avoided_activities: [...p.avoided_activities, newAvoidedActivity.trim()] }));
    setNewAvoidedActivity("");
  };

  const addPastTrip = () => {
    if (!newTrip.city) return;
    setPrefs((p) => ({ ...p, past_trips_summary: [...p.past_trips_summary, { ...newTrip }] }));
    setNewTrip({ city: "", country: "", month: "", year: new Date().getFullYear(), interests: [], rating: 5, notes: "" });
  };

  const removePastTrip = (idx) => {
    setPrefs((p) => ({ ...p, past_trips_summary: p.past_trips_summary.filter((_, i) => i !== idx) }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await voyager.auth.updateMe({ ...prefs, full_name: prefs.full_name.trim() });
      await refreshUser(); // keep the nav bar's name in sync
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err.message || "Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate(createPageUrl("Home"));
  };

  if (!user) return <BrandLoader label="Loading preferences" />;

  const chipClass = (active) =>
    `relative rounded-full border px-4 py-2 text-sm font-medium capitalize transition-colors ${active
      ? "border-ink bg-ink text-white"
      : "border-ink/10 bg-white/70 text-ink/65 hover:border-ink/30 hover:text-ink"
    }`;

  return (
    <div className="min-h-screen px-4 pb-32 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <PageHeader
          eyebrow="Profile"
          title="Your"
          accent="profile"
          subtitle="Your account and travel preferences — every itinerary gets more personal."
        />

        <Reveal className="surface mb-5 p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-sun/50 to-coral/50 font-display text-2xl font-bold text-ink">
              {(prefs.full_name || user.email || "U")[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your name</label>
              <Input
                value={prefs.full_name}
                onChange={(e) => setPrefs({ ...prefs, full_name: e.target.value })}
                placeholder="How should we greet you?"
                maxLength={60}
                className="h-11 rounded-2xl bg-white/80 text-base font-semibold"
              />
              {isCloud && (
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {user.email}</span>
                  <span className="flex items-center gap-1 text-emerald-700"><BadgeCheck className="h-3.5 w-3.5" /> Trips synced to your account</span>
                  {user.created_at && <span>Member since {new Date(user.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>}
                </p>
              )}
            </div>
            {isCloud && (
              <button
                onClick={handleSignOut}
                className="flex shrink-0 items-center gap-2 self-start rounded-full border border-ink/10 px-4 py-2.5 text-sm font-semibold text-ink/70 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 sm:self-center"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            )}
          </div>
        </Reveal>

        <div className="space-y-5">
          <Section index={1} icon={Globe} title="Travel style" hint="Pick everything that sounds like you">
            <div className="flex flex-wrap gap-2">
              {TRAVEL_STYLES.map((style) => (
                <motion.button
                  key={style}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => toggleStyle(style)}
                  className={chipClass(prefs.travel_style.includes(style))}
                >
                  {style}
                </motion.button>
              ))}
            </div>
          </Section>

          <Section index={2} icon={Utensils} title="Dietary restrictions" hint="We'll pick restaurants accordingly">
            <div className="flex flex-wrap gap-2">
              {DIETARY_OPTIONS.map((d) => (
                <motion.button
                  key={d}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => toggleDietary(d)}
                  className={chipClass(prefs.dietary_restrictions.includes(d))}
                >
                  {d}
                </motion.button>
              ))}
            </div>
          </Section>

          <Section index={3} icon={Plane} title="Travel defaults">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-muted-foreground">Default budget range</label>
                <Select value={prefs.preferred_budget_range} onValueChange={(v) => setPrefs({ ...prefs, preferred_budget_range: v })}>
                  <SelectTrigger className="h-12 rounded-2xl bg-white/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {BUDGET_RANGES.map((b) => (
                      <SelectItem key={b} value={b} className="capitalize">{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-muted-foreground">Home airport (IATA)</label>
                <Input
                  placeholder="e.g. BOM, DEL, BLR"
                  value={prefs.home_airport}
                  onChange={(e) => setPrefs({ ...prefs, home_airport: e.target.value.toUpperCase() })}
                  maxLength={3}
                  className="h-12 rounded-2xl bg-white/80 uppercase tracking-widest"
                />
              </div>
            </div>
          </Section>

          <Section index={4} icon={User} title="Activities to avoid">
            <div className="flex gap-2">
              <Input
                placeholder="e.g. crowded tourist spots, extreme sports..."
                value={newAvoidedActivity}
                onChange={(e) => setNewAvoidedActivity(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addAvoidedActivity()}
                className="h-12 rounded-2xl bg-white/80"
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                aria-label="Add activity"
                onClick={addAvoidedActivity}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ink text-white transition hover:bg-sunset"
              >
                <Plus className="h-5 w-5" />
              </motion.button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <AnimatePresence>
                {prefs.avoided_activities.map((a, i) => (
                  <motion.span
                    key={a + i}
                    layout
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    className="flex items-center gap-1.5 rounded-full bg-coral/10 py-1.5 pl-3.5 pr-1.5 text-sm text-coral"
                  >
                    {a}
                    <button
                      aria-label={`Remove ${a}`}
                      onClick={() => setPrefs((p) => ({ ...p, avoided_activities: p.avoided_activities.filter((_, j) => j !== i) }))}
                      className="flex h-6 w-6 items-center justify-center rounded-full transition hover:bg-coral hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          </Section>

          <Section index={5} icon={MapPin} title="Past trips" hint="Used to avoid repetition & improve suggestions">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="City" value={newTrip.city} onChange={(e) => setNewTrip({ ...newTrip, city: e.target.value })} className="h-11 rounded-2xl bg-white/80" />
              <Input placeholder="Country" value={newTrip.country} onChange={(e) => setNewTrip({ ...newTrip, country: e.target.value })} className="h-11 rounded-2xl bg-white/80" />
              <Input placeholder="Month (e.g. March)" value={newTrip.month} onChange={(e) => setNewTrip({ ...newTrip, month: e.target.value })} className="h-11 rounded-2xl bg-white/80" />
              <Input placeholder="Year" type="number" value={newTrip.year} onChange={(e) => setNewTrip({ ...newTrip, year: parseInt(e.target.value) })} className="h-11 rounded-2xl bg-white/80" />
              <Input placeholder="Notes (optional)" value={newTrip.notes} onChange={(e) => setNewTrip({ ...newTrip, notes: e.target.value })} className="col-span-2 h-11 rounded-2xl bg-white/80" />
            </div>
            <button
              onClick={addPastTrip}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink/15 py-3 text-sm font-semibold text-ink/70 transition hover:border-sunset hover:bg-sunset/5 hover:text-sunset"
            >
              <Plus className="h-4 w-4" /> Add past trip
            </button>
            <div className="mt-3 space-y-2">
              <AnimatePresence>
                {prefs.past_trips_summary.map((t, i) => (
                  <motion.div
                    key={`${t.city}-${t.year}-${i}`}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center justify-between rounded-2xl bg-secondary/70 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sunset">
                        <MapPin className="h-4 w-4" />
                      </span>
                      <div>
                        <span className="font-semibold text-ink">{t.city}{t.country && `, ${t.country}`}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{t.month} {t.year}</span>
                        {t.notes && <p className="mt-0.5 text-xs text-muted-foreground">{t.notes}</p>}
                      </div>
                    </div>
                    <button aria-label="Remove trip" onClick={() => removePastTrip(i)} className="rounded-full p-2 text-ink/40 transition hover:bg-red-50 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </Section>
        </div>
      </div>

      {/* Floating save bar */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.6, ease: EASE }}
        className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
      >
        <div className="flex w-full max-w-md items-center justify-between gap-3 rounded-full border border-ink/[0.07] bg-white/85 p-2 pl-6 shadow-lift backdrop-blur-xl">
          <span className={`text-sm ${saveError ? "text-red-600" : "text-muted-foreground"}`}>
            {saveError ? saveError : saved ? "All changes saved" : "Save to personalise trips"}
          </span>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-colors ${saved ? "bg-emerald-500" : "btn-sunset"}`}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={saving ? "saving" : saved ? "saved" : "idle"}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -12, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving" : saved ? "Saved!" : "Save"}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

function Section({ index, icon: Icon, title, hint = undefined, children }) {
  return (
    <Reveal className="surface p-6 sm:p-8">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sunset to-coral text-white shadow-glow">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className="ml-auto font-display text-3xl font-bold text-ink/[0.08]">{String(index).padStart(2, "0")}</span>
      </div>
      {children}
    </Reveal>
  );
}
