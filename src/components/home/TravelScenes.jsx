import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  AnimatePresence, motion, useInView, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform,
} from "framer-motion";
import {
  Backpack, Bus, Camera, Cloud, Compass, Glasses, IdCard, Map as MapIcon, MapPin, Plane,
  Sailboat, Smartphone, Ticket, TrainFront,
} from "lucide-react";
import { EASE } from "@/components/motion/primitives";

/*
 * Scroll-driven travel scenes for the landing page. Every vehicle's position is tied
 * to the scroll progress of its own section, so scrolling literally moves the journey.
 */

const INK = "#12141F";
const INK_SOFT = "#2B2525";
const SUNSET = "#FF6A2B";
const ORANGE = "#FF8A3D";
const CORAL = "#F0476A";
const SUN = "#FFB627";
const OCEAN = "#127F8C";
const CREAM = "#FFF3E6";
const PEACH = "#FFD9B3";
const GLASS = "#9ADBE3";

const MODES = [
  { id: "air", label: "By air", icon: Plane },
  { id: "rail", label: "By rail", icon: TrainFront },
  { id: "road", label: "By road", icon: Bus },
  { id: "pack", label: "Pack smart", icon: Backpack },
  { id: "sea", label: "Sea & sky", icon: Sailboat },
];

/* ------------------------------------------------------------------ */
/* Journey tracker                                                     */
/* ------------------------------------------------------------------ */

const JourneyContext = createContext(null);

/** Wrap the landing page; shows a floating tracker of the current travel mode. */
export function JourneyProvider({ children }) {
  const [mode, setMode] = useState(null);
  return (
    <JourneyContext.Provider value={setMode}>
      {children}
      <JourneyTracker mode={mode} />
    </JourneyContext.Provider>
  );
}

