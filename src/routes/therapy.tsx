import { createFileRoute, Outlet } from "@tanstack/react-router";
import { CareLaunchNotice } from "@/components/CareLaunchNotice";

export const Route = createFileRoute("/therapy")({
  staticData: { sitemap: false },
  component: () => <><CareLaunchNotice /><Outlet /></>,
});
