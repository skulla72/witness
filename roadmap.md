# Witness — Launch Roadmap (private beta)

Legend: [ ] not started · [~] partial · [x] done

## Must-have (this pass)
- [x] Responsive versions: phone remains unchanged; tablet navigation rail and desktop sidebar with wider primary-page layouts
- [x] Answer videos linked to original prayers (record answer, parent_prayer_id, timeline on prayer page)
- [x] Real feed / He Answered wall / prayer detail / journal / profile reading from database with playback of private media
- [x] Report + block controls on prayers, gratitude, profiles, groups, messages
- [x] Moderator queue: review reports, remove content (prayers, gratitude)
- [x] "I'm not okay" + Confessional: honest behaviour — real DMs to circle, crisis resources, Confessional marked preview
- [x] Calls: back in — voice + video inside private messages (see "This pass (done)")
- [x] Password reset end to end (/forgot-password, /reset-password)
- [x] Setup survey answers persisted server-side (usePrefs ↔ user_survey)
- [x] Walk-With groups, circle, public profiles on real data; join/leave verified in browser
- [x] DB fixes: group_members recursive policy, has_role executable via private helper
- [~] Legal review of Terms, Privacy and Care Agreement — entity/address updated and attorney packet prepared; blocked pending counsel engagement, mailbox activation and business phone number

## Money
- [x] One payment catalog covers every church/organization plan and the professional plan
- [x] Platform ledger separates charges, processing, 2% gift fees, optional Witness gifts, and recipient balances
- [x] Professional model confirmed: $9/month plus 10% of paid jobs
- [x] Automatic nonprofit and worker payouts — recipients add their own bank account and owed balances transfer on their own (needs connected accounts switched on in the Witness payments account)
- [ ] Live payments — blocked until the Witness payments account finishes identity, business, and bank verification

## Giving & serving network (done this pass)
- [x] Sender/Goer thank-you gift step at /perks: DB tiers (admin can add rungs), A/B/C options per rung, 14-day lock, public candle wall at /wall, FMV tax disclosure; team catalog + order queue at /admin/gifts
- [x] Serving ladder + hours log with leader / need-poster verification at /hours; public badge at /badge/$id (contractor fields)
- [x] Needs network at /needs: church projects + "Fix that" on prayers, hands offers, before/during/after/time-lapse updates, gifts designated to a need at checkout
- [x] Web Share on needs, badges; completed needs link into answered-prayer / gratitude recording
- [ ] Fill in Gift A / Gift B for each rung (name, photo, FMV, cost) in /admin/gifts — blocked: user decides the items
- [~] Email the gift acknowledgment (FMV / no-goods line) — receipt template wired into gift selection; sends once notify.witnessmovement.com finishes DNS verification (up to 72h, monitor in Cloud → Emails)
- [x] Videographer / story-of-the-week workflow — assignment, scheduling, delivery, and church sharing are live

## Voice & leaving the app (done this pass)
- [x] Voice prayers: Write it / Speak it / On camera on /record; 30s cap, live meter, listen back, over a tone or a chosen photo; plays inline in feed + detail
- [x] Shareable testimony card (4:5 post / 9:16 story) for the owner when a prayer is answered or reaches 50 prayers; name toggle, native share sheet (Instagram/Facebook/Messages) with save + caption fallback


## Polish & operations
- [x] Empty + error states in place on rebuilt screens; record flow accessibility pass done (labels, pressed states, dead controls)
- [x] Rework Sit with me in the selected cozy, polished ethereal-minimal direction
- [x] Gratitude photo editor: crop, filters, adjustments, layered text, undo/redo, preview, and flattened export
- [ ] Push notifications (needs Firebase/VAPID setup — blocked: config)

## This pass (done)
- [x] Moderation: message reports open the exact message with a preview; moderators can close groups and clear profiles
- [x] Atomic group seat-limit enforcement (join_group RPC with row lock; friendly full/closed errors)
- [x] Video + voice calls in private messages (Messenger-style): start/answer/decline/end, incoming-call sheet anywhere in the app, WebRTC media, signaling over realtime `calls`; browser-tested both directions

## Later
- Native app stores, AI montages, automatic sales tax.

- Weekly videographer story: each need can be booked for a week with before/during/after visits (`need_stories`, `story_shoots`); posting a before/progress/after update auto-marks that visit captured.

## Videographer workflow (done)
- [x] Camera roster (`videographers`) — people apply, our team approves/removes at /film/queue.
- [x] Assign a story to someone on the roster from the need page; the videographer is alerted.
- [x] Videographer queue at /film/queue: reschedule visits, upload or link the finished film, hand it in.
- [x] "Send the link to the church" notifies org leaders + the need's poster (server fn `shareStoryWithChurch`).


## Spread-out giving (one gift across many nonprofits)
- Done: /giving/fund (whole board or one lane), even split preview, one-time + monthly, payment notifications write one gift row per nonprofit, monthly renewals re-split, giving history groups the shares, monthly cancel.
- Note: lane page "Fund the lane" now links to the real flow (was a mock).

