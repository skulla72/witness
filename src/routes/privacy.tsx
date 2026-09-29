import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { BRAND } from "@/config/brand";
import { COVENANT_VERSION } from "@/lib/covenant";
import { LEGAL_ADDRESS, LEGAL_CONTACT } from "@/lib/legal";

export const Route = createFileRoute("/privacy")({
  staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: `Privacy Notice | ${BRAND.name}` },
    { name: "description", content: `What ${BRAND.name} collects, who can see it, how long we keep it, and the choices you have over your information.` },
    { property: "og:title", content: `Privacy Notice | ${BRAND.name}` },
    { property: "og:description", content: `What ${BRAND.name} collects, who can see it, and the choices you have.` },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage title="Privacy Notice" version={COVENANT_VERSION}>
      <p>
        This notice explains what {BRAND.name} ({LEGAL_CONTACT.entity}) collects, why, who can see it, and what you
        can ask us to do about it. People share tender things here, so we collect as little as the app needs.
      </p>

      <h2>What we collect</h2>
      <p>
        <strong>You give us:</strong> your name, email, password, date of birth, profile photo and details; prayers,
        answers, gratitude notes, journal entries, videos, voice recordings and captions; messages and calls you
        place; group and church activity; serving hours and job postings; giving, gift, and receipt details; safety
        reports; survey answers, including whether you want a faith-based experience and your gender when you choose
        to tell us.
      </p>
      <p>
        <strong>We collect automatically:</strong> device and browser type, app version, approximate region, pages
        used, error and performance logs, and push notification tokens if you turn notifications on. We use these to
        keep the app working and to find abuse — not to build advertising profiles.
      </p>
      <p>
        <strong>We do not collect:</strong> precise GPS location, contacts from your phone, or payment card numbers.
        We do not buy personal data, and we do not sell or share your information for advertising.
      </p>

      <h2>Who can see your content</h2>
      <p>
        Visibility follows the audience you choose for each post: only you, your circle, a group, or public.
        Anonymous posting hides your identity from ordinary viewers, but not from authorized safety review. Videos,
        voice recordings, and profile photos are held in private storage and served through short-lived links.
        Verified serving hours and service badges are public by design; the dollar amounts you give are private.
      </p>

      <h2>Care sessions and health information</h2>
      <p>
        What you tell a therapist in a session belongs to that provider's record, not to us. Session notes are
        readable only by the treating provider — not by you through the app, not by our staff. {BRAND.name} is not a
        covered entity or business associate under HIPAA, and this app is not a medical records system. Ask your
        provider directly for your record. See the{" "}
        <Link to="/care-agreement" className="underline">Care Agreement</Link>.
      </p>

      <h2>How we use information</h2>
      <p>
        To run the app and honor your audience choices; to send confirmations, receipts and notifications you asked
        for; to process gifts and orders; to personalize the lanes and rooms you see; to keep people safe and
        investigate reports; to fix bugs and improve the beta; and to meet legal, tax, and accounting obligations.
      </p>

      <h2>Who we share it with</h2>
      <p>
        Only with the services needed to run {BRAND.name}: our hosting and database provider, our payment provider,
        our email sender, push notification delivery, church and place lookup, and error monitoring. Each receives
        the minimum it needs and may not use it for its own purposes. We may also disclose information to comply
        with the law, respond to valid legal process, or prevent imminent harm.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Your content stays until you delete it or close your account. After you close it we remove your profile and
        posts within 30 days, except: giving and receipt records kept for up to 7 years for tax and accounting;
        safety and moderation records kept up to 2 years; and backups that age out within 90 days.
      </p>

      <h2>Your choices</h2>
      <p>
        You can edit your profile, change any post's audience, delete content, turn notifications off, and request
        an export or full deletion from account settings or by emailing{" "}
        <a href={`mailto:${LEGAL_CONTACT.privacyEmail}`} className="underline">{LEGAL_CONTACT.privacyEmail}</a>.
        Depending on where you live you may also have the right to correct information, object to certain
        processing, or complain to a regulator. We will not treat you differently for exercising these rights.
      </p>

      <h2>Children</h2>
      <p>
        {BRAND.name} is not for children under 13, and we do not knowingly collect their information. If you believe
        a child under 13 has an account, email us and we will remove it.
      </p>

      <h2>Security</h2>
      <p>
        We use encrypted connections, row-level access rules so people only reach what they are allowed to see,
        private media storage, and limited staff access. No system is risk-free, so share only what you are
        comfortable placing with the audience you choose. If a breach affects you, we will notify you as required by
        law.
      </p>

      <h2>Where information is handled</h2>
      <p>
        Our providers may process information in the United States and other countries. Where required, we rely on
        standard contractual protections for those transfers.
      </p>

      <h2>Changes and contact</h2>
      <p>
        We will post a new version here when this notice changes and tell you in the app about material changes.
        Privacy questions and rights requests may be sent to{" "}
        <a href={`mailto:${LEGAL_CONTACT.privacyEmail}`} className="underline">{LEGAL_CONTACT.privacyEmail}</a>, or
        by mail to {LEGAL_CONTACT.entity}, Attn: Privacy, {LEGAL_ADDRESS}.
      </p>

      <p className="font-medium">
        This is a beta notice. Have qualified counsel review it before public launch.
      </p>
    </LegalPage>
  );
}
