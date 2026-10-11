import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MapPin, ArrowUpRight, Search, CalendarDays, Wallet, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import PageHeader from "@/components/common/PageHeader";
import { EASE, TiltCard } from "@/components/motion/primitives";
import { CITIES } from "@/lib/cities";

const FILTERS = ["All", "History", "Culture", "Food", "Beach", "Mountains", "Architecture", "Nightlife"];

export default function ExploreCities() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return CITIES.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q));
      const matchesFilter = filter === "All" || c.tags.includes(filter);
      return matchesSearch && matchesFilter;
    });
  }, [search, filter]);

  return (
    <div className="min-h-screen px-4 pb-16 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="Explore"
          title="Find your next"
          accent="destination"
          subtitle="Discover handpicked cities across India — from Himalayan peaks to sun-drenched beaches."
        >
          <p className="font-display text-6xl font-bold text-ink/10 sm:text-8xl">
            {String(filtered.length).padStart(2, "0")}
          </p>
        </PageHeader>

        {/* Search + filters */}
        <div className="sticky top-24 z-30 mb-10">
          <div className="surface flex flex-col gap-3 rounded-[1.75rem] p-2 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Search cities or vibes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 w-full rounded-full bg-secondary/70 pl-11 pr-10 text-sm outline-none ring-sunset/40 transition focus:bg-white focus:ring-2"
              />
              {search && (
                <button
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-ink/5"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="scrollbar-hide flex gap-1 overflow-x-auto">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`relative shrink-0 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${filter === f ? "text-white" : "text-ink/60 hover:text-ink"}`}
                >
                  {filter === f && (
                    <motion.span
                      layoutId="explore-filter"
                      className="absolute inset-0 rounded-full bg-ink"
                      transition={{ type: "spring", stiffness: 400, damping: 34 }}
                    />
                  )}
                  <span className="relative">{f}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <motion.div layout className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((city, i) => (
              <motion.div
                key={city.name}
                layout
                initial={{ opacity: 0, y: 40, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.25 } }}
                transition={{ duration: 0.6, delay: Math.min(i * 0.06, 0.4), ease: EASE }}
              >
                <TiltCard className="group rounded-[2rem]">
                  <Link
                    to={createPageUrl(`PlanTrip?city=${city.name}`)}
                    className="block overflow-hidden rounded-[2rem] border border-ink/[0.06] bg-white shadow-soft transition-shadow duration-500 hover:shadow-lift"
                  >
                    <div className="relative h-64 overflow-hidden">
                      <img
                        src={city.img}
                        alt={city.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
                      <div className="absolute left-4 top-4 flex gap-2">
                        <span className="glass-dark flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-white">
                          <CalendarDays className="h-3 w-3" /> {city.bestSeason}
                        </span>
                      </div>
                      <div className="absolute right-4 top-4 flex h-10 w-10 translate-y-2 items-center justify-center rounded-full bg-white text-ink opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                        <ArrowUpRight className="h-4 w-4" />
                      </div>
                      <div className="absolute bottom-4 left-5 right-5">
                        <h3 className="font-display text-3xl font-bold text-white">{city.name}</h3>
                        <div className="flex items-center gap-1 text-sm text-white/70">
                          <MapPin className="h-3.5 w-3.5" />
                          {city.country}
                        </div>
                      </div>
                    </div>
                    <div className="p-5">
                      <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{city.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-1.5">
                          {city.tags.map((tag) => (
                            <span key={tag} className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-ink/70">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-ink">
                          <Wallet className="h-3.5 w-3.5 text-sunset" />₹{city.avgBudget.toLocaleString("en-IN")}
                          <span className="font-normal text-muted-foreground">/day</span>
                        </span>
                      </div>
                    </div>
                  </Link>
                </TiltCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        <AnimatePresence>
          {filtered.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="py-24 text-center"
            >
              <p className="font-display text-3xl font-semibold text-ink">No destinations found</p>
              <p className="mt-2 text-muted-foreground">Try a different search or filter.</p>
              <button
                onClick={() => {
                  setSearch("");
                  setFilter("All");
                }}
                className="mt-6 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-sunset"
              >
                Reset filters
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
