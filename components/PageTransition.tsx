"use client";

import { motion, AnimatePresence } from "motion/react";

interface Props {
  pathname: string;
  children: React.ReactNode;
}

export default function PageTransition({ pathname, children }: Props) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
