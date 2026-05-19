"use client";

import { useState } from "react";
import {
  Facebook,
  Twitter,
  Linkedin,
  Link2,
  Check,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ShareButtonsProps {
  url: string;
  title: string;
  className?: string;
}

export function ShareButtons({ url, title, className }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shares = [
    {
      name: "Facebook",
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: "hover:bg-blue-600 hover:text-white hover:border-blue-600",
    },
    {
      name: "Twitter",
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      color: "hover:bg-sky-500 hover:text-white hover:border-sky-500",
    },
    {
      name: "LinkedIn",
      icon: Linkedin,
      href: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`,
      color: "hover:bg-blue-700 hover:text-white hover:border-blue-700",
    },
  ];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // User cancelled
      }
    }
  };

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      <span className="text-sm font-medium text-neutral-500 flex items-center gap-1.5">
        <Share2 size={14} />
        Dijeli:
      </span>

      {shares.map(({ name, icon: Icon, href, color }) => (
        <a
          key={name}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "w-9 h-9 flex items-center justify-center rounded-lg border border-[hsl(var(--border))]",
            "text-neutral-600 dark:text-neutral-400 transition-all duration-200",
            color
          )}
          aria-label={`Dijeli na ${name}`}
        >
          <Icon size={15} />
        </a>
      ))}

      <button
        onClick={copyLink}
        className={cn(
          "w-9 h-9 flex items-center justify-center rounded-lg border border-[hsl(var(--border))]",
          "text-neutral-600 dark:text-neutral-400 transition-all duration-200",
          copied
            ? "bg-green-500 text-white border-green-500"
            : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
        )}
        aria-label="Kopiraj link"
      >
        {copied ? <Check size={15} /> : <Link2 size={15} />}
      </button>

      {typeof navigator !== "undefined" && "share" in navigator && (
        <button
          onClick={handleShare}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-[hsl(var(--border))] text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-200"
          aria-label="Dijeli"
        >
          <Share2 size={15} />
        </button>
      )}
    </div>
  );
}
