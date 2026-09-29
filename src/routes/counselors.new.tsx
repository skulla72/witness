import { createFileRoute } from "@tanstack/react-router";
import { BRAND } from "@/config/brand";
import { CounselorEditor } from "@/components/counselors/CounselorEditor";

export const Route = createFileRoute("/counselors/new")({
  staticData: { sitemap: false },
  component: () => <CounselorEditor />,
  head: () => ({
    meta: [
      { title: `Create your counselor page · ${BRAND.name}` },
      { name: "description", content: "Licensed counselors can create a page. Our team checks your license before it goes live." },
      { property: "og:title", content: `Create your counselor page · ${BRAND.name}` },
      { property: "og:description", content: "A verified page for licensed counselors." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
