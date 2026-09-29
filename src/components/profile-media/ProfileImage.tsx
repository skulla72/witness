import { Building2, UserRound } from "lucide-react";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { cn } from "@/lib/utils";

export function ProfileImage({
  path,
  alt,
  shape = "square",
  className,
  organization = false,
}: {
  path?: string | null;
  alt: string;
  shape?: "square" | "wide";
  className?: string;
  organization?: boolean;
}) {
  const { url, loading } = useSignedUrl(path, "profile-media");
  const sizing = shape === "wide" ? "aspect-[16/7] w-full rounded-md" : "aspect-square rounded-md";
  if (loading) return <div className={cn(sizing, "animate-pulse bg-secondary", className)} />;
  if (url) return <img src={url} alt={alt} loading="lazy" className={cn(sizing, "object-cover", className)} />;
  const Icon = organization ? Building2 : UserRound;
  return <div className={cn(sizing, "grid place-items-center bg-secondary text-brass", className)}><Icon className="h-1/3 w-1/3" aria-hidden="true" /></div>;
}