import React from "react";
import { motion } from "framer-motion";
import { EASE, SplitText } from "@/components/motion/primitives";

/**
 * Editorial page header. `accent` is rendered in italic serif with the sunset gradient
 * after the main title.
 */
export default function PageHeader({ eyebrow = undefined, title, accent = undefined, subtitle = undefined, children = undefined }) {
  return (
    <header className="relative mb-10 flex flex-col gap-6 sm:mb-14 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow && (
          <motion.p
            className="eyebrow mb-4"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <span className="h-px w-8 bg-sunset" />
            {eyebrow}
          </motion.p>
        )}
        <h1 className="text-4xl font-bold leading-[0.95] text-ink sm:text-5xl lg:text-6xl">
          <SplitText text={title} />
          {accent && (
            <>
              {" "}
              <SplitText
                text={accent}
                delay={0.15}
                wordClassName="font-serif font-normal italic text-gradient-sunset pr-1"
              />
            </>
          )}
        </h1>
        {subtitle && (
          <motion.p
            className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: EASE }}
          >
            {subtitle}
          </motion.p>
        )}
      </div>
      {children && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: EASE }}
        >
          {children}
        </motion.div>
      )}
    </header>
  );
}
