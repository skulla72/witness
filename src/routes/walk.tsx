import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/walk")({
  staticData: { sitemap: false },
  component: () => <Outlet />,
});
