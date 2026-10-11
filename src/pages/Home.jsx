import React from "react";
import HeroSection from "@/components/home/HeroSection";
import FeaturedCities from "@/components/home/FeaturedCities";
import HowItWorks from "@/components/home/HowItWorks";
import FeatureBento from "@/components/home/FeatureBento";
import { BackpackScene, BusScene, FlightScene, JourneyProvider, SeaSkyScene, TrainScene } from "@/components/home/TravelScenes";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { EASE, Magnetic, Marquee, Reveal, ScrollTextReveal, SplitText } from "@/components/motion/primitives";
import { CITIES } from "@/lib/cities";

export default function Home() {
  return (
    <JourneyProvider>
      <HeroSection />

      {/* Destination ticker */}
      <div className="relative z-10 -mt-px -rotate-1 scale-[1.02] bg-ink py-5">
        <Marquee speed={45}>
          {CITIES.map((city) => (
            <span key={city.name} className="flex items-center gap-8 px-4 font-display text-3xl font-semibold text-white sm:text-5xl">
              {city.name}
              <span className="text-2xl text-sunset">✦</span>
            </span>
          ))}
        </Marquee>
      </div>
      <div className="relative bg-sunset py-3 rotate-1 scale-[1.02] -mt-3">
        <Marquee reverse speed={55}>
          {["Budget-aware", "Seasonal", "Personalised", "Local tips", "Packing lists", "WhatsApp sharing", "PDF export"].map((t) => (
            <span key={t} className="flex items-center gap-6 px-3 text-sm font-semibold uppercase tracking-[0.25em] text-white">
              {t}
              <span>•</span>
            </span>
          ))}
        </Marquee>
      </div>

      <FlightScene />

      {/* Scroll-lit manifesto */}
      <section className="px-5 py-28 sm:px-6 sm:py-40">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <p className="eyebrow mb-8">
              <span className="h-px w-8 bg-sunset" /> Our promise
            </p>
          </Reveal>
          <ScrollTextReveal
            className="font-display text-3xl font-semibold leading-[1.15] text-ink sm:text-5xl lg:text-6xl"
            highlight={["friend", "minutes"]}
            text="Tell us where, when and what you love. In minutes you get a complete, budget-aware plan with the kind of local tips you'd only hear from a friend who lives there."
          />
        </div>
      </section>

      <TrainScene />
      <FeaturedCities />
      <BusScene />
      <HowItWorks />
      <BackpackScene />
      <FeatureBento />
      <SeaSkyScene />

      {/* CTA */}
      <section className="px-4 py-16 sm:px-6">
        <motion.div
          className="mx-auto max-w-6xl"
          initial={{ y: 60, scale: 0.96 }}
          whileInView={{ y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          <div className="relative overflow-hidden rounded-[2.5rem] bg-ink px-6 py-20 text-center sm:px-16 sm:py-28">
            <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-sunset/40 blur-[110px] animate-blob" />
            <div className="absolute -bottom-24 -right-10 h-96 w-96 rounded-full bg-coral/30 blur-[110px] animate-blob [animation-delay:-7s]" />
            <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sun/10 blur-[90px] animate-blob [animation-delay:-12s]" />
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
                backgroundSize: "48px 48px",
                maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
              }}
            />

            <div className="relative z-10">
              <img src="/logo-icon.png" alt="" className="mx-auto mb-8 h-20 w-20 rounded-[1.4rem] shadow-glow animate-float" />
              <h2 className="mx-auto max-w-3xl text-4xl font-bold leading-[0.95] text-white sm:text-6xl">
                <SplitText text="Ready for your next" inView />{" "}
                <SplitText text="adventure?" inView delay={0.2} wordClassName="font-serif font-normal italic text-gradient-sunset pr-1" />
              </h2>
              <p className="mx-auto mt-6 max-w-lg text-lg text-white/60">
                Let our AI create the perfect itinerary tailored to your style, budget, and schedule.
              </p>
              <Magnetic className="mt-10">
                <Link
                  to={createPageUrl("PlanTrip")}
                  className="group inline-flex items-center gap-3 rounded-full bg-white py-2 pl-7 pr-2 text-base font-semibold text-ink transition-shadow hover:shadow-[0_0_60px_-10px_rgba(255,255,255,0.6)]"
                >
                  Start planning now
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-sunset to-coral text-white transition-transform duration-500 group-hover:rotate-[-45deg]">
                    <ArrowRight className="h-5 w-5" />
                  </span>
                </Link>
              </Magnetic>
            </div>
          </div>
        </motion.div>
      </section>
    </JourneyProvider>
  );
}
