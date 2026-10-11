import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { voyager } from "@/api/voyagerClient";
import { Plane, Menu, X, Map, Compass, Plus, Settings, LogOut, ArrowUp, ArrowUpRight } from "lucide-react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useMotionValueEvent,
  useScroll,
} from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EASE, Magnetic, ScrollProgress } from "@/components/motion/primitives";
import { LogoMark, Wordmark } from "@/components/common/Brand";

const NAV_ITEMS = [
  { name: "Home", page: "Home", icon: Compass },
  { name: "Explore", page: "ExploreCities", icon: Map },
  { name: "My Trips", page: "MyTrips", icon: Plane },
];

// Pages whose hero image runs underneath the navigation bar.
const FULL_BLEED_PAGES = ["Home", "TripView"];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const { scrollY } = useScroll();

  useEffect(() => {
    voyager.auth.me().then(setUser).catch(() => { });
  }, []);

  // Start every navigation at the top of the page.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    setScrolled(latest > 24);
    setHidden(latest > previous && latest > 220 && !mobileMenuOpen);
    setShowTop(latest > 900);
  });

  const isFullBleed = FULL_BLEED_PAGES.includes(currentPageName);
  const isTransparent = isFullBleed && !scrolled && !mobileMenuOpen;

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-screen bg-background">
        <ScrollProgress />
        <div className="grain" aria-hidden />

        {/* Ambient background glow for content pages */}
        {!isFullBleed && (
          <div aria-hidden className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
            <div className="absolute -top-40 -right-32 h-[520px] w-[520px] rounded-full bg-sunset/15 blur-[120px] animate-blob" />
            <div className="absolute top-1/3 -left-40 h-[460px] w-[460px] rounded-full bg-sun/15 blur-[120px] animate-blob [animation-delay:-6s]" />
            <div className="absolute bottom-0 right-1/4 h-[380px] w-[380px] rounded-full bg-ocean/10 blur-[120px] animate-blob [animation-delay:-12s]" />
          </div>
        )}

        {/* Floating navigation */}
        <motion.header
          className="fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 sm:px-6 sm:pt-4"
          animate={{ y: hidden ? -120 : 0 }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          <motion.nav
            initial={{ y: -90 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
            className={`flex w-full max-w-6xl items-center justify-between rounded-full px-2.5 py-2 transition-all duration-500 sm:px-3 ${isTransparent
              ? "border border-white/15 bg-white/[0.06] backdrop-blur-md"
              : "border border-ink/[0.07] bg-white/75 shadow-lift backdrop-blur-xl"
              }`}
          >
            <Link to={createPageUrl("Home")} className="group flex items-center gap-2.5 pl-1 pr-2">
              <LogoMark />
              <Wordmark light={isTransparent} />
            </Link>

            {/* Desktop links */}
            <div className="hidden items-center gap-1 md:flex">
              {NAV_ITEMS.map((item) => {
                const active = currentPageName === item.page;
                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${active
                      ? isTransparent ? "text-ink" : "text-white"
                      : isTransparent ? "text-white/80 hover:text-white" : "text-ink/60 hover:text-ink"
                      }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-active"
                        className={`absolute inset-0 rounded-full ${isTransparent ? "bg-white" : "bg-ink"}`}
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      />
                    )}
                    <item.icon className="relative h-4 w-4" />
                    <span className="relative">{item.name}</span>
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <Magnetic strength={0.25} className="hidden sm:inline-block">
                <Link
                  to={createPageUrl("PlanTrip")}
                  className="btn-sunset group flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
                >
                  <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
                  Plan Trip
                </Link>
              </Magnetic>

              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sun/40 to-coral/40 text-sm font-semibold text-ink ring-2 ring-white/60 transition-all hover:ring-sunset/50">
                      {user.full_name?.[0]?.toUpperCase() || "U"}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5">
                    <div className="px-3 py-2">
                      <p className="text-sm font-semibold">{user.full_name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="rounded-xl">
                      <Link to={createPageUrl("UserPreferences")} className="flex cursor-pointer items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        Travel Preferences
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="rounded-xl" onClick={() => voyager.auth.logout()}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <button
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition md:hidden ${isTransparent ? "bg-white/15 text-white" : "bg-ink text-white"}`}
                onClick={() => setMobileMenuOpen((o) => !o)}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={mobileMenuOpen ? "x" : "menu"}
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                  </motion.span>
                </AnimatePresence>
              </button>
            </div>
          </motion.nav>
        </motion.header>

        {/* Mobile full-screen menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              className="fixed inset-0 z-40 flex flex-col justify-between bg-ink px-6 pb-10 pt-28 md:hidden"
              initial={{ clipPath: "circle(0% at calc(100% - 44px) 40px)" }}
              animate={{ clipPath: "circle(150% at calc(100% - 44px) 40px)" }}
              exit={{ clipPath: "circle(0% at calc(100% - 44px) 40px)" }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-sunset/30 blur-[100px]" />
              <motion.ul
                className="relative space-y-2"
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.07, delayChildren: 0.2 } } }}
              >
                {[...NAV_ITEMS, { name: "Plan a Trip", page: "PlanTrip", icon: Plus }].map((item) => (
                  <motion.li
                    key={item.page}
                    variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
                  >
                    <Link
                      to={createPageUrl(item.page)}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between border-b border-white/10 py-4 font-display text-4xl font-semibold ${currentPageName === item.page ? "text-sunset" : "text-white"}`}
                    >
                      {item.name}
                      <ArrowUpRight className="h-6 w-6 opacity-50" />
                    </Link>
                  </motion.li>
                ))}
              </motion.ul>
              <p className="relative text-sm text-white/40">AI-powered travel planning · Made for explorers</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page content with enter transition */}
        <motion.main
          key={location.pathname + location.search}
          className={`relative z-10 ${isFullBleed ? "" : "pt-24 sm:pt-28"}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          {children}
        </motion.main>

        <Footer />

        {/* Back to top */}
        <AnimatePresence>
          {showTop && currentPageName !== "UserPreferences" && (
            <motion.button
              aria-label="Back to top"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-ink text-white shadow-lift transition-colors hover:bg-sunset"
              initial={{ opacity: 0, scale: 0.6, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.6, y: 20 }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.92 }}
            >
              <ArrowUp className="h-5 w-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

function Footer() {
  return (
    <footer className="relative z-10 mt-24 overflow-hidden bg-ink text-white">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[80%] -translate-x-1/2 rounded-full bg-sunset/20 blur-[120px]" />
      <div className="relative mx-auto max-w-7xl px-6 pt-16 sm:px-8">
        <div className="flex flex-col justify-between gap-10 md:flex-row">
          <div className="max-w-sm">
            <Link to={createPageUrl("Home")} className="group flex items-center gap-2.5">
              <LogoMark className="h-12 w-12" />
              <Wordmark light tagline className="[&>span:first-child]:text-2xl" />
            </Link>
            <p className="mt-5 text-sm leading-relaxed text-white/50">
              Intelligent, budget-aware itineraries crafted by AI — so you can spend less time planning and more time exploring.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 text-sm sm:gap-16">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">Product</p>
              <FooterLink page="PlanTrip">Plan a trip</FooterLink>
              <FooterLink page="ExploreCities">Explore cities</FooterLink>
              <FooterLink page="MyTrips">My trips</FooterLink>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">Account</p>
              <FooterLink page="UserPreferences">Preferences</FooterLink>
            </div>
          </div>
        </div>

        <p
          aria-hidden
          className="mt-14 select-none bg-gradient-to-b from-white/[0.14] to-transparent bg-clip-text text-center font-display text-[22vw] font-extrabold leading-[0.8] tracking-tighter text-transparent"
        >
          voyager
        </p>
        <div className="flex flex-col items-center justify-between gap-2 border-t border-white/10 py-6 text-xs text-white/40 sm:flex-row">
          <p>© {new Date().getFullYear()} VoyagerAI. AI-powered travel planning.</p>
          <p>Crafted for curious travellers ✦</p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ page, children }) {
  return (
    <Link
      to={createPageUrl(page)}
      className="group flex items-center gap-1 text-white/70 transition-colors hover:text-white"
    >
      <span className="relative">
        {children}
        <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-sunset transition-transform duration-300 group-hover:scale-x-100" />
      </span>
    </Link>
  );
}
