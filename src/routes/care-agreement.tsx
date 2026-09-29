import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { BRAND } from "@/config/brand";
import { LEGAL_ADDRESS, LEGAL_CONTACT } from "@/lib/legal";
import {
  CARE_AGREEMENT_TITLE,
  CARE_AGREEMENT_VERSION,
  CLIENT_CLAUSES,
  THERAPIST_CLAUSES,
  type AgreementClause,
} from "@/lib/therapy-agreement";

export const Route = createFileRoute("/care-agreement")({
  staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: `Care Agreement | ${BRAND.name}` },
    { name: "description", content: `The agreement both the person and the licensed therapist sign before a ${BRAND.name} care session can begin.` },
    { property: "og:title", content: `Care Agreement | ${BRAND.name}` },
    { property: "og:description", content: "What both people sign before a care session begins: consent, confidentiality, records, and emergencies." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: CareAgreementPage,
});

function Clauses({ clauses }: { clauses: AgreementClause[] }) {
  return (
    <>
      {clauses.map(clause => (
        <div key={clause.heading}>
          <h2>{clause.heading}</h2>
          <p>{clause.body}</p>
        </div>
      ))}
    </>
  );
}

function CareAgreementPage() {
  return (
    <LegalPage title={CARE_AGREEMENT_TITLE} version={CARE_AGREEMENT_VERSION}>
      <p>
        This is the full text of the agreement both people sign inside the app. A session cannot begin until the
        person seeking care and the licensed therapist have each read it to the end and signed it by name. It sits
        alongside our <Link to="/terms" className="underline">Terms of Use</Link> and{" "}
        <Link to="/privacy" className="underline">Privacy Notice</Link>.
      </p>
      <p>
        {BRAND.name} is operated by {LEGAL_CONTACT.entity}, {LEGAL_ADDRESS}.
      </p>
      <p>
        If you are in danger right now, do not wait for a session — call or text 988 in the United States, or see our{" "}
        <Link to="/crisis" className="underline">crisis resources</Link>.
      </p>

      <h2>For the person seeking care</h2>
      <Clauses clauses={CLIENT_CLAUSES} />

      <h2>For the licensed therapist</h2>
      <Clauses clauses={THERAPIST_CLAUSES} />

      <h2>New versions</h2>
      <p>
        If this wording changes, we publish a new version and ask everyone to sign again before their next session.
        Questions may be sent to{" "}
        <a href={`mailto:${LEGAL_CONTACT.email}`} className="underline">{LEGAL_CONTACT.email}</a>, or by mail to{" "}
        {LEGAL_CONTACT.entity}, {LEGAL_ADDRESS}.
      </p>

      <p className="font-medium">
        This is a beta document. Have qualified counsel and a clinical supervisor review it before real sessions
        take place.
      </p>
    </LegalPage>
  );
}
