import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { COVENANT_VERSION } from "@/lib/covenant";
import { BRAND } from "@/config/brand";
import { LEGAL_ADDRESS, LEGAL_CONTACT } from "@/lib/legal";

export const Route = createFileRoute("/terms")({
  staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: `Terms of Use — Unfinished Draft | ${BRAND.name}` },
    { name: "description", content: `The rules of ${BRAND.name}: your account, member stories, serving and needs, giving, care sessions, and the limits of our responsibility.` },
    { property: "og:title", content: `Terms of Use — Unfinished Draft | ${BRAND.name}` },
    { property: "og:description", content: `The rules of ${BRAND.name}: your account, member stories, serving, giving, care sessions, and liability.` },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage title="Terms of Use — Unfinished Draft" version={COVENANT_VERSION}>
      <p>
        These terms are the agreement between you and {BRAND.name} ({LEGAL_CONTACT.entity}). By creating an account
        or using the app you accept them. If you do not accept them, do not use {BRAND.name}.
      </p>
      <p>
        {BRAND.name} is preparing for public release. Any separately enabled
        invitation controls depend on launch configuration, not a private-beta
        confidentiality rule. Features may change. This document is an unfinished
        draft and is not approved for launch.
      </p>

      <h2>1. Who may use {BRAND.name}</h2>
      <p>
        You must be at least 13 years old, and if you are under 18 you must have a parent or guardian's permission.
        You must give accurate information, keep your password to yourself, and you are responsible for everything
        done through your account. One person, one account.
      </p>
      <p>Counseling requests in this launch candidate are for adults 18+ seeking care for themselves only. Teen counseling is deferred until consent and legal arrangements are finalized. Crisis information and unrelated community features remain available.</p>

      <h2>2. Public-release scope</h2>
      <p>
        This draft is prepared for an intended public release. It does not impose
        a beta-confidentiality requirement. Member privacy, audience choices and
        the protections below still apply. Legal approval remains unfinished.
      </p>

      <h2>3. Protect member stories</h2>
      <p>
        Prayer requests, testimony videos, voice recordings, messages, names, and identifying details must stay
        within the audience the author chose. Do not copy, record, republish, sell, scrape, or discuss another
        member's sensitive information without clear permission. Do not use anyone's story or likeness for
        marketing, teaching, research, or training a machine-learning model.
      </p>

      <h2>4. Community conduct</h2>
      <p>
        Do not harass, threaten, exploit, impersonate, spam, defraud, or pressure members. Do not post unlawful
        content, sexual content involving minors, incitement to violence, or content that exposes someone to harm.
        Do not solicit money from members outside the giving features. Respect privacy choices, and report content
        that may place someone at risk.
      </p>

      <h2>5. Your content and the licence you give us</h2>
      <p>
        You keep ownership of what you post. You give {BRAND.name} a worldwide, non-exclusive, royalty-free licence
        to host, store, transcode, and display your content solely to run the app and show it to the audience you
        chose. That licence ends when you delete your content, except for copies we must retain for safety, legal,
        or transaction records, and for content others have already lawfully saved or shared with permission.
      </p>

      <h2>6. Moderation and enforcement</h2>
      <p>
        We may review reported content, restrict features, hide or remove content, and suspend or close accounts to
        protect members or comply with the law. Where practical we will tell you why. Serious safety matters may be
        reported to law enforcement.
      </p>

      <h2>7. Serving, volunteering and needs — no liability</h2>
      <p>
        {BRAND.name} is an introduction and coordination tool only. We do not employ, supervise, train, screen,
        background-check, insure, license, bond, or endorse any member, volunteer, contractor, church, nonprofit,
        homeowner, or organization listed in Serve, Needs, Hours, or Fix that. We do not inspect job sites, verify
        skills or licensure, control how work is performed, or guarantee the quality, timeliness, safety, or
        completion of any work, shift, donation of labor, or delivery of materials.
      </p>
      <p>
        Volunteering, accepting help, entering another person's home or property, operating tools, vehicles,
        ladders, or equipment, and performing manual, trade, or construction work carry real risk of property
        damage, injury, and death. You participate entirely at your own risk and are solely responsible for your
        own decisions, insurance, permits, licensing, tax obligations, workplace safety, and compliance with all
        laws. Verify anyone you invite onto your property or work alongside, and stop any activity that is unsafe or
        beyond your competence.
      </p>
      <p>
        To the fullest extent permitted by law, you release and hold harmless {BRAND.name}, its operators,
        affiliates, and staff from any claim, injury, illness, death, loss, theft, property damage, dispute, or
        expense arising out of serving, volunteering, hours reporting, verification by homeowners or organizations,
        contractor badges, needs postings, or any in-person meeting or work that began on this app. Any dispute is
        between the people and organizations involved. Verified hours, badges, before-and-after photos, and reviews
        are member-submitted claims, not our certification of anyone's character, work, or credentials.
      </p>

      <h2>8. Giving, gifts and pooled job funds</h2>
      <p>
        Gifts are voluntary and, once processed, generally non-refundable except as required by law. Card processing
        is handled by our payment provider; where you choose to cover processing costs, that added amount is part of
        your charge. Thank-you gifts never affect prayer visibility or how anyone's prayers are seen. Where a
        physical item is provided, only the portion of a gift exceeding that item's stated fair market value may be
        tax deductible, and service hours are never tax deductible. Money chipped in toward a job is held until the
        work is verified complete and is refunded if the job stalls. {BRAND.name} may retain a stated platform fee.
        We are not a bank, money transmitter, or investment adviser, and {BRAND.name} does not move money between
        members. Consult your own tax advisor.
      </p>

      <h2>9. Care sessions with therapists</h2>
      <p>
        Therapy sessions are provided by independent licensed professionals, not by {BRAND.name}. We do not employ,
        supervise, insure, or guarantee any provider or the care they give, and we are not your records system.
        Sessions require a separate signed{" "}
        <Link to="/care-agreement" className="underline">Care Agreement</Link> from both people before they begin.
      </p>

      <h2>10. Health and emergencies</h2>
      <p>
        Outside of a booked session with a licensed provider, {BRAND.name} is a peer community — not medical care,
        counseling, legal or financial advice, or emergency support. If someone may be in immediate danger, contact
        local emergency services. In the United States, call or text 988. See our{" "}
        <Link to="/crisis" className="underline">crisis resources</Link>.
      </p>

      <h2>11. Our intellectual property</h2>
      <p>
        The {BRAND.name} name, logo, design, and software belong to us. You may not copy, resell, reverse-engineer,
        or build a competing service from them, and you may not access the app by automated means without our
        written permission.
      </p>

      <h2>12. No warranty</h2>
      <p>
        The app is provided "as is" and "as available," without warranties of any kind, express or implied,
        including fitness for a particular purpose. We do not promise the app will be uninterrupted, secure, or
        error-free, and we do not guarantee any outcome, answer, healing, funding, or help.
      </p>

      <h2>13. Limit of liability</h2>
      <p>
        To the fullest extent permitted by law, {BRAND.name} is not liable for indirect, incidental, special,
        consequential, or punitive damages, or for lost data, lost profits, or emotional distress. Our total
        liability to you for any claim is limited to the greater of the amount you paid us in the twelve months
        before the claim or $100.
      </p>

      <h2>14. Indemnity</h2>
      <p>
        You will defend and indemnify {BRAND.name} against claims, losses, and costs arising from your content, your
        conduct, your in-person meetings and work, or your breach of these terms.
      </p>

      <h2>15. Ending your use</h2>
      <p>
        You may delete your account at any time from account settings. We may end your access if you break these
        terms or if we stop offering the app. Sections about content licences, liability, indemnity, and disputes
        survive after your account closes.
      </p>

      <h2>16. Disputes and governing law</h2>
      <p>
        Common Light LLC is registered in Colorado, USA. Mailing address,
        governing law and dispute terms are awaiting owner/legal confirmation.
        This draft does not select a jurisdiction.
      </p>

      <h2>17. Changes and contact</h2>
      <p>
        We will post a new version here when these terms change and, for material changes, ask you to accept them
        again in the app. {LEGAL_CONTACT.entity} is registered in {LEGAL_ADDRESS}.
        No postal address is confirmed; use the monitored contact email for notice instructions:{" "}
        <a href={`mailto:${LEGAL_CONTACT.email}`} className="underline">{LEGAL_CONTACT.email}</a>.
      </p>

      <p className="font-medium">
        This is an unfinished, unapproved public-release draft. Qualified legal
        review and owner decisions are still required before publication.
      </p>
    </LegalPage>
  );
}
