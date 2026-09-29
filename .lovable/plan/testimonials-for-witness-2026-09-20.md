# Testimonials for Witness

## Goal
Create a public success-stories page that signed-out visitors can reach from the landing page, while letting approved professionals and church leaders submit stories from their existing account areas.

## What will be built
- Add `/testimonials` as a public page with approved church and professional stories, clear attribution, optional photo, outcome highlights, and links back to the related public page.
- Add a “See what Witness is making possible” invitation on the signed-out landing page without exposing prayers or member-only community content.
- Add a simple submission form for approved professionals and church owners/leaders, available from their existing management pages.
- Keep new stories private until a Witness team member approves them; add a team review screen for approve, request changes, or remove.
- Include honest empty and pending states so no testimonials are fabricated.

## Safety and trust
- Store the story text, storyteller type, linked church/professional, optional image, consent confirmation, and review status.
- Only an approved professional may submit for their own page; only an owner or leader may submit for their church.
- Public visitors can read approved stories only. Submitters can see their own drafts and review status. Team members can review all submissions.
- Testimonial approval will not affect search ranking, prayer visibility, or paid placement.

## Technical details
- Add a protected database table with explicit access grants and row-level rules for public reads, owner submissions, and team review.
- Add typed helpers for loading, submitting, and reviewing stories.
- Create the public page, submission page, and team review page as separate TanStack routes with unique metadata.
- Add links from the signed-out landing page, professional account page, church management page, and relevant team navigation.
- Verify the public page and both submission paths on phone and desktop, then confirm the preview build is clean.
