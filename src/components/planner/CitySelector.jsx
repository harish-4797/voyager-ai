import React from "react";
import { MapPin, Check } from "lucide-react";
import { motion } from "framer-motion";
import { EASE } from "@/components/motion/primitives";
import { CITIES } from "@/lib/cities";

export default function CitySelector({ selected, onChange }) {
  return (
    <motion.div
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.05 } } }}
    >
      {CITIES.map((city) => {
        const active = selected === city.name;
        return (
          <motion.button
            key={city.name}
            type="button"
            onClick={() => onChange(city.name)}
            variants={{ hidden: { opacity: 0, y: 20, scale: 0.96 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: EASE } } }}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.97 }}
            className={`group relative aspect-[4/3] overflow-hidden rounded-3xl text-left transition-shadow duration-300 ${active ? "shadow-glow ring-[3px] ring-sunset ring-offset-4 ring-offset-background" : "shadow-soft hover:shadow-lift"}`}
          >
            <img
              src={city.img}
              alt={city.name}
              className={`h-full w-full object-cover transition-transform duration-700 ${active ? "scale-110" : "group-hover:scale-110"}`}
            />
            <div className={`absolute inset-0 transition-colors duration-500 ${active ? "bg-gradient-to-t from-sunset/80 via-ink/20 to-transparent" : "bg-gradient-to-t from-ink/80 via-ink/10 to-transparent"}`} />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <h3 className="font-display text-xl font-bold text-white sm:text-2xl">{city.name}</h3>
              <div className="flex items-center gap-1 text-xs text-white/75">
                <MapPin className="h-3 w-3" />
                {city.tagline}
              </div>
            </div>
            {active && (
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg"
              >
                <Check className="h-4 w-4 text-sunset" strokeWidth={3} />
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </motion.div>
  );
}
