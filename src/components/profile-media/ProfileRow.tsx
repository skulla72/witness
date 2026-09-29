import { ChevronRight } from "lucide-react";
import { ProfileImage } from "./ProfileImage";

export function ProfileRow({ image, name, detail, organization = false, trailing }: {
  image?: string | null;
  name: string;
  detail: string;
  organization?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <ProfileImage path={image} alt="" organization={organization} className="h-14 w-14 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-[16px] leading-tight text-ink">{name}</p>
        <p className="mt-1 truncate text-[11.5px] text-ink-soft">{detail}</p>
      </div>
      {trailing ?? <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden="true" />}
    </div>
  );
}