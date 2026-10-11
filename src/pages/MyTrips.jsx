import React from "react";
import { voyager } from "@/api/voyagerClient";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, MapPin, Calendar, Wallet, Plane, Trash2, ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import PageHeader from "@/components/common/PageHeader";
import { CountUp, EASE, Magnetic } from "@/components/motion/primitives";
import { getCityImage } from "@/lib/cities";

const STATUS_STYLES = {
  planning: "bg-sun/90 text-ink",
  confirmed: "bg-emerald-500 text-white",
  completed: "bg-ocean text-white",
  cancelled: "bg-white/80 text-ink/60",
};

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-ink/[0.06] bg-white/70">
      <div className="skeleton h-52" />
      <div className="space-y-3 p-6">
        <div className="skeleton h-5 w-2/3 rounded-full" />
        <div className="skeleton h-3 w-1/2 rounded-full" />
        <div className="skeleton h-3 w-1/3 rounded-full" />
      </div>
    </div>
  );
}

export default function MyTrips() {
  const { data: trips = [], isLoading, refetch } = useQuery({
    queryKey: ["my-trips"],
    queryFn: () => voyager.entities.Trip.list("-created_date", 50),
  });

  const handleDelete = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    await voyager.entities.Trip.delete(id);
    refetch();
  };

  const totalDays = trips.reduce((sum, t) => sum + (t.days || 0), 0);
  const uniqueCities = new Set(trips.map((t) => t.city)).size;

  return (
    <div className="min-h-screen px-4 pb-16 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="Your collection"
          title="My"
          accent="trips"
          subtitle="All of your AI-generated itineraries, ready whenever you are."
        >
          <Magnetic>
            <Link
              to={createPageUrl("PlanTrip")}
              className="btn-sunset group inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold"
            >
              <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
              New trip
            </Link>
          </Magnetic>
        </PageHeader>

        {!isLoading && trips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.3 }}
            className="surface mb-10 grid grid-cols-3 divide-x divide-ink/[0.06]"
          >
            {[
              { label: "Trips", value: trips.length, icon: Plane },
              { label: "Days planned", value: totalDays, icon: Calendar },
              { label: "Cities", value: uniqueCities, icon: MapPin },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1 p-5 sm:flex-row sm:justify-center sm:gap-4">
                <span className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-sunset/10 text-sunset sm:flex">
                  <s.icon className="h-5 w-5" />
                </span>
                <div className="text-center sm:text-left">
                  <p className="font-display text-3xl font-bold text-ink">
                    <CountUp to={s.value} duration={1.4} />
                  </p>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">{s.label}</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : trips.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="surface relative overflow-hidden px-6 py-24 text-center"
          >
            <div className="relative mx-auto mb-8 h-28 w-28">
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-sunset/30 animate-[spin_20s_linear_infinite]" />
              <div className="absolute inset-4 flex items-center justify-center rounded-full bg-gradient-to-br from-sunset to-coral shadow-glow animate-float">
                <Plane className="h-9 w-9 -rotate-12 text-white" />
              </div>
            </div>
            <h3 className="font-display text-3xl font-bold text-ink">No trips yet</h3>
            <p className="mx-auto mt-2 max-w-sm text-muted-foreground">
              Your passport is looking a little empty. Let's plan your first adventure.
            </p>
            <Link
              to={createPageUrl("PlanTrip")}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-sunset"
            >
              Plan your first trip <ArrowUpRight className="h-4 w-4" />
            </Link>
          </motion.div>
        ) : (
          <motion.div layout className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {trips.map((trip, i) => (
                <motion.div
                  key={trip.id}
                  layout
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.6, delay: (i % 3) * 0.08, ease: EASE }}
                >
                  <Link to={createPageUrl(`TripView?id=${trip.id}`)} className="group block">
                    <div className="overflow-hidden rounded-[2rem] border border-ink/[0.06] bg-white shadow-soft transition-all duration-500 hover:-translate-y-1.5 hover:shadow-lift">
                      <div className="relative h-52 overflow-hidden">
                        <img
                          src={getCityImage(trip.city)}
                          alt={trip.city}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
                        <span className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[trip.status] || STATUS_STYLES.planning}`}>
                          {trip.status}
                        </span>
                        <button
                          aria-label="Delete trip"
                          onClick={(e) => handleDelete(e, trip.id)}
                          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-ink/40 text-white/80 opacity-0 backdrop-blur-md transition-all hover:bg-red-500 hover:text-white group-hover:opacity-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <p className="absolute bottom-4 left-5 flex items-center gap-1 text-sm font-medium text-white">
                          <MapPin className="h-3.5 w-3.5" /> {trip.city}
                        </p>
                      </div>
                      <div className="p-6">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-display text-xl font-semibold leading-tight text-ink">{trip.title}</h3>
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-ink transition-all duration-500 group-hover:rotate-45 group-hover:bg-ink group-hover:text-white">
                            <ArrowUpRight className="h-4 w-4" />
                          </span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="chip">
                            <Calendar className="h-3 w-3" /> {trip.days} days · {trip.month}
                          </span>
                          <span className="chip">
                            <Wallet className="h-3 w-3" /> ₹{trip.budget?.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
