import { createFileRoute, Outlet } from "@tanstack/react-router";
import { CareLaunchNotice } from "@/components/CareLaunchNotice";

export const Route = createFileRoute("/counselors")({
  staticData: { sitemap: false },
  component: () => <><CareLaunchNotice /><Outlet /></>,
});
