import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/therapy")({
  staticData: { sitemap: false },
  component: () => <Outlet />,
});
