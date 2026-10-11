import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Compass } from 'lucide-react';


export default function PageNotFound() {
    const location = useLocation();
    const pageName = location.pathname.substring(1);

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-6">
            <div className="pointer-events-none absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-sunset/20 blur-[120px] animate-blob" />
            <div className="pointer-events-none absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-coral/15 blur-[120px] animate-blob [animation-delay:-8s]" />

            <div className="relative max-w-lg text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    className="relative"
                >
                    <h1 className="font-display text-[9rem] font-extrabold leading-none tracking-tighter text-ink/[0.08] sm:text-[12rem]">404</h1>
                    <motion.div
                        className="absolute inset-0 flex items-center justify-center"
                        animate={{ rotate: [0, 15, -10, 0] }}
                        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-sunset to-coral shadow-glow">
                            <Compass className="h-10 w-10 text-white" />
                        </div>
                    </motion.div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.7 }}
                >
                    <h2 className="mt-4 text-3xl font-bold text-ink sm:text-4xl">
                        Looks like you're <span className="font-serif font-normal italic text-gradient-sunset">off the map</span>
                    </h2>
                    <p className="mt-4 text-muted-foreground">
                        The page <span className="font-medium text-ink">"{pageName}"</span> doesn't exist. Let's get you back on route.
                    </p>
                    <Link
                        to="/"
                        className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-sunset"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to home
                    </Link>
                </motion.div>
            </div>
        </div>
    )
}
