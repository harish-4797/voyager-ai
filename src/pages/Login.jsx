import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail, MailCheck, User } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { createPageUrl } from "@/utils";
import { EASE } from "@/components/motion/primitives";
import { LogoMark, Wordmark } from "@/components/common/Brand";

const HERO_IMG = "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1200&q=80";

/** Only allow redirects to paths inside this app (prevents open-redirect links). */
function safeNext(raw) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function friendlyError(message = "") {
  if (/invalid login credentials/i.test(message)) return "Email or password is incorrect.";
  if (/email not confirmed/i.test(message)) return "Please confirm your email first — check your inbox for the link.";
  if (/already registered|already exists/i.test(message)) return "An account with this email already exists. Try signing in.";
  if (/password should be at least|weak password/i.test(message)) return "Please choose a stronger password (at least 8 characters).";
  if (/rate limit|too many/i.test(message)) return "Too many attempts. Please wait a minute and try again.";
  return message || "Something went wrong. Please try again.";
}

const COPY = {
  signin: { title: "Welcome back", subtitle: "Sign in to see your trips and keep planning." },
  signup: { title: "Create your account", subtitle: "Save itineraries, preferences and packing lists across devices." },
  forgot: { title: "Reset your password", subtitle: "We'll email you a link to choose a new one." },
  recovery: { title: "Choose a new password", subtitle: "Enter a new password for your account." },
  "check-email": { title: "Check your inbox", subtitle: "" },
};

function Field({ icon: Icon, label, type = "text", value, onChange, autoComplete, minLength, required = true, toggle }) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink/80">{label}</span>
      <span className="relative block">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
        <input
          type={isPassword && show ? "text" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          minLength={minLength}
          required={required}
          className="h-12 w-full rounded-2xl border border-ink/10 bg-white pl-11 pr-11 text-sm text-ink outline-none transition focus:border-sunset focus:ring-2 focus:ring-sunset/20"
        />
        {isPassword && toggle && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-ink/40 hover:text-ink"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </span>
    </label>
  );
}

