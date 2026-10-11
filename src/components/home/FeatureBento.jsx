import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Download, Heart, MessageCircle, Sparkles, Wallet } from "lucide-react";
import { EASE, fadeUpItem, staggerContainer, trackSpotlight } from "@/components/motion/primitives";

const BARS = [
  { label: "Stay", value: 42, color: "bg-sunset" },
  { label: "Food", value: 26, color: "bg-sun" },
  { label: "Travel", value: 14, color: "bg-ocean" },
  { label: "Sights", value: 12, color: "bg-coral" },
];

const PACKING = ["Light cotton shirts", "Sunscreen SPF 50+", "Power bank", "ID & cash"];

function Tile({ className = "", children }) {
  return (
    <motion.div
      variants={fadeUpItem}
      onMouseMove={trackSpotlight}
      className={`spotlight surface group overflow-hidden p-7 transition-shadow duration-500 hover:shadow-lift ${className}`}
    >
      {children}
    </motion.div>
  );
}

function TileHeading({ icon: Icon, title, text }) {
  return (
    <>
      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-white transition-colors duration-500 group-hover:bg-sunset">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-xl font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
    </>
  );
}

export default function FeatureBento() {
  return (
    <section className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <p className="eyebrow mb-4 justify-center">
            <span className="h-px w-8 bg-sunset" /> Why Voyager <span className="h-px w-8 bg-sunset" />
          </p>
          <h2 className="text-4xl font-bold leading-[0.95] text-ink sm:text-5xl">
            Everything a trip <span className="font-serif font-normal italic text-gradient-sunset">needs</span>
          </h2>
        </div>

        <motion.div
          className="grid auto-rows-[minmax(0,auto)] grid-cols-1 gap-5 md:grid-cols-6"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          variants={staggerContainer(0.1)}
        >
          {/* Budget */}
          <Tile className="md:col-span-4">
            <div className="grid gap-8 sm:grid-cols-2">
              <div>
                <TileHeading
                  icon={Wallet}
                  title="Budget-aware by design"
                  text="Every plan is balanced across stay, food, transport and sights — and never exceeds what you set."
                />
              </div>
              <div className="flex h-44 items-end gap-3 self-end">
                {BARS.map((bar, i) => (
                  <div key={bar.label} className="flex flex-1 flex-col items-center gap-2">
                    <motion.div
                      className={`w-full rounded-xl ${bar.color}`}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${bar.value * 3}px` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.1, delay: 0.3 + i * 0.12, ease: EASE }}
                    />
                    <span className="text-[11px] font-medium text-muted-foreground">{bar.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Tile>

          {/* Personalised */}
          <Tile className="md:col-span-2 bg-ink text-white">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sunset to-coral">
              <Heart className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white">Truly personal</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              Your travel style, diet and past trips shape every suggestion.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["foodie", "cultural", "vegetarian", "nature"].map((tag) => (
                <span key={tag} className="rounded-full border border-white/15 px-3 py-1 text-xs capitalize text-white/80">
                  {tag}
                </span>
              ))}
            </div>
          </Tile>

          {/* Packing */}
          <Tile className="md:col-span-2">
            <TileHeading icon={Sparkles} title="Smart packing lists" text="Tailored to the city, season and your plans." />
            <ul className="mt-5 space-y-2">
              {PACKING.map((item, i) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + i * 0.15 }}
                  className="flex items-center gap-2 text-sm text-ink/80"
                >
                  <CheckCircle2 className="h-4 w-4 text-ocean" />
                  {item}
                </motion.li>
              ))}
            </ul>
          </Tile>

          {/* Share */}
          <Tile className="md:col-span-2">
            <TileHeading icon={MessageCircle} title="Share on WhatsApp" text="Send the whole plan to your travel crew in one tap." />
            <div className="mt-5 ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-[#DCF8C6] px-4 py-2.5 text-xs text-ink/80 shadow-sm transition-transform duration-500 group-hover:-translate-y-1">
              🌴 <b>5-Day Goa Adventure</b> — Day 1: Fort Aguada at sunrise…
            </div>
          </Tile>

          {/* PDF */}
          <Tile className="md:col-span-2">
            <TileHeading icon={Download} title="Offline-ready PDF" text="Download a beautifully formatted itinerary for the road." />
            <div className="relative mt-5 h-20">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="absolute left-1/2 top-0 h-20 w-16 -translate-x-1/2 rounded-lg border border-ink/10 bg-white shadow-soft transition-transform duration-500"
                  style={{ transform: `translateX(-50%) rotate(${(i - 1) * 8}deg)` }}
                >
                  <div className="m-2 h-1.5 w-8 rounded bg-sunset/70" />
                  <div className="mx-2 mt-1 h-1 w-10 rounded bg-ink/10" />
                  <div className="mx-2 mt-1 h-1 w-9 rounded bg-ink/10" />
                </div>
              ))}
            </div>
          </Tile>
        </motion.div>
      </div>
    </section>
  );
}
