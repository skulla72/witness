import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/gratitude")({
  staticData: { sitemap: false },
  component: () => <Outlet />,
});
