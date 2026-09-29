# Real-photo mood albums

## Goal
Replace the synthetic-looking mood library with authentic photography and expand every mood album to 24 choices (192 photos total).

## What will change
- Curate 24 distinct, natural photographs for each album: Peace, Hope, Comfort, Gratitude, Lament, Courage, Healing, and Provision.
- Use properly licensed stock photography stored with the app rather than hotlinked images.
- Favor candid people, lived-in spaces, everyday objects, and believable landscapes; avoid glossy, surreal, or obviously generated imagery.
- Keep the existing album tabs and selection flow, while making the larger collections easy to browse on a phone.
- Preserve camera and photo-library choices alongside stock images.

## Technical details
- Optimize the 192 images for mobile delivery and thumbnails so opening the picker does not load every full-size file at once.
- Update the photo catalog with source/credit metadata where the license requires it.
- Lazy-load album images and verify selection, upload conversion, and phone layouts.
- Sync the updated assets into the iOS and Android shells and confirm the app builds cleanly.

## Acceptance checks
- Every mood contains 24 unique photographs.
- Photos appear photographic and contextually match their mood.
- Switching albums and selecting a photo works on mobile without layout shifts.
- “Take a photo” and “Choose from library” remain available and functional.
