"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";
import type { Article } from "@/types";

interface BreakingNewsTickerProps {
  articles: Article[];
}

export function BreakingNewsTicker({ articles }: BreakingNewsTickerProps) {
  const [isPaused, setIsPaused] = useState(false);

  if (!articles || articles.length === 0) return null;

  const doubled = [...articles, ...articles];

  return (
    <div className="bg-brand-600 text-white py-2.5 overflow-hidden relative">
      <div className="container-news flex items-center gap-4">
        <div className="flex-shrink-0 flex items-center gap-2 bg-white/20 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider z-10">
          <Zap size={12} className="animate-pulse" />
          Breaking
        </div>

        <div
          className="ticker-wrapper flex-1 cursor-pointer"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div
            className="ticker-content whitespace-nowrap"
            style={{
              animationPlayState: isPaused ? "paused" : "running",
            }}
          >
            {doubled.map((article, i) => (
              <span key={`${article.id}-${i}`} className="inline-flex items-center">
                <Link
                  href={`/vijest/${article.slug}`}
                  className="hover:text-brand-100 transition-colors duration-200 text-sm font-medium"
                >
                  {article.title}
                </Link>
                <span className="mx-8 text-brand-300 text-lg">•</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
