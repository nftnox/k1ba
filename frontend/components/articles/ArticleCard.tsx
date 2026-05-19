"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Clock, Eye, MessageCircle, Zap } from "lucide-react";
import { formatRelativeTime, getImageUrl, cn } from "@/lib/utils";
import type { Article } from "@/types";

interface ArticleCardProps {
  article: Article;
  variant?: "default" | "featured" | "compact" | "horizontal" | "hero";
  priority?: boolean;
  index?: number;
}

export function ArticleCard({
  article,
  variant = "default",
  priority = false,
  index = 0,
}: ArticleCardProps) {
  const href = `/vijest/${article.slug}`;

  if (variant === "hero") {
    return (
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="relative group overflow-hidden rounded-2xl aspect-[16/9] lg:aspect-[21/9]"
      >
        {article.featuredImage ? (
          <Link href={href} className="block h-full" tabIndex={-1} aria-hidden>
            <Image
              src={getImageUrl(article.featuredImage)}
              alt=""
              fill
              priority={priority}
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
            />
          </Link>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          {article.isBreaking && (
            <span className="badge-breaking mb-3">
              <Zap size={10} className="mr-1" />
              Breaking
            </span>
          )}
          <Link
            href={`/kategorije/${article.category.slug}`}
            className="badge-category mb-3 inline-block"
          >
            {article.category.name}
          </Link>
          <Link href={href}>
            <h2 className="text-white font-serif font-bold text-2xl md:text-4xl leading-tight mb-3 text-balance line-clamp-3">
              {article.title}
            </h2>
          </Link>
          <div className="flex items-center gap-4 text-white/70 text-sm">
            <span className="flex items-center gap-1.5">
              <Clock size={13} />
              {formatRelativeTime(article.publishedAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <Eye size={13} />
              {article.viewCount?.toLocaleString()} pregleda
            </span>
            <span className="flex items-center gap-1.5">
              <MessageCircle size={13} />
              {article._count?.comments || 0}
            </span>
          </div>
        </div>
      </motion.article>
    );
  }

  if (variant === "featured") {
    return (
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="card-news group"
      >
        {article.featuredImage && (
          <Link href={href} className="block">
            <div className="relative aspect-video overflow-hidden">
              <Image
                src={getImageUrl(article.featuredImage)}
                alt={article.featuredImageAlt || article.title}
                fill
                priority={priority}
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              {article.isBreaking && (
                <div className="absolute top-3 left-3">
                  <span className="badge-breaking">
                    <Zap size={10} className="mr-1" />
                    Breaking
                  </span>
                </div>
              )}
            </div>
          </Link>
        )}
        <div className="p-5">
          <Link
            href={`/kategorije/${article.category.slug}`}
            className="badge-category mb-3 inline-block"
          >
            {article.category.name}
          </Link>
          <Link href={href}>
            <h2 className="article-title text-lg md:text-xl line-clamp-3 mb-3">
              {article.title}
            </h2>
          </Link>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-4">
            {article.excerpt}
          </p>
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {formatRelativeTime(article.publishedAt)}
            </span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {article.readingTime} min
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle size={12} />
                {article._count?.comments || 0}
              </span>
            </div>
          </div>
        </div>
      </motion.article>
    );
  }

  if (variant === "horizontal") {
    return (
      <motion.article
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        className="group flex gap-4"
      >
        {article.featuredImage && (
          <Link href={href} className="flex-shrink-0">
            <div className="relative w-28 h-20 sm:w-36 sm:h-24 rounded-xl overflow-hidden">
              <Image
                src={getImageUrl(article.featuredImage)}
                alt={article.featuredImageAlt || article.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="150px"
              />
            </div>
          </Link>
        )}
        <div className="flex-1 min-w-0 py-1">
          <Link
            href={`/kategorije/${article.category.slug}`}
            className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-1 block"
            onClick={(e) => e.stopPropagation()}
          >
            {article.category.name}
          </Link>
          <Link href={href}>
            <h3 className="article-title text-sm sm:text-base font-bold line-clamp-2 leading-snug mb-2">
              {article.title}
            </h3>
          </Link>
          <span className="text-xs text-neutral-400 flex items-center gap-1">
            <Clock size={11} />
            {formatRelativeTime(article.publishedAt)}
          </span>
        </div>
      </motion.article>
    );
  }

  if (variant === "compact") {
    return (
      <motion.article
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.03 }}
        className="group flex items-start gap-3 py-3 border-b border-[hsl(var(--border))] last:border-0"
      >
        <span className="text-2xl font-black text-neutral-200 dark:text-neutral-700 leading-none mt-1 w-6 flex-shrink-0">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="flex-1 min-w-0">
          <Link
            href={`/kategorije/${article.category.slug}`}
            className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-1 block"
          >
            {article.category.name}
          </Link>
          <Link href={href}>
            <h3 className="article-title text-sm font-semibold line-clamp-2 leading-snug">
              {article.title}
            </h3>
          </Link>
        </div>
      </motion.article>
    );
  }

  // Default card
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="card-news group"
    >
      {article.featuredImage && (
        <Link href={href} className="block">
          <div className="relative aspect-video overflow-hidden">
            <Image
              src={getImageUrl(article.featuredImage)}
              alt={article.featuredImageAlt || article.title}
              fill
              priority={priority}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            {article.isBreaking && (
              <div className="absolute top-2 left-2">
                <span className="badge-breaking text-xs">
                  <Zap size={9} className="mr-0.5" />
                  Breaking
                </span>
              </div>
            )}
          </div>
        </Link>
      )}
      <div className="p-4">
        <Link
          href={`/kategorije/${article.category.slug}`}
          className="badge-category mb-2 inline-block"
        >
          {article.category.name}
        </Link>
        <Link href={href}>
          <h3
            className={cn(
              "article-title font-bold line-clamp-3 mb-2",
              "text-base sm:text-lg leading-snug"
            )}
          >
            {article.title}
          </h3>
        </Link>
        <div className="flex items-center justify-between text-xs text-neutral-400 mt-3">
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {formatRelativeTime(article.publishedAt)}
          </span>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <Eye size={11} />
              {article.viewCount?.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle size={11} />
              {article._count?.comments || 0}
            </span>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
