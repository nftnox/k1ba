"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  Reply,
  Flag,
  ChevronDown,
  Loader2,
  Send,
} from "lucide-react";
import { formatRelativeTime, cn } from "@/lib/utils";
import { commentsAPI } from "@/lib/api";
import type { Comment } from "@/types";
import toast from "react-hot-toast";

interface CommentsSectionProps {
  articleId: string;
}

export function CommentsSection({ articleId }: CommentsSectionProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "popular">("newest");

  useEffect(() => {
    loadComments(1, true);
  }, [articleId, sortBy]);

  const loadComments = async (pageNum: number, reset = false) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await commentsAPI.getByArticle(articleId, pageNum);
      if (reset) {
        setComments(res.data);
      } else {
        setComments((prev) => [...prev, ...res.data]);
      }
      setTotal(res.pagination.total);
      setHasMore(res.pagination.hasNext);
      setPage(pageNum);
    } catch {
      toast.error("Greška pri učitavanju komentara");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      signIn();
      return;
    }
    if (!newComment.trim() || newComment.length < 3) return;

    setSubmitting(true);
    try {
      const comment = await commentsAPI.create(
        { content: newComment.trim(), articleId },
        (session as { accessToken?: string }).accessToken || ""
      );
      setComments((prev) => [comment, ...prev]);
      setTotal((t) => t + 1);
      setNewComment("");
      toast.success("Komentar je objavljen");
    } catch {
      toast.error("Greška pri objavljivanju komentara");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-12">
      <div className="flex items-center justify-between mb-8">
        <h2 className="section-title flex items-center gap-2">
          <MessageCircle size={22} className="text-brand-600" />
          Komentari ({total})
        </h2>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortBy("newest")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              sortBy === "newest"
                ? "bg-brand-600 text-white"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            )}
          >
            Najnoviji
          </button>
          <button
            onClick={() => setSortBy("popular")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              sortBy === "popular"
                ? "bg-brand-600 text-white"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            )}
          >
            Najpopularniji
          </button>
        </div>
      </div>

      {/* Comment form */}
      <div className="mb-8 p-5 bg-[hsl(var(--muted))] rounded-xl">
        {!session ? (
          <div className="text-center py-4">
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              Prijavite se da ostavite komentar
            </p>
            <button
              onClick={() => signIn()}
              className="btn-primary"
            >
              Prijava / Registracija
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {session.user?.name?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Napišite komentar..."
                  rows={3}
                  className="input-field resize-none text-sm"
                  maxLength={2000}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-neutral-400">
                    {newComment.length}/2000
                  </span>
                  <button
                    type="submit"
                    disabled={submitting || !newComment.trim()}
                    className="btn-primary py-2 px-4 text-sm"
                  >
                    {submitting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                    Objavi
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Comments list */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-700 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 bg-neutral-200 dark:bg-neutral-700 rounded" />
                <div className="h-4 w-full bg-neutral-200 dark:bg-neutral-700 rounded" />
                <div className="h-4 w-3/4 bg-neutral-200 dark:bg-neutral-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12 text-neutral-400">
          <MessageCircle size={40} className="mx-auto mb-3 opacity-30" />
          <p>Budite prvi koji komentariše</p>
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-6">
            {comments.map((comment, i) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                articleId={articleId}
                session={session}
                index={i}
                onReply={(newReply) => {
                  setComments((prev) =>
                    prev.map((c) =>
                      c.id === comment.id
                        ? {
                            ...c,
                            replies: [...(c.replies || []), newReply],
                          }
                        : c
                    )
                  );
                }}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      {hasMore && (
        <div className="text-center mt-8">
          <button
            onClick={() => loadComments(page + 1)}
            disabled={loadingMore}
            className="btn-secondary"
          >
            {loadingMore ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ChevronDown size={16} />
            )}
            Učitaj više komentara
          </button>
        </div>
      )}
    </section>
  );
}

interface CommentItemProps {
  comment: Comment;
  articleId: string;
  session: ReturnType<typeof useSession>["data"];
  index: number;
  onReply: (reply: Comment) => void;
  isReply?: boolean;
}

function CommentItem({
  comment,
  articleId,
  session,
  index,
  onReply,
  isReply = false,
}: CommentItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [likes, setLikes] = useState(
    comment.reactions?.filter((r) => r.type === "LIKE").length || 0
  );
  const [dislikes, setDislikes] = useState(
    comment.reactions?.filter((r) => r.type === "DISLIKE").length || 0
  );

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !replyText.trim()) return;

    setSubmittingReply(true);
    try {
      const reply = await commentsAPI.create(
        { content: replyText.trim(), articleId, parentId: comment.id },
        (session as { accessToken?: string }).accessToken || ""
      );
      onReply(reply);
      setReplyText("");
      setShowReplyForm(false);
      toast.success("Odgovor je objavljen");
    } catch {
      toast.error("Greška");
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleReact = async (type: "LIKE" | "DISLIKE") => {
    if (!session) {
      signIn();
      return;
    }
    try {
      await commentsAPI.react(
        comment.id,
        type,
        (session as { accessToken?: string }).accessToken || ""
      );
      if (type === "LIKE") setLikes((l) => l + 1);
      else setDislikes((d) => d + 1);
    } catch {
      // ignore
    }
  };

  const handleReport = async () => {
    if (!session) {
      signIn();
      return;
    }
    try {
      await commentsAPI.report(
        comment.id,
        "spam",
        (session as { accessToken?: string }).accessToken || ""
      );
      toast.success("Komentar je prijavljen");
    } catch {
      toast.error("Greška");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={cn("flex gap-3", isReply && "ml-10 mt-3")}
    >
      <div
        className={cn(
          "rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-400 font-bold flex-shrink-0",
          isReply ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm"
        )}
      >
        {comment.author?.name?.[0]?.toUpperCase() || "?"}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm">
            {comment.author?.name || "Anonimno"}
          </span>
          <span className="text-xs text-neutral-400">
            {formatRelativeTime(comment.createdAt)}
          </span>
        </div>

        <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          {comment.content}
        </p>

        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={() => handleReact("LIKE")}
            className="flex items-center gap-1 text-xs text-neutral-400 hover:text-green-500 transition-colors"
          >
            <ThumbsUp size={13} />
            <span>{likes}</span>
          </button>
          <button
            onClick={() => handleReact("DISLIKE")}
            className="flex items-center gap-1 text-xs text-neutral-400 hover:text-red-500 transition-colors"
          >
            <ThumbsDown size={13} />
            <span>{dislikes}</span>
          </button>
          {!isReply && (
            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-brand-600 transition-colors"
            >
              <Reply size={13} />
              Odgovori
            </button>
          )}
          <button
            onClick={handleReport}
            className="flex items-center gap-1 text-xs text-neutral-300 hover:text-orange-500 transition-colors ml-auto"
            title="Prijavi komentar"
          >
            <Flag size={12} />
          </button>
        </div>

        {/* Reply form */}
        <AnimatePresence>
          {showReplyForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleReply}
              className="mt-3"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Vaš odgovor..."
                  className="input-field text-sm py-2"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={submittingReply || !replyText.trim()}
                  className="btn-primary py-2 px-3 text-sm"
                >
                  {submittingReply ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-4 space-y-3 border-l-2 border-[hsl(var(--border))] pl-4">
            {comment.replies.map((reply, ri) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                articleId={articleId}
                session={session}
                index={ri}
                onReply={() => {}}
                isReply
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
