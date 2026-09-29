import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Clock, UserCheck, UserPlus, X } from "lucide-react";
import { askToConnect, friendLink, removeLink, respond, statusFor } from "@/lib/friends";

interface Props {
  myUserId: string;
  personId: string;
  firstName: string;
}

/** Ask someone to connect, or answer their ask. */
export function FriendButton({ myUserId, personId, firstName }: Props) {
  const qc = useQueryClient();
  const linkQ = useQuery({
    queryKey: ["friend-link", myUserId, personId],
    queryFn: () => friendLink(myUserId, personId),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["friend-link", myUserId, personId] });
    qc.invalidateQueries({ queryKey: ["friend-requests"] });
    qc.invalidateQueries({ queryKey: ["friends"] });
  };

  if (linkQ.isLoading) {
    return <span className="h-9 w-32 rounded-full border border-border bg-card animate-pulse" />;
  }

  const link = linkQ.data ?? null;
  const status = statusFor(link, myUserId);

  const ask = async () => {
    const res = await askToConnect(myUserId, personId);
    if (res.error) toast.error(res.error);
    else toast.success(`Asked ${firstName} to connect.`);
    refresh();
  };

  const answer = async (next: "accepted" | "declined") => {
    if (!link) return;
    const res = await respond(link.id, next);
    if (res.error) toast.error(res.error);
    else toast.success(next === "accepted" ? `You and ${firstName} are connected.` : "Request declined.");
    refresh();
  };

  const undo = async () => {
    if (!link) return;
    const res = await removeLink(link.id);
    if (res.error) toast.error(res.error);
    refresh();
  };

  if (status === "friends") {
    return (
      <button
        onClick={() => void undo()}
        className="inline-flex items-center gap-2 rounded-full border border-brass/40 bg-brass/10 px-4 py-2 text-[12.5px] text-ink"
      >
        <UserCheck className="h-3.5 w-3.5 text-brass" /> Connected
      </button>
    );
  }

  if (status === "pending_out") {
    return (
      <button
        onClick={() => void undo()}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-[12.5px] text-ink-soft"
      >
        <Clock className="h-3.5 w-3.5" /> Request sent
      </button>
    );
  }

  if (status === "pending_in") {
    return (
      <span className="inline-flex items-center gap-2">
        <button
          onClick={() => void answer("accepted")}
          className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[12.5px] text-paper"
        >
          <Check className="h-3.5 w-3.5" /> Accept
        </button>
        <button
          onClick={() => void answer("declined")}
          aria-label={`Decline ${firstName}'s request`}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-[12.5px] text-ink-soft"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => void ask()}
      className="inline-flex items-center gap-2 rounded-full border border-ink/20 bg-card px-4 py-2 text-[12.5px] text-ink"
    >
      <UserPlus className="h-3.5 w-3.5 text-brass" /> Add {firstName}
    </button>
  );
}
