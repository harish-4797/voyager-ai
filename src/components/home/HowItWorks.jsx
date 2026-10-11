import React, { useRef } from "react";
import { Sparkles, Brain, Calendar, Wallet } from "lucide-react";
import { motion, useScroll, useSpring } from "framer-motion";
import { EASE } from "@/components/motion/primitives";

const STEPS = [
  {
    icon: Sparkles,
    title: "Tell us your dream",
    description: "Share your destination, dates, budget, and what excites you most about travel.",
    color: "from-sun to-sunset",
  },
  {
    icon: Brain,
    title: "AI crafts your plan",
    description: "Our engine retrieves real data and generates a hyper-personalised itinerary in seconds.",
    color: "from-sunset to-coral",
  },
  {
    icon: Wallet,
    title: "Budget optimised",
    description: "Every recommendation fits your budget, with a transparent, category-wise cost breakdown.",
    color: "from-coral to-ocean",
  },
  {
    icon: Calendar,
    title: "Day-by-day itinerary",
    description: "A realistic schedule — mornings, afternoons and evenings — with local tips and time estimates.",
    color: "from-ocean to-ink",
  },
];

export default function HowItWorks() {
  const listRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: listRef, offset: ["start 0.7", "end 0.6"] });
  const lineScale = useSpring(scrollYProgress, { stiffness: 100, damping: 25 });

  return (
    <section className="relative px-4 py-28 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
        {/* Sticky intro */}
        <div className="lg:sticky lg:top-32 lg:self-start">
          <p className="eyebrow mb-4">
            <span className="h-px w-8 bg-sunset" /> How it works
          </p>
          <h2 className="text-4xl font-bold leading-[0.95] text-ink sm:text-5xl lg:text-6xl">
            From idea to <span className="font-serif font-normal italic text-gradient-sunset">itinerary</span> in seconds
          </h2>
          <p className="mt-6 max-w-md text-muted-foreground">
            Four simple steps. No spreadsheets, no endless tabs — just tell us what you love and let the AI do the heavy lifting.
          </p>
        </div>

        {/* Timeline */}
        <div ref={listRef} className="relative">
          <div className="absolute bottom-6 left-7 top-6 w-px bg-ink/10" />
          <motion.div
            style={{ scaleY: lineScale }}
            className="absolute bottom-6 left-7 top-6 w-px origin-top bg-gradient-to-b from-sun via-sunset to-coral"
          />
          <ol className="space-y-6">
            {STEPS.map((step, i) => (
              <motion.li
                key={step.title}
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.8, ease: EASE }}
                className="relative flex gap-6"
              >
                <div
                  className={`relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${step.color} shadow-lg ring-8 ring-background`}
                >
                  <step.icon className="h-6 w-6 text-white" />
                </div>
                <div className="surface group flex-1 p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-lift">
                  <span className="text-xs font-bold uppercase tracking-[0.25em] text-sunset">
                    Step {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 text-2xl font-semibold text-ink">{step.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{step.description}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
