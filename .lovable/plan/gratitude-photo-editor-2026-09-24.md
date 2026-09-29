# Gratitude photo editor

## Goal
Turn the Gratitude photo flow into a polished social-style editor where someone can choose, capture, or select a mood photo, enhance it, and place designed text directly over the image before posting.

## What will change
- Open a full-screen editor after any gratitude photo is selected, including camera, photo library, and mood-album photos.
- Keep the existing photo sources and public/private posting choices.
- Add a reliable baseline editor:
  - drag and pinch to reposition and zoom
  - rotate, straighten, mirror, and reset
  - curated looks plus brightness, contrast, color, warmth, fade, and edge shade
  - add more than one text layer
  - edit text, choose from a small set of readable display/body styles, change size, alignment, color, and emphasis treatment
  - drag text to place it over the photo and keep it inside safe bounds
  - undo and redo editing changes
  - delete or duplicate the selected text layer
  - preview the finished post without editing controls
- Export the finished square image with all edits and text permanently rendered into it, while keeping the written gratitude caption available separately for accessibility and the wall/detail views.
- Let someone reopen the editor before posting, replace the image, or start over without losing their caption.

## Visual direction
- Use Witness's warm paper, navy, and brass system rather than copying another platform's appearance.
- Make the photo the focus, with a restrained bottom tool tray and familiar icon controls.
- Keep controls large enough for one-handed phone use, with clear selected states and labels.

## Technical details
- Create a gratitude-specific canvas editor so the circular profile-photo crop behavior stays unchanged.
- Render the same composition code for the live preview and final image export to avoid mismatches.
- Correct mobile-photo orientation, constrain output dimensions, and export an optimized JPEG suitable for upload.
- Keep editing local to the device; no new database fields are required because the completed composition is stored as the existing gratitude image.
- Reuse the existing protected media upload and gratitude posting flow.

## Acceptance checks
- Camera, library, and mood photos all enter the editor.
- Crop, filters, adjustments, text styling, text movement, undo/redo, preview, and export work on a phone.
- The wall and gratitude detail show the finished image with its overlaid text exactly as composed.
- Replacing or removing a photo behaves predictably, and video, voice, and text gratitude remain unchanged.
- No horizontal overflow, control overlap, or broken posting flow on phone and desktop layouts.
