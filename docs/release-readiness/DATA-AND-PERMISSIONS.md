# Source-based permissions and disclosure worksheet

**INTERNAL / UNAPPROVED — NOT APP PRIVACY OR PLAY DATA SAFETY ANSWERS**

Source proves intended processing paths, not live use, necessity, successful
provider authorization, legal basis, or retention. Confirm collection/sharing,
purpose, account linkage, optionality, tracking and deletion separately for
each store and each production provider. Server logs and SDK practices need
operator/provider evidence.

## Native permissions

| Declaration / SDK | Source / intended use | Open release question |
| --- | --- | --- |
| Android `INTERNET` | Main manifest; hosted site and remote APIs | Domains, transport and server logs |
| `POST_NOTIFICATIONS` | Main manifest, `src/lib/native-push.ts`, `NativeSupport.tsx` | Runtime choice exists; actual FCM delivery/device token lifecycle unverified |
| `CAMERA`, optional camera/autofocus hardware | Manifest; Camera SDK, record/profile-media features | Actual prompt/denial handling and requested use on device |
| `RECORD_AUDIO`, optional microphone, `MODIFY_AUDIO_SETTINGS` | Manifest; `VoiceRecorder.tsx`, `record.tsx`, `call.$id.tsx` | Recording/call permission and denial coverage; don't describe recording-only purpose if calls are included |
| `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_EXTERNAL_STORAGE` (max 32) | Manifest; media features/Camera SDK | Broad access may require Play review; determine whether system picker suffices. No permission removed here |
| Android application backup enabled | Main manifest `allowBackup=true` | Document backup behavior for account-scoped journals/sessions and assess data-extraction rules |
| iOS camera, photo library/read/add and microphone usage descriptions | `ios/App/App/Info.plist`; same media SDK/features | Text currently emphasizes prayers; validate against profile media and calls. Permission prompts not tested |
| iOS push presentation configuration | Capacitor PushNotifications + native support | No app entitlement file established in inspected tree; APNs capability, provisioning and native FCM bridge incomplete/unverified |
| Browser geolocation | `src/lib/geo.ts:locateMe`, `src/routes/serve.tsx` | Requests device coordinates and snaps to local ZIP centroids; local function need not transmit raw coordinates, but “no precise GPS collection/access” needs careful review. No native location permission/usage description found in inspected app declarations |
| Deep link scheme / file provider | Android manifest, iOS plist, `src/lib/auth-links.ts` | Parser rejects malformed/unsupported callbacks; device interception/session transfer unverified |

Manifest permissions are **not** evidence all are granted/used. Android merged
release manifest and iOS exported capabilities must be inspected in a future
authorized build; dependencies can contribute declarations.

## Data and destinations

