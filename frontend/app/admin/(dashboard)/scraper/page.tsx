"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  Clock,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { adminAPI } from "@/lib/api";
import { formatRelativeTime, cn } from "@/lib/utils";
import type { ScraperLog } from "@/types";
import toast from "react-hot-toast";

export default function ScraperPage() {
  const { data: session } = useSession();
  const [logs, setLogs] = useState<ScraperLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [scraperStatus, setScraperStatus] = useState<"online" | "offline" | "loading">("loading");

  useEffect(() => {
    fetchLogs();
    checkScraper();
    const interval = setInterval(() => {
      fetchLogs();
      checkScraper();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchLogs = async () => {
    try {
      const token = (session as { accessToken?: string })?.accessToken || "";
      const data = await adminAPI.getScraperLogs(token);
      setLogs(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const checkScraper = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL?.replace("8000", "8001") || "http://localhost:8001"}/health`
      );
      setScraperStatus(res.ok ? "online" : "offline");
    } catch {
      setScraperStatus("offline");
    }
  };

  const triggerScraper = async () => {
    setTriggering(true);
    try {
      const token = (session as { accessToken?: string })?.accessToken || "";
      await adminAPI.triggerScraper(token);
      toast.success("Scraper je pokrenut – čekaj 1-2 minute");
      setTimeout(fetchLogs, 5000);
    } catch {
      toast.error("Scraper nije dostupan. Provjeri Docker servis.");
    } finally {
      setTriggering(false);
    }
  };

  const statusIcon = (status: string) => {
    if (status === "SUCCESS") return <CheckCircle2 size={16} className="text-green-500" />;
    if (status === "FAILED") return <XCircle size={16} className="text-red-500" />;
    return <Loader2 size={16} className="text-blue-500 animate-spin" />;
  };

  const scraperBadge = {
    online: { cls: "bg-green-100 text-green-700", label: "Online" },
    offline: { cls: "bg-red-100 text-red-700", label: "Offline" },
    loading: { cls: "bg-neutral-100 text-neutral-600", label: "Provjera..." },
  }[scraperStatus];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black font-serif">Scraper & AI Pipeline</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn("badge text-xs", scraperBadge.cls)}>
              {scraperBadge.label}
            </span>
            <span className="text-xs text-neutral-500">
              Automatski interval: svakih 5 minuta
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchLogs} className="btn-ghost text-sm">
            <RefreshCw size={14} />
            Osvježi
          </button>
          <button
            onClick={triggerScraper}
            disabled={triggering || scraperStatus === "offline"}
            className="btn-primary text-sm"
          >
            {triggering ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Play size={14} />
            )}
            Pokreni odmah
          </button>
        </div>
      </div>

      {/* Pipeline info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Scraping", desc: "Klix, Avaz, N1, Oslobođenje", icon: FileText, color: "text-blue-600" },
          { label: "AI Rewrite", desc: "Ollama – DeepSeek/Mistral", icon: RefreshCw, color: "text-purple-600" },
          { label: "Auto-publish", desc: "PostgreSQL + Redis cache", icon: CheckCircle2, color: "text-green-600" },
        ].map((step, i) => (
          <div key={i} className="card-news p-4 flex items-start gap-3">
            <step.icon size={20} className={cn("flex-shrink-0 mt-0.5", step.color)} />
            <div>
              <p className="font-semibold text-sm">{step.label}</p>
              <p className="text-xs text-neutral-500 mt-0.5">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Logs */}
      <div className="card-news overflow-hidden">
        <div className="p-4 border-b border-[hsl(var(--border))] flex items-center justify-between">
          <h2 className="font-bold">Logovi ({logs.length})</h2>
          <span className="text-xs text-neutral-400">Zadnjih 50 ciklusa</span>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <Loader2 size={24} className="animate-spin mx-auto text-brand-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-neutral-400">
            <Clock size={32} className="mx-auto mb-2 opacity-30" />
            <p>Nema logova. Pokrenite scraper.</p>
          </div>
        ) : (
          <div className="divide-y divide-[hsl(var(--border))]">
            {logs.map((log) => (
              <div key={log.id} className="p-4 flex items-start gap-3 hover:bg-[hsl(var(--muted))] transition-colors">
                <div className="mt-0.5 flex-shrink-0">{statusIcon(log.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-medium text-sm">{log.source}</span>
                    <span className="text-xs text-neutral-500">
                      {formatRelativeTime(log.startedAt)}
                    </span>
                    {log.articlesProcessed > 0 && (
                      <span className="text-xs text-green-600 font-medium">
                        +{log.articlesProcessed} objavljeno
                      </span>
                    )}
                    {log.articlesFound > 0 && (
                      <span className="text-xs text-neutral-500">
                        {log.articlesFound} pronađeno
                      </span>
                    )}
                  </div>
                  {log.errors && log.errors.length > 0 && (
                    <div className="mt-1 flex items-start gap-1">
                      <AlertTriangle size={11} className="text-orange-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-orange-600 dark:text-orange-400 line-clamp-1">
                        {log.errors[0]}
                      </p>
                    </div>
                  )}
                </div>
                {log.completedAt && (
                  <span className="text-xs text-neutral-400 flex-shrink-0">
                    {Math.round(
                      (new Date(log.completedAt).getTime() - new Date(log.startedAt).getTime()) / 1000
                    )}s
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
