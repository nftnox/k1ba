import type { Metadata } from "next";
import Link from "next/link";
import {
  LayoutDashboard,
  FileText,
  MessageCircle,
  Users,
  Settings,
  Activity,
  LogOut,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Admin Panel – K1.ba",
  robots: { index: false, follow: false },
};

const adminNav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/clanci", label: "Članci", icon: FileText },
  { href: "/admin/komentari", label: "Komentari", icon: MessageCircle },
  { href: "/admin/analytics", label: "Analitika", icon: Activity },
  { href: "/admin/scraper", label: "Scraper", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-925 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-neutral-900 border-r border-[hsl(var(--border))] flex flex-col">
        <div className="p-5 border-b border-[hsl(var(--border))]">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">K1</span>
            </div>
            <span className="font-black">Admin Panel</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {adminNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-[hsl(var(--border))]">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <LogOut size={14} />
            Nazad na portal
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
