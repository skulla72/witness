import { Link } from "@tanstack/react-router";
import { TEEN_CARE_NOTICE } from "@/lib/launch-policy";
import { useState } from "react";
import { AdultCareAge } from "@/components/AdultCareAge";

export function CareLaunchNotice() {
  const [age, setAge] = useState("");
  return <aside className="mx-5 mt-4 rounded-xl border border-border p-3 text-[12px] text-ink-soft">
    {TEEN_CARE_NOTICE} Do not request care for anyone under 18. <Link to="/crisis" className="underline">Crisis information remains available to everyone.</Link>
    <details className="mt-2"><summary>Confirm or update adult self-attestation for this account</summary><AdultCareAge value={age} onChange={setAge} /></details>
    <p className="mt-2">Counselor acceptance and therapist-started rooms remain unavailable when this copy cannot establish the actual client's account-bound adulthood. Existing records remain available; no acceptance or room start is silently assumed.</p>
  </aside>;
}
