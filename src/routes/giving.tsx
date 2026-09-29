import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/giving")({
  staticData: { sitemap: false },
  component: () => <Outlet />,
});
