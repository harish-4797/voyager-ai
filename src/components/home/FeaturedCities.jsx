import React, { useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MapPin, ArrowUpRight, ArrowRight } from "lucide-react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { CITIES } from "@/lib/cities";

const FEATURED = ["Goa", "Jaipur", "Udaipur", "Leh", "Varanasi", "Kochi"].map((name) =>
  CITIES.find((c) => c.name === name)
);

function CityCard({ city, index }) {
  return (
    <Link
      to={createPageUrl(`PlanTrip?city=${city.name}`)}
      className="group relative block aspect-[3/4] w-[78vw] shrink-0 snap-start overflow-hidden rounded-[2rem] bg-ink sm:w-[340px] lg:w-[380px]"
    >
      <img
        src={city.img}
        alt={city.name}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent" />
      <span className="absolute left-6 top-5 font-display text-6xl font-bold text-white/20 transition-colors duration-500 group-hover:text-white/40">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="absolute right-5 top-5 flex h-11 w-11 -translate-y-2 items-center justify-center rounded-full bg-white text-ink opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
        <ArrowUpRight className="h-5 w-5" />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-6">
        <span className="glass-dark mb-3 inline-block rounded-full px-3 py-1 text-xs font-medium text-white/90">
          {city.tagline}
        </span>
        <h3 className="font-display text-4xl font-bold text-white">{city.name}</h3>
        <div className="mt-2 flex items-center justify-between text-sm text-white/65">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {city.country}
          </span>
          <span>~₹{city.avgBudget.toLocaleString("en-IN")}/day</span>
        </div>
        <div className="mt-4 h-px w-full origin-left scale-x-0 bg-gradient-to-r from-sunset to-coral transition-transform duration-700 group-hover:scale-x-100" />
      </div>
    </Link>
  );
}

function Intro({ className }) {
  return (
    <div className={className}>
      <p className="eyebrow mb-4">
        <span className="h-px w-8 bg-sunset" /> Destinations
      </p>
      <h2 className="text-4xl font-bold leading-[0.95] text-ink sm:text-5xl lg:text-6xl">
        Trending <span className="font-serif font-normal italic text-gradient-sunset">cities</span> this season
      </h2>
      <p className="mt-5 max-w-sm text-muted-foreground">
        Hand-picked places our travellers love right now. Tap any city to start planning instantly.
      </p>
      <Link
        to={createPageUrl("ExploreCities")}
        className="group mt-8 inline-flex items-center gap-2 text-sm font-semibold text-ink"
      >
        View all destinations
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white transition-transform group-hover:translate-x-1">
          <ArrowRight className="h-4 w-4" />
        </span>
      </Link>
    </div>
  );
}

export default function FeaturedCities() {
  const isMobile = useIsMobile();
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const [distance, setDistance] = useState(0);

  useLayoutEffect(() => {
    if (isMobile || !trackRef.current) return;
    const measure = () => setDistance(Math.max(0, trackRef.current.scrollWidth - window.innerWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(trackRef.current);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [isMobile]);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 24, restDelta: 0.001 });
  const x = useTransform(smooth, [0, 1], [0, -distance]);

  if (isMobile) {
    return (
      <section className="py-24">
        <Intro className="px-5" />
        <div className="scrollbar-hide mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4">
          {FEATURED.map((city, i) => (
            <CityCard key={city.name} city={city} index={i} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="relative" style={{ height: `calc(100vh + ${distance}px)` }}>
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <motion.div ref={trackRef} style={{ x }} className="flex w-max items-center gap-6 pl-[6vw] pr-[6vw]">
          <Intro className="mr-10 w-[380px] shrink-0" />
          {FEATURED.map((city, i) => (
            <CityCard key={city.name} city={city} index={i} />
          ))}
          <Link
            to={createPageUrl("ExploreCities")}
            className="group flex aspect-[3/4] w-[300px] shrink-0 flex-col items-center justify-center gap-5 rounded-[2rem] border-2 border-dashed border-ink/15 text-center transition-colors hover:border-sunset hover:bg-sunset/5"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink text-white transition-transform duration-500 group-hover:rotate-45 group-hover:bg-sunset">
              <ArrowUpRight className="h-7 w-7" />
            </span>
            <span className="font-display text-2xl font-semibold text-ink">
              See all
              <br />
              destinations
            </span>
          </Link>
        </motion.div>

        {/* Horizontal progress */}
        <div className="absolute bottom-10 left-[6vw] right-[6vw] h-[2px] overflow-hidden rounded-full bg-ink/10">
          <motion.div style={{ scaleX: smooth }} className="h-full origin-left bg-gradient-to-r from-sunset to-coral" />
        </div>
      </div>
    </section>
  );
}
