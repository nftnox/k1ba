"use client";

import { cn } from "@/lib/utils";

type AdSize =
  | "leaderboard"   // 728x90 – ispod navbara
  | "rectangle"     // 300x250 – sidebar
  | "billboard"     // 970x250 – homepage hero
  | "mobile-banner" // 320x50 – mobile
  | "halfpage"      // 300x600 – sidebar tall
  | "inline";       // 100% x 250 – unutar članka

interface AdSlotProps {
  size: AdSize;
  id: string;
  className?: string;
  label?: boolean;
}

const AD_DIMENSIONS: Record<AdSize, { w: string; h: string; label: string }> = {
  leaderboard:   { w: "728px", h: "90px",  label: "Oglas 728×90" },
  rectangle:     { w: "300px", h: "250px", label: "Oglas 300×250" },
  billboard:     { w: "970px", h: "250px", label: "Oglas 970×250" },
  "mobile-banner": { w: "320px", h: "50px", label: "Oglas 320×50" },
  halfpage:      { w: "300px", h: "600px", label: "Oglas 300×600" },
  inline:        { w: "100%",  h: "250px", label: "Oglas" },
};

// Mapa: slot ID → putanja do slike u /public/ads/
// Dodaj slike u frontend/public/ads/ i povezi ih ovdje.
// Ostavi null za slotove koji koriste AdSense ili nemaju sliku.
const CUSTOM_ADS: Record<string, { image: string; link: string; alt: string } | null> = {
  "homepage-top":        null,  // npr. { image: "/ads/banner-728x90.jpg", link: "https://...", alt: "Oglas" }
  "homepage-sidebar":    null,
  "article-after-content": null,
  "sidebar-article":     null,
  "mobile-bottom":       null,
};

export function AdSlot({ size, id, className, label = true }: AdSlotProps) {
  const dim = AD_DIMENSIONS[size];
  const custom = CUSTOM_ADS[id];

  // Ako postoji vlastita slika za ovaj slot – prikaži je
  if (custom) {
    return (
      <div
        className={cn("overflow-hidden", className)}
        style={{ maxWidth: dim.w }}
        aria-label={custom.alt}
      >
        <a href={custom.link} target="_blank" rel="noopener noreferrer sponsored">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={custom.image}
            alt={custom.alt}
            style={{ width: "100%", height: dim.h, objectFit: "cover" }}
          />
        </a>
      </div>
    );
  }

  if (process.env.NODE_ENV === "production") {
    // Produkcija bez vlastite slike: AdSense wrapper (ubaci skriptu u layout.tsx)
    return (
      <div
        id={id}
        className={cn("overflow-hidden", className)}
        style={{ maxWidth: dim.w, height: dim.h }}
        aria-hidden="true"
        data-ad-slot={id}
      />
    );
  }

  // Development: vizuelni placeholder
  return (
    <div
      className={cn(
        "overflow-hidden flex items-center justify-center",
        "bg-neutral-100 dark:bg-neutral-800 border border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg",
        className
      )}
      style={{ maxWidth: dim.w, height: dim.h }}
      aria-hidden="true"
    >
      {label && (
        <span className="text-xs text-neutral-400 font-mono">
          {dim.label} · ID: {id}
        </span>
      )}
    </div>
  );
}

// ─── Predefinisane pozicije ───────────────────────────────────────────────────

export function HomepageLeaderboard() {
  return (
    <div className="container-news py-3 flex justify-center no-print">
      <AdSlot size="leaderboard" id="homepage-top" />
    </div>
  );
}

export function SidebarRectangle({ slot = "sidebar-1" }: { slot?: string }) {
  return (
    <div className="no-print">
      <AdSlot size="rectangle" id={slot} />
    </div>
  );
}

export function ArticleInlineAd({ slot = "article-inline" }: { slot?: string }) {
  return (
    <div className="my-8 flex justify-center no-print">
      <AdSlot size="inline" id={slot} className="w-full max-w-2xl" />
    </div>
  );
}

export function MobileBannerAd() {
  return (
    <div className="md:hidden flex justify-center py-2 no-print">
      <AdSlot size="mobile-banner" id="mobile-bottom" />
    </div>
  );
}
