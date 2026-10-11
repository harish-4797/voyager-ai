import React from "react";
import {
  Utensils, Landmark, Mountain, ShoppingBag, Camera,
  Music, Waves, TreePine, Heart, Palette, Check
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { EASE } from "@/components/motion/primitives";

const INTERESTS = [
  { id: "food", label: "Food & Cuisine", icon: Utensils },
  { id: "culture", label: "Culture & History", icon: Landmark },
  { id: "adventure", label: "Adventure", icon: Mountain },
  { id: "shopping", label: "Shopping", icon: ShoppingBag },
  { id: "photography", label: "Photography", icon: Camera },
  { id: "nightlife", label: "Nightlife", icon: Music },
  { id: "beach", label: "Beach & Water", icon: Waves },
  { id: "nature", label: "Nature & Parks", icon: TreePine },
  { id: "wellness", label: "Wellness & Spa", icon: Heart },
  { id: "art", label: "Art & Design", icon: Palette },
];

export default function InterestPicker({ selected, onChange }) {
  const toggle = (id) => {
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id]
    );
  };

  return (
    <motion.div
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.04 } } }}
    >
      {INTERESTS.map((item) => {
        const active = selected.includes(item.id);
        return (
          <motion.button
            key={item.id}
            type="button"
            onClick={() => toggle(item.id)}
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.95 }}
            className={`relative flex flex-col items-center gap-3 overflow-hidden rounded-3xl border p-5 transition-colors duration-300 ${active
              ? "border-ink bg-ink text-white shadow-lift"
              : "border-ink/[0.06] bg-white/80 text-ink/60 shadow-soft hover:text-ink"
              }`}
          >
            <motion.span
              animate={active ? { rotate: [0, -12, 12, 0], scale: [1, 1.2, 1] } : { rotate: 0, scale: 1 }}
              transition={{ duration: 0.5 }}
              className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${active ? "bg-gradient-to-br from-sunset to-coral text-white" : "bg-secondary"}`}
            >
              <item.icon className="h-5 w-5" />
            </motion.span>
            <span className="text-center text-sm font-medium leading-tight">{item.label}</span>
            <AnimatePresence>
              {active && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-sunset"
                >
                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
