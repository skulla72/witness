# Safer photos and clearer reporting

## Goal
Make Witness visibly family-safe: replace the poorly matched stock-photo set and make reporting people or community posts straightforward.

## What will change
- Remove the current loosely sourced album selections, including every image with nudity, suggestive content, or unclear relevance.
- Rebuild all eight albums around a strict, manually reviewed list: modest clothing, no sexualized imagery, no adult content, no graphic material, and an obvious match to the named mood.
- Keep approximately 24 real photographs per album, but favor quality and safety over filling a quota with weak matches.
- Add “Nudity or adult content” as a dedicated report reason.
- Make the report action more explicit on member profiles and community posts while keeping blocking and author-removal controls.
- Keep reports going to the existing human moderation queue, where photos, profiles, prayers, and gratitude can be reviewed or removed.

## Technical details
- Curate from properly licensed CC0/public-domain photography already stored with the app; replace weak files and update the source/license manifest.
- Add the new report reason to the database’s allowed values and the report form.
- Add quick reporting to gratitude cards without nesting interactive controls, and label the profile reporting action clearly.
- Sync the revised local photo assets into the iOS and Android shells.

## Acceptance checks
- Eight albums remain available and each image is manually reviewed for theme fit and family-safe presentation.
- No nudity, sexualized poses, lingerie/swimwear-focused images, or adult content remains in the stock library.
- A member can report a person, prayer, gratitude post, message, or group, including specifically for adult content.
- Reports appear in the moderator queue and removable content can still be removed.
- Camera and personal photo-library choices continue to work.
