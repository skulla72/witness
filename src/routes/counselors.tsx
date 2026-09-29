import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/counselors")({
  staticData: { sitemap: false },
  component: () => <Outlet />,
});
