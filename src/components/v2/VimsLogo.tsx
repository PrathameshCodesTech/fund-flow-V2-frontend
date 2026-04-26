"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface VimsLogoProps {
  className?: string;
  labelClassName?: string;
  showTagline?: boolean;
  /** Scale the wordmark image to this height in pixels. Default auto-sizes to context. */
  imgHeight?: number;
}

export function VimsLogo({
  className,
  labelClassName,
  showTagline = true,
  imgHeight,
}: VimsLogoProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={cn("relative cursor-pointer select-none", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Static wordmark image — always visible */}
      <div className="flex flex-col">
        {/* VIMS wordmark image */}
        <img
          src="/vims-logo.png"
          alt="VIMS"
          className="h-auto w-auto object-contain"
          style={imgHeight ? { height: imgHeight } : undefined}
        />

        {showTagline && (
          <p className="text-[9px] text-muted-foreground/70 leading-none mt-0.5 tracking-wide">
            Invoice and Marketing Fund Governance &mdash; From Vendor Bill to Payment
          </p>
        )}
      </div>

      {/* SVG stroke animation overlay — draws over the image on hover */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {/* Semi-transparent dark overlay + white stroke letters */}
            <div className="absolute inset-0 bg-background/60" />

            <motion.svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 320 120"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="square"
              strokeLinejoin="miter"
              className="absolute inset-0 w-full h-full text-primary"
            >
              {/* V */}
              <motion.path
                d="M5 10 L20 110"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
              <motion.path
                d="M42 10 L20 110"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.3, ease: "easeOut", delay: 0.05 }}
              />

              {/* I */}
              <motion.path
                d="M58 10 L58 110"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.25, ease: "easeOut", delay: 0.12 }}
              />
              <motion.circle
                cx="58"
                cy="7"
                r="3"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.15, delay: 0.28 }}
              />

              {/* M */}
              <motion.path
                d="M80 110 L80 10 L110 55 L140 10 L140 110"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.45, ease: "easeInOut", delay: 0.32 }}
              />

              {/* S */}
              <motion.path
                d="M195 25 C195 10, 175 10, 168 18 L155 30 C148 38, 148 50, 158 58 L172 72 C182 80, 182 95, 172 102 L158 112 C148 118, 143 120, 143 108"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, ease: "easeInOut", delay: 0.62 }}
              />

              {/* Accent underline */}
              <motion.line
                x1="5"
                y1="118"
                x2="315"
                y2="118"
                strokeWidth="1.5"
                className="text-amber-400"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.8 }}
                transition={{ duration: 0.35, ease: "easeOut", delay: 0.85 }}
              />
            </motion.svg>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
