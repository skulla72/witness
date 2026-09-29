# Witness — Honest Review and Next Changes

## What is working
- **The core idea.** You film the ask, then the answer, and they stay linked. No other app keeps that full story together.
- **Built with integrity.** The feed has an end, there are no like counts, and the daily-candle streak never shames anyone. People are tired of apps built to hook them, so this matters.
- **Real-world follow-through.** Needs, serving hours, job funding, videographers and spread-out giving connect prayer to action.
- **Care and safety.** "I'm not okay", crisis resources, reporting, blocking and moderation are more complete than most beta apps have.

## What is holding it back
1. **Too many doors on the Home screen.** Home offers about 12 cards plus a feed. A first-time user can't tell what to do. Home should lead to one thing: pray for someone, or share what you're carrying.
2. **The first week is empty.** A new person with no circle sees a quiet feed. That is where people leave apps like this.
3. **The app does too many jobs at once.** Personal, organization, professional, counselor, trades, store, gifts, film crew, Bible, map, ledger and spotlight are all in one app. Each part is fine alone, but together the app feels scattered.
4. **Answers are the magic, and they are hard to find.** People come back to see what happened to the prayers they prayed for. Right now that news doesn't reach them.
5. **Churches are how you grow, and they don't have easy tools.** Groups will bring members in, but there is no simple way for a church to get its people onto the app.
6. **Some things App Store reviewers will check are unfinished.** In-app account deletion, Apple sign-in keys, and push notifications are not done.

## Missed opportunities (what people will want)
- **"Your prayer was answered" alerts.** Tell everyone who prayed when an answer is posted. This is the strongest reason to come back.
- **Prayer follow-ups.** After 30 days, gently ask the person who asked: "Any update?" This leads to more answer videos.
- **A church invite kit.** One link or QR code for Sunday, with a slide, a short video and a card that puts new people straight into that church's group.
- **Guided first prayer.** At signup, show three real open requests and ask the person to pray for one. Their first action is giving, not posting.
- **Prayer for a specific person.** "Pray for my mom" requests that the family can follow and join.
- **Weekly recap email.** "You prayed 4 times, 2 answers came in." It's personal, and it has no vanity numbers.
- **Share-to-invite.** Answered-prayer cards already get shared. Add a link on them that brings people to that story on the app.

## Things to change or cut
- Move Map, Ledger, Spotlight, Bible and the Tour off Home into one "Explore" row.
- Hide store, film crew and trades from personal users unless they opt in. Keep them in the Organization and Professional spaces.
- Look at "Mine" and the other feed filters. Most people will only use All and Answered.
- Turn the Home greeting into one clear next step instead of two lines of text.

## Proposed first pass
1. Simplify Home: a greeting, one main action, the candle, "someone prayed for you", a small Explore row, then the feed.
2. Add the "your prayer was answered" alert to the notification bell and to phone notifications.
3. Add the 30-day follow-up nudge for open prayers.
4. Build the church invite kit: a QR code and link that join someone straight into that church's group.
5. Build in-app account deletion, which app stores require.

Pick which of these to do first, or approve all five.

## Technical notes
- Answer alerts: when an answer post is linked to a prayer (it has a parent_prayer_id), notify everyone who prayed for that prayer through the existing notification inbox and push sends.
- Follow-up nudge: add a check to the existing hourly reminder job for open prayers older than 30 days, sent once per prayer.
- Invite kit: add an invite code for each organization, with a route that signs the person up and joins them to the group.
- Account deletion: a server function that uses the admin client to delete the user and their content, reached from You, then Settings.
