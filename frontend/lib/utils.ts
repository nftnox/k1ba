import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format, parseISO } from "date-fns";
import { bs } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(
  date: Date | string,
  pattern: string = "d. MMMM yyyy."
): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, pattern, { locale: bs });
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: bs });
}

export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "HH:mm", { locale: bs });
}

export function slugify(text: string): string {
  const charMap: Record<string, string> = {
    č: "c",
    ć: "c",
    š: "s",
    ž: "z",
    đ: "dj",
    Č: "c",
    Ć: "c",
    Š: "s",
    Ž: "z",
    Đ: "dj",
  };

  return text
    .toLowerCase()
    .replace(/[čćšžđČĆŠŽĐ]/g, (char) => charMap[char] || char)
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .replace(/^-+|-+$/g, "");
}

export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const wordCount = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).replace(/\s+\S*$/, "") + "...";
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&[a-z]+;/gi, " ");
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

export function getImageUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || "";
  return `${cdnUrl}${path}`;
}

export function generateExcerpt(content: string, length: number = 160): string {
  const stripped = stripHtml(content);
  return truncateText(stripped, length);
}

export function getMetaTitle(title: string, siteName: string = "K1.ba"): string {
  const maxLength = 60;
  if (title.length + siteName.length + 3 <= maxLength) {
    return `${title} | ${siteName}`;
  }
  return truncateText(title, maxLength);
}

export function buildSearchParams(
  params: Record<string, string | number | boolean | undefined>
): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });
  return searchParams.toString();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function getCategoryColor(slug: string): string {
  const colors: Record<string, string> = {
    vijesti: "#ed1515",
    politika: "#1d4ed8",
    ekonomija: "#15803d",
    sport: "#d97706",
    kultura: "#7c3aed",
    tehnologija: "#0891b2",
    zdravlje: "#dc2626",
    obrazovanje: "#65a30d",
    default: "#6b7280",
  };
  return colors[slug] || colors.default;
}
