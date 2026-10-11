import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowRight, MapPin, Sparkles, Star } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { CountUp, EASE, Magnetic, SplitText } from "@/components/motion/primitives";
import { CITIES, findCity } from "@/lib/cities";

const ROTATING = ["Jaipur", "Goa", "Leh", "Udaipur", "Varanasi", "Kochi"];
const QUICK_PICKS = ["Goa", "Jaipur", "Leh", "Udaipur"];

export default function HeroSection() {
  const ref = useRef(null);
  const navigate = useNavigate();
  const [wordIndex, setWordIndex] = useState(0);
  const [hasCycled, setHasCycled] = useState(false);
  const [query, setQuery] = useState("");

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1.08, 1.25]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -140]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  useEffect(() => {
    const id = setInterval(() => {
      setHasCycled(true);
      setWordIndex((i) => (i + 1) % ROTATING.length);
    }, 2400);
    return () => clearInterval(id);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const city = findCity(query);
    navigate(createPageUrl(city ? `PlanTrip?city=${city.name}` : "PlanTrip"));
  };

  return (
    <section ref={ref} className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-ink">
      {/* Parallax background */}
      <motion.div className="absolute inset-0" style={{ y: imageY, scale: imageScale }}>
        <img
          src="https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1920&q=80"
          alt=""
          className="h-full w-full object-cover"
        />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/40 to-ink" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_20%,hsl(var(--ink)/0.6)_100%)]" />

      {/* Glow orbs */}
      <div className="absolute left-[10%] top-1/4 h-72 w-72 rounded-full bg-sunset/25 blur-[100px] animate-blob" />
      <div className="absolute bottom-1/4 right-[10%] h-80 w-80 rounded-full bg-coral/20 blur-[110px] animate-blob [animation-delay:-8s]" />

      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 pt-32 text-center sm:px-6"
      >
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
          className="glass-dark mx-auto mb-8 inline-flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-xs font-medium text-white/85 sm:text-sm"
        >
          <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-sunset to-coral px-2.5 py-1 text-[11px] font-semibold text-white">
            <Sparkles className="h-3 w-3" /> New
          </span>
          AI itineraries that fit your budget
        </motion.div>

        <h1 className="font-display text-[12vw] font-bold leading-[0.9] tracking-[-0.025em] text-white sm:text-7xl lg:text-[7rem]">
          <SplitText text="Your next escape" delay={0.35} />
          <br />
          <SplitText text="to" delay={0.55} />{" "}
          {/* Transform-only animation: animating opacity breaks background-clip:text painting in Chromium */}
          <span
            className="relative inline-grid overflow-hidden pb-[0.12em] -mb-[0.12em] text-left align-bottom"
          >
            {ROTATING.map((word, i) => {
              const previous = (wordIndex - 1 + ROTATING.length) % ROTATING.length;
              const y = i === wordIndex ? "0%" : i === previous ? "-110%" : "110%";
              return (
                <motion.span
                  key={word}
                  aria-hidden={i !== wordIndex}
                  initial={{ y: "110%" }}
                  animate={{ y }}
                  // Words returning to the waiting slot below jump there instantly instead of sweeping through view.
                  transition={y === "110%" ? { duration: 0 } : { duration: 0.8, ease: EASE, delay: hasCycled ? 0 : 0.65 }}
                  className="col-start-1 row-start-1 whitespace-nowrap pr-2 font-serif font-normal italic text-gradient-sunset"
                >
                  {word}
                </motion.span>
              );
            })}
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.8 }}
          className="mx-auto mt-8 max-w-xl text-base font-light leading-relaxed text-white/70 sm:text-lg"
        >
          Intelligent itineraries crafted by AI — budget-aware, seasonally optimised and personalised to the way you love to travel.
        </motion.p>

        {/* Search pill */}
        <motion.form
          onSubmit={handleSearch}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.95 }}
          className="glass-dark mx-auto mt-10 flex max-w-xl items-center gap-2 rounded-full p-1.5 shadow-2xl shadow-black/30"
        >
          <MapPin className="ml-4 h-5 w-5 shrink-0 text-sunset" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            list="hero-cities"
            placeholder="Where do you want to go?"
            aria-label="Destination"
            className="min-w-0 flex-1 bg-transparent py-3 text-sm text-white placeholder:text-white/50 focus:outline-none sm:text-base"
          />
          <datalist id="hero-cities">
            {CITIES.map((c) => (
              <option key={c.name} value={c.name} />
            ))}
          </datalist>
          <Magnetic strength={0.2}>
            <button
              type="submit"
              className="btn-sunset group flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold sm:px-6"
            >
              <span className="hidden sm:inline">Plan my trip</span>
              <span className="sm:hidden">Go</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </Magnetic>
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.15 }}
          className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-white/50"
        >
          <span>Popular:</span>
          {QUICK_PICKS.map((city) => (
            <Link
              key={city}
              to={createPageUrl(`PlanTrip?city=${city}`)}
              className="rounded-full border border-white/15 px-3 py-1 text-white/75 transition hover:border-sunset hover:bg-sunset/20 hover:text-white"
            >
              {city}
            </Link>
          ))}
          <Link
            to={createPageUrl("PlanTrip?surprise=1")}
            className="rounded-full border border-sunset/60 bg-sunset/20 px-3 py-1 font-semibold text-white transition hover:bg-sunset"
          >
            🎲 Surprise me
          </Link>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 1.3 }}
          className="mx-auto mt-12 grid max-w-lg grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-8"
        >
          {[
            { node: <CountUp to={50} suffix="+" />, label: "Cities" },
            { node: <CountUp to={10} suffix="K+" />, label: "Trips planned" },
            { node: <CountUp to={4.9} decimals={1} />, label: "Rating", star: true },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="flex items-center justify-center gap-1 font-display text-2xl font-bold text-white sm:text-4xl">
                {stat.node}
                {stat.star && <Star className="h-4 w-4 fill-sun text-sun" />}
              </p>
              <p className="mt-1 text-xs uppercase tracking-widest text-white/45">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        className="absolute bottom-8 right-8 z-10 hidden flex-col items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/50 sm:flex"
      >
        <div className="flex h-9 w-5 justify-center rounded-full border border-white/30 pt-1.5">
          <span className="h-2 w-1 rounded-full bg-white/80 animate-scroll-cue" />
        </div>
        Scroll
      </motion.div>
    </section>
  );
}
