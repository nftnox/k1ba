"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import {
  FileText,
  MessageCircle,
  Users,
  Eye,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { adminAPI } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import type { AdminStats } from "@/types";
import toast from "react-hot-toast";

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [scraperLoading, setScraperLoading] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    const user = session?.user as { role?: string } | undefined;
    if (!session || user?.role !== "ADMIN") {
      redirect("/prijava");
    }
    fetchStats();
  }, [session, status]);

  const fetchStats = async () => {
    try {
      const token = (session as { accessToken?: string })?.accessToken || "";
      const data = await adminAPI.getStats(token);
      setStats(data);
    } catch {
      toast.error("Greška pri učitavanju statistike");
    } finally {
      setLoading(false);
    }
  };

  const triggerScraper = async () => {
    setScraperLoading(true);
    try {
      const token = (session as { accessToken?: string })?.accessToken || "";
      await adminAPI.triggerScraper(token);
      toast.success("Scraper je pokrenut");
    } catch {
      toast.error("Scraper nije dostupan");
    } finally {
      setScraperLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={24} className="animate-spin text-brand-600" />
      </div>
    );
  }

  const statCards = [
    {
      label: "Ukupno vijesti",
      value: stats?.totalArticles,
      sub: `${stats?.publishedArticles} objavljenih`,
      icon: FileText,
      color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
    },
    {
      label: "Na čekanju",
      value: stats?.pendingArticles,
      sub: "vijesti čeka odobrenje",
      icon: AlertCircle,
      color: "text-orange-600 bg-orange-50 dark:bg-orange-950/30",
    },
    {
      label: "Komentari",
      value: stats?.totalComments,
      sub: `${stats?.pendingComments} na čekanju`,
      icon: MessageCircle,
      color: "text-green-600 bg-green-50 dark:bg-green-950/30",
    },
    {
      label: "Korisnici",
      value: stats?.totalUsers,
      sub: "registrovanih",
      icon: Users,
      color: "text-purple-600 bg-purple-50 dark:bg-purple-950/30",
    },
    {
      label: "Pregledi danas",
      value: stats?.todayViews,
      sub: "uniknih posjeta",
      icon: TrendingUp,
      color: "text-brand-600 bg-brand-50 dark:bg-brand-950/30",
    },
    {
      label: "Ukupno pregleda",
      value: stats?.totalViews,
      sub: "svih vremena",
      icon: Eye,
      color: "text-teal-600 bg-teal-50 dark:bg-teal-950/30",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black font-serif">Admin Dashboard</h1>
          <p className="text-neutral-500 mt-1">Upravljanje K1.ba portalom</p>
        </div>
        <button
          onClick={triggerScraper}
          disabled={scraperLoading}
          className="btn-primary"
        >
          {scraperLoading ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <CheckCircle2 size={16} />
          )}
          Pokreni Scraper
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {statCards.map((card) => (
          <div key={card.label} className="card-news p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-neutral-500">{card.label}</p>
                <p className="text-3xl font-black mt-1">
                  {formatNumber(card.value || 0)}
                </p>
                <p className="text-xs text-neutral-400 mt-1">{card.sub}</p>
              </div>
              <div className={`p-3 rounded-xl ${card.color}`}>
                <card.icon size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a
          href="/admin/clanci"
          className="card-news p-5 hover:border-brand-300 dark:hover:border-brand-700 transition-colors group"
        >
          <FileText size={24} className="text-brand-600 mb-3" />
          <h3 className="font-bold group-hover:text-brand-600 transition-colors">
            Upravljanje člancima
          </h3>
          <p className="text-sm text-neutral-500 mt-1">Pregledaj, uredi, objavi</p>
        </a>
        <a
          href="/admin/komentari"
          className="card-news p-5 hover:border-brand-300 dark:hover:border-brand-700 transition-colors group"
        >
          <MessageCircle size={24} className="text-green-600 mb-3" />
          <h3 className="font-bold group-hover:text-brand-600 transition-colors">
            Moderacija komentara
          </h3>
          <p className="text-sm text-neutral-500 mt-1">
            {stats?.pendingComments || 0} komentara čeka
          </p>
        </a>
        <a
          href="/admin/scraper"
          className="card-news p-5 hover:border-brand-300 dark:hover:border-brand-700 transition-colors group"
        >
          <RefreshCw size={24} className="text-orange-600 mb-3" />
          <h3 className="font-bold group-hover:text-brand-600 transition-colors">
            Scraper logovi
          </h3>
          <p className="text-sm text-neutral-500 mt-1">AI pipeline status</p>
        </a>
      </div>
    </div>
  );
}