function JourneyTracker({ mode }) {
  const { scrollYProgress } = useScroll();
  const activeIndex = MODES.findIndex((m) => m.id === mode);
  const active = MODES[activeIndex];

  return (
    <div className="pointer-events-none fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 lg:block">
      <AnimatePresence>
        {active && (
          <motion.aside
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="flex flex-col items-center gap-3"
          >
            <div className="surface flex flex-col items-center gap-2 rounded-full px-1.5 py-2.5">
              {MODES.map((m, i) => (
                <motion.div
                  key={m.id}
                  animate={{ scale: i === activeIndex ? 1 : 0.82 }}
                  className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-300 ${i === activeIndex ? "bg-ink text-white" : i < activeIndex ? "bg-sunset/15 text-sunset" : "text-ink/30"}`}
                >
                  {i === activeIndex && (
                    <motion.span
                      initial={{ scale: 1.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 380, damping: 26 }}
                      className="absolute -inset-1 rounded-full border-2 border-sunset"
                    />
                  )}
                  <m.icon className="h-4 w-4" />
                </motion.div>
              ))}
              <div className="mt-1 h-14 w-1 overflow-hidden rounded-full bg-ink/10">
                <motion.div style={{ scaleY: scrollYProgress }} className="h-full w-full origin-top bg-gradient-to-b from-sun to-coral" />
              </div>
            </div>
            <AnimatePresence mode="wait">
              <motion.span
                key={active.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="rounded-full bg-ink px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white"
              >
                {active.label}
              </motion.span>
            </AnimatePresence>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Registers a scene with the tracker and returns its smoothed scroll progress (0 → 1 while passing). */
function useScene(mode) {
  const ref = useRef(null);
  const setMode = useContext(JourneyContext);
  const inView = useInView(ref, { amount: 0.4 });
  useEffect(() => {
    if (inView && setMode) setMode(mode);
  }, [inView, mode, setMode]);
  const raw = useSectionProgress(ref);
  const progress = useSpring(raw, { stiffness: 120, damping: 28, restDelta: 0.0005 });
  return { ref, progress };
}

/**
 * 0 when the section's top enters the bottom of the viewport, 1 when its bottom leaves the top.
 * Reads the live bounding box on every scroll, so it stays correct when content above
 * changes height (e.g. the pinned city gallery measuring itself after mount).
 */
function useSectionProgress(ref) {
  const { scrollY } = useScroll();
  const progress = useMotionValue(0);
  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;
    progress.set(Math.min(1, Math.max(0, (vh - rect.top) / (rect.height + vh))));
  }, [ref, progress]);
  useMotionValueEvent(scrollY, "change", update);
  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);
  return progress;
}

function SceneCaption({ index, kicker, title, centered = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.7, ease: EASE }}
      className={`relative z-20 mx-auto max-w-6xl px-5 sm:px-6 ${centered ? "text-center" : ""}`}
    >
      <p className="eyebrow">
        <span className="h-px w-8 bg-sunset" />
        {index} · {kicker}
      </p>
      <h3 className={`mt-3 max-w-md text-2xl font-bold leading-tight text-ink sm:text-4xl ${centered ? "mx-auto" : ""}`}>{title}</h3>
    </motion.div>
  );
}

/** Rotating wheel; spins around its own centre. */
function Wheel({ cx, cy, r, rotate }) {
  return (
    <motion.g style={{ rotate, transformBox: "fill-box", transformOrigin: "center" }}>
      <circle cx={cx} cy={cy} r={r} fill={INK} />
      <circle cx={cx} cy={cy} r={r * 0.5} fill={PEACH} />
      <rect x={cx - 1.2} y={cy - r * 0.85} width="2.4" height={r * 1.7} rx="1.2" fill={INK} />
      <rect x={cx - r * 0.85} y={cy - 1.2} width={r * 1.7} height="2.4" rx="1.2" fill={INK} />
    </motion.g>
  );
}

/* ------------------------------------------------------------------ */
/* 01 · Flight                                                         */
/* ------------------------------------------------------------------ */

// Flight path as a cubic Bézier in normalised (0–1) stage coordinates.
const P = [[0.06, 0.8], [0.3, 1.05], [0.58, -0.05], [0.94, 0.2]];
const bez = (t, i) => {
  const u = 1 - t;
  return u * u * u * P[0][i] + 3 * u * u * t * P[1][i] + 3 * u * t * t * P[2][i] + t * t * t * P[3][i];
};
const bezSlope = (t, i) => {
  const u = 1 - t;
  return 3 * u * u * (P[1][i] - P[0][i]) + 6 * u * t * (P[2][i] - P[1][i]) + 3 * t * t * (P[3][i] - P[2][i]);
};
const TRAIL = Array.from({ length: 44 }, (_, i) => i / 43);
const CLOUDS = [
  { top: "4%", left: "8%", size: 120, drift: -160 },
  { top: "18%", left: "62%", size: 90, drift: -260 },
  { top: "55%", left: "38%", size: 70, drift: -120 },
  { top: "68%", left: "80%", size: 110, drift: -220 },
  { top: "30%", left: "88%", size: 60, drift: -90 },
];

function PlaneArt() {
  return (
    <svg viewBox="0 0 120 50" className="w-full drop-shadow-[0_12px_14px_rgba(18,20,31,0.28)]">
      <path d="M58 21 L68 21 L60 7 L53 7 Z" fill={ORANGE} />
      <path d="M10 25 L4 7 L16 7 L30 21 Z" fill={SUNSET} />
      <path d="M8 27 C8 22 14 20 24 20 L94 20 C106 20 114 23 118 27 C114 31 106 33 94 33 L24 33 C14 33 8 31 8 27 Z" fill={INK} />
      <path d="M22 29.5 L104 29.5" stroke={SUNSET} strokeWidth="2" />
      {[34, 42, 50, 58, 66, 74, 82, 90].map((x) => (
        <circle key={x} cx={x} cy="24.5" r="1.6" fill={PEACH} />
      ))}
      <path d="M103 22 C108 22.5 112 24 114 26 L103 26 Z" fill={GLASS} />
      <path d="M50 28 L72 28 L58 46 L47 46 Z" fill={CORAL} />
      <path d="M10 28 L2 34 L12 34 L20 30 Z" fill={SUNSET} />
    </svg>
  );
}

function TrailDot({ at, t }) {
  const opacity = useTransform(t, [at - 0.03, at], [0.15, 1]);
  const scale = useTransform(t, [at - 0.03, at], [0.5, 1]);
  return (
    <motion.span
      style={{ left: `${bez(at, 0) * 100}%`, top: `${bez(at, 1) * 100}%`, opacity, scale, x: "-50%", y: "-50%" }}
      className="absolute h-1.5 w-1.5 rounded-full bg-sunset"
    />
  );
}

function DriftingCloud({ cloud, progress }) {
  const x = useTransform(progress, [0, 1], [0, cloud.drift]);
  return (
    <motion.div style={{ x, top: cloud.top, left: cloud.left }} className="absolute">
      <Cloud
        fill="white"
        strokeWidth={0}
        style={{ width: cloud.size, height: cloud.size }}
        className="drop-shadow-[0_8px_16px_rgba(18,20,31,0.08)]"
      />
    </motion.div>
  );
}

export function FlightScene() {
  const { ref, progress } = useScene("air");
  const stageRef = useRef(null);
  const aspect = useRef(2.5);

  useEffect(() => {
    const el = stageRef.current;
    const measure = () => {
      aspect.current = el.offsetWidth / Math.max(1, el.offsetHeight);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const t = useTransform(progress, [0.2, 0.72], [0, 1]);
  const left = useTransform(t, (v) => `${bez(v, 0) * 100}%`);
  const top = useTransform(t, (v) => `${bez(v, 1) * 100}%`);
  // Bank the plane along the curve; slope is corrected for the stage's aspect ratio.
  const rotate = useTransform(t, (v) => (Math.atan2(bezSlope(v, 1), bezSlope(v, 0) * aspect.current) * 180) / Math.PI);
  const scale = useTransform(t, [0, 0.5, 1], [0.8, 1.15, 0.9]);
  const pinScale = useTransform(t, [0.9, 1], [0, 1]);

  return (
    <section ref={ref} className="relative overflow-hidden bg-gradient-to-b from-[#FCE9DC] via-background to-background pb-10 pt-24">
      <SceneCaption index="01" kicker="By air" title="Take off in minutes, not hours of planning" />
      <div ref={stageRef} className="relative mx-auto mt-6 h-[44vh] min-h-[280px] max-w-6xl">
        {CLOUDS.map((c, i) => (
          <DriftingCloud key={i} cloud={c} progress={progress} />
        ))}
        {TRAIL.map((at) => (
          <TrailDot key={at} at={at} t={t} />
        ))}

        <div className="absolute flex -translate-x-1/2 -translate-y-full flex-col items-center" style={{ left: "6%", top: "80%" }}>
          <span className="mb-1 rounded-full bg-ink px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white">Home</span>
          <MapPin className="h-7 w-7 fill-ink text-white" />
        </div>
        <div className="absolute -translate-x-1/2 -translate-y-full" style={{ left: "94%", top: "20%" }}>
          <motion.div style={{ scale: pinScale }} className="flex origin-bottom flex-col items-center">
            <span className="mb-1 rounded-full bg-sunset px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white">Goa</span>
            <MapPin className="h-8 w-8 fill-sunset text-white" />
          </motion.div>
        </div>

        <motion.div style={{ left, top, rotate, scale, x: "-50%", y: "-50%" }} className="absolute z-10 w-24 sm:w-36">
          <PlaneArt />
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 02 · Train                                                          */
/* ------------------------------------------------------------------ */

function Carriage({ x, color, wheel }) {
  return (
    <g>
      <rect x={x + 6} y="22" width="163" height="12" rx="6" fill={INK} />
      <rect x={x} y="30" width="175" height="62" rx="10" fill={color} />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={x + 16 + i * 40} y="42" width="28" height="22" rx="4" fill={CREAM} />
      ))}
      <rect x={x} y="76" width="175" height="5" fill="white" opacity="0.45" />
      <Wheel cx={x + 35} cy={100} r={12} rotate={wheel} />
      <Wheel cx={x + 140} cy={100} r={12} rotate={wheel} />
    </g>
  );
}

function TrainArt({ wheel }) {
  return (
    <svg viewBox="0 0 562 115" className="w-full drop-shadow-[0_14px_16px_rgba(18,20,31,0.2)]">
      <rect x="170" y="80" width="30" height="4" fill={INK} />
      <rect x="365" y="80" width="20" height="4" fill={INK} />
      <Carriage x={0} color={CORAL} wheel={wheel} />
      <Carriage x={195} color={SUNSET} wheel={wheel} />
      {/* Engine */}
      <path d="M380 40 L500 40 Q548 40 555 80 L555 95 L380 95 Z" fill={INK} />
      <rect x="380" y="18" width="62" height="77" rx="8" fill={INK} />
      <rect x="392" y="30" width="38" height="24" rx="4" fill={GLASS} />
      <rect x="380" y="72" width="175" height="6" fill={SUNSET} />
      <rect x="470" y="16" width="18" height="26" fill={INK_SOFT} />
      <rect x="466" y="11" width="26" height="7" rx="2" fill={INK_SOFT} />
      <circle cx="548" cy="64" r="5" fill={SUN} />
      <path d="M540 95 L562 110 L516 110 Z" fill={SUNSET} />
      <Wheel cx={410} cy={100} r={12} rotate={wheel} />
      <Wheel cx={466} cy={100} r={12} rotate={wheel} />
      <Wheel cx={520} cy={102} r={10} rotate={wheel} />
    </svg>
  );
}

export function TrainScene() {
  const { ref, progress } = useScene("rail");
  const left = useTransform(progress, [0.1, 0.9], ["-80%", "105%"]);
  const wheel = useTransform(progress, [0, 1], [0, 2520]);
  const hillsFar = useTransform(progress, [0, 1], ["0%", "-12%"]);
  const hillsNear = useTransform(progress, [0, 1], ["0%", "-28%"]);
  const sunY = useTransform(progress, [0, 1], [-20, 110]);
  const sleepers = useTransform(progress, [0, 1], ["0px", "-180px"]);

  return (
    <section ref={ref} className="relative overflow-hidden bg-gradient-to-b from-background to-[#FBE3D3] pt-24">
      <SceneCaption index="02" kicker="By rail" title="Scenic routes, perfectly timed" />
      <div className="relative mt-6 h-[300px] sm:h-[360px]">
        <motion.div
          style={{ y: sunY }}
          className="absolute right-[14%] top-6 h-24 w-24 rounded-full bg-gradient-to-b from-sun to-sunset opacity-80 blur-[1px] sm:h-32 sm:w-32"
        />
        <motion.svg style={{ x: hillsFar }} viewBox="0 0 1400 200" preserveAspectRatio="none" className="absolute bottom-14 left-0 h-40 w-[140%]">
          <path d="M0 200 L0 110 Q120 30 260 100 T560 80 T860 105 T1160 60 T1400 95 L1400 200 Z" fill="#F4C7AE" />
        </motion.svg>
        <motion.svg style={{ x: hillsNear }} viewBox="0 0 1400 200" preserveAspectRatio="none" className="absolute bottom-10 left-0 h-28 w-[160%]">
          <path d="M0 200 L0 130 Q160 60 320 120 T640 110 T960 130 T1280 90 T1400 120 L1400 200 Z" fill="#E9A07F" />
        </motion.svg>

        {/* Track */}
        <div className="absolute inset-x-0 bottom-0 h-10 bg-[#2B2525]" />
        <motion.div
          style={{
            backgroundPositionX: sleepers,
            backgroundImage: `repeating-linear-gradient(90deg, ${INK_SOFT} 0 8px, transparent 8px 30px)`,
          }}
          className="absolute inset-x-0 bottom-8 h-3 bg-[#C98A6B]"
        />
        <div className="absolute inset-x-0 bottom-[42px] h-1.5 rounded-full bg-ink" />

        {/* Train */}
        <motion.div style={{ left }} className="absolute bottom-[44px] w-[400px] sm:w-[560px]">
          <div className="absolute left-[85.5%] top-[6%]">
            {[0, 0.6, 1.2].map((delay) => (
              <span
                key={delay}
                className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-white/90 animate-steam"
                style={{ animationDelay: `${delay}s` }}
              />
            ))}
          </div>
          <TrainArt wheel={wheel} />
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 03 · Bus                                                            */
/* ------------------------------------------------------------------ */

function BusArt({ wheel }) {
  return (
    <svg viewBox="0 0 262 120" className="w-full drop-shadow-[0_14px_16px_rgba(18,20,31,0.22)]">
      {/* Luggage on the roof rack */}
      <rect x="40" y="6" width="34" height="16" rx="3" fill={CORAL} />
      <rect x="80" y="2" width="28" height="20" rx="3" fill={OCEAN} />
      <rect x="114" y="9" width="32" height="13" rx="6" fill={ORANGE} />
      <rect x="30" y="20" width="130" height="3" rx="1.5" fill={INK_SOFT} />
      {/* Body */}
      <path d="M10 32 Q10 24 20 24 L220 24 Q246 24 252 52 L256 92 Q256 100 248 100 L18 100 Q10 100 10 92 Z" fill={SUN} />
      <rect x="10" y="76" width="246" height="8" fill={SUNSET} />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <rect x={22 + i * 36} y="34" width="28" height="26" rx="4" fill={INK} opacity="0.88" />
          <rect x={25 + i * 36} y="37" width="8" height="12" rx="2" fill="white" opacity="0.25" />
        </g>
      ))}
      <rect x="198" y="34" width="14" height="56" rx="3" fill={INK} opacity="0.85" />
      <path d="M216 32 L238 32 Q248 36 250 60 L216 60 Z" fill={GLASS} />
      <circle cx="251" cy="86" r="4" fill={CREAM} />
      <rect x="248" y="92" width="12" height="6" rx="2" fill={INK_SOFT} />
      <Wheel cx={60} cy={102} r={15} rotate={wheel} />
      <Wheel cx={204} cy={102} r={15} rotate={wheel} />
    </svg>
  );
}

function Tree({ pine, scale = 1, color }) {
  return (
    <svg viewBox="0 0 60 100" style={{ width: 60 * scale }} className="shrink-0">
      <rect x="27" y="62" width="6" height="38" fill={INK_SOFT} />
      {pine ? (
        <path d="M30 2 L54 70 L6 70 Z" fill={color} />
      ) : (
        <circle cx="30" cy="40" r="26" fill={color} />
      )}
    </svg>
  );
}

export function BusScene() {
  const { ref, progress } = useScene("road");
  const left = useTransform(progress, [0.1, 0.9], ["-40%", "105%"]);
  const wheel = useTransform(progress, [0, 1], [0, 2160]);
  const bounce = useTransform(progress, (v) => Math.sin(v * 90) * 2.5);
  const dashes = useTransform(progress, [0, 1], ["0px", "-720px"]);
  const trees = useTransform(progress, [0, 1], ["0%", "-22%"]);

  return (
    <section ref={ref} className="relative overflow-hidden pt-24">
      <SceneCaption index="03" kicker="By road" title="Every stop on the route, sorted" />
      <div className="relative mt-6 h-[260px] sm:h-[300px]">
        <motion.div style={{ x: trees }} className="absolute bottom-[86px] left-0 flex w-[150%] items-end gap-6 sm:gap-10">
          {Array.from({ length: 22 }, (_, i) => (
            <Tree key={i} pine={i % 3 !== 1} scale={0.7 + ((i * 37) % 5) * 0.12} color={i % 2 ? OCEAN : "#0E6670"} />
          ))}
        </motion.div>
        {/* Milestone sign */}
        <div className="absolute bottom-[86px] right-[10%] z-10 flex flex-col items-center">
          <span className="rounded-md bg-ocean px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-soft">Goa · 42 km</span>
          <span className="h-8 w-1 bg-ink/70" />
        </div>

        {/* Road */}
        <div className="absolute inset-x-0 bottom-0 h-[88px] bg-ink" />
        <div className="absolute inset-x-0 bottom-[84px] h-1 bg-white/20" />
        <motion.div
          style={{
            backgroundPositionX: dashes,
            backgroundImage: `repeating-linear-gradient(90deg, ${SUN} 0 40px, transparent 40px 80px)`,
          }}
          className="absolute inset-x-0 bottom-[42px] h-1"
        />

        <motion.div style={{ left, y: bounce }} className="absolute bottom-[48px] z-10 w-[200px] sm:w-[262px]">
          <BusArt wheel={wheel} />
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 04 · Backpack                                                       */
/* ------------------------------------------------------------------ */

const PACK_ITEMS = [
  { icon: Camera, label: "Camera" },
  { icon: MapIcon, label: "Offline map" },
  { icon: IdCard, label: "Passport" },
  { icon: Ticket, label: "Tickets" },
  { icon: Compass, label: "Compass" },
  { icon: Glasses, label: "Shades" },
  { icon: Smartphone, label: "Power bank" },
];

function BackpackArt({ flapY, flapRotate }) {
  return (
    <svg viewBox="0 0 200 240" className="w-full overflow-visible drop-shadow-[0_24px_24px_rgba(18,20,31,0.22)]">
      <path d="M52 76 Q18 130 42 212" stroke={INK_SOFT} strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M148 76 Q182 130 158 212" stroke={INK_SOFT} strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M84 44 Q100 18 116 44" stroke={INK} strokeWidth="8" fill="none" strokeLinecap="round" />
      <rect x="40" y="50" width="120" height="178" rx="42" fill={SUNSET} />
      <rect x="40" y="188" width="120" height="40" rx="20" fill="#D9531F" />
      <rect x="62" y="138" width="76" height="62" rx="18" fill={CORAL} />
      <path d="M72 152 L128 152" stroke={PEACH} strokeWidth="3" strokeLinecap="round" strokeDasharray="5 4" />
      <circle cx="100" cy="174" r="9" fill={SUN} />
      <motion.g style={{ y: flapY, rotate: flapRotate, transformBox: "fill-box", transformOrigin: "0% 0%" }}>
        <path d="M44 92 Q44 48 100 46 Q156 48 156 92 L156 110 Q100 126 44 110 Z" fill={INK} />
        <rect x="92" y="100" width="16" height="20" rx="4" fill={SUN} />
      </motion.g>
    </svg>
  );
}

function PackItem({ item, index, count, progress, orbit, radius }) {
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
  const start = 0.3 + index * 0.035;
  const out = useTransform(progress, [start, start + 0.14], [0, 1]);
  const x = useTransform(out, (v) => Math.cos(angle) * radius * v);
  const y = useTransform(out, (v) => Math.sin(angle) * radius * v - (1 - v) * 40);
  const scale = useTransform(out, [0, 1], [0.2, 1]);
  const opacity = useTransform(out, [0, 0.25], [0, 1]);
  const counterRotate = useTransform(orbit, (v) => -v);

  return (
    <motion.div style={{ x, y, scale, opacity }} className="absolute left-1/2 top-1/2 -ml-10 -mt-10 w-20">
      <motion.div style={{ rotate: counterRotate }} className="flex flex-col items-center gap-1.5">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-lift">
          <item.icon className="h-6 w-6 text-sunset" />
        </span>
        <span className="whitespace-nowrap text-[11px] font-semibold text-ink/70">{item.label}</span>
      </motion.div>
    </motion.div>
  );
}

export function BackpackScene() {
  const { ref, progress } = useScene("pack");
  const [radius, setRadius] = useState(200);
  useEffect(() => {
    const update = () => setRadius(window.innerWidth < 640 ? 140 : 205);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const bagScale = useTransform(progress, [0.12, 0.32], [0.8, 1]);
  const bagY = useTransform(progress, [0.12, 0.32], [60, 0]);
  const flapY = useTransform(progress, [0.25, 0.38], [0, -34]);
  const flapRotate = useTransform(progress, [0.25, 0.38], [0, -14]);
  const orbit = useTransform(progress, [0.35, 0.9], [0, 60]);
  const ringScale = useTransform(progress, [0.3, 0.5], [0.4, 1]);

  return (
    <section ref={ref} className="relative overflow-hidden py-24">
      <SceneCaption index="04" kicker="Pack smart" title="Your AI packing list knows exactly what to bring" centered />
      <div className="relative mx-auto mt-8 flex h-[440px] max-w-3xl items-center justify-center sm:h-[540px]">
        <motion.div
          style={{ scale: ringScale, width: radius * 2, height: radius * 2 }}
          className="absolute rounded-full border-2 border-dashed border-sunset/25"
        />
        <div className="absolute h-48 w-48 rounded-full bg-sunset/15 blur-3xl" />
        <motion.div style={{ rotate: orbit }} className="absolute inset-0">
          {PACK_ITEMS.map((item, i) => (
            <PackItem key={item.label} item={item} index={i} count={PACK_ITEMS.length} progress={progress} orbit={orbit} radius={radius} />
          ))}
        </motion.div>
        <motion.div style={{ scale: bagScale, y: bagY }} className="relative z-10 w-32 sm:w-44">
          <BackpackArt flapY={flapY} flapRotate={flapRotate} />
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 05 · Sea & sky                                                      */
/* ------------------------------------------------------------------ */

function BalloonArt({ main, stripe }) {
  return (
    <svg viewBox="0 0 100 140" className="w-full drop-shadow-[0_12px_14px_rgba(18,20,31,0.18)]">
      <path d="M50 4 C20 4 4 28 4 52 C4 78 30 92 40 104 L60 104 C70 92 96 78 96 52 C96 28 80 4 50 4 Z" fill={main} />
      <path d="M50 4 C38 20 36 80 44 104 L56 104 C64 80 62 20 50 4 Z" fill={stripe} />
      <path d="M42 104 L44 120 M58 104 L56 120" stroke={INK} strokeWidth="1.5" />
      <rect x="40" y="118" width="20" height="16" rx="3" fill={INK_SOFT} />
    </svg>
  );
}

function Balloon({ progress, left, from, to, size, sway, main, stripe }) {
  const y = useTransform(progress, [0, 1], [from, to]);
  const x = useTransform(progress, (v) => Math.sin(v * sway) * 18);
  return (
    <motion.div style={{ y, x, left, width: size }} className="absolute top-0">
      <BalloonArt main={main} stripe={stripe} />
    </motion.div>
  );
}

function ShipArt() {
  return (
    <svg viewBox="0 0 220 104" className="w-full drop-shadow-[0_10px_12px_rgba(18,20,31,0.2)]">
      <path d="M70 28 L70 8" stroke={INK} strokeWidth="2" />
      <path d="M70 8 L88 13 L70 18 Z" fill={SUN} />
      <rect x="118" y="6" width="18" height="24" fill={CORAL} />
      <rect x="118" y="6" width="18" height="6" fill={INK} />
      <rect x="80" y="28" width="62" height="18" rx="4" fill={PEACH} />
      <rect x="58" y="44" width="104" height="26" rx="4" fill={CREAM} />
      {[74, 90, 106, 122, 138].map((cx) => (
        <circle key={cx} cx={cx} cy="57" r="4" fill={OCEAN} />
      ))}
      <path d="M8 70 L212 70 L192 102 L28 102 Z" fill={INK} />
      <path d="M14 78 L206 78 L202 85 L18 85 Z" fill={SUNSET} />
    </svg>
  );
}

const WAVE = "M0 40 Q75 10 150 40 T300 40 T450 40 T600 40 T750 40 T900 40 T1050 40 T1200 40 L1200 120 L0 120 Z";

export function SeaSkyScene() {
  const { ref, progress } = useScene("sea");
  const shipLeft = useTransform(progress, [0.1, 0.9], ["-30%", "100%"]);
  const shipRock = useTransform(progress, (v) => Math.sin(v * 40) * 3);
  const shipBob = useTransform(progress, (v) => Math.sin(v * 40 + 1) * 4);
  const waveFront = useTransform(progress, [0, 1], ["0%", "-25%"]);
  const waveBack = useTransform(progress, [0, 1], ["-25%", "0%"]);

  return (
    <section ref={ref} className="relative overflow-hidden bg-gradient-to-b from-background via-[#FCE3D2] to-[#F9C9A9] pt-24">
      <SceneCaption index="05" kicker="Sea & sky" title="Wherever the journey takes you next" />
      <div className="relative mt-4 h-[420px] sm:h-[480px]">
        <Balloon progress={progress} left="12%" from={260} to={-60} size={70} sway={12} main={SUNSET} stripe={SUN} />
        <Balloon progress={progress} left="70%" from={300} to={-20} size={96} sway={9} main={CORAL} stripe={PEACH} />
        <Balloon progress={progress} left="44%" from={330} to={60} size={52} sway={15} main={OCEAN} stripe={SUN} />

        <motion.svg style={{ x: waveBack }} viewBox="0 0 1200 120" preserveAspectRatio="none" className="absolute bottom-6 left-0 h-28 w-[200%] opacity-60">
          <path d={WAVE} fill={OCEAN} />
        </motion.svg>
        <motion.div style={{ left: shipLeft, rotate: shipRock, y: shipBob }} className="absolute bottom-[58px] w-[180px] sm:w-[230px]">
          <ShipArt />
        </motion.div>
        <motion.svg style={{ x: waveFront }} viewBox="0 0 1200 120" preserveAspectRatio="none" className="absolute bottom-0 left-0 h-24 w-[200%]">
          <path d={WAVE} fill={OCEAN} />
        </motion.svg>
      </div>
    </section>
  );
}