## First run & feedback (this pass)
- [x] First open lands on /welcome: home-screen/splash icon preview, "Do you want this faith-based?", four-room look around, then the /setup survey
- [x] Feedback invitation after 3 separate visits OR the first ask/answer, whichever comes first (3 questions + 1-5 rating) stored in `app_feedback`; snoozes 3 days, asks once
- [x] Approved flame-in-ring logo applied everywhere: app, browser, landing/header, welcome, sharing cards, social previews, and campaign video
- [x] prefs.faithBased drives wording (src/lib/tone.ts: home tab label) and rooms (faith-only rooms + faith circles hidden in plain mode)

## Notifications, offline & story hub (this pass)
- [x] Notification settings under You → Menu → Account: per-alert switches + quiet hours (`notification_prefs`); push sends respect both
- [x] Offline banner app-wide; written prayers/notes kept as a local draft and restored after a dropped signal
- [x] Filming schedule hub at /needs/stories (this week + ahead, past weeks, uncaptured visits), linked from the Needs board
- [x] Phone-sized run-through of the main screens: all load clean, no console errors

## Church directory (this pass)
- [x] Search finds churches anywhere in the US via public map records; "Add to Witness" creates an unclaimed church page (no duplicates, one place per page)

## Nonprofit payouts (in progress)
- [x] Organizations connect their own bank account; recipient balances stay separate from Witness revenue
- [x] Gifts calculate the nonprofit balance with Witness keeping 2%; the balance transfers automatically once their bank account is confirmed
- [x] Organization payment page explains package charges, the gift fee, and honest payout status

## Chip in for a hired job (pooled funding)
- [x] Anyone can chip in $1+ toward hiring someone for a project; money is held until the work is confirmed with an after photo.
- [x] Witness keeps 10%; poster/leader confirms, refunds, or leaves the money on the board; workers can be marked unfinished/no-show.
- [x] Star reviews from the poster or church leader; public badge page shows stars, reviews, free jobs, and hours.
- [x] Worker payout is automatic: confirming a finished job sends the worker's balance to their connected bank account. Nothing is marked paid unless a real transfer succeeded.
- [ ] Blocked: lawyer review of holding funds, refunds, the 10% fee, and worker tax reporting.

## Support inbox
- [x] MX records live for witnessmovement.com (Google Workspace); notify.* sender domain verified
- [x] Linked the support@witnessmovement.com Gmail account via the connector (verified: profile read 200, 7 inbox threads)
- [x] One-inbox support: app reads incoming support emails and sends replies as support@ (admin screen at /admin/support, batched thread reads)
- [x] Seeker in-app messages ("Message the team" on /help) surface in the same inbox; replies email the sender and mark the request answered

## Public success stories
- [x] Signed-out landing page links to a public `/testimonials` page without exposing member prayers
- [x] Approved professionals and church leaders can submit their own story with consent and see its review status
- [x] Team review at `/admin/testimonials`; only approved stories appear publicly

## In-app notifications
- [x] Top-right bell opens a real notification inbox with live unread count and working destinations
- [x] New prayer support and private messages create private alerts; people can mark one or all as read

## Daily reminder (this pass)
- [x] Opt-in daily reminder now arrives in the phone's own notification tray (where texts land), not just inside the app
- [x] Hourly scheduled job sends one nudge a day after each person's chosen hour, honoring quiet hours; in-app bell nudge remains as fallback

## Nonprofit profile polish
- [x] Nonprofit leaders use the same profile, dashboard, alerts and messages flow as churches with organization-safe wording
- [x] Instagram profile logo generated as a square upload-ready image

## Campaign film
- [x] Campaign page now carries only the main film; 10-second and 30-second cuts removed
- [x] Film mark changed to white, matched to the title, with a shorter closing appearance

## Navigation simplification
- [x] Walk With became Community: circles, organizations, needs, and serving now have one clear home
- [x] Community opens with Pray / Help / Give; giving opens with need / organization / Witness choices
- [x] You now separates personal activity, organization pages, and settings without repeated destinations
- [x] Giving reordered around choosing a destination first, with secondary giving methods grouped below
- [x] Mood photos expanded into grouped albums with several choices per mood.
- [x] Camera button fixed for web and native photo capture.
- [x] Mood library manually safety-curated; adult-content reporting added to people and community posts.
- [x] Plain experience: organizations and nonprofits only, neutral hope/support wording, and Stand + Encourage actions
- [x] One sign-in followed by a clear choice: personal, organization, professional, or counselor

## Review follow-through (this pass)
- [x] Home simplified: one clear next step + compact Explore row
- [x] "Your prayer was answered" alert to everyone who prayed (bell)
- [x] 30-day "Any update?" nudge for open asks (daily, once per prayer)
- [x] Church invite kit: QR + link on the organization dashboard, /join/$slug one-step join (survives sign-up)
- [x] In-app account deletion (already live under You → Account)
- [ ] Phone notifications for answer alerts — blocked on push setup (Firebase/VAPID)

## Organization imagery (this pass)
- [x] Added verified official logos for FCA, Cavetime, Flatirons Church West, and Cross Point Church; ambiguous demo organizations remain unchanged.

