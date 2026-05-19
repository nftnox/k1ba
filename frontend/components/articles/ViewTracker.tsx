"use client";

import { useEffect } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:8000";

export function ViewTracker({ articleId }: { articleId: string }) {
  useEffect(() => {
    fetch(`${API_BASE}/api/articles/${articleId}/view`, { method: "POST" }).catch(
      () => {}
    );
  }, [articleId]);

  return null;
}
