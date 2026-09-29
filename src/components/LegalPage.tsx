import { Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export function LegalPage({ title, version, children }: { title: string; version: string; children: React.ReactNode }) {
  return <main className="min-h-screen bg-paper px-5 py-8 text-ink"><div className="mx-auto max-w-2xl">
    <Link to="/login" className="inline-flex items-center gap-2 text-[13px] text-ink-soft"><ArrowLeft className="h-4 w-4" /> Back</Link>
    <ShieldCheck className="mt-10 h-7 w-7 text-brass" /><h1 className="mt-4 font-serif text-[30px]">{title}</h1>
    <p className="mt-2 text-[12px] text-ink-soft">Beta version {version}</p>
    <article className="mt-8 space-y-4 text-[14px] leading-7 text-ink-soft [&_h2]:pt-4 [&_h2]:font-serif [&_h2]:text-[18px] [&_h2]:text-ink">{children}</article>
  </div></main>;
}