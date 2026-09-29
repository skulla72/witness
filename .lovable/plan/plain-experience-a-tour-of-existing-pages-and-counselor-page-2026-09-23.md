# Plain experience, a tour of existing pages, and counselor pages

## What already exists (the tour you asked for)

- **Church and organization pages**: anyone can add one (Community → Add your church or organization). Each page has a profile, service times, contact details, groups, events and prayer requests. Owners get a manage screen, a dashboard, a claim flow for pages someone else started, and a payments screen where they connect their bank for gifts. Monthly plans are $29 (Page), $79 (Page + Giving) and $39 (Serving add-on).
- **Professional pages (contractors and tradespeople)**: Pros → create a page with trade, service area, rates and past work. Our team approves it before it goes public. Owners get "My page", leads (jobs sent to them) and payouts. Ratings are two-way and hidden until both sides submit, and there are strikes for no-shows. The page costs $9 a month.
- **Counseling**: there are counseling screens and a care agreement, but counselors don't have their own public page yet. Counseling revenue stays at $0 until licensing is in place.
- **Plain wording**: the first question at the door sets faith or plain. Plain swaps "prayer" for "hope", but only on about 10 screens. Everywhere else, faith wording, the Bible, verses and church prompts still show up.

## 1. A separate plain experience

People who choose plain get an experience of their own, with no faith content anywhere:
- **Words**: every screen uses plain wording, including Record, Gratitude, Answered, notifications, emails, the film and the tour. For example: "Share a hope", "Came through", "Standing with you".
- **Hidden features**: the Bible, verse suggestions, the verse panel, the men's room scripture, and church-only prompts.
- **Home screen**: it leads with hopes, gratitude, people to check in on, and needs nearby.
- **Community**: it shows nonprofits and community groups first. Churches appear only if the person searches for them.
- **Photos and prompts**: mood albums keep the same photos but use plain captions. Writing prompts become neutral (for example "What are you hoping for?").
- **Switching later**: people can change the setting in You → Settings.

## 2. Counselor pages (their own page type)

- **Creating a page**: a counselor builds a page with photo, license type and state, specialties (grief, marriage, addiction and so on), in-person or video, rates, sliding scale, faith-integrated or not, and languages.
- **Checks**: the page stays hidden until our team verifies the license and completes an ID check. It then shows a "License verified" mark.
- **Public page and directory**: the page lives at /counselor/name. A directory lets people filter by specialty, state, video and faith-integrated.
- **Requests**: people send a private request for a first session. The counselor accepts or declines on their own dashboard. Nothing goes public.
- **Organizations**: churches and organizations can list their own counselors on their page.
- **Plain users**: they see the directory with "faith-integrated" as an optional filter, not the default.
- **Payment**: pages are free during the beta. Session payments stay off until licensing and the payment rules are settled, and the page says so plainly.

## Technical details

- **Plain experience**: extend `src/lib/tone.ts` into a full copy dictionary plus feature flags (`showBible`, `showVerses`, `churchFirst`). Add a `useTone()` hook and replace hardcoded faith strings across routes, components, email templates and notifications. Gate the /bible route and ScriptureSuggest on the tone.
- **Counselor tables**: `counselor_profiles`, `counselor_licenses` (admin-reviewed), `counselor_requests` and `org_counselors`. Each gets GRANTs, RLS (public read of approved profiles only, owner read and write, admin review) and a `has_role` admin check.
- **Counselor screens**: `counselors.index.tsx`, `counselors.new.tsx`, `counselors.mine.tsx`, `counselor.$slug.tsx` and `admin.counselors.tsx`. Add a counselors section to `community.manage.$slug.tsx`.
- **Checks**: Playwright passes with a plain account (no faith words or Bible links on the main screens) and a faith account (no change).

## Order

1. Plain experience: wording, then hidden features, then home and community order.
2. Counselor database and admin review.
3. Counselor pages, directory, requests, and the organization link.
