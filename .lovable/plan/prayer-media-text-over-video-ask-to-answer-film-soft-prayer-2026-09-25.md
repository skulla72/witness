# Prayer media: text over video, ask-to-answer film, soft prayer-room sound

## 1. Text over video (Instagram-level baseline, no music)
- After someone records or picks a prayer video (ask or answer), a full-screen editor opens. It works like the gratitude photo editor, with the video playing behind the controls.
- More than one text layer. Each has display, clean, or strong style, color, and a highlight. You can drag and pinch text and it stays inside safe bounds.
- Timing: each text layer can show for the whole clip or only part of it, set on a simple trim bar. "Breathing" option: lines fade in one at a time as the video plays.
- Stickers: "Day N of praying", "Answered", and the verse reference when one is attached.
- Undo/redo, preview, reset. The video's original sound stays; no music is added.
- The overlays are saved as separate information next to the video and drawn on top when the video plays. The video file itself is not changed. Captions stay readable for screen readers.

## 2. Ask-to-answer film (the signature Witness post)
- When a prayer gets an answer, the answer page shows a new "Watch the journey" player. It plays the original ask, then a soft candle-light crossfade with a date card ("Asked Mar 3 · Answered Sep 12 · 193 days"), then the answer.
- Split-screen option: ask and answer side by side, with a still image of each when a video is missing.
- Share: a link to a public journey page (only when both posts are public). A download option makes a video file on the phone, drawn right on the device.
- Only the poster's own posts are used. Private asks never appear.

## 3. Soft prayer-room sound (off by default)
- A small speaker button in the prayer board header. Choices: Piano pad, Rain, Fireplace, Silence.
- Starts only when someone taps it. Fades in and out. Gets quieter on its own when any video or voice prayer plays, then comes back up.
- The choice is remembered on the device. It never plays in plain mode unless turned on there, and never on other screens.
- Four short royalty-free loops come with the app.

## Technical details
- New `prayer_posts.overlay jsonb` (text layers, start/end times, sticker kinds, position/scale/rotation as 0–1 fractions). Migration only adds a nullable column; existing RLS covers it.
- `src/components/video/VideoOverlayEditor.tsx` (shares text-layer logic pulled out of GratitudePhotoEditor into `src/components/media/textLayers.ts`); `VideoOverlayPlayer.tsx` renders overlays in sync with `currentTime` wherever prayer videos play.
- Wired into record.tsx for ask/answer video flows.
- `src/components/journey/JourneyPlayer.tsx` on the answer/prayer detail route; public `src/routes/journey.$id.tsx` with its own head(); export uses canvas + MediaRecorder (webm/mp4 depending on browser).
- `src/hooks/useAmbientSound.ts` + `AmbientToggle.tsx`; a global media-play event bus for ducking; audio loops stored as project assets.
- Verify with Playwright on a 384×681 phone screen.
