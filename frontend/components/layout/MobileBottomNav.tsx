"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, TrendingUp, Search, BarChart2, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: Home, label: "Početna" },
  { href: "/trending", icon: TrendingUp, label: "Trending" },
  { href: "/pretraga", icon: Search, label: "Pretraga" },
  { href: "/popularno", icon: BarChart2, label: "Popularno" },
  { href: "/najnovije", icon: Menu, label: "Sve vijesti" },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  // Sakrij u admin panelu
  if (pathname.startsWith("/admin")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-neutral-925/95 backdrop-blur-md border-t border-[hsl(var(--border))] safe-area-inset-bottom">
      <div className="flex items-center justify-around h-14 px-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl min-w-[52px] transition-all duration-200",
                active
                  ? "text-brand-600"
                  : "text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
              )}
            >
              <Icon size={active ? 22 : 20} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
