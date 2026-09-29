# Service page photos and videos

## What will be built

- Keep discovery simple with a compact row everywhere people browse from Giving, their personal area, or a directory:
  - square logo or portrait on the left
  - page name and service type beside it
  - one clear tap target that opens the full page
- Give organizations, nonprofits, and churches a wide rectangular profile image at the top of their full page, while retaining a square logo for compact rows.
- Give subcontractors, professionals, and counselors a square portrait or business image on their full page and in compact rows.
- Add a public gallery to every organization, nonprofit, church, professional, subcontractor, and counselor page.
- Allow up to 12 gallery items per page, mixing photos and short videos.
- Let page owners upload, preview, caption, reorder, replace, and remove their own media from the page-management area.
- Show photos and videos in a clean gallery on the public page; tapping an item opens a larger viewer with video controls when needed.
- Include empty, uploading, failed-upload, and full-gallery states in plain language.

## Safety and ownership

- Accept common image and video formats with clear size and duration limits.
- Only verified page owners or leaders can add, change, reorder, or remove media.
- Public visitors can view approved page media; existing reporting tools will be available on gallery items.
- Removing an item removes both its page record and stored file.
- Counselor license review and professional identity review remain unchanged; adding media does not bypass either review.

## Technical details

- Create one reusable profile-media system shared by organizations, professionals, and counselors rather than separate gallery implementations.
- Add a `profile_media` table with page type, page ID, media type, storage path, caption, display order, owner, timestamps, and moderation state.
- Add the required table grants, row-level security, ownership checks, and indexes in the same migration.
- Add image fields where needed: organization wide image plus existing square logo; professional and counselor square image fields continue to represent their compact and full-page portrait.
- Create a dedicated storage bucket for page photos and videos with owner-only upload/update/delete rules and public viewing for media attached to visible pages.
- Reuse the app’s existing image/video preview and signed-file patterns where appropriate.
- Build shared upload, media-grid, viewer, and compact-profile-row components, then wire them into organization, professional, counselor, Giving, and personal-space listings.
- Preserve existing page permissions, payments, giving destinations, and the Personal / Organization / Professional space separation.

## Verification

- Verify each page type can upload photos and video, reach the 12-item limit, reorder, replace, and remove items.
- Verify compact rows show square logos or portraits and open the correct full page.
- Verify full organization pages use the wide rectangle while professional and counselor pages use square images.
- Verify signed-out visitors can view public media but cannot manage it.
- Check phone, tablet, and desktop layouts, video playback, failed uploads, and current build/runtime logs.
