import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Copy, Download, QrCode, Share2 } from "lucide-react";

/** One link + QR a church or organization can put on a slide, bulletin or card. */
export function InviteKit({ slug, name }: { slug: string; name: string }) {
  const [qr, setQr] = useState<string | null>(null);
  const [link, setLink] = useState(`https://witnessmovement.com/join/${slug}`);

  useEffect(() => {
    const url = `${window.location.origin}/join/${slug}`;
    setLink(url);
    QRCode.toDataURL(url, { margin: 1, width: 640, color: { dark: "#1b2540", light: "#faf8f3" } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [slug]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Invite link copied.");
    } catch {
      toast.error("Couldn't copy — press and hold the link instead.");
    }
  };
  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: `Join ${name} on Witness`, url: link }); } catch { /* closed */ }
    } else copy();
  };

  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <h2 className="mb-3 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-ink-soft">
        <QrCode className="h-3.5 w-3.5" /> Invite your people
      </h2>
      <p className="text-[13px] leading-relaxed text-ink-soft">
        Put this code on a slide, bulletin or card. Anyone who scans it joins {name} on Witness in one step.
      </p>
      <div className="mt-3 flex items-center gap-4">
        {qr ? (
          <img src={qr} alt={`QR code to join ${name}`} className="h-28 w-28 rounded-lg border border-border" />
        ) : (
          <div className="h-28 w-28 rounded-lg border border-border bg-paper-warm" />
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <p className="break-all text-[12px] text-ink">{link}</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={copy} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-[12px] text-ink">
              <Copy className="h-3 w-3" /> Copy
            </button>
            <button onClick={share} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-[12px] text-ink">
              <Share2 className="h-3 w-3" /> Share
            </button>
            {qr && (
              <a href={qr} download={`${slug}-witness-qr.png`} className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-[12px] text-paper">
                <Download className="h-3 w-3" /> Save code
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
