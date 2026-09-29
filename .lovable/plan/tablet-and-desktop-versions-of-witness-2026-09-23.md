# Tablet and desktop versions of Witness

## Goal
Keep the current phone experience visually and behaviorally unchanged. When the same person signs in on a tablet or desktop browser, present a larger-screen version designed for that space rather than stretching the phone layout.

## What will change

### 1. Responsive app frame
- Keep the current header and five-item bottom navigation below 768px.
- Add a compact tablet navigation rail from 768px through 1023px.
- Add a persistent desktop sidebar at 1024px and above with the same primary destinations: Prayer, Gratitude, Share, Community, and You.
- Move messages, notifications, streak, account access, and sign-out into clear larger-screen positions without changing their behavior.
- Preserve full-screen flows such as recording, welcome/setup, login, and campaign pages.

### 2. Larger-screen page layouts
- Give ordinary pages a readable central content width instead of a stretched phone column.
- On tablet, use a wider single column or two columns where the content naturally supports it.
- On desktop, use a main reading column plus a contextual side area for existing shortcuts, rooms, activity, or account controls.
- Adapt the signed-in Prayer home, Gratitude, Community, and You pages first because they are the five primary destinations.
- Let secondary pages inherit the larger frame and safe content widths without redesigning their business logic.

### 3. Desktop and tablet interaction details
- Replace phone-only bottom sheets with centered dialogs or side panels on larger screens where appropriate.
- Keep tap targets, keyboard focus, labels, and scrolling usable with touch, mouse, and keyboard.
- Ensure fixed actions and media do not overlap the new navigation at tablet or desktop sizes.

### 4. Signed-out website
- Keep the current phone landing page intact.
- Expand the signed-out landing and login presentation on larger screens without exposing member content.

### 5. Validation
- Compare phone screenshots before and after at 384px to confirm the current mobile layout remains unchanged.
- Test representative tablet and desktop widths, including navigation, home feed, Community, Gratitude, You, recording entry, dialogs, and sign-out.
- Check for horizontal overflow, clipped text, overlapping fixed elements, runtime errors, and the final app build.
- Sync the web changes into the existing iOS and Android shells after validation.

## Technical details
- Use one responsive React application and one account/data source, not three duplicated codebases.
- Introduce shared breakpoint-aware shell components and semantic layout classes using the existing Witness design tokens.
- Use 768px for tablet navigation and 1024px for desktop navigation; preserve all existing base/mobile classes below 768px.
- Keep all current routes, links, permissions, payment behavior, and saved data unchanged.
