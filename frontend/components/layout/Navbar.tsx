"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  Search,
  Flame,
  ChevronDown,
  Newspaper,
  Globe,
  TrendingUp,
  BarChart2,
  Heart,
  Zap,
  BookOpen,
  Cpu,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Početna", href: "/", icon: Newspaper },
  {
    label: "Vijesti",
    href: "/kategorije/vijesti",
    icon: Globe,
    children: [
      { label: "Politika", href: "/kategorije/politika" },
      { label: "Ekonomija", href: "/kategorije/ekonomija" },
      { label: "Regija", href: "/kategorije/regija" },
      { label: "Svijet", href: "/kategorije/svijet" },
    ],
  },
  { label: "Sport", href: "/kategorije/sport", icon: Flame },
  { label: "Kultura", href: "/kategorije/kultura", icon: Heart },
  { label: "Tehnologija", href: "/kategorije/tehnologija", icon: Cpu },
  { label: "Zdravlje", href: "/kategorije/zdravlje", icon: BookOpen },
  { label: "Trending", href: "/trending", icon: TrendingUp },
  { label: "Popularno", href: "/popularno", icon: BarChart2 },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const pathname = usePathname();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (searchOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [searchOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/pretraga?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-white/95 dark:bg-neutral-925/95 backdrop-blur-md shadow-sm border-b border-[hsl(var(--border))]"
            : "bg-white dark:bg-neutral-925 border-b border-[hsl(var(--border))]"
        )}
      >
        {/* Top Bar */}
        <div className="bg-brand-600 text-white text-xs py-1.5 hidden sm:block">
          <div className="container-news flex justify-between items-center">
            <span className="font-medium flex items-center gap-1.5">
              <Zap size={12} />
              Najbrži news portal u BiH
            </span>
            <div className="flex items-center gap-4">
              <Link href="/najnovije" className="hover:text-brand-100 transition-colors">
                Najnovije vijesti
              </Link>
              <span className="text-brand-300">|</span>
              <Link href="/newsletter" className="hover:text-brand-100 transition-colors">
                Newsletter
              </Link>
            </div>
          </div>
        </div>

        {/* Main Nav */}
        <div className="container-news">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 flex-shrink-0"
            >
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-sm">K1</span>
              </div>
              <span className="font-black text-xl hidden sm:block">
                K1<span className="text-brand-600">.ba</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <div
                  key={item.href}
                  className="relative"
                  onMouseEnter={() =>
                    item.children && setOpenDropdown(item.label)
                  }
                  onMouseLeave={() => setOpenDropdown(null)}
                >
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                      pathname === item.href ||
                        pathname.startsWith(item.href + "/")
                        ? "text-brand-600 bg-brand-50 dark:bg-brand-950/30"
                        : "text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    )}
                  >
                    <item.icon size={14} />
                    {item.label}
                    {item.children && <ChevronDown size={12} />}
                  </Link>

                  {item.children && openDropdown === item.label && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-[hsl(var(--border))] py-1 z-50"
                    >
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="block px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:text-brand-600 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </div>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="btn-ghost w-9 h-9 p-0 justify-center"
                aria-label="Pretraga"
              >
                <Search size={18} />
              </button>
              <ThemeToggle />
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden btn-ghost w-9 h-9 p-0 justify-center"
                aria-label="Meni"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <AnimatePresence>
            {searchOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-t border-[hsl(var(--border))]"
              >
                <form onSubmit={handleSearch} className="py-4">
                  <div className="relative">
                    <Search
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
                    />
                    <input
                      ref={searchRef}
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Pretražite vijesti..."
                      className="input-field pl-12 pr-4 text-base"
                    />
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-white dark:bg-neutral-925 shadow-2xl overflow-y-auto"
            >
              <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
                <span className="font-black text-xl">
                  K1<span className="text-brand-600">.ba</span>
                </span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="btn-ghost w-9 h-9 p-0 justify-center"
                >
                  <X size={20} />
                </button>
              </div>
              <nav className="p-4 space-y-1">
                {navItems.map((item) => (
                  <div key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all",
                        pathname === item.href
                          ? "text-brand-600 bg-brand-50 dark:bg-brand-950/30"
                          : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      )}
                    >
                      <item.icon size={18} />
                      {item.label}
                    </Link>
                    {item.children && (
                      <div className="ml-9 mt-1 space-y-0.5">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className="block px-4 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-brand-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Spacer */}
      <div className="h-[calc(theme(spacing.16)+theme(spacing.7))] sm:h-[calc(theme(spacing.16)+theme(spacing.7))]" />
    </>
  );
}
