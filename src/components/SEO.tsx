import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
  type?: "website" | "article";
  /** When true, marks the page as noindex,nofollow (admin/dashboard/private). */
  noindex?: boolean;
}

const DEFAULT_IMAGE = "https://seuvideopronto.lovable.app/og-image.png";

/**
 * Lightweight, SSR-safe SEO head manager.
 * Updates document.title and a curated set of meta/link tags via DOM.
 * - Avoids duplicates by reusing tags via [data-seo] markers.
 * - Cleans up nothing (next mount overwrites in place).
 *
 * For private routes, pass `noindex` to emit robots=noindex,nofollow.
 */
export const SEO = ({
  title,
  description,
  canonical,
  image,
  type = "website",
  noindex = false,
}: SEOProps) => {
  useEffect(() => {
    if (typeof document === "undefined") return;

    if (title) document.title = title;

    const setMeta = (selector: string, attr: string, value: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, value);
        el.setAttribute("data-seo", "1");
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const setLink = (rel: string, href: string) => {
      let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", rel);
        el.setAttribute("data-seo", "1");
        document.head.appendChild(el);
      }
      el.setAttribute("href", href);
    };

    if (description) {
      setMeta('meta[name="description"]', "name", "description", description);
      setMeta('meta[property="og:description"]', "property", "og:description", description);
      setMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
    }
    if (title) {
      setMeta('meta[property="og:title"]', "property", "og:title", title);
      setMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
    }
    setMeta('meta[property="og:type"]', "property", "og:type", type);
    setMeta(
      'meta[property="og:image"]',
      "property",
      "og:image",
      image || DEFAULT_IMAGE,
    );
    setMeta(
      'meta[name="twitter:image"]',
      "name",
      "twitter:image",
      image || DEFAULT_IMAGE,
    );

    const url = canonical || (typeof window !== "undefined" ? window.location.href : "");
    if (url) {
      setMeta('meta[property="og:url"]', "property", "og:url", url);
      setLink("canonical", url);
    }

    setMeta(
      'meta[name="robots"]',
      "name",
      "robots",
      noindex
        ? "noindex,nofollow"
        : "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1",
    );
  }, [title, description, canonical, image, type, noindex]);

  return null;
};

export default SEO;
