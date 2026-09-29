# Witness: Three-Week Private Beta Launch Plan

## Launch target

Release Witness as an invite-only mobile web app for a controlled beta group. The beta will include the complete core journey:

1. Record or type a prayer request.
2. Share it privately or publicly within the invited community.
3. Receive prayer and encouragement.
4. Record and link an answered-prayer reaction.
5. Join groups, message members, and receive alerts.
6. Give to an approved nonprofit or buy from an approved store.

Every invited member must accept a versioned confidentiality and community agreement before entering. It will cover both confidentiality about the unreleased app and protection of other members’ sensitive stories. The final wording must be reviewed by a qualified attorney; the app will record acceptance, not claim that software alone can prevent disclosure or screenshots.

## What is already solid

- Email/password and Google sign-in, password reset, sign-out, account export, and account deletion.
- Setup survey saved to the member’s account across devices.
- Real conversation and message records with live incoming-message updates.
- Real organization pages, groups, events, service times, contacts, and prayer-request records.
- Store and donation checkout, payment updates, monthly gift tracking, order fulfillment, tracking, and store refunds.
- A configurable brand foundation and a cohesive mobile-first visual system.
- A clean current build.

## Launch blockers

### 1. Core prayer journey is still sample-only

Build the real prayer, answer, intercession, and gratitude records; camera and microphone capture; upload progress; secure video storage; privacy rules; playback; feed reads; text-only alternatives; deletion; and linked ask-to-answer stories. Replace sample data on all launch surfaces.

### 2. Invite-only access is not enforced

Add single-use or limited-use invitations, expiration, inviter tracking, revocation, and an acceptance screen. Prevent uninvited account creation and prevent invited users from bypassing the confidentiality agreement.

### 3. Safety and moderation are missing

Add report and block controls to profiles, prayers, comments, groups, and messages. Add a moderator queue, removal/suspension actions, audit records, crisis-resource access, and clear emergency language. Either connect “I’m not okay” to real, consenting responders with escalation rules or hide it for beta; it must not claim people were alerted when nobody was.

### 4. Calls are not real two-person calls

The current call screen only shows each person their own camera. Implement secure real-time audio/video signaling and connection handling, or remove calling from the beta. Messaging can launch without calls; a simulated call cannot.

### 5. Push notifications are absent

Add installable-app support, notification permission onboarding, device subscriptions, notification preferences, and delivery for new messages, call invitations if calls ship, “someone prayed for you,” and answer updates. Include unsubscribe, quiet hours, and expired-device cleanup.

### 6. Giving needs a safe operating model

The payment flow works, but money currently enters one platform payment account. Before live gifts:

- Restrict the beta to manually approved organizations.
- Add an admin vetting queue and prevent leaders from approving themselves.
- Record legal name, registration details, review date, reviewer, readiness, and supporting evidence.
- Implement connected nonprofit payout accounts, or limit beta money to one organization legally controlled by the platform until payout routing exists.
- Publish fee, refund, tax-deductibility, payout timing, and donation-use language.
- Keep all payments in test mode until legal/accounting approval and an end-to-end reconciliation test pass.

### 7. Legal and privacy documents are missing

Publish Terms, Privacy Policy, Community Guidelines, Giving/Refund Policy, consent for recording, consent for sharing another person’s story, age requirement, copyright/takedown contact, and the beta confidentiality agreement. Include versioned acceptance records. Obtain attorney review before inviting testers.

### 8. Launch operations are missing

Add error monitoring, privacy-conscious product analytics, payment alerts, backups/restore checks, abuse rate limits, security headers, an incident contact, a support inbox, and a written response process for safety, privacy, payment, and account issues.

### 9. Release packaging and quality need completion

Add the final icon set, install manifest, home-screen metadata, loading/offline states, accessibility labels, slow-network handling, empty/error states, and stable owned media assets. Fix the current home-screen time hydration error. Add automated tests for the critical paths.

## Three-week schedule

### Week 1 — Make the core real

- Enforce invitations and the confidentiality/community agreement.
- Build prayer, answer, intercession, and gratitude data with secure video upload and playback.
- Connect the home feed, prayer detail, profile, and gratitude screens to real member data.
- Persist the private journal to the member’s account.
- Replace misleading simulated safety behavior.
- Fix the home-screen rendering error.

**Exit test:** two invited accounts can complete the full prayer-to-answer journey on separate phones, with privacy enforced.

### Week 2 — Trust, communication, and money

- Add reporting, blocking, moderation, crisis language, and admin tools.
- Finish real group membership and member profiles.
- Decide calls: complete real calls or hide them.
- Implement web push and notification preferences.
- Add nonprofit approval controls and the chosen payout model.
- Complete legal pages and versioned acceptance.

**Exit test:** two members can safely join, message, block/report, receive alerts, and complete test purchases/gifts; a moderator can resolve a report.

### Week 3 — Stabilize and release

- Add monitoring, analytics, rate limits, security headers, and operational alerts.
- Finish icon/installability, accessibility, offline/slow-network, and empty/error states.
- Remove remaining invented/sample content from beta routes.
- Run security review and database-policy review.
- Test the full matrix on iPhone Safari, Android Chrome, and desktop.
- Run a 3–5 day internal rehearsal with 5–10 people, fix only launch-severity defects, then invite the first beta cohort.

**Exit test:** no critical defects; no sample-only primary actions; payments reconcile; privacy tests pass; support and incident owners are named.

## Technical implementation

- Create database-backed prayer, media, intercession, gratitude, report/block, invitation, moderation, notification-subscription, and legal-acceptance models with least-privilege access policies.
- Store videos in private storage and issue short-lived authorized playback links; validate type, size, duration, and ownership server-side.
- Use browser recording with upload recovery and a typed-post fallback.
- Use a proven real-time calling provider or WebRTC signaling service rather than hand-rolling media infrastructure. If no provider is selected by the Week 2 cutoff, exclude calls.
- Use Web Push for the beta; native Apple/Google packaging remains after beta.
- Add automated browser tests for invite acceptance, auth, prayer upload/privacy, linked answer, messaging, block/report, checkout, webhook reconciliation, refund, cancellation, export, and deletion.

## Explicitly deferred until after beta

- Apple App Store and Google Play packaging.
- Open public registration.
- Broad multi-nonprofit onboarding without completed connected payouts and compliance review.
- AI-generated answer montages.
- Gamified giving tiers, sponsor rewards, and annual events.
- Any safety feature that depends on unavailable human responders.

## Launch decision

A private beta in three weeks is achievable only with strict scope control. Prayer videos, invite enforcement, moderation, legal acceptance, and payment safety are non-negotiable. Calling is the first feature to cut if the schedule slips; public launch and native app stores should follow the beta, not share its deadline.
