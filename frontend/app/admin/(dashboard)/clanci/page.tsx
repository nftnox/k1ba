"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
  Edit,
  Archive,
  RefreshCw,
  Zap,
  Filter,
} from "lucide-react";
import { adminAPI } from "@/lib/api";
import { formatDate, formatNumber, cn } from "@/lib/utils";
import toast from "react-hot-toast";

type StatusFilter = "ALL" | "PUBLISHED" | "PENDING" | "DRAFT" | "ARCHIVED";

export default function AdminArticlesPage() {
  const { data: session } = useSession();
  const [articles, setArticles] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchArticles();
  }, [status, page]);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const token = (session as { accessToken?: string })?.accessToken || "";
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (status !== "ALL") params.set("status", status);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/admin/articles?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setArticles(data.data || []);
      setTotal(data.pagination?.total || 0);
    } catch {
      toast.error("Greška pri učitavanju");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const token = (session as { accessToken?: string })?.accessToken || "";
      await adminAPI.publish(id, token);
      toast.success("Vijest objavljena");
      fetchArticles();
    } catch {
      toast.error("Greška");
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      PUBLISHED: { label: "Objavljeno", cls: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" },
      PENDING:   { label: "Na čekanju", cls: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400" },
      DRAFT:     { label: "Draft", cls: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400" },
      ARCHIVED:  { label: "Arhivirano", cls: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" },
    };
    const b = map[s] || { label: s, cls: "bg-neutral-100 text-neutral-600" };
    return <span className={cn("badge", b.cls)}>{b.label}</span>;
  };

  const aiQualityBadge = (article: Record<string, unknown>) => {
    if (!article.aiProcessed) return null;
    const quality = article.aiQuality as number || 0;
    const cls =
      quality >= 80 ? "text-green-500" :
      quality >= 50 ? "text-yellow-500" :
      "text-red-500";
    return (
      <span className={cn("flex items-center gap-1 text-xs font-mono", cls)} title={`AI kvalitet: ${quality}/100`}>
        <Zap size={11} />
        {quality}
      </span>
    );
  };

  const filters: StatusFilter[] = ["ALL", "PENDING", "PUBLISHED", "DRAFT", "ARCHIVED"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black font-serif">Članci ({total})</h1>
        <button onClick={fetchArticles} className="btn-ghost text-sm">
          <RefreshCw size={14} />
          Osvježi
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => { setStatus(f); setPage(1); }}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              status === f
                ? "bg-brand-600 text-white"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
            )}
          >
            {f === "ALL" ? "Sve" : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card-news overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
                <th className="text-left p-4 font-semibold text-neutral-500">Naslov</th>
                <th className="text-left p-4 font-semibold text-neutral-500 hidden md:table-cell">Kategorija</th>
                <th className="text-left p-4 font-semibold text-neutral-500">Status</th>
                <th className="text-left p-4 font-semibold text-neutral-500 hidden lg:table-cell">AI</th>
                <th className="text-left p-4 font-semibold text-neutral-500 hidden lg:table-cell">Pregledi</th>
                <th className="text-left p-4 font-semibold text-neutral-500 hidden xl:table-cell">Datum</th>
                <th className="text-right p-4 font-semibold text-neutral-500">Akcije</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="p-4">
                        <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : articles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-neutral-400">
                    Nema članaka
                  </td>
                </tr>
              ) : (
                articles.map((article) => (
                  <tr key={String(article.id)} className="hover:bg-[hsl(var(--muted))] transition-colors">
                    <td className="p-4 max-w-xs">
                      <div className="font-medium line-clamp-2 text-sm leading-snug">
                        {String(article.title)}
                      </div>
                      {article.sourceUrl && (
                        <div className="text-xs text-neutral-400 mt-0.5 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                          {String(article.sourceName || "Auto")}
                        </div>
                      )}
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <span className="text-xs text-neutral-500">
                        {String((article.category as Record<string, unknown>)?.name || "-")}
                      </span>
                    </td>
                    <td className="p-4">{statusBadge(String(article.status))}</td>
                    <td className="p-4 hidden lg:table-cell">
                      {aiQualityBadge(article)}
                    </td>
                    <td className="p-4 hidden lg:table-cell text-neutral-500">
                      {formatNumber(Number(article.viewCount) || 0)}
                    </td>
                    <td className="p-4 hidden xl:table-cell text-neutral-400 text-xs">
                      {article.publishedAt
                        ? formatDate(String(article.publishedAt), "d.M.yy")
                        : "—"}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        {article.status === "PENDING" && (
                          <button
                            onClick={() => handlePublish(String(article.id))}
                            className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors"
                            title="Objavi"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        <Link
                          href={`/vijest/${article.slug}`}
                          target="_blank"
                          className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                          title="Pregled"
                        >
                          <Eye size={16} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-between p-4 border-t border-[hsl(var(--border))]">
            <span className="text-sm text-neutral-500">
              {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} od {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-ghost text-sm py-1.5 px-3 disabled:opacity-40"
              >
                ← Prethodna
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * 20 >= total}
                className="btn-ghost text-sm py-1.5 px-3 disabled:opacity-40"
              >
                Sljedeća →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
