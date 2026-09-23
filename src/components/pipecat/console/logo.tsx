"use client";

import * as React from "react";

export interface PipecatLogoProps {
  /** Accessible label for the logo (default "Tilted Studio"). */
  alt?: string;
  /** Height in pixels; width derives from the aspect ratio (default 24). */
  height?: number;
  className?: string;
}

/**
 * Modern Tilted Studio brand badge with angled isometric prism mark
 */
export function PipecatLogo({
  alt = "Tilted Studio",
  height = 24,
  className,
}: PipecatLogoProps) {
  return (
    <div
      data-slot="tilted-studio-logo"
      className={`flex items-center gap-2 select-none ${className ?? ""}`}
      style={{ height }}
      role="img"
      aria-label={alt}
    >
      <svg
        width={height}
        height={height}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="tilted-logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7047FF" />
            <stop offset="60%" stopColor="#845CFF" />
            <stop offset="100%" stopColor="#24D8ED" />
          </linearGradient>
        </defs>
        {/* Tilted Diamond/Hexagon Prism */}
        <path
          d="M16 3L28 9.5V22.5L16 29L4 22.5V9.5L16 3Z"
          stroke="url(#tilted-logo-gradient)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Inner Tilted Facet */}
        <path
          d="M16 3V16L28 22.5M16 16L4 22.5"
          stroke="url(#tilted-logo-gradient)"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.7"
        />
        <circle cx="16" cy="16" r="3" fill="#20E99A" />
      </svg>
      <span className="font-bold tracking-tight text-xs bg-gradient-to-r from-[#F4F2F8] via-[#F4F2F8] to-[#845CFF] bg-clip-text text-transparent">
        Tilted Studio
      </span>
    </div>
  );
}

