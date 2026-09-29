import { createFileRoute } from "@tanstack/react-router";
import { getRouterInstance } from "@tanstack/react-start";
import { sitemapStaticPaths, sitemapXML, isSitemapRouteIncluded, sitemapPathForLocation, type SitemapEntry } from "@/lib/sitemap";

const BASE_URL = "https://witnessmovement.com";

export const Route = createFileRoute("/sitemap.xml")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async () => {
        const router = await getRouterInstance();
        const entries: SitemapEntry[] = sitemapStaticPaths(router).map((path) => ({ path }));

        const { createClient } = await import("@supabase/supabase-js");
        const key = process.env['SUPABASE_PUBLISHABLE_KEY']!;
        const supabase = createClient(process.env['SUPABASE_URL']!, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            fetch: (input, init) => {
              const headers = new Headers(init?.headers);
              // Opaque sb_ keys are not JWTs; send apikey without the default bearer.
              if (key.startsWith("sb_") && headers.get("Authorization") === "Bearer " + key) headers.delete("Authorization");
              headers.set("apikey", key);
              return fetch(input, { ...init, headers });
            },
          },
        });

        const pageSize = 1000;

        // Churches, nonprofits and ministries: claimed or verified pages only.
        const orgRouteId = "/community/$slug";
        if (isSitemapRouteIncluded(router.routesById[orgRouteId])) {
          for (let offset = 0; ; ) {
            const { data, error } = await supabase
              .from("organizations")
              .select("slug")
              .or("verified.eq.true,owner_id.not.is.null")
              .order("id")
              .range(offset, offset + pageSize - 1);
            if (error) throw error;
            if (data.length === 0) break;
            for (const row of data) {
              if (!row.slug) continue;
              const location = router.buildLocation({
                to: "/community/$slug",
                params: { slug: row.slug },
                search: () => ({}),
                hash: "",
              });
              const path = sitemapPathForLocation(router, location, orgRouteId);
              if (path) entries.push({ path });
            }
            offset += data.length;
          }
        }

        // Professionals who serve: approved pages only.
        const proRouteId = "/pro/$slug";
        if (isSitemapRouteIncluded(router.routesById[proRouteId])) {
          for (let offset = 0; ; ) {
            const { data, error } = await supabase
              .from("pro_profiles")
              .select("slug")
              .eq("status", "approved")
              .order("id")
              .range(offset, offset + pageSize - 1);
            if (error) throw error;
            if (data.length === 0) break;
            for (const row of data) {
              if (!row.slug) continue;
              const location = router.buildLocation({
                to: "/pro/$slug",
                params: { slug: row.slug },
                search: () => ({}),
                hash: "",
              });
              const path = sitemapPathForLocation(router, location, proRouteId);
              if (path) entries.push({ path });
            }
            offset += data.length;
          }
        }

        if (entries.length === 0) {
          return new Response(
            'No pages are included in this sitemap. Check route decisions and ancestor exclusions. Setting "exclude-subtree" on the root excludes the entire site.',
            { status: 404, headers: { "Cache-Control": "no-store" } },
          );
        }
        return new Response(sitemapXML(BASE_URL, entries), {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
