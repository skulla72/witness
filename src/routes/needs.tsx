import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/needs")({
  staticData: { sitemap: false },
  component: () => <Outlet />,
});