export default function Login() {
  const { isCloud, isAuthenticated, recovery, clearRecovery, signIn, signUp, resetPassword, updatePassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const next = safeNext(params.get("next")) || createPageUrl("MyTrips");

  const [mode, setMode] = useState(params.get("reset") ? "recovery" : params.get("mode") === "signup" ? "signup" : "signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (recovery) setMode("recovery");
  }, [recovery]);

  // Already signed in → go where they were headed (except while setting a new password).
  useEffect(() => {
    if (isCloud && isAuthenticated && mode !== "recovery") navigate(next, { replace: true });
  }, [isCloud, isAuthenticated, mode, next, navigate]);

  const switchMode = (m) => {
    setMode(m);
    setError(null);
    setNotice(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signin") {
        await signIn(email.trim(), password);
      } else if (mode === "signup") {
        const data = await signUp(email.trim(), password, name.trim());
        if (!data.session) setMode("check-email"); // email confirmation required
      } else if (mode === "forgot") {
        await resetPassword(email.trim());
        setNotice("If an account exists for that email, a reset link is on its way.");
      } else if (mode === "recovery") {
        await updatePassword(password);
        clearRecovery();
        navigate(next, { replace: true });
      }
    } catch (err) {
      setError(friendlyError(err.message));
    } finally {
      setBusy(false);
    }
  };

  if (!isCloud) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4 pb-16">
        <div className="surface max-w-md p-8 text-center">
          <LogoMark className="mx-auto mb-5 h-14 w-14" />
          <h1 className="text-2xl font-bold text-ink">Accounts aren't enabled here</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This copy of VoyagerAI runs in local mode — your trips are saved in this browser. Connect Supabase to enable sign-in
            (see the README).
          </p>
          <Link to={createPageUrl("PlanTrip")} className="mt-6 inline-flex rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white hover:bg-sunset">
            Plan a trip
          </Link>
        </div>
      </div>
    );
  }

  const copy = COPY[mode];

  return (
    <div className="px-4 pb-16 sm:px-6">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] border border-ink/[0.06] bg-white shadow-lift lg:grid-cols-[1fr_1.05fr]">
        {/* Visual panel */}
        <div className="relative hidden min-h-[560px] lg:block">
          <img src={HERO_IMG} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/10" />
          <div className="relative flex h-full flex-col justify-between p-10 text-white">
            <div className="group flex items-center gap-2.5">
              <LogoMark />
              <Wordmark light />
            </div>
            <div>
              <p className="font-display text-4xl font-bold leading-tight">Your trips, everywhere you go.</p>
              <ul className="mt-6 space-y-2 text-sm text-white/80">
                {["Itineraries grounded in real places", "Synced across all your devices", "Private — only you can see your trips"].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-sunset" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Form panel */}
        <div className="p-7 sm:p-10">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              {mode === "check-email" ? (
                <div className="py-10 text-center">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-sunset to-coral shadow-glow">
                    <MailCheck className="h-8 w-8 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold text-ink">{copy.title}</h1>
                  <p className="mx-auto mt-3 max-w-sm text-muted-foreground">
                    We sent a confirmation link to <b className="text-ink">{email}</b>. Open it to activate your account, then sign in.
                  </p>
                  <button onClick={() => switchMode("signin")} className="mt-8 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white hover:bg-sunset">
                    Back to sign in
                  </button>
                </div>
              ) : (
                <>
                  {(mode === "forgot" || mode === "recovery") && (
                    <button onClick={() => switchMode("signin")} className="mb-6 flex items-center gap-1.5 text-sm font-medium text-ink/60 hover:text-ink">
                      <ArrowLeft className="h-4 w-4" /> Back to sign in
                    </button>
                  )}
                  {(mode === "signin" || mode === "signup") && (
                    <div className="mb-8 inline-flex rounded-full bg-secondary p-1">
                      {[
                        ["signin", "Sign in"],
                        ["signup", "Create account"],
                      ].map(([m, label]) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => switchMode(m)}
                          className={`rounded-full px-5 py-2 text-sm font-semibold transition ${mode === m ? "bg-ink text-white shadow-soft" : "text-ink/60 hover:text-ink"}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}

                  <h1 className="text-3xl font-bold text-ink">{copy.title}</h1>
                  <p className="mt-1.5 text-muted-foreground">{copy.subtitle}</p>

                  <form onSubmit={submit} className="mt-8 space-y-4">
                    {mode === "signup" && <Field icon={User} label="Your name" value={name} onChange={setName} autoComplete="name" />}
                    {mode !== "recovery" && <Field icon={Mail} label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />}
                    {mode !== "forgot" && (
                      <Field
                        icon={Lock}
                        label={mode === "recovery" ? "New password" : "Password"}
                        type="password"
                        value={password}
                        onChange={setPassword}
                        autoComplete={mode === "signin" ? "current-password" : "new-password"}
                        minLength={mode === "signin" ? undefined : 8}
                        toggle
                      />
                    )}
                    {mode === "signin" && (
                      <div className="text-right">
                        <button type="button" onClick={() => switchMode("forgot")} className="text-sm font-medium text-sunset hover:underline">
                          Forgot password?
                        </button>
                      </div>
                    )}

                    <AnimatePresence>
                      {(error || notice) && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          role={error ? "alert" : "status"}
                          className={`overflow-hidden rounded-2xl px-4 py-3 text-sm ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
                        >
                          {error || notice}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <button
                      type="submit"
                      disabled={busy}
                      className="btn-sunset flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold disabled:opacity-60"
                    >
                      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                      {{ signin: "Sign in", signup: "Create account", forgot: "Send reset link", recovery: "Update password" }[mode]}
                    </button>
                  </form>

                  {mode === "signup" && (
                    <p className="mt-6 text-center text-xs text-muted-foreground">
                      Your trips are private — only you can see them. Password must be at least 8 characters.
                    </p>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
