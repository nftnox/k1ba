import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Clock, Eye, Calendar, User, Tag } from "lucide-react";
import { articlesAPI } from "@/lib/api";
import { formatDate, getImageUrl } from "@/lib/utils";
import { ShareButtons } from "@/components/articles/ShareButtons";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { ReadingProgress } from "@/components/articles/ReadingProgress";
import { ViewTracker } from "@/components/articles/ViewTracker";
import { ArticleInlineAd, SidebarRectangle } from "@/components/ui/AdSlot";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const article = await articlesAPI.getBySlug(slug);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://k1.ba";
    const canonicalUrl = `${appUrl}/vijest/${slug}`;

    return {
      title: article.metaTitle || article.title,
      description:
        article.metaDescription || article.excerpt,
      keywords: article.metaKeywords || undefined,
      alternates: { canonical: canonicalUrl },
      openGraph: {
        type: "article",
        url: canonicalUrl,
        title: article.title,
        description: article.excerpt,
        images: article.featuredImage
          ? [{ url: getImageUrl(article.featuredImage), width: 1200, height: 630 }]
          : undefined,
        publishedTime: String(article.publishedAt),
        modifiedTime: String(article.updatedAt),
        section: article.category.name,
        tags: article.tags?.map((t) => t.name),
      },
      twitter: {
        card: "summary_large_image",
        title: article.title,
        description: article.excerpt,
        images: article.featuredImage
          ? [getImageUrl(article.featuredImage)]
          : undefined,
      },
    };
  } catch {
    return { title: "Vijest nije pronaÄ‘ena" };
  }
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;

  let article;
  try {
    article = await articlesAPI.getBySlug(slug);
  } catch {
    notFound();
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://k1.ba";
  const articleUrl = `${appUrl}/vijest/${slug}`;

  let relatedArticles: any[] = [];
  try {
    relatedArticles = await articlesAPI.getRelated(article.id, 4);
  } catch {
    // ignore
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.excerpt,
    image: article.featuredImage ? [getImageUrl(article.featuredImage)] : [],
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: {
      "@type": "Person",
      name: article.author?.name || "K1 Redakcija",
    },
    publisher: {
      "@type": "Organization",
      name: "K1.ba",
      logo: { "@type": "ImageObject", url: `${appUrl}/logo.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
    articleSection: article.category.name,
    keywords: article.tags?.map((t) => t.name).join(", "),
  };

  return (
    <>
      <ReadingProgress />
      <ViewTracker articleId={article.id} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="container-news py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Article content */}
          <div className="lg:col-span-8">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-neutral-400 mb-6" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-brand-600 transition-colors">PoÄŤetna</Link>
              <span>/</span>
              <Link
                href={`/kategorije/${article.category.slug}`}
                className="hover:text-brand-600 transition-colors"
              >
                {article.category.name}
              </Link>
              <span>/</span>
              <span className="text-neutral-600 dark:text-neutral-400 truncate max-w-[200px]">
                {article.title}
              </span>
            </nav>

            {/* Category + Breaking */}
            <div className="flex items-center gap-3 mb-4">
              <Link
                href={`/kategorije/${article.category.slug}`}
                className="badge-category"
              >
                {article.category.name}
              </Link>
              {article.isBreaking && (
                <span className="badge-breaking text-xs">Breaking</span>
              )}
            </div>

            {/* Title */}
            <h1 className="font-serif font-black text-3xl md:text-4xl lg:text-5xl leading-tight mb-5 text-balance">
              {article.title}
            </h1>

            {/* Excerpt / Lead */}
            {article.excerpt && (
              <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 leading-relaxed mb-6 font-medium border-l-4 border-brand-600 pl-4">
                {article.excerpt}
              </p>
            )}

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-400 mb-8 pb-6 border-b border-[hsl(var(--border))]">
              <div className="flex items-center gap-1.5">
                <User size={14} />
                <span>{article.author?.name || "K1 Redakcija"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar size={14} />
                <time dateTime={String(article.publishedAt)}>
                  {formatDate(article.publishedAt)}
                </time>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={14} />
                <span>{article.readingTime} min ÄŤitanja</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Eye size={14} />
                <span>{article.viewCount?.toLocaleString()} pregleda</span>
              </div>
            </div>

            {/* Featured image */}
            {article.featuredImage && (
              <figure className="mb-8 rounded-xl overflow-hidden">
                <Image
                  src={getImageUrl(article.featuredImage)}
                  alt={article.featuredImageAlt || article.title}
                  width={1200}
                  height={630}
                  priority
                  className="w-full object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 800px"
                />
                {article.featuredImageAlt && (
                  <figcaption className="text-xs text-neutral-400 text-center mt-2 italic">
                    {article.featuredImageAlt}
                  </figcaption>
                )}
              </figure>
            )}

            {/* Content */}
            <div
              className="prose-news"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />

            {/* Inline ad â€“ poslije sadrĹľaja */}
            <ArticleInlineAd slot="article-after-content" />

            {/* Tags â€“ sada vode na /tag/slug */}
            {article.tags && article.tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap mt-6 pt-6 border-t border-[hsl(var(--border))]">
                <Tag size={14} className="text-neutral-400" />
                {article.tags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/tag/${tag.slug}`}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-950 dark:hover:text-brand-400 transition-colors"
                  >
                    #{tag.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Share */}
            <div className="mt-8 pt-6 border-t border-[hsl(var(--border))]">
              <ShareButtons url={articleUrl} title={article.title} />
            </div>

            {/* Comments */}
            <CommentsSection articleId={article.id} />
          </div>

          {/* Sticky sidebar */}
          <aside className="hidden lg:block lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              {/* Related articles */}
              {relatedArticles.length > 0 && (
                <div className="card-news p-5">
                  <div className="mb-4">
                    <div className="section-divider" />
                    <h3 className="font-bold text-base">Povezane vijesti</h3>
                  </div>
                  <div className="space-y-4">
                    {relatedArticles.map((related, i) => (
                      <ArticleCard
                        key={related.id}
                        article={related}
                        variant="horizontal"
                        index={i}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Sidebar ad */}
              <SidebarRectangle slot="sidebar-article" />

              {/* Category latest */}
              <div className="card-news p-5">
                <div className="mb-4">
                  <div className="section-divider" />
                  <Link
                    href={`/kategorije/${article.category.slug}`}
                    className="font-bold text-base hover:text-brand-600 transition-colors"
                  >
                    ViĹˇe iz {article.category.name} â†’
                  </Link>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </article>
    </>
  );
}
