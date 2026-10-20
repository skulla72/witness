# Draft reviewer instructions
Latest local additions: `/account-controls` allows only authenticated own
cancellation/recurring stops without age eligibility. It exposes no purchases
or other protected content. Do not perform a real cancellation as a review test.
Call admission now checks all linked clinical sessions before media, but needs
the existing authoritative server reader; unavailable access blocks peer/care
admission. No reviewer should be told those live flows are verified. See
[current verification](../ACTION-BOUNDARIES-VERIFICATION.md).


**INTERNAL — DO NOT SUBMIT UNTIL ACCESS AND RELEASE GATES PASS**

These instructions are an outline for the eventual signed release. They have
not been executed with a review account. Do not give store reviewers a broken
login, a production owner's personal account, or secret values.

## Missing review access

| Required item | Current status / secure destination |
| --- | --- |
| Apple review contact name/email/phone | OWNER REQUIRED; App Store Connect → app version → App Review Information |
| Active dedicated review account / full demo access | NOT PROVIDED OR VERIFIED; credentials belong only in protected App Review Information and Play Console's App access instructions |
| Google Play review login / all restricted steps | NOT PROVIDED OR VERIFIED; Play Console → Policy and programs / App content → App access (console labels may vary) |
| Invitation for intended release configuration | Local `BRAND.inviteOnly=false`; preserve conditional invitation checks. Owner must confirm published setting and provide valid review access if gating is enabled |
| Reviewer access to all roles/restricted functionality | Missing. Document individual/member/org/counselor/moderator requirements as applicable; do not expose a real admin account |
| Review-safe content and transactions | Missing authorized staging/demo fixtures. No isolated backend established, and no dummy live accounts/data were created |
| Working recovery / social/native login | Unverified; native managed social handoff unavailable locally. Do not use a website-login workaround as device-session proof |
| Store screenshots / required graphics | Not prepared or verified for final signed build/device layouts; no invented screenshots |

## Updated authorized scope

Common Light LLC, USA operates Witness. support@witnessmovement.com is actively
monitored for privacy/deletion. Colorado, USA registration is owner-confirmed;
mailing address and governing-law/venue decisions remain unconfirmed, and legal
text remains unfinished/unapproved.

Minimum user age is 13. Whole-year age must be entered before new local email
signup or any Google/Apple initiation (including sign-in mode). After sign-in,
**every account**, including an existing account, must separately confirm the
13+ self-attestation before protected content mounts. Editable metadata saves
age band/account ID/time; exact age is not saved. This is not verified age.
Social failure/cancellation clears pre-auth age; it cannot authorize a different
signed-in account. No creation-date/legacy-flag exemption exists.

Counseling is adult-only for this launch candidate. New local counselor requests,
client agreements/bookings and client session initiation require adult age;
there is no teen consent program ready to review. Acceptance/therapist-start
handlers resolve the actual requester/session client and refuse because
another client's adult auth metadata cannot currently be safely accessed.
Do not describe these provider paths as operational or ask a reviewer to submit
real counseling requests. Crisis resources and existing records remain.

The separate owned Lovable deletion-request page is prepared and verified in
unpublished code per owner, not live. Its exact new URL and live behavior are not
verified here. Do not equate it with proven backend deletion/file cleanup.

## Proposed review path after owner supplies verified access

1. Install the exact signed build referenced in the submission; record package,
   version, build number, OS/device and artifact provenance.
2. Open Witness with connectivity. Native shell loads
   `https://witnessmovement.com`; local Replit changes are not what the device
   necessarily runs. Verify offline fallback separately.
3. Sign in using the dedicated review access. Explain invitation/confirmation
   steps if applicable. Do not depend on reviewer-controlled social-provider
   consent, owner approval or one-time codes without a supported review plan.
4. Review prayer feed, prayer detail/responses, gratitude, Bible and journal.
   Distinguish seeded/demo material from real users; don't ask reviewers to
   message/contact real members.
5. Explain audience controls and report/block/support access once verified.
   Review moderation evidence and response procedures before submitting.
6. Explain optional camera/microphone/photos/notifications and denial paths.
   Native push/calls/social session behavior must be tested first, not declared
   complete in these instructions.
7. Account controls are in Profile → account panel in local source. Export and
   deletion are not certified live. Eventual instructions must use a designated
   review account and explicitly approved deletion procedure, never real users.
8. Any giving, store, subscription or counseling payment path needs a compliant
   sandbox/review plan before inclusion. Do not ask reviewers to make real
   charges or claim Stripe testing exists.

## Evidence to attach later

- Exact final release revision/artifact/checksum, signed iOS archive/IPA export,
  Android signing certificate relationship and Play validation report.
- Real-device Google/Apple/email sign-in, recovery and cold/warm/resume session
  results; provider initiation alone is insufficient.
- Account isolation (including switch/sign-out and legacy journal handling),
  audience/RLS, exports and managed deletion/files/failure evidence using
  specifically authorized test accounts only.
- Push delivery/tap, camera/microphone/photo denial, recording/calls, offline,
  accessibility, screen-size and 16 KB compatibility results.
- Approved legal URLs, privacy/Data safety forms, content/age/health/financial
  declarations as applicable, rights-cleared screenshots and review credentials
  in secure store fields (not this repository).

Do not submit a note promising later fixes. The current result is **not ready
to submit** because legal, authentication/session, signing and review evidence
remain incomplete.