| Data / likely store category to assess | Source / SDK | Destination / release evidence |
| --- | --- | --- |
| Name, email, account ID, minimum-age confirmation, age band, profile photo, sessions; legacy DOB may remain | `login.tsx`, `eligibility.ts`, `eligibility-client.ts`, Supabase JS, Lovable cloud-auth-js | Pre-auth exact age transient; post-auth explicit self-attestation saves only 13–17/18+ band, account ID and time in editable account metadata. Scoped token binds update to actual confirmed account. No age is carried through broker. No live account write tested |
| Faith/religious content; possible health/sensitive disclosures | Prayer/gratitude/journal/therapy/community source | Sensitive fields can occur in free text/media; don't label the app “no sensitive data” or clinical/HIPAA-compliant |
| Prayers, posts, responses, photos, video, voice/audio | `prayers.ts`, `record.tsx`, `profileMedia.ts`, VoiceRecorder; Capacitor Camera | Supabase DB/Storage, audience-selected community. Storage authorization and all signed URL expiry/retention behavior not verified |
| Journal and local preferences | `journal.ts`, `previewAuthStorage.ts`, localStorage consumers | Journal is device/account-scoped, legacy recovery preserved; no cross-device sync or end-to-end encryption claim. Tokens/preferences also persist locally |
| Messages, community relationships, moderation/reports | Community routes, Supabase generated schema/server functions | Account-linked DB/realtime processing; moderator access, retention and block/report response need operational review |
| Call audio/video and signaling | `src/routes/call.$id.tsx`, getUserMedia/WebRTC | Peer media, Supabase signaling and public Google STUN; no TURN readiness established. Verify recording behavior/IP exposure rather than assume calls are stored or E2EE-certified |
| Prayer text used for AI scripture suggestions | `ScriptureSuggest.tsx`, `bible.functions.ts`, `ai-gateway.server.ts`, AI SDK | Local consent explains optional transfer to `ai.gateway.lovable.dev`; model configured `google/gemini-3.7-flash`. Gateway/downstream retention/training/location not established; no paid request made |
| Bible lookup/search | `bible.functions.ts` | Public Bible service plus optional distinct AI path; confirm licensed texts/attribution and actual requests in final release |
| Approximate place / optional device coordinates / maps requests | `geo.ts`, `serve.tsx`, `places.functions.ts`, `google-maps.ts` | Local centroid logic; Google Places through Lovable gateway; Maps browser SDK loaded from maps.googleapis.com. Live keys/authorization/logging unknown |
| Push token, notification choices and messages | Firebase JS, `push.ts`, `native-push.ts`, `notify.server.ts` | Firebase/FCM through Lovable gateway; APNs/native iOS path unfinished. Token disclosure/removal and actual recipient delivery not verified |
| Email address, auth mail, support correspondence | `email-templates/send-email.ts`, `support.functions.ts`, `lovable/email/auth/webhook.ts`; Lovable email-js/Gmail gateway | Mail delivery/support mailbox authentication not tested. Presence of code is not evidence messages work |
| Donation/payment/order/subscription/payout records | Stripe JS/React/server SDK, `stripe.server.ts`, payment webhook and checkout functions | Stripe through Lovable gateway; card handling may be delegated, but payment metadata/purchase history processed by app. No charge/refund/webhook/payout verification |
| Support/admin access | `support.functions.ts`, `admin.support.tsx` | Restricted backend and Gmail gateway intended. Operator roles, mailbox access and audit logs need evidence |
| Browser/device, network IP, diagnostics/usage | Hosting, HTTP providers; `usage.ts`, native/runtime SDKs | Intended usage processing exists; exact live logs/analytics and retention unknown. No basis for “no tracking” or invented analytics-vendor claims |

Installed/native SDK inventory: Capacitor App, Browser, Camera, PushNotifications,
SplashScreen, StatusBar; web/server SDKs include Supabase, Lovable auth/email,
Firebase, Stripe, AI/OpenAI-compatible and Google Maps types/browser loader.
Installed package alone does not prove collection. No ad SDK was established by
this focused review; that is **not** an approved “contains no ads/no tracking”
declaration.

Capacitor core and Cordova `PrivacyInfo.xcprivacy` files exist in installed
`@capacitor/ios`. Their existence does not complete the app's required-reason
API assessment, other SDK manifests, privacy nutrition labels or final archive
privacy report.

## Required form review before submission

- For every row, owner/provider must confirm data actually leaving the device,
  recipient/controller/processor, purposes, optional vs required, linkage to
  identity, retention/backup deletion, encryption and cross-border transfers.
- Distinguish store definitions of “collected”, “shared”, “tracking”, ephemeral
  processing and service-provider exceptions; do not mechanically map a row to
  a checked box.
- Validate sensitive-data/AI consent and truthful permission explanations in the
  **published** native experience, not only local source.
- Finalize content moderation/filtering/report/block/contact and child-safety
  policies for social/UGC functionality. Source controls are not operational
  moderation evidence.
- Earlier local privacy claims of deletion within 30 days, financial retention
  seven years, moderation two years and backup expiry 90 days are **unapproved
  claims requiring operator/legal confirmation**, not verified facts. The current
  local draft no longer asserts those timelines as established commitments.
- Minimum age 13, operator Common Light LLC/USA and actively monitored support@
  contact are owner-confirmed, not legal-compliance certification. Local age
  checks can be falsified; no remote auth trigger/RLS/API changes were applied.
  Exact care ages are transient; adulthood uses the same saved account band,
  not a clinician's age or legacy birthday. No new clinical fields were added.
  Missing evidence for another client blocks provider acceptance/start.
  Legacy DOB disclosure is retained; there is no birthday-edit/removal feature.
