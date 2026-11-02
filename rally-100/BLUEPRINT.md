# RALLY 100 Product Blueprint

**Version 0.2 · 2026-11-01 (America/Chicago) · Status: product planning, no code · Working name: RALLY 100**

Prepared for the owner of RALLY MKTG. Brand assets referenced here live in `rally-100/brand/`. The branded web view of this document is generated from this file; this file is the source of truth.

## How to read this document

Every rule in this blueprint carries one of three labels. The labels matter more than the prose.

- **CONFIRMED RULE**: stated by the owner, in the master brief or in a recorded owner decision (dated). Not changed here. Both cash rewards are confirmed rules.
- **RECOMMENDATION**: proposed by this blueprint. Open to change. Nothing labeled RECOMMENDATION is a business commitment.
- **OPEN DECISION**: the owner must decide before build. Each one is numbered OD-1 to OD-8 in the final section with options and a recommendation; decided ones are marked there.

XP, levels and badges are game progress. They are never money and are never shown as money. Cash is only the two confirmed rewards below plus whatever the owner adds later from the separate incentive list, which this document deliberately leaves blank.

## The product in one page

**What it is.** RALLY 100 turns the new-rep "100 list" into a short, phone-first game, and turns every name a rep enters into a shared recruiting record the RALLY team can act on. One system, three views: the rep plays and introduces, the leader runs meetings and confirms requirements, the owner sees everything, approves rewards and records payments.

**The experience.** The rep's list is a 10×10 Wall of 100 tiles on a black screen. Names reach the Wall through Scenes: short memory prompts that drop the rep into a part of their life (the lunch table, the team bus, the slow part of a shift, their group chats), run a 60-second name Sprint, and chain one name into the next ("Who sat next to Marcus?"). A Sweep then fills in the missing details, fewest-missing-fields first. Each real, complete contact lights one tile RALLY green. Milestone lines cross the Wall at 10, 25, 50 and 75. Nothing is gated by time, nothing expires, and a motivated rep can light the whole Wall in an evening.

**Why this concept.** It was chosen over a checkpoint route map and a collectible card deck by three independent reviewers scoring delight, rule fidelity and buildability (Appendix A). Memory works by context, not alphabetically, so Scenes produce names a blank form never would. A grid is the fastest progress display to read with one glance and the simplest to build. The whole celebration budget fits in 1.5 seconds with a reduced-motion fallback for every moment.

**The money, exactly as confirmed.**

| Reward | Condition | Amount | Frequency |
|---|---|---|---|
| List Completion Reward | 100 distinct, complete contacts (first name, last name, social handle with platform, phone) | $100 | Once per rep, ever. Passing 200 earns nothing further. |
| Referral Reward | All four confirmed separately: meeting completed, commitment confirmed, agreement signed, start date and travel/arrival plans confirmed as applicable | $100 | Once per qualifying friend. Arrival is not required. Further stages earn nothing further. |

A completed list plus three qualifying friends is $400. A Referral Reward never waits for the list to reach 100. The interface never shows partial or pending cash: "42/100 contacts complete" and "Complete your 100 list to qualify for the $100 completion reward", never "$42 earned".

**Decided by the owner on 2026-11-01.**

- A Referral Reward can be approved before the rep's own list reaches 100.
- When two reps know the same person, each puts them on their own list and each counts them toward 100.
- A contact still counts toward 100 after any outcome, including Not interested and Do not contact.
- The extra incentives get a reserved spot; the incentive list itself is still to come.
- The look stays in RALLY brand colors, black, white and gray, with green for wins.

**Still open.** OD-2: when two reps know the same person, which rep receives the single $100 Referral Reward (this blueprint recommends the rep whose introduction led to the meeting, chosen by the leader with a written reason). The owner also needs to confirm the duplicate rule for one rep's own list, explained with an example in Duplicates and attribution. OD-4 to OD-8 are smaller build choices, listed in the final section.

**What ships first.** Rep app on the phone (Wall, Scenes, Add Contact with drafts and duplicate warnings, My Network, Introductions, My Rewards, Settings), Leader Workspace and Owner Dashboard on desktop, the recruiting pipeline with four separately confirmed referral requirements, an append-only reward ledger, and in-app and push reminders to the rep. Contact import, SMS reminders, team competitions and any payment integration come later. RALLY 100 never messages a contact automatically, in any version.

## Contents

- 1. What RALLY 100 is
- 2. The game: concept, progression and the actions that make it engaging
- 3. Walkthrough: a new rep from first login to 100 complete contacts
- 4. Reminders for a self-paced experience
- 5. Walkthrough: from adding a friend to referral-reward eligibility
- 6. The recruiting pipeline
- 7. Duplicates and attribution
- 8. Screens, part A: rep screens
- 9. Screens, part B: Leader Workspace and Owner Dashboard
- 10. Access and privacy model
- 11. Rewards, review and payment tracking
- 12. One connected system: how rep, leader and owner views stay connected
- 13. Data model and integration notes
- 14. First-version scope and later enhancements
- 15. Open decisions and assumptions
- Appendix A. Concept panel
- Appendix B. Brand assets
- Appendix C. Document history

---

## 1. What RALLY 100 is

RALLY 100 is a phone-first app that turns the new-rep "100 list" into a short game, Scenes & Sprints, and feeds every saved name into a recruiting CRM the RALLY MKTG team works from. The rep names 100 real people they personally know and enters four required details for each: first name, last name, one social handle with its platform identified (the platform is a fifth stored field) and a phone number. The game makes remembering fast and satisfying; the CRM lets the owner's team act on the result.

### Three purposes

1. Help each rep complete a 100-person warm-network list without treating it as homework.
2. Give each rep a clear view of introductions, each friend's recruiting progress and reward status.
3. Give the owner a master CRM of every submitted contact and the recruiting history behind it.

### The main experience

A black 10x10 Wall of 100 tiles. The rep drops into a Scene from their own life (the team bus, the lunch table, the slow part of a shift), calls out names in a 60-second Sprint, then Sweeps in the missing details. Each complete, distinct person lights one tile green. Milestone lines cross the Wall at 10, 25, 50 and 75, so the next target is always visible. Introductions start from the first contact: the Wall is one track, the Intro Board the other.

### Who uses it, on what device

Reps: young sales reps on phones, in short sessions. Leaders: a desktop Leader Workspace to run meetings, update the pipeline and confirm referral requirements. Owner: a desktop Owner Dashboard across every rep, contact, reward and payment record. Saved contacts reach the master CRM as they are saved, not at 100 (CONFIRMED RULE); reps are told so at onboarding and on every contact card. Deactivating a rep's login never erases submitted records (Access and privacy model).

### How it works in 60 seconds

A rep logs in, reads the goal, the two cash rewards and what counts as complete, and acknowledges that submitted contacts are shared with the RALLY recruiting team. Game Home shows an empty Wall and one button: "Enter a Scene." They pick Same Shift, sprint eight names, sweep in phones and handles; five tiles turn green and the counter reads "5/100 contacts complete." Tomorrow Game Home says "Last scene: Same Shift. 5 lit, 3 drafts left. Pick up where you left off." Nothing expired. When they introduce Marcus by their own text or call and mark it, a leader runs the meeting and ticks the four referral requirements as each is confirmed; the rep watches on the Intro Board. At 100 the Wall freezes as a trophy, the List Completion Reward moves to Ready for review, and Game Home pivots to introductions.

## 2. The game: concept, progression and the actions that make it engaging

### Concept and metaphor

RECOMMENDATION. Concept: Scenes & Sprints, subtitle "Light the Wall."

The Wall is the 100 list made physical: a 10x10 grid on a black screen, one complete distinct Person per tile, lit RALLY green (#22B558, the Sold green of the RALLY sales app). Names reach the Wall through Scenes, short memory sessions set in one place from the rep's life. A Scene is not a category form; it opens with a scene-setting line that puts the rep back in a specific place and moment ("After an away game, speaker on. Who's in the seats around you?"), because people are recalled by place and company, not by list. Inside a Scene the Sprint collects names only, Chain prompts pull the next name out of the last one, and the Sweep finishes details. The panther is the brand mark, used as a milestone stamp, not a mascot.

### Progression system

**How 0-100 is shown.** RECOMMENDATION. Tiles fill in completion order: Complete first, left to right, top to bottom, then Possible duplicate, then Drafts into the remaining empties; removing a contact collapses the order. Fill states: Empty (charcoal outline); Draft (40% gray, not counted); Possible duplicate (hatched gray, not counted); Complete (solid green, counted); Syncing (green with a white dot until the server confirms). Labels live in the counter row ("42 lit | 6 drafts | 1 to check"); tapping the Wall opens a zoomed 48px row with a first name and a "2 left" or "Check" chip, so no one taps a 30px target. If sync finds a duplicate, the tile moves to Possible duplicate, the counter corrects, and a toast reads "Marcus Lee might already be on your Wall (same phone). Tap to check."

**What the display counts.** CONFIRMED RULE: a tile lights only when first name, last name, phone number and one social handle with its platform are all present; one Person is one tile regardless of tags or accounts; Drafts and unresolved duplicates never count; no prior job interest is required, and every new List Entry starts with interest status Unknown. CONFIRMED RULE (owner decision, 2026-11-01): a Person whose outcome is Follow up later, Not interested or Do not contact still counts toward 100; Do not contact is honored in the CRM regardless. RECOMMENDATION: the platform is picked from a fixed list (Instagram, Snapchat, TikTok, Facebook, X, LinkedIn, Discord, Other plus a typed name); the phone is a normalized digits-only phone (rules in Data model and integration notes); the handle is non-empty. These are format checks only, not verification that the person is a real connection, which stays with the Leader at review. The number is a server-computed query over the rep's List Entries (complete, not deleted, not held as Possible duplicate), never a stored counter. Counting uses the rep's own List Entry fields; once a Person is Introduced, or known by more than one rep, a rep's phone or handle edit is a proposed correction the responsible leader accepts (see The recruiting pipeline).

**Duplicates.** RECOMMENDATION. The flag fires when either key matches, normalized digits-only phone (rules in Data model and integration notes) or platform+handle (lowercased, "@" stripped), against the rep's full history including deleted entries. The earlier Complete entry keeps counting; only the newer entry is held as Possible duplicate, so adding never lowers the count (RECOMMENDATION pending owner confirmation). Resolution ("Same person" / "Different people" with a reason, recorded as "Kept both" and shown to the leader at list review; nothing merges automatically) and cross-rep matching: see Duplicates and attribution.

**What changes at each milestone.** RECOMMENDATION, including the milestone values; the brief suggests 10/25/50/75/100 but does not confirm them. The primary button follows the main-loop rule at every milestone; only headline and subline change.

| Tiles | Name | What changes |
|---|---|---|
| 10 | On the board | First row green; panther stamp lands in the Wall's top-left corner; extra Chain prompt variants unlock |
| 25 | First quarter | Wall frame turns green; Game Home headline: "25 lit. Keep the run going." |
| 50 | Half Wall | Faint green dot-grid background; copy: "Half your Wall is lit. 50 to go. The $100 completion reward is for the full 100, no halfway cash." |
| 75 | Home stretch | Counter stays "75/100 contacts complete"; subline becomes a countdown: "25 to go. Finish your 14 drafts and you're at 89." |
| 100 | Wall complete | All tiles green; stamp centers, then settles into the header; Wall freezes as a trophy; reward strip: "100/100 complete. List reward: Ready for review. Next action: RALLY leadership approval. Nothing needed from you." |

Milestones 10 through 75 may fire on the optimistic local count and self-correct. The 100 milestone, the trophy freeze and any reward-status text fire only on the server-confirmed count; until then the strip reads "100/100 syncing."

**Exact progress wording.** CONFIRMED RULE phrasing, used everywhere: "42/100 contacts complete." "14 drafts." "8 more until your next milestone (50)." "Complete your 100 list to qualify for the $100 completion reward." "99/100, 1 more to complete your list." Never a percentage of cash, never "$42 earned," never a pending dollar figure beside a partial count.

**Claim integrity.** RECOMMENDATION, by analogy to RALLY's server-records-facts rule. Reaching 100 creates exactly one List Completion Reward record per rep (idempotent key = rep id) at Ready for review. The Leader reviews and may raise Needs correction with a reason; the Owner records Approved and Paid (OD-7 covers who else may). If the server count drops below 100 before approval the status stays Ready for review and the server sets a count-drop hold ("Count is 98 now, was 100 on Mar 14") that blocks Approve and clears itself at 100; Needs correction is raised only by a leader or the owner with an explanation. Approved and Paid are never reversed automatically; any correction is a new linked ledger entry, and crossing 100 again or 200 creates nothing (CONFIRMED RULE: one-time). Full rules: Rewards, review and payment tracking.

### Main loop

RECOMMENDATION. Every step ends in one obvious next tap.

1. **Open.** Game Home shows the Wall, "42/100 contacts complete," "6 drafts are one field away," "8 more until 50," and one white button for the cheapest next action: "Finish N drafts (2 min)" when N is 3 or more or finishing the one-field-away drafts would cross the next milestone line; otherwise "Continue: <last scene>" if it has under 5 names, otherwise "Enter a Scene"; after 100, the oldest Intro Board action waiting on the rep, else "Introduce someone". After a break: "Last scene: The Gym. 4 lit, 2 drafts left. Pick up where you left off." Nothing expires (CONFIRMED RULE).
2. **Pick a Scene.** Mission Select, titled "Scenes," is a card stack with per-Scene counts ("Same Shift · 2 lit · 1 draft" or "The Gym · not started"). Default order: Phone Sweep, Group Chats, Same Shift, then the memory Scenes. "Pick a scene. Skip any that aren't you." Card footer: "3 names clears this scene. No limit." (5 for Phone Sweep and Group Chats.)
3. **Drop in.** The scene-setting line plus two or three sensory cues. Primary "Start a 60-second Sprint", secondary "Just add names" (Phone Sweep and Group Chats put "Just add names" first, because the rep leaves the app).
4. **Sprint.** One input, "First name (nickname ok)." The keyboard's return key is labelled Add; tapping it saves the Draft immediately, pops a Draft tile onto the mini-Wall in 200ms and clears the field. Sound is opt-in. Under the field: "Just names. Details later." The timer pauses whenever the app goes to the background and resumes on return ("Timer paused while you were away"). At the end, a sheet: "You called 11 names." Primary "Light them up" (opens the Sweep), secondary "30 more seconds"; the input stays focused underneath, so typing another name also continues. "Dead end? Get a cue" sits under the input at all times; "Done" is a plain text link top-right, never a peer button.
5. **Chain.** After each name, one horizontally scrollable row of Chain prompts, first chip fully visible: "Who sat next to Marcus?" "Who did Marcus always come with?" "Marcus's sibling or cousin?" Chips stay until the next name is added or the rep swipes them away; nothing auto-dismisses. Tapping a chip pins it above the input and keeps the keyboard up; a name added under a pinned chip is a chain_hit.
6. **Sweep.** "Light them up: 11 drafts from this scene." Queue sorted fewest-missing-fields first; only missing fields shown as white-outlined rows. The handle row is two parts: "@ handle" (placeholder "@marcus.lee") and a required "Which app?" chip row (Instagram / Snapchat / TikTok / Facebook / X / LinkedIn / Discord / Other); Save is disabled until a chip is chosen, helper text "Pick the app so we know where to find them." "Save and next" (primary) / "Skip for now." Every save sets interest status to Unknown (CONFIRMED RULE); the Sweep never asks for interest or tags; interest changes only through the rep's "I introduced Marcus" sheet or a leader's record of a conversation. Each save flips its tile green in 200ms.
7. **See progress.** "53/100 contacts complete. You crossed the 50 line." Celebration plays once.
8. **Next action.** One button, per the rule in step 1: next Scene, finish drafts, or "Introduce someone" (never "first"; introductions start from the first contact).

With the keyboard up the Scene screen shows only the "Done" link, "11 names · 0:42", one prompt line, the chips, the input and "Dead end? Get a cue" (layout detail in Rep screens, Mission Select).

### Scene catalog

RECOMMENDATION. All Scenes are skippable and uncapped; the clear target only earns XP. Every chip is a full question. Tags are defaults the rep can change on the card; several tags, one count (CONFIRMED RULE). Phone Sweep is manual entry; import is optional and platform-dependent. Plus-One Chain and Mutual Friends draw unlock at 20 Complete tiles.

| Scene | Memory prompt | Chain prompts | Clears at | Tags applied |
|---|---|---|---|---|
| Phone Sweep | "Flip to your Phone app: Recents, then Contacts A to Z. Then your Instagram followers. Come back and type everyone you'd text back. The timer waits." | "Who's on your Snapchat best friends?" "Which TikTok mutuals do you actually know?" | 5 | Other; gray "Add tag" chip on the card, ignorable |
| Group Chats | "Scroll your group chats oldest to newest. Who's in each one? The timer waits while you look." | "Who's in a dead chat you never left?" "Who's in your Discord servers or Instagram group DMs?" | 5 | Group chat |
| Same Shift | "Clock in. Slow part of the shift. Who's on with you?" | "Who trained you on day one?" "Who was on with you at your last job?" | 3 | Work |
| The Lunch Table | "Cafeteria, junior year. Find your table. Who's there? Now the next table." | "Who was in your homeroom?" "Who did you ride to school with?" | 3 | School |
| Team Bus | "After an away game, speaker on. Who's in the seats around you?" | "Who was on the team the year before you?" "Who was on your club or travel team?" | 3 | Sports |
| The Gym | "The rack you always use. Who's there at the same time?" | "Who do you play pickup, rec league or jiu-jitsu with?" "Which trainers or front-desk people know your name?" | 3 | Gym |
| Home Street | "Stand in front of the house you grew up in. Look left, right, across." | "Who did you bike with?" "Who are your neighbors now?" | 3 | Neighborhood |
| Lost Touch | "Who were you tight with two years ago and haven't texted since? Picture where you two used to hang out." | "Who did they hang out with?" "Who would you text if you ran into them?" | 3 | Lost touch |
| Family Table | "Last big family gathering. Go around the table." | "Who are your parents' friends' kids?" "Who are your siblings' friends?" | 3 | Family |
| Clubs, Church, Community | "Youth group, band, robotics, scouts, volunteer shifts. Who was in the room?" | "Who ran it?" "Who was in your carpool?" | 3 | Hobbies/Clubs/Community |
| Roommates | "Dorm, apartment, barracks, mission companion, anyone you lived with. Who was down the hall?" | "Who was always over but didn't live there?" "Who shared a lease or a Wi-Fi password with you?" | 3; skip if none apply | Other (plus School for a dorm) |
| The Big Night | "Last party, wedding, concert, trip. Who did you go with? Who's in the photos?" | "Who posted the photos?" "Who did you leave with?" | 3 | Other; rep adds the fitting tag |
| Plus-One Chain | "Pick someone already on your Wall" opens a searchable list of lit names; then "Who did Jordan always bring?" | "Who introduced you to Jordan?" "Who else was always with them?" | 3 | Suggests the picked contact's tags |
| Mutual Friends draw | App draws three lit contacts that share a tag, shown as name cards: "Jordan, Priya and Sam (School). Who were they always with?" | "Who do these three have in common?" "Who was in the same photos as them?" | 3 | Suggests the shared tag |
| Light the Drafts | No recall: "14 drafts, most missing one field. Knock them out." Offered whenever drafts >= 5. | "Check the group chat for the number." "Only know their @? Save it with the app name. Phone can come later." | Clear the queue; no scene_cleared XP | No new tags |

### Stuck mechanic

RECOMMENDATION. The "Dead end? Get a cue" button opens the ladder; silence never opens anything. After 20 seconds without a name, or three chips swiped away, the button pulses once. Each tap climbs one rung and the input keeps focus: (1) next Chain cue; (2) cue swap, same Scene; (3) switch to thinnest Scene; (4) Phone Sweep as floor; (5) Plus-One or Mutual Friends, after 20 Complete tiles. No quota, no penalty for an empty Scene. Silence loses teenagers; a button that always has an answer does not.

### XP, levels and badges

RECOMMENDATION; XP and cash staying separate is a CONFIRMED RULE. XP is a thin white bar under the level name, never in dollars, never near the reward strip; the bar and every toast carry the "XP" suffix ("+100 XP"), so a bare number never sits one screen from "$100." Every XP event is server-recorded with an idempotency key.

| Event | XP | Key and rule |
|---|---|---|
| contact_completed | +10 XP | Keyed to the List Entry's linked Person; once per Person per rep, ever, regardless of later phone or handle edits. "Different people" creates two Persons and two keys |
| chain_hit | +3 XP | Name added under a pinned chip; keyed to the contact; granted only when that contact completes |
| scene_cleared | +15 XP | A name's origin Scene is the Scene it was first added in. Fires once per origin Scene per rep when 3 (5 for Phone Sweep and Group Chats) of its names reach Complete, wherever they are completed. Light the Drafts never awards it |
| milestone | +50 / +100 / +200 / +300 / +500 XP | At 10 / 25 / 50 / 75 / 100; keyed to the milestone |
| introduction_made | +100 XP | Fires when the Leader confirms the rep's Introduced report with one tap; once per Person per rep. Later pipeline stages award nothing |

**Anti-farming rules.** No XP for drafts, edits, deletes, restores, re-tags, notes, status changes, or opening the app. A rep delete is a soft-delete of the List Entry only; the Person, its recruiting history and any reward record remain in the master CRM, and re-adding the same person restores the same List Entry id and its events, so nothing is earned twice. A duplicate never counts and never earns. The count can go down and back up; XP never re-grants. XP never converts to cash and never appears on My Rewards. The remove sheet (wording in Rep screens, Add Contact) states the new count, that XP is never re-earned and that the RALLY recruiting team keeps the record.

**Levels:** Rookie 0, Scout 150, Connector 400, Operator 800, Prowler 1300, Apex 2000.

**Badges (never cash):** Scene Reader (3 Scenes cleared), Sprinter (10 names in one Sprint), Chain Reaction (5 chain hits in one Scene), Clean Sweep (20 drafts completed in one Sweep queue without leaving it), Full Wall, First Intro, Matchmaker (3 introductions; "Connector" stays a level name only). A reserved row reads "More incentives coming from RALLY leadership." The owner confirmed this reserved spot (owner decision, 2026-11-01); the incentive list itself is still to come, and no amounts or requirements are invented here.

### Celebrations and visual upgrades

Owner direction (2026-11-01): keep the RALLY brand colors and use green for wins. The details below are RECOMMENDATION. Green appears when a rep saves a name, completes a contact, clears a Scene, crosses a milestone or earns a reward, and nowhere else. Every celebration is under 1.5 seconds, tap-dismissible and never blocking. Sound is off by default; a light haptic tap plays where the phone supports it.

| Moment | Motion | Reduced-motion fallback |
|---|---|---|
| Name saved in a Sprint | The name flashes a green check for 150ms, then settles into a gray Draft tile; the counter does not move | Static green check for one second |
| Tile complete | 200ms green sweep across the tile; the counter ticks up | Instant green fill, 120ms opacity fade |
| Scene cleared | Green check burst on the Scene card; "+15 XP" rises once | Static green check and "+15 XP" |
| 10 | First row flashes green once; panther stamp scales in | Static stamp plus text |
| 25 | Frame animates to green | Frame appears green |
| 50 | Green dot-grid fades in; level card slides 300ms | Both appear static |
| 75 | Subline tick-flips to countdown | Text swap |
| 100 | All 100 tiles ripple green once from the first tile; stamp lands center, settles to header | Static centered stamp, then header |
| Badge or level-up | Flat card slides in 300ms with a green edge | Card appears |
| Reward approved | The panther stamp presses onto the reward row with a green ring: "Approved: $100" | Stamp and text appear |
| Reward paid | Green check: "Paid on Mar 21" | Same, static |

Cosmetic upgrades persist once earned, like XP: corner stamp (10), green frame (25), dot-grid (50). The countdown subline (75), trophy freeze and Overflow strip (100) follow the live server count and revert while the count is below 75 or 100. Every state is readable without color: fill patterns plus counter-row labels, never green alone. A reward celebration plays only at Approved and Paid, never at Ready for review, so no cash moment fires before approval (CONFIRMED RULE: no partial or pending cash).

### Brand and visual system

Owner decision (2026-11-01): RALLY brand colors, with green for wins. The tokens and rules below are RECOMMENDATION.

| Token | Value | Use |
|---|---|---|
| Black | #0A0A0B | Rep app background, matching rallymktg.com |
| Ink and charcoal | #17181A, #1B1C1E | Cards and panels; the same values as the live RALLY sales app |
| Grays | #3A3C40, #5C5E63, #B8BABF | Lines, Draft tiles, secondary text |
| White | #FFFFFF | Text; the primary button (white with black text, like the white menu pill on rallymktg.com); outlines on missing fields |
| RALLY green | #22B558 | Wins only: the saved-name check, Complete tiles, Scene cleared, milestones, badges, Approved and Paid stamps. The same green the RALLY sales app uses for a Sold pin |

- **Green means done, counted or earned.** It never marks a button, a Draft, a pending state or a Ready for review reward, so reps learn that green is a win. Green on black measures about 7 to 1 contrast, so it stays readable at small sizes.
- **Type.** Outfit 400 to 900, the typeface of the live RALLY app. Counters in 900 at 56px with tabular figures; body 16 on 24; labels 12px capitals with 0.12em tracking; the "RALLY 100" mark in 900 with 0.3em tracking, echoing the RALLY wordmark.
- **Panther.** The supplied panther mark is used unchanged: 24px top-left on every screen beside "RALLY 100"; a stamp at the 10 and 100 milestones; a green-ringed stamp on Approved rewards meaning "confirmed by RALLY"; "WALL COMPLETE" at 100 in letter-spaced capitals with thin rules on each side, echoing the "M K T G" lockup. No mascot animation, speech bubbles or new logo asset. The level names Prowler and Apex nod to the panther.
- **Shape and touch.** 16px corner radius, as in the live RALLY app; 48px tap targets; one primary button per screen.
- **Leader and owner screens.** The same tokens on a light surface: white and gray panels, ink text, black primary buttons, and green only for success states.

### Post-100 play

CONFIRMED RULE: the List Completion Reward is one-time; passing 200 or any multiple creates nothing. RECOMMENDATION: at 100 the Wall freezes as a trophy and Game Home pivots to the Intro Board, available since the first contact. Contacts beyond 100 appear in an "Overflow +12" strip: full CRM records, normal XP, introducible, referral-eligible (this follows from the confirmed rules: the list is everything the rep adds, and a Referral Reward never depends on the list count), but the counter never reads "112/100" and no 200 milestone, badge or reward exists. Strip copy: "Extra contacts help you make more introductions. The list reward is one-time."

An introduction is a record the rep makes after introducing the person through their own channels; RALLY 100 never messages a contact. "Introduce someone" opens a search of the rep's Complete contacts (a Draft reads "Finish this contact to introduce them."); "I'll introduce Marcus" sets Introduction planned and "I introduced Marcus" opens the Introduced sheet (chips Text / Call / In person / Other, what Marcus said, button "Done, Dana's up"; full flow in the referral walkthrough). Footer: "RALLY doesn't message Marcus. You make the intro your way, then tap this so your leader can set up the meeting." After save: "Marcus is on your Intro Board. Next: Dana schedules the meeting."

Stage ownership (RECOMMENDATION): the Rep sets Added, Introduction planned and Introduced and may set Follow up later on their own introductions before handoff; the Leader confirms the Introduced report, sets Meeting scheduled through Arrived or started and Follow up later from there, and Not interested and Do not contact at any stage. The responsible leader defaults to the assigned leader of the rep who first set Introduced (Access and privacy model). Ownership table: The recruiting pipeline.

Under the stage sit four separate check rows (Meeting completed, Commitment confirmed, Agreement signed, Start date and travel plans confirmed), each set individually by a Leader or Owner with name and date; a stage change never ticks a check (CONFIRMED RULE). The fourth row has three states: Unconfirmed, Confirmed, Not applicable (reason required); Not applicable counts as satisfied. Unticking requires a reason and is appended to history, never overwritten; its effect on the reward record follows Rewards, review and payment tracking. Card after the introduction: "0 of 4 confirmed. Next: Dana schedules the meeting." Later: "3 of 4 confirmed. Next: Dana confirms start date and travel plans, by Dec 3." Cards never use the word Owner to mean the person responsible. The Referral Reward record (one per Person org-wide, ever) is created at In progress when the Person reaches Introduced; the fourth confirmation, with the credited rep set, moves it to Ready for review; attribution, approval, payment and merges follow Rewards, review and payment tracking and Duplicates and attribution. A Referral Reward can be approved before the rep's list is complete (CONFIRMED RULE, owner decision, 2026-11-01); OD-2, which rep receives it when two reps know the same person, stays open. Return digest: "2 updates. Jordan Lee → Meeting completed (Dana confirmed). Priya Shah → Follow up later; Dana will reach out Dec 3."

### Optional team challenge

Later enhancement, not v1 (see First-version scope and later enhancements). RECOMMENDATION; off by default; enabled per team by the Owner; aggregate only. Team Wall: team average lit percentage, level badges and complete-counts only; a rep may hide their number from peers, which also removes them from the leaderboard; leaders still see it. Sprint Night: a 15-minute window with a live team total of names, no attribution below team level. Relay: pairs race to clear five Scenes each, shown only as Scenes cleared. Opt-in leaderboard shows rank, level and count. No tap path from any team surface reaches another rep's contacts (CONFIRMED RULE: no private list exposed through a leaderboard).

### Why this concept

Recall is place-based: "who was on the bus" beats "list your friends." Scenes exploit that, and Chain prompts turn each remembered name into the cue for the next. The Wall gives the 100 one physical shape, so progress needs no explanation and the next line is seen, not computed. Names-first entry keeps the fast part fast and moves the slow part into a sorted Sweep showing only what is missing. One metaphor, no caps, no waiting periods, so a motivated rep can finish in an evening; cash wording stays literal.

### Exact actions that make it engaging

- Tap "Enter a Scene" and read one line that puts you in a real place; names arrive in seconds because place cues beat blank forms.
- Type a first name and tap Add; a Draft tile pops onto the mini-Wall in 200ms and the field clears, so the Sprint never stalls.
- A Chain prompt row waits under each name ("Who sat next to Marcus?"); tap one, it pins above the input, and another name follows.
- The timer ends on "You called 11 names" with "Light them up" or "30 more seconds"; the rep chooses and is never blocked.
- Tap "Dead end? Get a cue" for a new cue, angle or Scene in one tap; being stuck never ends a session.
- In the Sweep the card shows only "Phone"; fill it, tap "Save and next", the tile flips green in 200ms and the counter ticks.
- Cross a milestone line, read "53/100 contacts complete. You crossed the 50 line", and the Wall changes (frame, dot-grid, stamp) and stays changed.
- Game Home opens on "6 drafts are one field away" with a two-minute button, so the cheapest win is always offered first.
- After a break Game Home says "Last scene: The Gym. 4 lit, 2 drafts left. Pick up where you left off"; nothing expired.
- At 20 Complete tiles, Mutual Friends draws three names sharing a tag and asks who they were always with; the Wall becomes the prompt.
- After an introduction the Intro Board card reads "0 of 4 confirmed. Next: Dana schedules the meeting", naming the next step and who holds it.
- At 100 the Wall freezes as a trophy and the strip reads "100/100 complete. List reward: Ready for review"; the next button is an introduction.

## 3. Walkthrough: a new rep from first login to 100 complete contacts

Labels: CONFIRMED RULE = from the master brief; RECOMMENDATION = design proposal (everything unlabeled); OPEN DECISION = owner must decide. Tyler is a new rep on Leader Dana's team. Screen wording is in quotes; days are illustrative (CONFIRMED RULE: self-paced, no deadline).

### First login and onboarding (Day 1, under 60 seconds)

Four cards ("1 of 4" dots, each under 40 words); Game Home is locked until card 4 is acknowledged.

Card 1, goal: "Build your 100 list: 100 real people you know. Nobody has to want a job. You build it in Scenes: short memory prompts from one part of your life. Each person lights one tile on your Wall."

Card 2, rewards, four lines: "Finish all 100: $100. One time." / "Each friend you introduce who gets all four checks: $100. Each friend counts once." / "The four checks: Meeting completed, Commitment confirmed, Agreement signed, Start date and travel plans confirmed (where travel applies)." (CONFIRMED RULE) / "Your leader reviews, RALLY leadership approves, then it's recorded as paid." (RECOMMENDATION).

Card 3, required fields: "A contact counts with all four: first name, last name, one social handle with the app named, phone number. Save names first, add details later. Drafts are kept but don't count."

Card 4, "Who sees your contacts" (CONFIRMED RULE: reps must understand contacts are shared; RECOMMENDATION: the checkbox is stored as a timestamped append-only acknowledgment event with the disclosure version): "Every contact you save, including drafts, is visible to your leader and the RALLY recruiting team the moment you save it, not at 100. The RALLY recruiting team may contact people you introduce. Other reps never see your list." Checkbox: "I understand my contacts are shared with the RALLY recruiting team." Button "Light the Wall" (subline "Start building your 100") is disabled until checked.

Game Home: empty Wall, "0/100 contacts complete", "Rookie" with an empty XP bar, one white button "Enter a Scene", subline "Just names first. Details later." The reward strip is two fixed lines until status changes: "List reward: In progress." / "Complete your 100 list to qualify for the $100 completion reward." (CONFIRMED RULE wording). Never an earned or partial amount.

### The first Scene

Mission Select ("Scenes") opens with "Pick a scene. Skip any that aren't you." Phone Sweep is first: "Open your Recents, then Contacts A to Z, then your followers. Type every name you'd text back. Switch apps as much as you want, we keep your spot." Because the rep leaves the app, its primary button is "Just add names" (same input, no timer); "Start a 60-second Sprint" is second. A Sprint timer pauses while the app is backgrounded.

### Fast name capture

One field, "First name (nickname ok)", with "Just names. Details later." under it. Tyler types "Marcus", taps the keyboard's "Add" key: a gray draft tile lands on the mini-Wall and the field clears. Three scene-specific chain chips appear (Phone Sweep: "Who's on your Snapchat best friends?" "Which TikTok mutuals do you actually know?" "Who's in your Venmo history?"; memory scenes substitute the name: "Who sat next to Marcus?"). Chips never time out; the next name replaces them. He taps the second and types "Devin". With the keyboard up only "Phone Sweep: 11 names", the input, the chips, "Dead end? Get a cue" (ghost) under the input and "Done" as a text link top-right are visible. Sprint end sheet: "You called 11 names." Primary "Light them up", secondary "30 more seconds".

Names take the Scene's tag automatically (Team Bus = Sports); tags are never asked for during entry. Each name is written to local storage at once and queued for sync; after an interruption: "11 names saved as drafts. Resume Phone Sweep?" A Draft is a List Entry visible to Dana and the owner; a Person is created once it has a phone or platform+handle and linked to an existing Person only under the cross-rep rule in Duplicates and attribution. Tiles carry fill state only; labels live in the counter row and the zoomed row. Counter: "0/100 contacts complete, 11 drafts." No XP for drafts.

### Finishing details later

Sweep: "Light them up: 11 drafts from this scene", fewest-missing first. Marcus shows only "Last name", "Phone", "Social" (app chip, then "@handle"). Tyler fills them, taps "Save and next". The tile fills green with a white syncing dot; the counter reads "1/100 (1 syncing)" until the server confirms, then "1/100 contacts complete". For Devin he enters last name and Snapchat handle, then "Skip for now": "Draft, 1 to go: phone." Every card carries "This contact is shared with the RALLY recruiting team" and the notes hint "Never type card or bank details here." He closes at "7/100 contacts complete, 4 drafts."

### First milestone: 10 "On the board" (Day 2)

Home: "7/100 contacts complete. 4 drafts, 3 one field away. 3 more until your next milestone (10)." ("One field away" = exactly one missing field.) Primary: "Finish 4 drafts (2 min)". He gets Devin Ortiz's number from a group chat, then completes Kayla Nguyen and Andre Walker. Tile ten fills, the row flashes once, the panther stamp lands top-left: "10/100. On the board. First row lit." Level card "Scout" (150 XP: ten completions plus the milestone) sits under the level name, never near the reward strip. Next action: "Enter a Scene" (he picks Group Chats).

### Returning the next day (Day 3) and "Save and add another"

Home opens straight to the Wall: "Last scene: Group Chats. 4 lit, 2 drafts left. Pick up where you left off." Primary-button rule (stated in the game section's main loop): "Finish N drafts (2 min)" when N is 3 or more or the one-field-away drafts would cross the next milestone line; otherwise "Continue: <last scene>" if it has under 5 names, otherwise "Enter a Scene"; after 100, the Intro Board's oldest action waiting on the rep, else "Introduce someone". No streak indicator exists.

Tyler opens Marcus's card, taps "I'll introduce Marcus" (stage is now Introduction planned; card: "Next: you, tell Marcus about RALLY."). Only a Complete entry can be introduced; a Draft shows "Finish this contact to introduce them." At a gas station he meets a coworker: Add Contact from the My Network "+", name and phone, "Save and add another", her roommate, "Save and finish" (first name is the only field required to save). That weekend he tells Marcus about RALLY and taps "I introduced Marcus" (Introduced; card: "Next: Dana schedules the meeting."). The Intro Board is available from the first contact (CONFIRMED RULE).

### Returning after a two-week break (Day 18 to 32)

Tyler stops at "23/100 contacts complete, 9 drafts" for two weeks. CONFIRMED RULE: a missed day never erases progress or expires an eligible reward. Return: same Wall, one gray line "Welcome back. 23/100 complete, 9 drafts, 2 more until First quarter (25)." Primary: "Finish 2 drafts (2 min)" (two one-field-away drafts cross the 25 line). No streak loss, no red. Away moves are leader-made: "Since your last visit: Marcus Lee is now Meeting scheduled (Dana)." Two drafts later the frame turns green: "25/100. First quarter." Home copy: "Keep the run going."

### Hitting a duplicate inside his own list (Day 33)

In the Team Bus Sprint Tyler types "Marcus" again (hint "You already have 1 Marcus on your Wall", no block). In the Sweep he enters phone 555-0142; on save the dedupe check (digits-only phone and lowercase platform+handle, against his full history including deleted and merged-away entries; run on the device for instant feedback and re-run on the server, which is authoritative) matches Marcus Lee. The older Complete entry keeps counting; only the new tile goes hatched "?" as a Possible duplicate and is not counted, so adding never lowers the count (CONFIRMED RULE: a duplicate does not advance the count; the older-keeps-counting rule is a RECOMMENDATION pending owner confirmation). Banner: "Looks like Marcus Lee is already on your Wall (same phone). Same person?" Buttons "Same person" (opens "Keep the best of both": pick the right value per field; nothing is deleted) / "Different people".

Same person: the Sports tag and note join the existing entry (several tags, one count); no XP, since contact_completed for Marcus exists; the second entry is soft-deleted and linked, with "Undo merge" in its history.

Different people: asks for a one-line reason ("brothers share a phone"); both tiles count at once, the pair is recorded as "Kept both" with a small "2" link chip, and the card reads "Counted. Your leader will see this pair when reviewing your list." On a same platform+handle match "Different people" is not offered: one handle cannot belong to two humans. This is a duplicate check, not verification of a real connection.

Cross-rep matches are never shown to the rep: the tile lights normally (each rep counts a Person once: CONFIRMED RULE, owner decision, 2026-11-01); leaders and the owner see "Known by 2 reps" on a linked Person, or a "Possible cross-rep match" flag to resolve, and decide attribution (OD-2).

### Running out of ideas (Day 35)

In The Gym, after 20 seconds without a name, or three chips swiped away, the "Dead end? Get a cue" button pulses once; nothing opens without a tap, and the app never leaves a scene on its own. Each tap climbs one rung. Rung 1: "Trainers, front desk?" Rung 2: "Different gym, different year?" Rung 3: "Nobody else at the gym? Try Lost Touch or The Big Night." Rung 4: Phone Sweep again. Rung 5 (20+ tiles): three tiles sharing a tag, redrawable: "Mutual friends: Marcus, Devin and Andre (Sports). Who was always around all three?" He types "Jordan". No quota, no penalty for an empty scene.

### The 50 moment: "Half Wall" (Day 41)

"49/100, 3 drafts." Tyler completes Priya Shah. Dot-grid fades in; level card "Operator." Copy: "Half your Wall is lit. 50 to go. The $100 completion reward is for the full 100, no halfway cash." The strip keeps its two fixed lines; nothing reads "$50 earned." Next: "Enter a Scene".

### The 75 moment: "Home stretch" (Day 50)

Counter: "75/100 contacts complete." Subline: "25 to go. Finish your 14 drafts and you're at 89." Primary: "Finish 14 drafts (2 min)". He gets cousins Elena and Mateo Ruiz's numbers from the family chat and clears all 14 in one sitting (one foreground session). Badge card: "Clean Sweep: 14/20"; the badge needs 20 and is never cash.

### 99 versus 100 (Day 56)

"99/100, 1 more to complete your list." Strip: "List reward: In progress." / "Complete your 100 list to qualify for the $100 completion reward." CONFIRMED RULE: 99 complete contacts = list not finished. No "almost earned", no partial amount, no countdown to cash. If the hundredth save is a duplicate (Jordan Lee again), the tile goes "?" and the counter stays at 99. Only a distinct, complete Person lights tile 100.

### The 100th complete contact (Day 56, that evening)

Tyler completes Sofia Castillo. The strip reads "100/100 syncing." until the server confirms the count and creates the reward record; no reward status is ever shown from device state alone. Then the Wall pulses once, the panther stamp settles into the header, "WALL COMPLETE". Strip: "100/100 complete. List reward: Ready for review. Next action: RALLY leadership approval. Nothing needed from you." No amount is marked earned. My Rewards: "List reward: $100", "Ready for review", footer "'Paid' means RALLY marked this as paid on that date. This app doesn't send money. RALLY pays you directly." (CONFIRMED: no payment provider is selected).

Review flow: one List Completion Reward record per rep id, server-created at Ready for review; next action: RALLY leadership approval. Dana may run the optional spot-check (3 to 5 random Complete entries, one question each, asynchronous, shown on the record as "Spot-check: done by Dana, Nov 16") and may raise Needs correction with a note; the owner setting "Leader spot-check required" defaults to No (OD-5). The server also shows her 100 distinct complete entries, open Possible duplicate pairs and Kept both pairs. Full rules: Rewards, review and payment tracking.

Leaders flag, reps merge. Strip: "Needs correction. Dana: 'Jordan Lee and Jordan L. look like the same person.' Your count stays 100 until you resolve it; if you merge, it becomes 99." "Review Jordan" shows the pair with "Same person" / "Different people" and "Your reward stays on record. Nothing is lost." He merges: "99/100. List reward: Ready for review, on hold until you're back at 100. Nothing was lost." (a server-set hold, cleared automatically at 100). He completes a draft and taps "Ask for re-check"; Dana records the correction resolved and the same record returns to Ready for review. No second record, ever. Next action: "Introduce someone".

### After 100

The Wall freezes as a trophy. New contacts: "Overflow +3. Extra contacts help you make more introductions. The list reward is one-time." Never "103/100"; nothing at 200 (CONFIRMED RULE). Overflow contacts are full records, introducible and referral-eligible. After Approved or Paid the trophy stays and nothing regenerates. Home pivots to the Intro Board. Marcus Lee: "Meeting scheduled. Next: Dana holds the meeting." Kayla Nguyen: "Introduction planned. Next: you, tell Kayla about RALLY." Button "I introduced Kayla", subline "Then Dana takes it from there."

Who moves what: the Rep sets Added, Introduction planned and Introduced and may set Follow up later (with a date) on their own introductions before handoff; from Meeting scheduled onward only the Leader or Owner sets stages, the four checks and outcomes; Not interested and Do not contact are Leader or Owner only at every stage. A backward stage move needs a reason and is a new event. Reps see "Next: you" or "Next: Dana", never the word owner. Table: The recruiting pipeline.

### If a rep is deactivated

Login disabled; every List Entry, Draft, Person, pipeline event, XP event, acknowledgment event and reward record stays under Tyler's rep id ("Tyler (deactivated Dec 2)" in Owner Dashboard); referrals in flight keep attribution. Whether a Ready for review or Approved reward is still paid is OD-8; it is never deleted and can move to Paid or be reversed by the owner with a reason (a flag, not a status). Mechanics: Access and privacy model.

## 4. Reminders for a self-paced experience

Everything here is RECOMMENDATION unless marked. "Nudge" = one of three automated reminders: unfinished drafts, next milestone close, introduction awaiting the rep. Leader updates, leader messages and reward status changes are not nudges.

### Principles

1. Self-paced, no deadline (CONFIRMED RULE). A reminder informs; it never counts down.
2. Never punish: no streaks, no streak loss, no "you missed", no red states.
3. Never erase: no reminder path changes, hides or expires data or an eligible reward (CONFIRMED RULE).
4. One next action per reminder, one tap away.
5. Rep only. Adding a contact never messages the contact (CONFIRMED RULE: V1 records introductions made through existing channels).
6. Quiet by default; volume rises only when the rep opts in.

### Channels

| Channel | Default | Notes |
|---|---|---|
| In-app (Home digest line, bell) | Always on | System of record; other channels point here; never held or decayed |
| Push | Off until asked | At the 10 milestone: "Put RALLY 100 on your Home Screen to get nudges" (an iPhone web app can only push from there). On first Home Screen open: "Want a nudge when drafts stack up or your leader updates one of your intros?" with "Yes, nudge me" / "Not now", re-asked only from Settings |
| SMS to the rep's own number | Off | Double opt-in (number, 6-digit code), "Reply STOP to end" on every message. Reward status and leader messages only; bodies never carry names or amounts: "RALLY 100: a reward status changed. Open the app." RECOMMENDATION: v1 ships without SMS; it is a later enhancement until a provider is chosen |
| Email | Not in V1 | |

### Cadence and quiet rules (recommended defaults)

Last active = last foreground session of 10+ seconds; idle = hours since; local time = device timezone stored on the profile, team timezone as fallback.

| Reminder | Trigger | Delivery and limit |
|---|---|---|
| Unfinished drafts | 3+ drafts and 48 hours idle | Once per 72 hours |
| Next milestone close | Within 3 of a milestone and 24 hours idle | Once per milestone, ever |
| Introduction awaiting rep | 24 hours after an action becomes the rep's | Every 7 days, maximum 3, then Intro Board only |
| Leader update | Stage change or requirement check by a leader | In-app at once; push/SMS at once outside quiet hours, later events within 60 minutes collapsed into one updated push |
| Reward status change | Ready for review, Approved, Needs correction or Paid | In-app at once; push/SMS at once outside quiet hours, otherwise when quiet hours end |

Quiet hours default 10 pm to 8 am local, editable; they hold push and SMS only. Caps: one nudge push per day, three nudge pushes per week. No push while the app is in the foreground. No nudge within 12 hours of a leader nudge. Idle decay applies to nudges only: after 30 days idle, one per month ("Your Wall is still here. 23/100, nothing expired."); after 90 days, nudges stop until the rep returns. Reward status changes, leader updates and leader messages never decay. Data is never deleted.

### What each reminder says

Unfinished drafts: "6 drafts are one field away. Knock them out and light 6 tiles." Opens the Sweep.

Next milestone close: "47/100. 3 more until Half Wall." Opens Game Home with the primary-button rule from "Returning the next day". Never "3 more until $X."

Introduction awaiting the rep: "Talked to Marcus yet? Tap to update." Opens the card with "I introduced Marcus" / "Not yet, follow up later" (sets Follow up later with a date; stage unchanged).

Leader update: "Dana updated Jordan Lee. Stage: now Meeting completed. Confirmed: Meeting completed (1 of 4 requirements)." Where only the stage moved: "Jordan Lee: now Meeting scheduled. Requirements confirmed: 0 of 4." A stage line and a requirement line are always separate items from separate events; a stage change never changes the count, which is read from the four requirement records and always named in full (Meeting completed, Commitment confirmed, Agreement signed, Start date and travel plans confirmed), never as codes (CONFIRMED RULE). Amounts are never shown. Opens Introductions.

Reward status change: "List reward: Approved by RALLY leadership. RALLY pays rewards outside this app; your leader will tell you how and when." / "List reward: Needs correction. Dana left a note." / "Referral reward for Jordan Lee: recorded as paid on Nov 20. Tap for details." Opens My Rewards. Never "you earned" before Approved.

### How a leader nudges without nagging

Leader Workspace shows per rep: count, drafts, "last active 9 days ago" (never "9 days missed"), and who holds the next action. "Send a nudge" offers three templates plus an optional personal line, delivered in-app and by push from the leader by name; numbers are filled from live data at send time and stored as sent:

- "Dana: You're 4 drafts from Half Wall. Want help getting numbers?"
- "Dana: Marcus is on your board. Tell me when he's open to a meeting."
- "Dana: Your list is under review. I'll have it back to you by Friday."

Limits: one leader nudge per rep per 7 days across all leaders and the owner combined; no bulk send; no automated nudges in a leader's name. Leaders cannot message contacts through RALLY 100 in V1. Team play lines stay on the Team Wall, never in a rep's notifications.

### How reps control it in Settings

"Reminders" group:

- Push notifications: on / off ("add to Home Screen first" on iPhone until done).
- Draft, milestone and introduction reminders: each on / off.
- Leader updates and messages: push on / off (in-app always remains).
- Reward status changes: push on / off (in-app always remains).
- Show names in notifications: on / off (off says "a contact").
- SMS to my number: off / on with double opt-in (later enhancement).
- Quiet hours: default 10 pm to 8 am; hint "Nudges wait until your quiet hours end."
- "Pause all reminders for 30 days": stops push and SMS nudges and leader-update pushes; in-app lines and reward status changes continue. Line: "Your Wall and rewards are unaffected."

Turning everything off has no effect on count, XP, rewards or review, and the screen says so.

## 5. Walkthrough: from adding a friend to referral-reward eligibility

Cast: Rep Tyler, his friend Marcus Lee, Leader Dana, a second rep Sam, the Owner. Rep-facing copy never uses "Owner" as a label: it says "Next: you, ..." or "Next: Dana ...", and calls the Owner "RALLY leadership".

CONFIRMED RULE: the Referral Reward is $100 per qualifying Person, paid once, and requires R1 Meeting completed, R2 Commitment confirmed, R3 Agreement signed and R4 Start date and travel/arrival plans confirmed, each confirmed separately. A stage change never confirms a requirement. Rep screens show the requirement names, never the R codes.

### Steps

1. **Rep adds Marcus (Added).** Tyler calls Marcus's name in the Team Bus Scene and finishes his fields in the Sweep. Tile lights; interest status "Unknown". Marcus is in the Owner Dashboard immediately with source rep, creation date and Sports tag. Nothing is sent to Marcus.

2. **Rep taps "I'll introduce Marcus" (Introduction planned).** Card: "Introduction planned. Next: you, tell Marcus about RALLY and that Dana will text him. Then come back and tap 'I introduced Marcus'." RECOMMENDATION (still no automatic messaging): a "Copy a message" button puts an editable blurb on the clipboard ("Hey, I'm working with RALLY this summer. Cool if my leader Dana texts you about it?") for Tyler to send himself. Both buttons need a Complete List Entry (RECOMMENDATION: the leader needs the phone to schedule); a Draft shows "Finish this contact to introduce them."

3. **Rep records the introduction (Introduced).** Tyler texts Marcus, then taps "I introduced Marcus". One sheet, two chip rows, one button: "How?" [Text] [Call] [In person] [Other]; "What did Marcus say?" [In] [Maybe] [Not for them] [Didn't really say] (stored as Interested / Maybe / Not interested / Unknown); "Done, Dana's up", enabled after one chip per row. Date is today behind a gray "Not today? Change date" link; "Add a note" is collapsed. "Not for them" records interest status Not interested and creates a task for Dana; only a leader or the Owner sets the outcome Not interested. Card: "Introduced on Mar 2 by text. Next: Dana schedules the meeting. Nothing needed from you right now." Under it: "0 of 4 confirmed. Next: Dana confirms the meeting." and four rows, each "empty circle, name, 'Not yet'". Marcus appears in Dana's Leader Workspace under "New introductions (1)". Marcus reaching Introduced creates his Referral Reward record (one per Person org-wide, ever) at In progress; a confirmation never creates it, and My Rewards now shows "Marcus Lee: 0 of 4 confirmed." Dana taps "Confirm introduction received", or schedules the meeting, which records an explicit "Introduction received by Dana, Mar 4" event as part of that action; introduction_made XP is keyed to that event, once per (rep, Person). XP is game progress only, never money.

4. **Leader schedules (Meeting scheduled).** Dana taps "Take this introduction" (records receipt; Marcus's responsible leader already defaulted to Dana, Tyler's assigned leader, when Tyler set Introduced; see The recruiting pipeline), then enters date, time, how (In person / Video / Phone) and a note. Tyler's card: "Meeting with Dana: Mar 6, 4:00 PM, video. Next: Dana holds the meeting." Tyler can no longer change stage, outcome or requirements. Lock explainer: "Dana runs this from here. You can still fix Marcus's phone, handle, tags and your notes." Beneath it, "Something wrong? Tell Dana" (placeholder "What should Dana know?"; confirmation "Sent to Dana. She'll see it in her next actions.").

5. **Meeting completed, then R1 confirmed separately.** Dana moves the stage. The app asks: "Confirm check 1, Meeting completed, for Marcus Lee? This will be saved as confirmed by Dana, Mar 6." Buttons: "Confirm" / "Not yet". On "Not yet", Tyler's card: "Meeting completed on Mar 6. Dana still needs to confirm it for your reward. 0 of 4 confirmed. Nothing needed from you." On "Confirm": "1 of 4 confirmed. Next: Dana confirms the commitment." with the first row "check, Meeting completed, 'Dana, Mar 6'". Gray line: "The meeting is 1 of 4. All 4 need Dana's confirmation before your referral reward goes to review."

6. **R2 Commitment confirmed.** Marcus says yes. Dana sets the stage and separately confirms R2 with event date Mar 9 and a note ("verbal yes on call"). Each confirmation stores event date, server confirmed-at and confirmer (see The recruiting pipeline); the rep sees the event date.

7. **R3 Agreement signed.** Dana confirms R3 on Mar 12. Card: "3 of 4 confirmed. Next: Dana confirms start date and travel plans."

8. **R4 confirmed; Ready for review.** On Mar 15 Dana records start date May 4 and a travel note, or ticks "travel not applicable" (row reads "Start date confirmed. No travel needed."), and confirms R4. R4 confirmation and the attribution entry (see Duplicates and attribution) are one server transaction; if Dana abandons the decision screen, R4 stays unconfirmed and Dana's panel reads "3 of 4 confirmed. Start date and travel plans confirmed is waiting on an attribution decision." On commit the server, not the device, checks that all four carry confirmer and date and moves Marcus's existing record to Ready for review. On a single-rep Person the recipient defaults to that rep; if that rep recorded no introduction, the record carries the flag "No introduction recorded", red in the Owner queue (see Duplicates and attribution). One string on the card, My Rewards and the digest: "Marcus Lee: 4 of 4 confirmed. Referral reward: Ready for review. Nothing needed from you." Marcus's start date is seven weeks out. CONFIRMED RULE: eligibility does not require arrival.

9. **Owner approves (Approved).** The Owner Dashboard queue shows rep Tyler, contact Marcus Lee, the four requirements with confirmer, event date and confirmed-at time, attribution and reason, any soft-match line (see Duplicates and attribution), amount $100 and Tyler's list count. Buttons: "Approve" / "Needs correction" (explanation required, naming the requirement or record at fault). Rep row while returned: "Marcus Lee: Needs correction. Leader Dana is fixing a date on Agreement signed. Nothing needed from you." If the correction is on Tyler (wrong phone, duplicate), it ends "Next: you, ...". On approval the row gains the green panther stamp: "Approved on Mar 16."

10. **Owner records payment (Paid).** When the money has gone out, the Owner taps "Record as paid" with date and method. Rep row: "Paid on Mar 20." (the method note sits in the row's expanded history). Rep footer: "'Paid' means RALLY marked this as paid on that date. This app doesn't send money. RALLY pays you directly." The Owner Dashboard keeps "Recorded as paid means RALLY has logged the payment; it is not the transfer itself." No payment provider is selected or integrated.

11. **Marcus arrives (Arrived or started).** On May 4 Dana moves the stage; Tyler sees it in his return digest. Nothing is created: a record for Marcus's Person ID exists, so the server refuses a second one. The same holds if Tyler edits, deletes and restores Marcus, or Marcus is merged with a duplicate (see Duplicates and attribution). Unticking a requirement before Approved is a new linked entry with a reason that returns the same record to In progress ("3 of 4 confirmed. Reward on hold until Dana re-confirms Commitment confirmed. Nothing needed from you."); re-confirming returns it to Ready for review; after Approved or Paid an untick is refused and only an Owner reversal applies (Rewards, review and payment tracking).

### The rep's requirement line at each step

The contact card shows the short summary ("2 of 4 confirmed. Next: Dana confirms the agreement.") and the four rows carry the names. The line below is the single string in My Rewards and the return digest, where there are no rows.

| After step | My Rewards / digest line |
|---|---|
| 3 | "Marcus Lee: 0 of 4 confirmed. Still needed: Meeting completed, Commitment confirmed, Agreement signed, Start date and travel plans confirmed." |
| 5 | "Marcus Lee: 1 of 4 confirmed: Meeting completed. Still needed: Commitment confirmed, Agreement signed, Start date and travel plans confirmed." |
| 6 | "Marcus Lee: 2 of 4 confirmed: Meeting completed, Commitment confirmed. Still needed: Agreement signed, Start date and travel plans confirmed." |
| 7 | "Marcus Lee: 3 of 4 confirmed: Meeting completed, Commitment confirmed, Agreement signed. Still needed: Start date and travel plans confirmed." |
| 8 | "Marcus Lee: 4 of 4 confirmed. Referral reward: Ready for review. Nothing needed from you." |

The fourth row label is "Start date and travel plans confirmed"; when travel does not apply it reads "Start date confirmed. No travel needed." A per-Person reward row appears only once the record exists (from Introduced) and carries no amount before Approved; the rule line "Referral rewards: $100 per qualifying friend" is always visible on My Rewards. Totals include only Approved and Paid; a Ready for review row carries "Not counted in your total until Approved." The card never shows "$75 earned" or "75% of your bonus".

This walkthrough deliberately shows: a meeting alone does not qualify (walkthrough step 5); a stage change does not tick a requirement (walkthrough step 5, "Not yet"); the same friend advancing further never creates a second reward (walkthrough step 11); eligibility arrives before arrival (walkthrough step 8); XP (walkthrough step 3) and cash (walkthrough step 8 onward) are separate events in separate places.

### Referral approval does not wait for the list

CONFIRMED RULE (owner decision, 2026-11-01): a Referral Reward can be approved as soon as all four requirements are confirmed, whatever the rep's list count. Approval steps are in Rewards, review and payment tracking.

## 6. The recruiting pipeline

Entities and keys are defined in Data model and integration notes. In short: a Person is created on the first save that carries a phone or platform+handle and linked to an existing Person only under the cross-rep rule in Duplicates and attribution; stage, interest status and the four requirements live on the Person; each introduction is its own record naming the rep; outcomes a rep sets before handoff live on the List Entry, leader outcomes on the Person.

Contact edits: before any introduction, the only rep who knows the Person edits phone and handle directly and duplicate checks re-run. Once a Person is Introduced or known by more than one rep, a rep's phone or handle edit is a proposed correction that the responsible leader (the Owner if none) sees as a task ("Tyler updated Marcus's phone (proposed)") and accepts into the Person; cross-rep re-matching never runs past Introduced, and conflicts go to the leader as a manual link.

### Stage table

| Stage | Meaning | Who moves it | Typical next action (who does it) | Data captured | Requirement |
|---|---|---|---|---|---|
| Added | On a rep's list; no recruiting action yet | System, when the Person is first created; a later List Entry for the same Person never changes the stage | Decide whether to introduce (rep) | Source rep, created date, tags, interest status (Unknown) | None |
| Introduction planned | Rep has said they will introduce this person | Rep | Make the introduction (rep) | Planned date (optional), note | None |
| Introduced | Rep has told the friend about RALLY; the team may reach out | Rep | Confirm receipt and take the introduction (leader) | Channel, date, interest status, note, introducing rep, received by, received date; rep's List Entry must be Complete | None |
| Meeting scheduled | A meeting date exists | Leader | Hold the meeting (leader) | Date, time, how, note | None |
| Meeting completed | The meeting took place | Leader | Confirm R1 (leader) | Meeting date, note | R1, separate confirmation |
| Commitment confirmed | Friend has said they are in | Leader | Confirm R2 (leader) | Date, how confirmed, note | R2, separate confirmation |
| Agreement signed | Signed agreement on file | Leader | Confirm R3 (leader) | Date signed, note | R3, separate confirmation |
| Start/travel plans confirmed | Start date and arrival logistics settled | Leader | Confirm R4 (leader); then approve or return the record (Owner) | Start date, travel note, travel-not-applicable flag | R4, separate confirmation |
| Arrived or started | Friend is here or working | Leader | None for RALLY 100 | Arrival date | None; arrival is not a requirement and creates nothing. If any requirement is unconfirmed the card shows the gap as usual |

CONFIRMED RULE: each requirement is a separate, explicit confirmation, and moving the stage never confirms one. RECOMMENDATION on the record: confirmer, event date (leader-entered, defaults to today) and server confirmed-at; the rep card shows the event date, the Owner queue both. Moving the stage prompts the leader to confirm the matching requirement but never does it for them. A leader may confirm without moving the stage, or set a later stage with an earlier requirement unconfirmed; the leader then sees "Stage is Agreement signed, but check 3 (Agreement signed) is not confirmed. Confirm it or move the stage back." and the rep sees "[Stage] on [date]. Dana still needs to confirm it. [n] of 4 confirmed." Unticking follows the unticking rule in the referral walkthrough. Stage on a shared Person never moves backward because of another rep's action: a second rep's "I'll introduce Marcus" or "I introduced Marcus" creates a second introduction record and leaves the stage at its maximum.

### Outcomes

RECOMMENDATION (the outcome names are CONFIRMED RULE; data, setters and behavior are mine). Outcomes are parallel flags, not stages. A Person keeps their last reached stage and gains an outcome on top: "Meeting completed. Follow up later (Apr 10)." Who sets one: Follow up later by the rep on their own introductions before handoff (Added, Introduction planned, Introduced) and by the leader or Owner from Meeting scheduled onward; Not interested and Do not contact by a leader or the Owner at every stage. After handoff the rep's path is "Something wrong? Tell Dana", which creates a leader task; a rep who hears "don't contact me" flags it that way at any stage, since it is a safety signal.

| Outcome | Required data | Rep card | What happens |
|---|---|---|---|
| Follow up later | Date, note | Chip "Later: Apr 10"; "Follow up with Marcus on Apr 10. Your note: 'ask again after finals.'" On the date, Game Home: "Next: you, check back with Marcus." | "Later" bucket in My Network; reappears in the next actions of whoever owns the stage on that date. No message goes to the friend. |
| Not interested | Reason (short select plus note) | "Marcus said not for him (Mar 9). Still counts on your Wall." | "Closed" bucket; set and cleared by a leader or the Owner. Still counts toward 100 (CONFIRMED RULE, owner decision, 2026-11-01). |
| Do not contact | Optional reason | "Do not contact. The RALLY team won't reach out to Marcus. Still counts on your Wall." | Honored org-wide: no introduction actions, hidden from intro suggestions. Only the Owner clears it. Another rep whose card it locks sees only "This person has asked not to be contacted by RALLY. No introduction actions available." with no rep name. Still counts toward 100 (CONFIRMED RULE, owner decision, 2026-11-01). |

Clearing an outcome returns the Person to their last stage. An outcome never unticks a confirmed requirement or voids a reward record. Not an open decision: eligibility does not require arrival (CONFIRMED RULE), so a friend who withdraws after all four confirmations leaves the record at its status; the Owner may reverse it with a reason under the ledger rules in Rewards, review and payment tracking. If a confirmation was recorded in error, the leader unticks it with a note (the unticking rule in the referral walkthrough) and the Owner returns the record with Needs correction naming the requirement.

### Interest status

RECOMMENDATION on values: Unknown, Interested, Maybe, Not interested (chip labels: Didn't really say / In / Maybe / Not for them). It starts "Unknown" (CONFIRMED RULE) and is a signal, not a stage: one value on the Person, last write wins, with history (who, when, value). A rep writes it only through "I introduced Marcus"; after handoff only the leader writes it. The outcome Not interested also sets it; changing it alone changes nothing else.

### No automatic messaging in v1

CONFIRMED RULE: adding, completing or introducing a contact sends nothing to the friend. Introductions, meetings and follow-ups happen by text, call, in person or whatever the recruiting team already uses; RALLY 100 records that they happened. "Copy a message" is a clipboard blurb the rep sends from their own phone. Reminders exist only inside the app, only for whoever owns the next action.

### Ownership rules

| Range | Who owns it | Can change |
|---|---|---|
| Added through Introduced | Rep | Stage within this range, Follow up later on own introductions before handoff, interest status (through the introduction sheet), phone, handle, tags, own notes |
| Meeting scheduled through Arrived or started | Leader | Stage, outcomes, interest status, the four requirements, attribution (before the record is locked at Ready for review), leader notes |
| Referral Reward record | Owner | Approved, Needs correction, Paid, recipient after the record locks at Ready for review (correction entry), clearing Do not contact |

RECOMMENDATION: a rep can plan or record an introduction only from a Complete List Entry, because the leader needs the phone number to schedule a meeting. On a Draft the introduction buttons are replaced by the line "Finish this contact to introduce them."

After handoff the rep still sees the current stage, the responsible leader by name, whose move it is, the leader's dates, the four rows with confirmer and date, outcomes and reward status, and cannot change any of them. The rep can still edit Marcus's phone, handle, tags and their own notes (phone and handle as proposed corrections once Introduced).

Leaders see only their assigned reps and those reps' contacts; a Person's responsible leader defaults to the introducing rep's assigned leader at the first Introduced, "Take this introduction" records receipt and, for a Cross-team Person (reps under two leaders), which leader runs it, with the other rep shown only as "A rep under Leader Kim" and the attribution decision routed to the Owner's queue; the full scoping rules are in Access and privacy model.

Rep deactivation: nothing is deleted; every record keeps Tyler's rep id with status Deactivated ("Tyler (deactivated)"); open introductions move to the responsible leader's queue, or the Owner's "Unassigned" queue if none; reward records keep their status, flagged "Rep deactivated"; whether a deactivated rep is paid is OD-8. Leader deactivation: open Persons and tasks sit in the Owner's "Unassigned" queue until reassigned. Mechanics: Access and privacy model.

## 7. Duplicates and attribution

### Duplicates within one rep's list

CONFIRMED RULE: a duplicate does not advance the count. One Person counts once per rep regardless of tags or accounts.

RECOMMENDATION on detection: it runs on every save and again on sync, against the rep's full history including deleted entries. The older Complete entry keeps counting and only the newer entry is held, so adding never lowers the count (pending owner confirmation).

In plain words (RECOMMENDATION, waiting on owner confirmation): Tyler already has Marcus Lee on his list, complete, so Marcus is one of his 100. A week later Tyler forgets and adds Marcus again with the same phone number. The app spots the match. The first Marcus keeps counting, so Tyler's count does not drop. The second Marcus is set aside and does not count until Tyler answers one question: "Same person" folds the two into one record, still counted once, and "Different people" (for example, two brothers who share a phone) counts both. Either way, a duplicate can never raise the count, and adding one never lowers it. The alternative, stopping both entries from counting until Tyler answers, would make his count drop the moment he adds the duplicate.

- Strong signals: same digits-only phone; same lowercase platform plus handle. Either puts the new entry in the "Possible duplicate" tile state (hatched gray, "?" chip), not counted until resolved. Banner: "Looks like Marcus Lee is already on your Wall (same phone). Same person?" Buttons: "Same person" (primary) / "Different people".
- Soft signals: same normalized first and last name; same name plus a shared tag. The entry still counts, because two people can share a name. Banner: "You already have a Marcus Lee on your Wall (different phone). Same person?" Buttons: "Same person" / "Different people" / gray "Decide later", which leaves the entry counted with a small gray "?" on the card, not the tile.

"Same person" opens "Keep the best of both": one column per entry, each field prefilled with the more complete value, instruction "Tap the one that's right for each field." Tags are the union; notes from both are kept with dates. The surviving entry keeps the earlier creation date, all recruiting history and any reward record, and links to the merged-away entry so the leader can see what happened. No XP; the count stays one. ("Merge" is the internal name.)

"Different people" on a same-phone match requires a reason (placeholder "Why two people? e.g. brothers share a phone"). Both tiles become Complete with a small "2" link chip (a chip, not a tile state); card line: "Counted. Your leader will see this pair when reviewing your list." On a same platform+handle match it is not offered: one handle cannot belong to two humans, so the rep corrects a handle or merges. The leader's List Completion Reward review lists kept-both pairs; if the count without them is below 100, Approve shows "Count depends on N kept-both pairs" and the leader marks each pair verified before the Owner can approve, or returns the list with Needs correction naming the pair. Duplicate checks are formatting checks; verifying a real personal connection is human work the app never claims to do.

### The same Person known by two reps

Model (RECOMMENDATION, built from the brief's suggested starting approach): one Person in the master CRM, one RALLY-owned ID; one List Entry per rep who knows them, carrying that rep's tags, notes, draft fields and typed name; each rep counts the Person once in their own list, so both tiles light; one recruiting record on the Person (one pipeline, one set of four requirements); one Referral Reward record per Person, ever, with the leader selecting the single recipient with a required reason and the Owner seeing both reps at approval.

RECOMMENDATION on linking. Automatic cross-rep link requires a strong signal (digits-only phone, or platform+handle) AND matching normalized last name, or both strong signals. Any other strong-signal match is recorded as "Possible cross-rep match" for the leader and stays two Persons until a leader links them. A leader can also split a linked Person; the split keeps both List Entries, both tiles and all history, and the two IDs are separate record keys from then on. Merge rules: (1) a Person with a reward record is always the survivor; (2) if both carry a Referral Reward record the merge is blocked until the Owner reverses one in the same action (ledger rule in Rewards, review and payment tracking); (3) the retired Person ID is kept as an alias so the key refuses a second record for either ID; (4) history, introduction records and confirmations are appended to the survivor with original dates and confirmers.

Safety net: when the leader sets Meeting scheduled, and again when the fourth confirmation moves the record to Ready for review, an org-wide soft match (normalized first and last name) runs against Persons with any recruiting or reward record; hits show "Possible same person: Marcus Lee, known by a rep under Leader Kim, Meeting completed Mar 6. Same person? Link / Different people" and the answer is recorded. The Owner queue shows the same line and the Owner's export includes a duplicate-record report by name and phone; this reduces, but does not eliminate, the two-Person case.

What the reps see: on the Wall, nothing different; the count is unaffected, and neither rep is told the other's name or shown the other's list. A second rep's "I'll introduce" intent still saves and their card shows their own stage; the only cross-rep signal a rep ever receives is the attribution outcome (Access and privacy model). A rep who recorded an introduction sees the normal stage and requirement rows. A rep who has not recorded an introduction sees only Added and no requirement block, and the Person is absent from that rep's My Rewards until a record names them. When the record is decided, the credited rep sees the normal reward row; the other sees: "Marcus Lee: Referral credited to another rep who also knows Marcus. No reward on your list for this one. Marcus still counts toward your 100. Questions? Ask your leader." Hiding it would read as a bug.

The recipient is decided once, at the fourth confirmation. A List Entry created after that never reopens the decision; that rep sees only their own stage, and the credited-to-another-rep line if they later record an introduction.

What the leader sees: the Person card carries "Known by 2 reps" with each rep's name, added date, tags and whether that rep recorded an introduction (anonymized for a rep under another leader, see The recruiting pipeline). When R4 is confirmed on such a Person, the leader cannot finish without the decision screen:

"Who receives the $100 Referral Reward for Marcus Lee?"
- Tyler: added Feb 14 (Sports). Introduced Mar 2 by text.
- Sam: added Mar 1 (Gym). No introduction recorded.
- "First entered: Tyler, Feb 14 (not the credit rule)."
- "Why this rep? e.g. Marcus said Tyler told him about RALLY." (required)
- "Submit for Owner review".

The record reaches Ready for review with recipient and reason attached. Attribution is append-only. The leader's choice locks the record at Ready for review; any later change is an Owner-only correction entry with a reason, and after Paid a reversal entry precedes any new payment (Rewards, review and payment tracking). OD-2 (sub-question): is a recorded introduction by the rep required for a Referral Reward? RECOMMENDATION: yes, because the reward is for bringing the friend in, not for having them on the list; until decided, the "No introduction recorded" flag in the referral walkthrough lets the Owner approve or return.

### OPEN DECISION OD-2: who receives the Referral Reward when two reps know the same person

List credit is decided. CONFIRMED RULE (owner decision, 2026-11-01): when two reps know the same person, each puts them on their own list and each counts them once toward 100. Still open: which rep receives the single $100 Referral Reward. The model above never allows two rewards for one Person ID; it does not decide the rule the leader applies. CONFIRMED RULE: "first to enter the name" must not become the credit rule silently. Three options:

**Option A, introducer credit.** The reward goes to the rep whose introduction led to the meeting, verified by the leader asking the friend ("Who told you about RALLY?") and checking the introduction records. Trade-off: it rewards the behavior the company wants at the cost of one leader question, but when two reps both helped, one gets nothing.

**Option B, first to enter.** The earliest List Entry wins, published as a rule rather than hidden. Trade-off: no leader judgement and easy to explain, but it rewards typing speed over influence and invites reps to enter names they barely know.

**Option C, leader discretion with required reason and no default rule.** The leader decides every multi-rep case and writes the reason; the Owner reviews. Trade-off: it handles every real situation, but is slower and inconsistent across leaders unless the Owner publishes guidance.

RECOMMENDATION: Option A as the stated policy, run through Option C's mechanics (the decision screen and required reason always exist). Do not split the $100; the brief defines one $100 reward per qualifying friend, and a split would introduce partial amounts the rules do not have.

## 8. Screens, part A: rep screens

Labels: **CONFIRMED RULE** (master brief), **RECOMMENDATION** (anything unlabeled), **OPEN DECISION** (OD-1 to OD-8 in Open decisions and assumptions).

**Conventions.** Tokens, type and the 24px panther mark beside "RALLY 100" follow the brand and visual system in The game: concept, progression and the actions that make it engaging. Green appears only for wins. One white primary button per screen; 48px tap targets. Bottom nav "Home", "Scenes", "Network", "Intros", "Rewards"; Settings behind the profile icon. Rep copy names the four requirements in full, never by code, calls the Owner "RALLY leadership", writes dates as "Mar 22" and names whose move it is: "Next: Dana schedules the meeting." or "Next: you, tell Marcus about RALLY." Dollar amounts appear only as a reward's condition or on an Approved or Paid reward, never as earned, partial, pending or accruing; XP, level and badges never share a block with cash. Reduced motion follows the phone or Settings; no state relies on color alone.

### Welcome & Onboarding

**Purpose.** In under a minute: the goal, both cash rewards, what makes a contact complete, and that saved contacts are shared with the RALLY recruiting team.

**Main information.** Four cards with "1 of 4" dots: the goal and how Scenes work, over a Wall preview where one tile lights; the two rewards, the four referral requirements as separate lines; the four required fields and the Draft rule; "Who sees your contacts", the sharing disclosure with a required checkbox. All card wording is owned by Walkthrough: a new rep from first login to 100 complete contacts.

**Main action.** "Light the Wall", dimmed until the box is ticked; it opens Game Home, whose primary reads "Enter a Scene" from the first visit.

**Secondary actions.** "Back"; "Full reward rules" (the confirmed reward rules table in Rewards, review and payment tracking, read-only); "Sign out".

**What happens next.** CONFIRMED RULE: reps must understand that contacts are shared; Game Home stays locked until the box is ticked. The acknowledgment syncs first, versioned and timestamped; the server refuses List Entries without a current acknowledgment, so new wording shows card 4 again.

**Sample interface wording.** From the walkthrough: "Build your 100 list: 100 real people you know. Nobody has to want a job." and "Finish all 100: $100. One time." Tapping the dimmed button shakes the checkbox row: "Check the box to continue."

**Visual notes.** Full black, Outfit 900 headlines; green only on the example tile; the enabled button is white. Reduced motion drops the 200ms crossfade.

### Game Home

**Purpose.** The Wall, the exact count and the cheapest next action, readable at a glance.

**Main information, top to bottom.** Mark strip with the level line ("Scout · 210 XP · 190 to Connector" over a thin white XP bar) and profile icon. The 10x10 Wall, milestone lines after tiles 10, 25, 50 and 75. Tiles show fill only, no chips or digits: Empty (charcoal outline), Draft (gray), Possible duplicate (hatched), Complete (green), Syncing (green, white dot); tapping the Wall opens a zoomed row of ten 48px tiles with first names and "2 left" or "Check" chips. Counter "42/100 contacts complete", gray "(1 syncing)" until confirmed. Counter-row labels "42 lit | 6 drafts | 1 to check". Gray line "6 drafts are one field away | 8 more until your next milestone (50)". The primary button above the fold; the reward strip at the bottom, away from the XP bar. Below the fold: the since-last-visit digest and an Intro Board preview ("See all intros").

**The count.** Syncing tiles count once the server confirms; a duplicate found at sync turns the tile Possible duplicate, never Draft. Milestones 10 to 75 may celebrate locally; 100 and reward strings wait for the server (count rules: The game).

**Main action.** The main-loop rule from The game: "Finish 6 drafts (2 min)" at 3 or more drafts, or when finishing the one-field-away drafts would cross the next milestone line; else "Continue: The Gym" if the last Scene has under 5 names; else "Enter a Scene"; after 100, the oldest Intro Board action waiting on the rep, else "Introduce someone" (a search of Complete contacts). A Needs correction the rep must fix comes first (wording in Screens, part B).

**Secondary actions.** Zoomed-row tiles open their contact at the missing fields; labels open My Network filtered to that group; the strip opens My Rewards.

**What happens next.** At 100 the Wall freezes as a trophy of the first 100 by completion time; later contacts go to "Overflow +N", and removing one of the first 100 while Overflow exists keeps the Wall full. Below 100 with no Overflow the Wall unfreezes; the reward record stays, approval on hold.

**Sample interface wording.** Milestone headlines are in The game.

- Empty: "0/100 contacts complete." "Your Wall is dark. Enter a Scene: a short memory prompt from one part of your life."
- After a break: "Last scene: The Gym. 4 lit, 2 drafts left. Pick up where you left off." Never "expired" or "streak" (CONFIRMED RULE: a missed day never erases progress).
- Strip, two fixed lines below 100: "List reward: In progress." "Complete your 100 list to qualify for the $100 completion reward." Later: My Rewards' List Completion line, holds included.
- At 100: "100/100 contacts complete. Wall complete." Strip: "100/100 complete. List reward: Ready for review. Next action: RALLY leadership approval. Nothing needed from you." Until the server confirms: "100/100 syncing."
- Count drop after 100: "99/100, 1 more to complete your list."
- Overflow: "Overflow +12 · 3 drafts" "Extra contacts help you make more introductions. The list reward is one-time."
- Sync reject: "Marcus Lee might already be on your Wall (same phone). Tap to check."
- Digest: "2 updates. Jordan Lee → Meeting completed (Dana confirmed). Priya Shah → Follow up later; Dana will reach out Dec 3."

**Visual notes.** Stamp (10), green frame (25) and dot-grid (50) persist once earned; the 75 countdown subline and the 100 trophy ("WALL COMPLETE" in spaced caps between thin rules, echoing "M K T G") follow the live count. Celebrations under 1.5 seconds, audio off; reduced motion: instant fills, 120ms fade.

### Mission Select (on-screen title "Scenes")

**Purpose.** Pick a Scene from the rep's own life in one tap and start typing names.

**Main information.** Title "Scenes", subtitle "Pick a scene. Skip any that aren't you.", mini counter "42/100 · 14 drafts". At 5 or more drafts, a pinned "Light the Drafts · 14 drafts, most missing one field. Knock them out." Cards follow the Scene catalog in The game (Phone Sweep, Group Chats, Same Shift, then memory Scenes), each counting List Entries first created there, footer "3 names clears this scene. No limit." (5 for Phone Sweep and Group Chats). Plus-One Chain and Mutual Friends draw sit last, locked below 20 Complete contacts. "Show hidden scenes" when any are hidden.

**Main action.** A card opens its Drop-in sheet: scene-setting line, cues, primary "Start a 60-second Sprint", secondary "Just add names" (same input, no timer). Phone Sweep and Group Chats put "Just add names" first, since the rep leaves the app.

**Secondary actions.** Swipe to hide a Scene; "Suggest one" (thinnest applicable Scene). Inside a Scene: "Dead end? Get a cue", a 44px ghost button directly under the input, and "Done", a plain text link top-right.

**Inside a Scene.** One input, "First name (nickname ok)"; text after a first space becomes the last name. The "Add" return key saves the Draft locally, clears the field and adds a gray tile to the mini-Wall. The scene-setting line stays pinned above the input, the last three names under it as tap-to-edit chips. Chain prompts: one scrollable row of name-filled chips ("Who was on shift with Marcus?" "Who covered for Marcus?") that stays until the next name or a swipe; a tapped chip pins above the input, and a name added under it is a chain hit. With the keyboard up only "Done", the count line "Phone Sweep · 11 names · 0:42", ticking on each Add, the prompt line, chips, input and "Dead end? ->" remain; the timer ring and mini-Wall return when it closes. The timer pauses in the background and never blocks. Sprints hold nothing as duplicates; at most a gray hint: "You already have 1 Marcus on your Wall".

**Dead end ladder.** Each tap climbs a rung, input focused: a new Chain prompt ("Try this: Who was on shift with Marcus?"); a new angle ("Different angle: same place, a different year?"); a Scene switch, thinnest first ("Switch scenes? The Lunch Table has 0 names." with "Switch", "Stay here"); Phone Sweep ("Open your Phone app's Recents. Say who's there. Your sprint waits here."); at 20 Complete contacts, "Pick someone on your Wall. Who did they always bring?" After 20 seconds without a name, or three chips swiped away, the button pulses once; nothing opens without a tap.

**What happens next.** Timer-end sheet, then the Sweep (Add Contact in queue mode, fewest missing first, only missing fields shown), then Game Home, with one celebration if a line was crossed. Origin Scenes drive scene_cleared (+15 XP; rule in The game). CONFIRMED RULE: no quota per category, no caps, no waiting periods.

**Sample interface wording.**

- Cards: "Phone Sweep · 7 lit · 2 drafts"; "Same Shift · 2 lit · 1 draft"; "The Gym · not started"; "Plus-One Chain · Unlocks at 20 complete contacts".
- First Sprint only: "Say first names as fast as they come. Nothing is graded, nothing is final. You can stop any time." Always under the input: "Just names. Details later."
- Timer end: "You called 11 names." "Add their details to light their tiles." Buttons "Light them up", "30 more seconds". After an interruption: "11 names saved as drafts. Resume Phone Sweep?"
- Sweep: "Light them up: 11 drafts from this scene." Buttons "Save and next", "Skip for now". Toast: "Same Shift cleared. +15 XP."

**Visual notes.** Black card, Outfit 900 title, scene-setting line 20px white, charcoal chips, optional white timer ring. Reduced motion: numeric countdown, no animation.

### Add Contact

**Purpose.** Capture a name in seconds, show exactly what is missing, finish the rest later.

**Main information, top to bottom.** Header: name or "New contact", status chip "Draft · 2 left" or "Complete". The Possible duplicate banner when triggered. Required rows: missing ones white-outlined with the exact label and a gray "Missing", filled ones collapsed to one gray line. A "More (optional)" row. The sharing line in gray under the name and as the last row. First name is autofocused; no List Entry exists until a first name does.

**Fields.** Required (CONFIRMED RULE): first name (nickname accepted), last name, one social handle with its platform, phone number. Handle: "@ handle" (placeholder "@marcus.lee") plus a required "Which app?" chip row: Instagram, Snapchat, TikTok, Facebook, X, LinkedIn, Discord, Other (typed name); once a handle is typed, Save waits for a chip. Phone: telephone keypad, stored as a normalized digits-only phone (rules in Data model and integration notes). Optional: relationship tags (School, Sports, Work, Gym, Neighborhood, Family, Group chat, Hobbies/Clubs/Community, Lost touch, Other; several allowed, one count), never asked for during entry, the origin Scene's tag pre-selected; how you know them; city; notes. Interest status starts "Unknown" (CONFIRMED RULE) and shows read-only once the person is on the Intro Board; the rep sets it once, in the "I introduced Marcus" sheet, then only a leader.

**Draft save.** Changes autosave locally and sync when possible, so leaving loses nothing; tapping the chip jumps to the first missing field. CONFIRMED RULE: every save, Draft or Complete, reaches the master CRM at once, not at 100.

**Possible duplicate warning (RECOMMENDATION pending owner confirmation; mechanics in Duplicates and attribution).** Checked on save and sync against the rep's full history, removed entries included. The older Complete entry keeps counting and only the newer is held, so adding never lowers the count; nothing merges silently; cross-rep matches never show here.

- Same phone or platform+handle: "Looks like Marcus Lee is already on your Wall (same phone). Same person?" with "Same person" (primary) and "Different people".
- "Same person" opens "Keep the best of both" ("Tap the one that's right for each field."); the older entry survives with its history and any reward record, the other links to it ("Undo merge" in history), and nothing earns XP; a merge completing a Draft lights one tile. Past Added the leader confirms ("Your leader will confirm this merge."). Done: "Merged. Marcus counts once."
- "Different people", offered on a same-phone match only, needs a reason (placeholder "Why two people? e.g. brothers share a phone") and records "Kept both": both count, with a "2" link chip and "Counted. Your leader will see this pair when reviewing your list."
- Name-only match, never held: "You already have a Marcus Lee on your Wall (different phone). Same person?" plus a gray "Decide later" that leaves a "?" on the card, not the tile.
- Removed entry: "You removed Marcus Lee on Mar 3 (same phone). Same person?"; "Same person" restores it, granting nothing.

**Main action.** A pinned bar: "Save and add another" ("Save Draft and add another" while incomplete), secondary "Save and finish"; in a Sweep, "Save and next" and "Skip for now".

**Secondary actions.** "I'll introduce Marcus" on Complete entries only (a Draft shows "Finish this contact to introduce them."; a held duplicate cannot be introduced); "Remove contact"; "Restore" on a removed one.

**What happens next.** A Complete save flips the tile green in 200ms and grants contact_completed (+10 XP) once per Person per rep, ever; edits, removals, restores and re-tags grant nothing and never create a reward. Removal soft-deletes the List Entry only; the Person, its recruiting history and any reward record stay, and an entry at Introduction planned or later remains on the Intro Board with a "Removed from your Wall" chip.

**Sample interface wording.**

- Missing rows "Last name", "Phone", "Social handle", each with "Missing". "Which app?" helper: "Pick the app so we know where to find them."
- Phone, empty: "Don't have it? Check Recents, your group chat, or their Snap or IG bio." Format hint: "Needs 10 digits (area code first)". Notes hint: "Never type card or bank details here."
- Remove: "Remove Marcus Lee? Your count drops to 41. XP you already earned stays, and adding Marcus again won't earn it twice. The RALLY recruiting team keeps the record and any recruiting history." When they apply: "Your list reward is under review. Going below 100 pauses that review until you're back at 100." "Marcus is in recruiting (Meeting scheduled). Removing him from your Wall does not remove him from the RALLY recruiting team's records." Draft: "Remove this draft? It was not counted." Buttons "Remove", "Keep".
- Sharing line: "This contact is shared with the RALLY recruiting team."

**Visual notes.** White on black; missing-row outlines and the primary button are white; green appears only when a save completes the contact. Reduced motion: instant tile fill, 120ms fade.

### My Network

**Purpose.** Find, finish and fix any contact, with completion and recruiting status together.

**Main information.** Search field. Chips "All", "Drafts", "Complete", "In intros", "Filters" (sheet: tag, stage, outcome, possible duplicates, removed; sort by fewest missing, recently added, A to Z, stage). Counts line "42 complete · 14 drafts · 2 to check" (disjoint; "to check" counts held newer entries). Cards, an "Overflow +12" group after 100, "Removed contacts" at the bottom. Stage filter: "Added (not yet introduced)", then Introduction planned through Arrived or started. Outcome filter: "Later" (Follow up later), "Closed" (Not interested), "Do not contact".

**Card states.** A completion chip plus, when present, a recruiting chip. Completion: "Draft · 1 left" (gray) with "Missing: Phone"; "Complete" (green dot) with tags and "Added Mar 14"; "Check" (hatched) with "Might be the same person as Marcus Lee. Tap to check."; "Syncing" (white dot) with "Confirming with RALLY"; a Kept both pair with its "2" chip. Recruiting: stage chip and Next line ("Meeting scheduled · Next: Dana holds the meeting."); outcome chip ("Later: Apr 10" with "Follow up with Marcus on Apr 10. Your note: 'ask again after finals.'"); Do not contact dims the card. A leader's Verify flag: "Dana asked you to check Marcus Lee: [reason]" with "Fix it", "It's right". CONFIRMED RULE (owner decision, 2026-11-01): an outcome never removes a tile. Leader internal notes never show.

**Main action.** Tap a card to open Add Contact for it; floating "+ Add contact".

**Secondary actions.** "Finish all drafts" (a Sweep across the list); swipe for "Introduce" (Complete only) or "Remove"; "Restore" in Removed contacts.

**What happens next.** Edits save as on Add Contact; resolving a duplicate updates Game Home.

**Sample interface wording.**

- Search: "Search name, handle or phone". No results: "No match for 'Marc'." Button "Add Marc as a new contact".
- Empty: "No contacts yet. Enter a Scene to add your first names." Button "Enter a Scene". Drafts header: "14 drafts. Fewest missing first."
- Removed: "Removed contacts stay in RALLY's records. Adding one back never earns XP or a reward twice."

**Visual notes.** Charcoal cards on black, names Outfit 700, status always a worded chip; no celebrations.

### Introductions

**Purpose.** The Intro Board: each introduced person's stage, four requirement rows, and the next action with its holder.

**Main information.** Title "Introductions", subtitle "Available from your first contact. You don't need 100 to introduce someone." A pinned "1 waiting on you" when a next action is the rep's; the digest, as on Game Home. A "Ready to introduce" row of Complete entries at Added with no outcome, the only Added-stage surface. The Intro Board groups cards by stage from Introduction planned to Arrived or started, outcomes last. Collapsed: name, stage chip, "3 of 4 confirmed", Next line; expanded: the four rows with who and when, the leader's note to rep, dates. Rows "Meeting completed", "Commitment confirmed", "Agreement signed", "Start date and travel plans confirmed" read "Confirmed by Dana, Mar 22", "Start date confirmed. No travel needed." (travel not applicable) or "Not yet". CONFIRMED RULE: each requirement is confirmed separately, a stage change never ticks one, and arrival is not required.

**Main action.** On a ready card, "I'll introduce Marcus" sets Introduction planned (optional planned date and note) and adds "Copy a message" (a clipboard blurb). The primary becomes "I introduced Marcus" (usable without planning), opening the Introduced sheet from Walkthrough: from adding a friend to referral-reward eligibility: "How?" [Text] [Call] [In person] [Other]; "What did Marcus say?" [In] [Maybe] [Not for them] [Didn't really say]; "Done, Dana's up".

**Secondary actions.** On own introductions before handoff (Added, Introduction planned, Introduced): "Follow up later", with date and note. At any stage: "Something wrong? Tell Dana" (placeholder "What should Dana know?"), also how a rep reports "don't contact me". Reps never set Not interested or Do not contact: "Not for them" records interest status and creates a task for Dana; only the Owner clears Do not contact.

**What happens next.** From Introduced the leader holds the next action: Dana's "Confirm introduction received", or scheduling the meeting, records "Introduction received by Dana, Mar 4" and grants introduction_made (+100 XP) once per Person per rep, toasted on Game Home, never beside a reward word. A rep sees a shared Person's stage and rows only after recording their own introduction; who gets the one reward (OD-2) is the only cross-rep signal a rep sees. With no leader assigned RALLY leadership acts; after a change ("Your leader is now Leader Sam") confirmed rows keep their original name and date. Rules: The recruiting pipeline.

**Sample interface wording.**

- Empty: "No introductions yet. Pick someone from your Wall who would actually take a meeting." Button "Introduce someone".
- Disclosure: "You make the intro yourself: text, call or in person. RALLY only keeps track. Adding someone here never messages them."
- Introduction planned: "Introduction planned. Next: you, tell Marcus about RALLY and that Dana will text him. Then come back and tap 'I introduced Marcus'."
- Introduced: "Introduced on Mar 2 by text. Next: Dana schedules the meeting. Nothing needed from you right now." "0 of 4 confirmed. Next: Dana confirms the meeting."
- Meeting scheduled: "Meeting with Dana: Mar 6, 4:00 PM, video. Next: Dana holds the meeting." "Dana runs this from here. You can still fix Marcus's phone, handle, tags and your notes." After Tell Dana: "Sent to Dana. She'll see it in her next actions."
- Agreement signed: "3 of 4 confirmed. Next: Dana confirms start date and travel plans." Untick: "3 of 4 confirmed. Reward on hold until Dana re-confirms Commitment confirmed. Nothing needed from you."
- All four: "Marcus Lee: 4 of 4 confirmed. Referral reward: Ready for review. Nothing needed from you."
- Outcomes: "Marcus said not for him (Mar 9). Still counts on your Wall." "Do not contact. The RALLY team won't reach out to Marcus. Still counts on your Wall."

**Visual notes.** Stage chip white-outlined; confirmed rows a green check with name and date, unconfirmed an empty circle and "Not yet". Reduced motion: no card motion.

### My Rewards

**Purpose.** Where each cash reward stands, what remains, whose move it is, and what RALLY recorded as paid.

**Main information.** Header "List Completion Reward: $100" with status chip, next-action line and what remains. Divider. Rule line "Referral rewards: $100 per qualifying friend", then one collapsed row per Person on which the rep is a candidate, expanding to the four rows. A row appears at Introduced, when the record is created In progress (or at an earlier first confirmation); the fourth confirmation, with a credited rep set, moves it to Ready for review. Approved and Paid rows sort first and never disappear. Totals "Approved, not yet paid: $100 · Paid: $100" count only Approved and Paid, never reversed rows. Payment history as recorded by RALLY leadership (date, reward, amount, method note); corrections are new linked lines. Reserved panel "More incentives coming from RALLY leadership" (OD-3; no amounts). Footer, always visible.

**Statuses.** Exactly five; "On hold" and "Reversed" are display lines. Strings quote the canonical table in Rewards, review and payment tracking, which owns transitions. The spot-check is optional, never a modal on the rep's phone (OD-5).

**Main action.** A Needs correction naming the rep shows its one button ("Fix duplicates" opens My Network filtered to Possible duplicates; then "Ask for re-check" asks the raiser to record it resolved); under 100, "Finish your list (58 to go)"; otherwise none ("Nothing needed from you").

**Secondary actions.** Tap a row for its history (status changes with who and when, payment method note); "Reward rules" sheet.

**What happens next.** Every status is server-authored (Leader Workspace and Owner Dashboard); the rep changes nothing. CONFIRMED RULE: recording Paid is separate from moving money; no payment provider is selected. A Referral Reward can be approved before the list is complete (CONFIRMED RULE, owner decision, 2026-11-01); money never shows as pending.

**Sample interface wording.**

- List, In progress: "42/100 contacts complete. Complete your 100 list to qualify for the $100 completion reward."
- List, Ready for review: "100/100 complete. List reward: Ready for review. Next action: RALLY leadership approval. Nothing needed from you." Spot-check open: "Next action: Leader Dana is checking a few contacts." Count drop: chip "On hold (99/100)", "99/100. List reward: Ready for review, on hold until you're back at 100. Nothing was lost."
- List, Needs correction: "List reward: Needs correction. 3 contacts have the same phone number and were kept as separate people." Button "Fix duplicates", then "Ask for re-check". Another leader note: "Count is 99 now: resolve 1 possible duplicate; if it is the same person, add 1 more."
- List, Approved: "List reward: Approved: $100. Nothing needed from you. RALLY pays you directly and marks it Paid here." Paid: "List reward: $100. Paid on Mar 21."
- Referral, In progress: "Jordan Lee: 0 of 4 confirmed." Later: "Jordan Lee: 2 of 4 confirmed. Still needed: Agreement signed, Start date and travel plans confirmed. Next action: Leader Dana."
- Referral, Ready for review: "Jordan Lee: 4 of 4 confirmed. Referral reward: Ready for review. Nothing needed from you."
- Referral, Approved: "Jordan Lee: Referral reward Approved: $100. Nothing needed from you." with the stamp and "Approved on Mar 16." Paid: "Jordan Lee: $100. Paid on Apr 2."
- Referral, Needs correction: "Jordan Lee: Needs correction. Leader Dana is fixing a date on Start date and travel plans confirmed. Nothing needed from you."
- Credited elsewhere: "Jordan Lee: Referral credited to another rep who also knows Jordan. No reward on your list for this one. Jordan still counts toward your 100. Questions? Ask your leader."
- Outcome before all four: "Jordan Lee: Not moving forward. No referral reward." Follow up later: "Jordan Lee: On hold. 1 of 4 confirmed." Reversed: "Jordan Lee: Referral reward reversed on Apr 2. Reason: [rep-facing reason]."
- History: "Apr 2 · Referral reward, Jordan Lee · $100 · Recorded as paid by RALLY leadership · 'Venmo Apr 2'". Correction: "Apr 4 · Correction to the Apr 2 line · 'Recorded in error.'"
- Footer: "'Paid' means RALLY marked this as paid on that date. This app doesn't send money. RALLY pays you directly."

**Visual notes.** The calmest screen: white on black, white-outlined chips, the small green panther stamp on Approved and Paid rows only; no XP, nothing moves.

### Settings

**Purpose.** Account, reminders, privacy and accessibility; nothing here touches data or rewards.

**Main information.** Profile: name, team, your leader, phone, email. "Reminders", exactly as defined in Reminders for a self-paced experience (per-type toggles, push, show names, quiet hours defaulting to 10 pm to 8 am, "Pause all reminders for 30 days"). Sound, off by default. Reduce motion: "Follow phone setting", "Always on". Sharing: the acknowledgment date. Account: sign out, app version, sync status. No team-play settings in v1 (a later enhancement; First-version scope and later enhancements).

**Main action.** None; toggles save immediately.

**Secondary actions.** "Read it again"; "Reward rules"; "Sign out".

**What happens next.** Reminders follow Reminders for a self-paced experience (CONFIRMED RULE: self-paced, no deadline); turning them off changes no count, XP, reward or review. Deactivation keeps every record under the rep's RALLY-owned id; reactivation restores the same Wall (Access and privacy model; paying a deactivated rep is OD-8).

**Sample interface wording.**

- "Quiet hours: 10 pm to 8 am", "Nudges wait until your quiet hours end." "Pause all reminders for 30 days", "Your Wall and rewards are unaffected."
- "Sound effects: Off".
- "You acknowledged on Mar 2 that your contacts are shared with the RALLY recruiting team." Button "Read it again".
- "If you leave RALLY, the contacts you shared stay with the recruiting team, and so does your reward history." "Anything not yet synced when you sign out is not on record."

**Visual notes.** Plain list; toggles turn white and read "On".

## 9. Screens, part B: Leader Workspace and Owner Dashboard

Both screens use the rep app's tokens on a light surface: white and gray panels, ink text, dense tables, black primary buttons and a gray selected row. RALLY green appears only for success states (confirmed requirements, Approved, Paid) and on the "confirmed by RALLY" panther stamp; green text on white uses the RALLY app's darker #15803D so it stays readable. Every status reads without color. On-screen dates read "Mar 22"; R1 to R4 are document and export codes, never rep-facing text.

### Leader Workspace (desktop-first, phone-usable)

**Purpose.** The leader owns the middle of the confirmed handoff (rep adds, rep introduces, leader meets, leader updates, rep sees): take introductions, run meetings, confirm the four requirements, check reward records before the owner approves. A queue, not a database view.

**Main information.** Five queues over assigned reps and the Persons this leader is responsible leader for (see Access and privacy model); every Person sits in exactly one.

1. **New introductions**: Introduced (rep-reported or confirmed), no meeting scheduled. Oldest first.
2. **Meetings today**: Meeting scheduled for today, by time.
3. **Follow-ups due**: this leader's next actions dated today or earlier, plus Follow up later outcomes whose revisit date has arrived.
4. **Confirmations to finish**: Meeting completed or later with any requirement unchecked.
5. **Reviews**: Ready for review List Completion records without a spot-check; Needs correction records owned by this leader; four-confirmed Referral Reward records with unresolved attribution; "Possible cross-rep match" items.

Any outcome removes the Person from queues 1, 2, 4 and 5; Follow up later needs a revisit date and an owner and surfaces in queue 3 on that date; Do not contact leaves every queue. Desktop: count cards expanding to tables, plus a per-rep strip ("67/100 complete", "9 drafts", introductions this month, last activity). Phone: a chip row ("New 3 · Today 2 · Due 3 · Confirm 2 · Review 1"), the strip collapsed under "My reps", and a sticky bottom primary button.

**Main action.** The primary button names the item: "Next: Marcus Lee · meeting today 6 pm". One Person, one save, then it re-labels to the next item. Empty: "Nothing waiting. Nice."

**Secondary actions and what happens next.** Every save is an event; the rep's Introductions screen and return digest update from it.

- *Schedule a meeting* (date, time, channel, note): sets Meeting scheduled; only a leader ticks Meeting completed afterward. V1 sends nothing (CONFIRMED RULE: no automatic messaging): footer "This saves the meeting. It sends nothing to Marcus. Set who tells him below", the required next action. Rep card: "Meeting with Dana: Mar 6, 4:00 PM, video. Next: Dana holds the meeting." If the leader sets the rep to pass on the time, the card instead reads "Next: you, send Marcus the time."
- *Flag "Verify this contact"* (phone / handle / name / other, one line): an event that never changes tile state or count (CONFIRMED RULE: only the four required fields and distinctness decide the count) but blocks Approve on the rep's List Completion record ("1 contact flagged for verification") until the leader clears it. Rep card: "Dana asked you to check Marcus Lee: [reason] [Fix it] [It's right]".
- *Record spot-check*: a flag shown as "Spot-check: done by Dana, Mar 15" (who, when), not a status; optional unless the owner setting "Leader spot-check required" is Yes (OD-5). Ready for review is server-set, never a button: List Completion at the first 100; Referral when all four are confirmed and attribution is decided or unneeded. Rep strip: "100/100 complete. List reward: Ready for review. Next action: RALLY leadership approval. Nothing needed from you." (while a spot-check is open: "Next action: Leader Dana is checking a few contacts.").
- *Needs correction* with explanation and correction owner. Rep-owned: Game Home button "Fix 1 thing for your $100 list reward"; My Rewards "List reward: Needs correction. Dana says: 'Marcus Lee's phone is missing a digit.' [Open Marcus Lee]". The record stays at Needs correction until the leader or owner who raised it records the correction resolved (the rep's "Ask for re-check" button notifies them); it then returns to Ready for review. Leader-owned corrections show the rep "Needs correction" with the explanation and "Nothing needed from you."
- *Count drift* (no button): status stays Ready for review; the server sets and clears a drift flag with events, the only hold that clears itself. Leader row: "Count is 98 now, was 100 on Mar 14. The owner cannot approve until it is back at 100." Rep strip: "98/100. List reward: Ready for review, on hold until you're back at 100. Nothing was lost."; chip "On hold (98/100)", a display state, not a status.
- Reassign next actions, set outcomes, add notes; search and filter assigned contacts by name, phone, handle, rep, stage, outcome, requirement state, date.

**Sample wording.** Header: "3 new introductions. 2 meetings today. 3 follow-ups due. 2 confirmations to finish. 1 review." Review row: "Tyler Nguyen, List reward: 100/100 since Mar 14. Duplicates resolved. 0 Verify flags. Spot-check 3 to 5 contacts below (optional). [Spot-check done] [Needs correction]". RECOMMENDATION: the spot-check shows three to five random Complete contacts, one question each ("How do you know Marcus?"), each ticked "Looks real" (which writes the entry's verified real connection mark) or flagged "Verify this contact"; asynchronous, never a modal on the rep's phone; stored on the record as "Spot-check: not done / done by Dana, Apr 2" and shown to the owner. This is the real-connection check the brief separates from formatting and duplicate checks.

### Person detail panel (Leader Workspace)

Right-side panel on desktop. Phone order: identity line; Next; Stage; four checkboxes; Outcome; Notes; "Known by 2 reps" and "History (14)" collapsed.

1. **Identity.** Name, phone, handle with platform, interest status, created date, source rep, responsible leader. RALLY-owned Person ID only.
2. **Next.** Text, person (named rep or leader), date; required from Introduced through Start/travel plans confirmed when no outcome is set (CONFIRMED RULE: the next action and its owner must be clear). Label "Next:" with the person first ("Next: Dana schedules the meeting"); next_action_owner is a column name only, since "Owner" is a role.
3. **Pipeline stage.** One select over the nine stages; a change prompts for a date, writes an event, never ticks a requirement (CONFIRMED RULE: a stage change alone never confirms a requirement). A rep-set Introduced shows "Introduced (rep-reported, Mar 2)"; the leader's first save confirms it, an event, and triggers introduction_made. Backward moves need a reason. Moving to Meeting completed shows: "Also tick 'Meeting completed' below if the meeting actually happened. Changing the stage does not tick it for you."
4. **Four requirement checkboxes.** Meeting completed; Commitment confirmed; Agreement signed; Start date and travel/arrival plans confirmed, each "Confirmed by Leader Dana, Mar 22". The fourth needs a start date (always) plus a travel/arrival plan or "Travel not applicable (local start)" with reason; both stored. Unchecking needs a reason; before Approved the record returns to In progress; after Approved or Paid the untick is refused and the leader asks the owner for a reversal entry (Rewards, review and payment tracking). Re-checking never creates a record or an approval.
5. **Outcomes.** Follow up later (revisit date and owner), Not interested, Do not contact, beside the stage; from Meeting scheduled onward only a leader or the owner sets them. The Person still counts on the Wall (CONFIRMED RULE, owner decision, 2026-11-01). RECOMMENDATION: Do not contact also blocks new introductions org-wide (the outcome name is a CONFIRMED RULE; the block is ours); open records keep their status and leave all queues.
6. **Notes.** Timestamped, author-stamped, append-only. Hint: "Never type card or bank details here."
7. **Who knows them.** Assigned reps with a List Entry, with tags and date added; "first entered by" is information only. Others appear as "+1 rep outside your assignment (owner can see who)", no name, tags or date.
8. **Cross-rep attribution (when applicable).** Two or more List Entries and all four confirmed. If every such rep is under this responsible leader, the leader picks one with a reason: "Two reps know Marcus Lee. Choose who receives the $100 Referral Reward. First entered by Sam Ortiz (Mar 2). Reason required." Otherwise hidden: "Attribution: owner decides", and the record waits In progress until the owner sets it. A second decision is rejected: "Decided by Leader Dana on Mar 22; owner override only." RECOMMENDATION; policy is OD-2.
9. **History.** The audit events for this Person.

**Can and cannot.** Everything above within scope, plus proposing a Person merge, recording a spot-check and returning Needs correction, is the leader's. A leader cannot mark Approved, use Record as paid, change an amount, edit a rep's List Entry fields, uncheck on an Approved or Paid record, see reps outside their assignment or delete anything. Owner-only Approve and Record as paid: RECOMMENDATION (the brief names the owner as the approver; OD-7).

### Owner Dashboard (desktop)

**Purpose.** Master CRM and reward ledger: every contact org-wide as it is saved (CONFIRMED RULE: saved contacts reach the master CRM as saved), every rep's progress, every introduction, every reward record with its approval and payment facts.

**Main information.** Six panels with "View all", plus an "Unassigned reps" card when an active rep has no assigned leader (the owner acts as leader meanwhile).

1. **Org-wide contacts.** Totals (Persons, added this week, complete vs draft, Do not contact); table of Person, source rep, stage, outcome, interest status, created.
2. **Per-rep list progress.** Rep, leader, "67/100 complete", drafts, Overflow, last add, "Introductions made" (leader-confirmed), "Referrals Approved or Paid", "Referrals in progress", "Deleted in 30 days", "Created vs now complete" ("112 created / 98 complete"), level and badges (never money).
3. **Pipeline funnel.** Nine stage columns, counts and median days; outcomes as a side bar.
4. **Rewards queue.** Counts for Ready for review (with "Spot-check: done by Dana, Mar 15" or "Spot-check: not done" and any drift or Verify flag), Needs correction and In progress; counts and amounts for Approved and Paid only (CONFIRMED RULE: partial progress never appears as earned cash). In progress here means Referral Reward records created at Introduced and not yet Ready for review; List Completion records do not exist before 100 (a per-rep "near 100" count belongs in list progress, not here).
5. **Payments recorded.** Rep, reward, amount, paid date, method note, reference (optional), recorded by.
6. **Leader workload.** Assigned reps, open items per queue, "Oldest waiting" ("6 days"), confirmations this month.

**Main action.** Three buttons per reward row, restricted by status. Approve: Ready for review only; idempotent. Needs correction: Ready for review only; explanation and correction owner required; after Approved the owner may only leave the record or reverse it. Record as paid: Approved only; date and method note required, reference optional; one payment event per record, a repeat refused with "Already recorded as paid on Mar 30, payroll 3/30"; re-validates the four requirements and attribution at save.

Approve is blocked, reason shown, when a List Completion count is under 100 ("Blocked: count 98/100"), a Verify flag is open, any requirement is unconfirmed, attribution is unresolved or, with "Leader spot-check required" set to Yes, no spot-check is recorded (OD-5). A Referral Reward never waits for the rep's list count (CONFIRMED RULE, owner decision, 2026-11-01).

**What happens next.** Approve writes an Approved entry and the rep's My Rewards row gains the green panther stamp; Needs correction writes the explanation and correction owner, moves the record to the leader's or the rep's next actions, and the rep sees the status with the note; Record as paid writes one Paid entry with date and method note and the rep's row reads Paid on that date. Every action is an audit event and reaches the rep's Introductions digest and My Rewards within the same sync.

**Secondary actions.** Search and filters: one search over name, phone, handle, rep; filters for rep, leader, tag, stage, outcome, interest status, dates (created, stage changed, confirmed, approved, paid), reward status and type, list state, Persons known by more than one rep, deactivated reps (off by default).

**Reporting (v1).** Five saved filters over live records, no warehouse. (1) List progress by rep: who needs a nudge, whether a count is stable before paying. (2) Pipeline funnel and stage aging per leader: where introductions stall. (3) Introductions per rep per week: the leading indicator. (4) Rewards ledger: the money view; totals for Approved and Paid only, Ready for review aging, correction reasons; In progress never carries a dollar figure. (5) Leader response time, introduction to first leader action: where the handoff quietly fails. Later: retention, cohorts, forecasting.

**Export (CSV).** Two exports honoring active filters, each an audit event (who, when, filter, row count). *Contacts*: one row per List Entry (rep x Person). Person-level columns repeat per Person: person_id, name, phone, social_platform, social_handle, interest_status, pipeline_stage, outcome, responsible_leader, next_action, next_action_owner, next_action_date, r1 to r4 confirmed_by/at, other_reps_who_know (full for the owner; assigned reps plus outside_assignment_count for a leader). Per row: source_rep, relationship_tags, created_at, completed_at, draft_missing_fields, verify_flag. Notes are a separate opt-in export (RECOMMENDATION). *Rewards*: every owner-facing reward record field as a column; rep = attribution_rep once decided, blank before, with candidate_reps. XP, levels and badges never appear.

**Sample wording.** Queue card: "Rewards: 6 Ready for review, 1 Needs correction, 23 In progress (no amounts until approved). Approved: 2 ($200). Paid: 14 ($1,400)." Approve (referral): "Approve $100 Referral Reward for Marcus Lee to Tyler Nguyen? All four confirmed by Leader Dana, Mar 10 to Mar 22." Approve (list): "Approve $100 List Completion Reward for Tyler Nguyen? 100/100 since Mar 14. Spot-check: done by Dana, Mar 15." Record as paid: "Record as paid: date and method note (e.g. 'payroll 3/22', 'check #1042'); reference optional. Recorded as paid means RALLY has logged the payment; it is not the transfer itself." The rep's My Rewards row then reads "Paid on Mar 22." with the method note in the row's expanded history.

### Reward record detail (Owner Dashboard)

One read-only page per reward record showing the owner-facing reward record fields listed in Rewards, review and payment tracking; append-only. Amounts are fixed per type in v1; the owner's additional incentives (OD-3) would add a reward type, not an edit.

Keys: one List Completion record per rep record, one Referral record per Person, ever (CONFIRMED RULE: one reward per qualifying friend, implemented as the recommended one-per-Person key). A Referral Reward record is created In progress when the Person reaches Introduced, or on the first requirement confirmation if that comes first; the fourth confirmation with a credited rep set moves it to Ready for review and never creates it. Records key to the durable rep record, not the login, so re-linking carries records and never creates one; editing, deleting or restoring a contact cannot create a second record.

Person merge: a strong signal (digits-only phone or platform+handle) plus a matching last name, or both strong signals, links automatically; any other match opens a "Possible cross-rep match" item for the leader, and the Persons stay separate until confirmed, never silently merged. If both Persons carry a Referral Reward record the merge is blocked until the owner reverses one in the same action (ledger rule in Rewards, review and payment tracking). A merge never creates a record or reopens a Paid one. The rep sees nothing.

## 10. Access and privacy model

### Roles and permissions

Three roles, Rep, Leader, Owner: FIXED VOCABULARY. RECOMMENDATION, answering the brief's request to propose leader access: a leader is its own login; the live RALLY app's "manager" role is unused in v1.

| Data or action | Rep | Leader | Owner |
|---|---|---|---|
| Own List Entries: create, edit, draft, delete, restore | Yes | No; may flag Verify | No edits; may flag Verify; may soft-delete a Person (last row) |
| Other reps' List Entries and Persons | Never | Assigned reps, read | All, read |
| Own Wall, XP, level, badges | Yes | Assigned reps' counts and levels | All |
| Pipeline stage | Set Added, Introduction planned, Introduced on own Complete List Entries (an intent; next action defaults to the assigned leader); later stages read only | Change any stage in scope; may move a rep-set Introduced back with reason | Change, all |
| Outcome, next action | Follow up later on own introductions before handoff (Added, Introduction planned, Introduced); request Do not contact through "Tell Dana" (a leader or the owner sets it); mark own next action done, with note | Set, in scope | Set, all |
| Requirements R1 to R4 | Read own, shown by name, never code | Confirm / unconfirm with reason | Same (RECOMMENDATION: when the owner ran the meeting; shows "Owner") |
| Cross-rep attribution | Read bounded result (below) | Decide with reason, responsible-leader scope | Decide or override |
| Spot-check, Needs correction | Read | Set | Set |
| Approved; Record as paid | Read | Read | Set |
| Reward amount | Read | Read | Read; fixed per type in v1 |
| Merge / split Persons | No | Propose, in scope | Confirm, logged |
| Notes | Append on own | Append, in scope | Append, all |
| Search, filters, reports | Own contacts | In scope | Org-wide |
| CSV export | No | Off by default; owner enables per leader (RECOMMENDATION) | Both exports |
| Leaderboard (later enhancement, not v1) | Opt-in; counts, levels, badges | Same, plus assigned reps' real counts | Same, plus all |
| Accounts, leader assignments, deactivation, org settings | No | No | Yes |
| Audit log | Own digest | In scope | All |
| Delete records or events | No | No | Soft-delete a Person only, with reason; events never |

Owner soft-delete (spam, fake, legal request): every List Entry for that Person is marked "Removed by RALLY", tiles return to Empty, the count drops; the Person, its events and any reward record remain, and a List Completion record shows the drift block. Rep, on Game Home: "RALLY removed Marcus Lee from your list: 'not a real person'. Your count is 99. Questions? Ask Dana."

### Leaders with separate accounts

RECOMMENDATION: a leader is its own login with an assignment list set by the owner; every active rep has exactly one assigned leader. The leader sees those reps, their List Entries, the Persons behind them and their reward records, nothing else. Each Person has one responsible leader, defaulted at the first Introduced to the introducing rep's assigned leader and changeable by the owner (event); "Take this introduction" records receipt and, for a cross-team Person, which leader runs it, never responsibility by race. Only the responsible leader's queues hold the Person; another leader in scope sees it read-only under "Run by Leader Dana." Deactivating a leader moves their reps and open items to the owner's "Unassigned" queue, where the owner acts as leader until reassignment (an event). On the shared RALLY backend this is row-level security on the assignment list inside the existing team scope, no tenancy redesign.

### Reps never see another rep's list

CONFIRMED RULE. No screen, search, share link, export or leaderboard path reaches another rep's List Entries, and the rep app never shows which other rep knows a Person. If a Person already exists in the master CRM when a rep adds them, the rep's app says nothing.

CONFIRMED RULE (owner decision, 2026-11-01): the rep's own List Entry is created and counts once on their Wall. RECOMMENDATION (OD-2): the responsible leader or owner decides who receives the single Referral Reward. The card's "I'll introduce Marcus" and "I introduced Marcus" buttons (sheet in the referral walkthrough) record the intent. A rep sees pipeline stages only after their own Introduced intent; before that the card shows Added whatever the true stage. If the Person is already Do not contact, the intent still saves, the responsible leader sees "Blocked: Do not contact (set by Owner on Feb 10)" and tells the rep offline; the card shows "Introduction planned. Next: your leader will follow up." If a Person the rep introduced is later set Do not contact: "Do not contact. The RALLY team won't reach out to Marcus. Still counts on your Wall.", introduction buttons greyed. If attribution goes elsewhere: "Marcus Lee: Referral credited to another rep who also knows Marcus. No reward on your list for this one. Marcus still counts toward your 100. Questions? Ask your leader.", no name, tags or date. That residual leak, that someone else knows the Person, is accepted and listed under OD-2.

### Leaderboards

Later enhancement, not v1. CONFIRMED RULE: never names from lists. RECOMMENDATION: off by default, opt-in per rep, showing rank, level, badges and complete count only. A rep may hide their count from peers; leaders and the owner still see it. Team Wall and Sprint Night totals are aggregate only. No leaderboard row links anywhere.

### Submitted records survive rep deactivation

CONFIRMED RULE: submitted contacts are team records separate from the rep's login. RECOMMENDATION on mechanics: the login, the durable rep record (phone/email identity), the List Entry and the Person are separate records; reward records key to the rep record. Deactivation freezes the login (no login, sync or new events), keeps every List Entry and Person labeled "source rep: Sam Ortiz (deactivated)", every event and reward row, and moves the rep's next actions to their assigned leader (event). In progress records stay In progress and leave the default queues. Ready for review and Approved records keep their status, stay in the owner's queues tagged "rep deactivated", and Record as paid shows the tag; whether a deactivated rep is paid is OD-8, never cleared automatically. Reactivation restores access with statuses exactly as left. On new-account creation, a phone or email match to a deactivated rep shows the owner: "Matches deactivated rep Sam Ortiz. Link to that record (keeps history and reward status) or create a separate rep (reason required, logged)." A separate rep for a human already paid the List Completion Reward is part of OD-8; the system warns and logs, it never pays twice silently.

### Onboarding disclosure text

Shown as the "Who sees your contacts" card on Welcome & Onboarding (wording owned by the new-rep walkthrough), acknowledged by a required checkbox before Game Home unlocks, and echoed by the permanent contact-card footer "This contact is shared with the RALLY recruiting team" (CONFIRMED RULE: reps must understand contacts are shared). "Never type card or bank details here" lives on the notes-field hint only. The acknowledgment is an event with text version and timestamp; a changed text triggers a one-time re-acknowledgment.

### Audit trail

RECOMMENDATION, by analogy to RALLY's append-only, server-authored rules. Every change to a stage, outcome, next action, requirement, attribution, reward status, flag or reversal entry, payment record, leader or responsible-leader assignment, account state, List Entry (create, edit, delete, restore; actor is the rep), Verify flag, Person merge or split, CSV export or owner setting is an event: actor, role, server timestamp, object, field, old value, new value, reason where required. Raw events keep UTC; every date shown and every day boundary uses one owner setting, "Org timezone" (RECOMMENDATION: the office's zone, e.g. America/Denver). Reasons are required for Needs correction, unchecking a requirement, reversal entries, backward stage moves, attribution, pre-100 overrides and holds, Verify flags, soft-deletes, merges and account re-linking. Events are never edited or deleted; corrections are new events. Leaders and the owner see a History tab on every Person and reward record; the rep sees a simplified line on Introductions and My Rewards: "Meeting completed · confirmed by Dana, Mar 22".

## 11. Rewards, review and payment tracking

Two cash rewards exist. Both are server-authored, append-only and idempotent, following RALLY's locked rule that devices submit intents and the server records facts. XP, Levels and Badges never enter money paths.

### Confirmed reward rules

All cells are CONFIRMED RULE from the master brief; bracketed labels mark recommendations and open decisions.

| Reward | Trigger | Amount | Frequency | Who confirms | What does not trigger it |
|---|---|---|---|---|---|
| List Completion Reward | The rep's list reaches 100 distinct, complete List Entries (first name, last name, social handle with platform, phone number), each a distinct Person | $100 total | One-time per rep | Owner approves and records Paid [leader spot-check: RECOMMENDATION, see the List Completion review process] [Owner-only Approve and Paid: v1 default, OD-7] | 99 complete; Drafts; Possible duplicates; one Person in several categories; Overflow; 200 or any multiple; edits, deletes, restores, re-adds; XP, Levels, Badges; introductions or joins (separate incentive) |
| Referral Reward | All four requirements confirmed for one Person referred from the rep's list: R1 Meeting completed, R2 Commitment confirmed, R3 Agreement signed, R4 Start date and travel/arrival plans confirmed (as applicable) | $100 | One per qualifying friend; never a second copy for the same Person moving through more stages [one record per Person org-wide: RECOMMENDED key, see Reward ledger design; cross-rep attribution: OD-2] | Leader confirms R1 to R4 separately with date; Owner approves and records Paid [Owner-only Approve and Paid: v1 default, OD-7] | R1 alone (a meeting); one to three of the four; a stage change alone; physical arrival (not required); later stages after the reward exists |

Also CONFIRMED RULE: no deadline, no expiry; a missed day never erases progress or an eligible reward; list complete plus three qualifying Persons equals $400. The List Completion Reward is $100; the brief replaces an earlier $150 figure.

### Review process: List Completion Reward

1. **Trigger.** CONFIRMED RULE: 100 distinct, complete contacts qualifies. RECOMMENDATION: the count is a server query over the rep's List Entries (complete, not deleted, not the newer entry of an unresolved duplicate pair), re-run after every write that can change it. The first time it is 100 or more (a jump from 99 to 101 still fires) the server creates the record with first status **Ready for review**; the rep requests nothing. "In progress" here is derived from the count, not stored.
2. **Next action.** Every reward record carries a required next-action field (Leader / Owner / Rep / None) shown on all role screens: on creation Owner; the leader spot-check is offered in parallel and shown on the record as "Spot-check: not done" or "Spot-check: done by Dana, Apr 2" (RECOMMENDATION: the owner setting "Leader spot-check required" defaults to No; OD-5 can make it required and then the next action starts as Leader).
3. **Leader spot-check (RECOMMENDATION).** The leader samples 3 to 5 Complete entries, one question each ("How do you know Marcus?"), asynchronously and never as a modal on the rep's phone, checking plausibility (name reads as a person, valid phone, handle exists on the platform, sensible tag). The leader records "Spot-check: done by Dana, Apr 2, no concerns" (a "Looks real" tick writes the entry's verified real connection mark; a concern raises a Verify flag to the rep) or sets Needs correction. Only a human can judge a real personal connection.
4. **Approval (Owner).** Sets **Approved**; blocked below 100: "Count is 98 now, was 100 on Mar 14. Approve opens once the list is back at 100." A count below 100 is a server-set hold on the Ready for review record, cleared automatically at 100; it is not Needs correction. Approve is also blocked while a leader's Verify flag is open on any of the rep's entries or an unresolved Possible duplicate pair exists.
5. **Paid (Owner).** Date and method note (see Recorded as Paid is not the transfer).
6. **Needs correction.** Leader or owner sets it before Approved with a required explanation and rep action (or "Nothing needed from you"). It returns to Ready for review only when the person who raised it records it resolved; 100 is a precondition for Approve, not for leaving Needs correction, so plausibility concerns use the same path. The rep's row ends in one button, "Fix duplicates" (My Network filtered to Possible duplicates), which becomes "Ask for re-check" and notifies the resolver. No second record is ever created.

### Review process: Referral Reward

1. **Record creation.** One record per Person (natural key: Person id), status **In progress**, created by the first of: the Person reaching Introduced or any later stage, or any R1 to R4 confirm intent, which creates the record and appends the confirmation in one transaction.
2. **Four separate confirmations (CONFIRMED RULE).** A leader confirms R1 to R4 individually, each with name and date; a stage change never ticks a check. R4 requires a note; without travel: "No travel needed; start date May 4 confirmed." RECOMMENDATION: an untick needs a reason and is its own entry; before Approved it returns the record to In progress; after Approved or Paid it is refused and the leader asks the owner for a reversal (see Reward ledger design).
3. **Credited rep (RECOMMENDATION; cross-rep attribution is OD-2).** Candidates: reps with a non-deleted List Entry for the Person created before the first introduction entry; "first entered by" is information only. Fourth tick with one candidate: the server locks in that rep and sets **Ready for review**. With several, the record stays In progress with next action "Choose credited rep": the Person's responsible leader if all candidates are on their team, otherwise the Owner. The chooser selects one with a required reason, and that entry moves the record to Ready for review. Once locked, Person and credited rep are fixed; changing either is an owner-only correction entry with a reason.
4. **Approval (Owner).** Sees the Person, the credited rep (locked when, by whom) and the four confirmations; blocked while credited rep is empty. RECOMMENDATION pending owner confirmation: also blocked until the credited rep's List Entry is Complete ("Rep's entry for Jordan Lee is a Draft (missing phone). Approve opens when it is complete.") (normally guaranteed, since only Complete entries can be introduced; this covers an entry edited or removed after the introduction); if declined, a Draft qualifies and the confirmed reward rules table will say so.
5. **Paid (Owner).** Date and method note.
6. **Needs correction.** Example: "Start date and travel plans confirmed was ticked before a start date existed. Leader Dana: enter the start date and re-confirm it. Rep: nothing needed." Resolution follows the Needs correction step of the List Completion review process.

### Reward ledger design

**Natural keys**, each a server-side unique constraint: List Completion `(rep id)`, one per rep, ever; Referral `(Person id)`, one per Person, org-wide, ever, never per rep or List Entry. Rep id is RALLY-owned and separate from the login: records survive deactivation, a reactivated rep keeps the same id, and team and leader are snapshots at creation and on every status entry. Owner Dashboard filters "deactivated rep with Approved, unpaid reward" (OD-8).

**Append-only.** Header plus linked entries; nothing updated in place or deleted; the current status is the last status entry.

**Two kinds of intent.** Create intents ("count reached 100", "Person 8841 introduced") are idempotent on the natural key and write nothing if the record exists. Entry intents (confirm, untick, approve, pay, correct, resolve, reverse) append to it, idempotent on (record id, entry type, client intent id), so a retried "confirm R2" writes one entry and neither path can create a second reward for the same key.

**Status transitions** (the server refuses any other): In progress to Ready for review (server: fourth tick with one candidate, or credit lock); Ready for review to In progress (an untick before Approved); Ready for review to Needs correction (leader or owner) and back (resolved entry by whoever raised it); Ready for review to Approved (owner only, OD-7; count 100 or more for List, credited rep set for Referral, and no other open block); Approved to Paid (owner only, once); Approved or Paid change only by a reversal entry (owner only).

**Reversal** is a flag, not a sixth status, recorded by the owner with an internal note and a separate required rep-facing reason; the record keeps its last status plus "Reversed by Owner on Apr 2." A Paid entry is never erased; the note records any recovery outside the system. An owner "reinstate" entry with reason returns a reversed record to In progress with checks cleared, never a second record, so a Person who joins after an earlier reversal is still paid once.

**Contact deleted or merged after a reward exists.** A deleted List Entry is soft-deleted; history and reward stay. If both Persons in a merge carry a Referral record, the merge is blocked until the owner reverses one in the same action; the reversed record stays under the merged-away id with a "merged into" link and Owner Dashboard raises "duplicate referral after merge." Cross-Person duplicates are caught here, not by the key.

**Count drops below 100 after approval.** RECOMMENDATION: no automatic claw-back. A flag entry reads "Count is 97 now, was 100 at approval on Mar 14. Review?" The owner acknowledges ("Reviewed, leaving as is") or reverses; the flag re-raises only if the count drops below the acknowledged value. Re-crossing 100, or reaching 200, creates nothing (CONFIRMED RULE: one-time).

### Rep-facing wording by status

These are the canonical rep-facing status strings; every other section quotes them verbatim. Rules: a dollar amount appears only as a reward's condition or as the amount of an Approved or Paid reward; money is never shown as earned, partial, accruing or pending before Approved. Totals read "Approved, not yet paid: $100 · Paid: $100" and exclude reversed records. Every Needs correction row ends in one button or "Nothing needed from you." "Next action" names the responsible person; "Owner" is reserved for the role.

**Who sees a referral row.** Candidate reps before credit is locked, only the credited rep after; the uncredited rep sees the row below and never the credited rep's name, the leader's reason, or the Person's later stage, checks or status. Each row expands to the four checks with who and when, plus a plain-language R4 helper (local friend: start date only).

| State | List Completion Reward | Referral Reward |
|---|---|---|
| In progress | "42/100 contacts complete. Complete your 100 list to qualify for the $100 completion reward." | "Jordan Lee: 2 of 4 confirmed. Still needed: Agreement signed, Start date and travel plans confirmed. Next action: Leader Dana." |
| Ready for review | "100/100 complete. List reward: Ready for review. Next action: RALLY leadership approval. Nothing needed from you." (while a spot-check is open: "Next action: Leader Dana is checking a few contacts.") | "Jordan Lee: 4 of 4 confirmed. Referral reward: Ready for review. Nothing needed from you." |
| Ready for review, on hold (a display state, not a status) | Count dropped below 100: "99/100. List reward: Ready for review, on hold until you're back at 100. Nothing was lost." | n/a: a Referral Reward never waits for the list (CONFIRMED RULE, owner decision, 2026-11-01) |
| Approved | "List reward: Approved: $100. Nothing needed from you. RALLY pays you directly and marks it Paid here." with the green panther stamp | "Jordan Lee: Referral reward Approved: $100. Nothing needed from you." with the stamp |
| Paid | "List reward: $100. Paid on Mar 21." | "Jordan Lee: $100. Paid on Apr 2." |
| Needs correction | "List reward: Needs correction. 3 contacts have the same phone number and were kept as separate people. [Fix duplicates]" then "[Ask for re-check]" | "Jordan Lee: Needs correction. Leader Dana is fixing a date on Start date and travel plans confirmed. Nothing needed from you." |
| Reversed (flag) | "List reward: Reversed on Apr 2. Reason: [rep-facing reason]." | "Jordan Lee: Referral reward reversed on Apr 2. Reason: [rep-facing reason]." |
| Credited to another rep | n/a | "Jordan Lee: Referral credited to another rep who also knows Jordan. No reward on your list for this one. Jordan still counts toward your 100. Questions? Ask your leader." |
| Outcome or removal | n/a | Not interested / Do not contact before all four are confirmed: "Jordan Lee: Not moving forward. No referral reward." (after all four are confirmed the record keeps its status: eligibility does not require arrival, CONFIRMED RULE). Follow up later: "Jordan Lee: On hold. 1 of 4 confirmed." Deleted after Paid: "Jordan Lee (removed from your list): $100. Paid on Apr 2." |

Footer on My Rewards, always visible: "'Paid' means RALLY marked this as paid on that date. This app doesn't send money. RALLY pays you directly."

### Owner-facing reward record fields

Reward id (RALLY-owned); type; natural key; credited rep, locked when and by whom; team and leader snapshots; next action; Person with stage and outcome; "first entered by" (information only); candidates; amount in integer cents plus currency; status history with actor and timestamp; R1 to R4 with confirmed by, date, note, untick reason; spot-check (who, when, note); count at trigger and now; "Kept both" pairs; self-involved flag (recipient is also a confirmer, attributor or spot-checker; owner-only approval); approved by and date; Paid date, method note, reference, recorded by; correction, rep action, resolved entry; flags, acknowledgements, reversals and reinstatements with reasons; links to List Entries and Person. Filters: rep, team, type, status, next action, date range; CSV export owner-only. Leaders see a record only when the credited rep (before lock, every candidate) is on their team.

### Recorded as Paid is not the transfer

CONFIRMED RULE: no payment provider or automatic payment integration has been selected; RALLY 100 moves no money. Paid is a bookkeeping fact the owner enters after paying outside the app: only on an Approved record, once per record, with date, method note (free text: "Venmo Mar 21", "Added to Mar 31 payroll") and optional reference; who recorded it is captured automatically. A mistaken Paid is corrected by a reversal plus, if paid again, a new linked Paid entry. A future provider webhook could write the entry instead; nothing in v1 assumes it.

### Placeholder for the owner's additional incentives

OD-3: the owner confirmed the reserved spot (owner decision, 2026-11-01) and will supply the incentive list later; no amounts, milestones or requirements are invented here. The Badges row reads "More incentives coming from RALLY leadership" and My Rewards reserves a panel with no numbers. Each incentive needs: name and rep-facing description; kind (cash, non-cash prize, or game-only XP or Badge, never on My Rewards); an exact server-checkable trigger; natural key (per rep, Person, team or period); amount in cents or prize description; frequency; who confirms, approves and records Paid; what does not trigger it; who it applies to, with start and end dates; the same five statuses and next-action field. Not live until every field is filled and the owner activates it.

### Check examples

| Example from the brief | How the design handles it | Outcome |
|---|---|---|
| 99 complete contacts | Count is 99; no record; "99/100, 1 more to complete your list." | List not finished. No reward. |
| 100 distinct complete contacts | Count first reaches 100 or more; one record keyed on rep id, Ready for review. | Qualifies for the $100 List Completion Reward, pending review and approval. |
| A duplicate entered | Dedupe (digits-only phone, lowercase platform+handle, full history) marks the newer entry a Possible duplicate, excluded until resolved; a "Different people" answer is recorded as "Kept both" and is visible to the spot-check and owner. | Count does not advance. |
| A meeting alone | R1 confirmed, R2 to R4 not; "1 of 4 confirmed," In progress. | Referral not qualified. |
| All four confirmed, arrival in the future | R4 covers plans confirmed, not arrival; Ready for review on the fourth tick or credit lock. | Eligible now. |
| Completed list plus three qualifying referrals | One List Completion record ($100) and three Referral records on distinct Persons ($300). | $400, paid separately. |
| Returning after a break | No deadline, no expiry; counts, confirmations and statuses are server state. | Progress and eligibility preserved. |
| Saved contacts before 100 | Each List Entry is on the server and visible to leaders and the owner from its first save; it creates or links a Person in the master CRM as soon as it carries a phone or platform+handle. | In the owner CRM from the first save. |
| Repeated edits and status changes | Create intents hit the natural key; entry intents deduplicate by intent id; neither can create a second reward. | Never a duplicate reward. |

### Decided: Referral Reward approval does not wait for the list

CONFIRMED RULE (owner decision, 2026-11-01): a Referral Reward can be approved once all four requirements are confirmed and a credited rep is set, whatever the rep's list count. The List Completion Reward stays a separate, one-time reward. There is no owner setting and no hold for this case; rep wording is the normal Ready for review string.

## 12. One connected system: how rep, leader and owner views stay connected

### One set of records, three windows

CONFIRMED RULE: the game and the CRM share the same contact records. The Wall, the Leader Workspace and the Owner Dashboard are three windows onto one set of server records; scope and permission differ, the data does not.

- **Person.** One real human, org-wide, with a RALLY-owned ID, every phone and handle any rep supplied, interest status (starts Unknown) and Do not contact. RECOMMENDATION (pending OD-2): one Person per human; software auto-links only under the cross-rep rule in Formatting and duplicate checks and otherwise flags; only a leader or owner merges.
- **List Entry.** A rep's own link to a Person, with that rep's typed fields, tags and notes. Complete is judged on those fields, never inherited from the Person; each Person counts at most once per rep.
- **Pipeline history.** Reps write Added, Introduction planned and Introduced (from a Complete entry only), and Follow up later on their own introductions before handoff; leaders and the owner write everything from Meeting scheduled on, plus Not interested and Do not contact at any stage. A stage moves backward only when a leader or the owner records a reason, as a new event; history is never rewritten.
- **Requirement confirmations.** R1 to R4 as separate rows with leader and date; R4 may be "not applicable". A stage change never ticks a row (CONFIRMED RULE).
- **Reward records.** One List Completion Reward record per rep; one Referral Reward record per Person, ever, created at In progress when the Person reaches Introduced, or at the first confirmation if that comes first. Status moves are append-only ledger rows (ledger rules in Rewards, review and payment tracking); a reversal never frees the Person ID.
- **XP events.** Idempotent game progress, never money.
- **Reminder preferences.** Per-type on/off (drafts, milestone, introduction, leader updates, reward status), push opt-in, show names, quiet hours (default 10 pm to 8 am), 30-day pause; strings and defaults in Reminders for a self-paced experience.

**What a rep never sees.** CONFIRMED RULE: no rep sees another rep's list. RECOMMENDATION: a cross-rep match is never shown to either rep; only leaders and the owner see two reps linked to one Person. Stage and confirmations appear only on Persons the rep introduced, under the exact stage names, and never show R-codes.

### Worked example: Marcus Lee, seen three ways

Tyler opens the Team Bus Scene and calls "Marcus": a Draft List Entry, saved on the server and already visible to Dana and the owner as one of Tyler's drafts. In the Sweep he adds "Lee", a phone and "@marcus.lee, Instagram". The first identifier creates the Person; no phone or platform+handle match anywhere, so it is a new Person: Complete, tile lit, contact_completed written.

**Rep view.** My Network card: "Marcus Lee"; chip "Complete"; gray "Sports · Interest: Unknown"; gray "Added"; button "I'll introduce Marcus"; footer "This contact is shared with the RALLY recruiting team." Game Home: "43/100 contacts complete."

**Leader view (Dana).** Marcus appears in Dana's Leader Workspace once Complete, because Tyler is assigned to her: "Added by Tyler · Mar 2 · Team Bus." When Tyler sets Introduced, Dana becomes responsible leader: "Next: Dana schedules the meeting." After the meeting she sets Meeting completed and separately ticks R1; later R2, R3 and R4 ("travel confirmed").

**Rep view meanwhile.** Introductions card: "Marcus Lee · Agreement signed · 3 of 4 confirmed ✓ Meeting completed ✓ Commitment confirmed ✓ Agreement signed ◻ Start date and travel plans confirmed · Next: Dana confirms start date and travel plans."

**Attribution (recommended OD-2 policy).** Marcus's Referral Reward record was created at In progress when he reached Introduced. The fourth tick, with Tyler locked in as the only candidate (system reason "Only rep linked"), moves it to Ready for review; with several candidates it waits at In progress, "Choose credited rep", in Dana's queue, and she picks one rep with a reason.

**Owner view.** The same row in full, plus "Referral Reward · $100 · Tyler · Ready for review · List: 43/100 (not complete)." The owner can approve it now, because a Referral Reward does not wait for the list (CONFIRMED RULE, owner decision, 2026-11-01). Tyler's My Rewards reads "Marcus Lee: 4 of 4 confirmed. Referral reward: Ready for review. Nothing needed from you." After approval and payment, Tyler's row reads "Paid on Apr 10."

One record, three windows. Tyler cannot edit Dana's confirmations; Dana cannot edit Tyler's notes; the owner approves and records Paid (v1 default, OD-7).

### Why saved contacts reach the owner CRM immediately

CONFIRMED RULE: saved contacts appear in the master CRM as saved, not at 100. The handoff starts at the first contact, and a leader cannot take a meeting on a record that lives only on a phone; cross-rep duplicate detection needs a live master list; the count is a server query (RECOMMENDATION, by analogy to RALLY's server-records-facts rule). Offline entry still works: Syncing dot, then on rejection the tile moves to Possible duplicate with "Marcus Lee might already be on your Wall (same phone). Tap to check."

Disclosure makes this acceptable: the "Who sees your contacts" card on Welcome & Onboarding (wording in the new-rep walkthrough) is acknowledged before Game Home unlocks. Every contact card carries the permanent footer.

### Why deactivating a rep keeps the records

CONFIRMED RULE: submitted CRM records are separate from a rep's login. RECOMMENDATION: every record keys to the durable Rep record, not the login, so deactivating Tyler freezes his login and erases nothing: every Person, List Entry ("Source rep: Tyler (deactivated)"), pipeline event, confirmation and reward record stays, including Approved and Paid. Open reward records keep their status, tagged "rep deactivated"; whether they are paid is OPEN DECISION OD-8. Mechanics: Access and privacy model.

RECOMMENDATION: never hard-delete an account; mark deactivated, keep the ID.

## 13. Data model and integration notes

### Entities and key fields

Plain names, no SQL. Every entity carries a RALLY-owned ID, created-at, created-by and updated-at.

| Entity | Key fields and rules |
|---|---|
| Account | login credentials, role (Rep / Leader / Owner), status (active / deactivated), linked rep record. One type; OD-4 (b) would split it. |
| Rep record | RALLY-owned rep id, display name, phone or email identity, status (active / deactivated), assigned leader. Separate from the login Account; List Entries, XP events, acknowledgments and reward records key to this id, so deactivation freezes the login and erases nothing. |
| Leader assignment | leader, rep, from, to. |
| Person | canonical first and last name, interest status, Do not contact, responsible leader, external CRM reference, merged-into. Canonical values default to the first Complete entry; only Leader or Owner edit them. |
| Person identifier | person, kind (phone / handle), platform, raw, normalized, source rep, source entry. Dedupe compares every identifier; differing values never overwrite ("Tyler has 555-0101, Sam has 555-0199"). |
| List Entry | rep, person (empty while a Draft has no phone or platform+handle; set when the first identifier is saved), first name, last name, phone, handle, platform, tags, notes, state (Draft / Complete), scene of origin, chain-hit flag, verified real connection (by leader, at, method), deleted-at. One live entry per (rep, Person); deleted entries kept for dedupe and XP. |
| Duplicate flag | record A, record B, scope (within-rep / cross-rep), signal, status (open / decide later / kept both / merged), resolved by, at. |
| Pipeline event | person, from, to stage or outcome, changed by, at, responsible rep or leader, next action, note. Append-only. |
| Requirement confirmation | person, requirement (R1 to R4), R4 applicability, confirmed by, at, note, revoked at, revoke reason. Never derived from stage. |
| Reward record | type, rep, person (referral), status, amount, idempotency key, attribution reason, self-involved flag (recipient is also a confirmer, attributor or spot-checker; only the Owner may approve). |
| Reward ledger entry | reward record, kind (creation, status move, hold, correction, reversal), amount, actor, timestamp, note, linked entry. Append-only; every status move is a row. |
| XP event | rep, kind, points, idempotency key, related entry / scene / milestone. Never money. |
| Scene progress | rep, scene, names called, names completed, cleared, last opened, last name called, last chain cue. Return line on Game Home: "Last scene: The Gym. 4 lit, 2 drafts left. Pick up where you left off." (game section). |
| Reminder preference | rep, push enabled, per-type toggles, show names, quiet hours, paused until, last sent. |
| Acknowledgment | rep, wording version, accepted at, re-accepted at. Game Home stays locked until one exists for the current wording. |
| Spot-check | rep, reward record (optional), leader, at, entries checked, result per entry (looks real / unclear / not real), note. Asynchronous leader task, never a modal on the rep's phone. |
| Audit log | actor, entity, entity ID, field, old, new, timestamp. Covers Person, identifiers, List Entry, Duplicate flag, confirmations, reward records, Leader assignment, Account status, every CSV export (actor, filter, row count). |

### Identity: RALLY-owned IDs are canonical

RECOMMENDATION, by analogy to the locked RALLY principle: an outside CRM's ID is stored on the Person only as "external CRM reference". A Person is never redefined around it, deleted because the outside record vanished, or re-keyed when the CRM changes.

### Audit history

Every audited change writes who, when, field, old and new value; pipeline events and ledger rows are their own history. "Who ticked R3 on Marcus Lee?" and "Why did Tyler's count drop to 98?" are answered from the log alone.

### Formatting and duplicate checks (mechanical)

These establish that two records look like the same human, not that the human is real or known.

**Phone (RECOMMENDATION).** Digits only; strip a leading 1 from 11 digits; prepend 1 to 10 digits; anything else stored digits-only and compared as typed. Pasted "+1", spaces, dashes and parentheses are accepted silently.

**Handle (RECOMMENDATION).** Platform is an enumerated field: Instagram, Snapchat, TikTok, Facebook, X, LinkedIn, Discord, Other (name required); pasted URLs set it. Lowercase, strip "@" and URL prefix, compare on (platform, handle). "Other" never matches on signal 2.

**Signals (RECOMMENDATION).** Strong: 1 same normalized phone; 2 same platform and handle. Name-only: 3 same first and last name with a similar handle. Checked against the rep's full history (including deleted) and every Person identifier.

**Within one rep's list.** RECOMMENDATION (pending owner confirmation; plain-language example in Duplicates and attribution): the older Complete entry keeps counting; only the newer entry is held in Possible duplicate until resolved, so adding a contact never lowers the count (CONFIRMED RULE: a duplicate never advances it). A name-only match never holds the count. Resolution flow, buttons ("Same person" / "Different people") and the Kept both rule: Duplicates and attribution. Re-adding a deleted match links to the old record: "Marcus Lee is back on your Wall. He was here before, so no new XP."

**Across reps.** Auto-link only on a strong signal plus a matching normalized last name, or on both strong signals; every other strong-signal match opens a "Possible cross-rep match" flag for the responsible leader (rule in Duplicates and attribution). Both reps count their entry (CONFIRMED RULE, owner decision, 2026-11-01) and neither rep is shown the match.

**Merge rules (RECOMMENDATION).** Person merge: the loser gets merged-into and its identifiers, List Entries, pipeline events and confirmations re-point to the survivor; if both carry a Referral Reward record the merge is blocked until the owner reverses one in the same action (ledger rule). If one rep then holds two live entries on one Person, a within-rep flag holds the newer. Entry merge ("Keep the best of both" in Duplicates and attribution): the Complete entry survives, else the older; the loser gets deleted-at and its XP events link to the survivor, never re-granting.

**Never a silent merge of an ambiguous record (CONFIRMED RULE).** Outside the auto-link rule, software proposes and a human decides.

### Verification that someone is a real personal connection (human)

The checks above cannot tell whether Tyler knows Marcus; only a conversation can, and no "realness" score should pretend otherwise.

RECOMMENDATION: a light leader spot-check when a List Completion Reward record opens (optionally earlier): three to five random Complete entries, one question each ("How do you know Marcus?"). A "Looks real" result, given only after an actual conversation with the rep (or with the Person where introduced and not Do not contact), writes the List Entry's verified real connection mark; an "unclear" result becomes the leader's Verify flag to the rep (Leader Workspace). The mark belongs to that rep's entry only. In v1 the spot-check does not block Approve (owner setting "Leader spot-check required" defaults to No); making it required is OD-5.

### Contact import (later, platform-dependent)

CONFIRMED RULE: import is optional; manual entry always works. Platform capability at time of writing, to re-check before build: iOS PWAs have no usable address-book access; Android Chrome offers a Contact Picker; CSV upload works anywhere. RECOMMENDATION: v1 ships manual entry and the Phone Sweep Scene. Later, imported rows wait in "Import review" outside the Wall; each becomes a List Entry only when the rep opens it and taps Save, passing the same duplicate checks, so an import never lights tiles directly.

### Connecting an outside CRM later

No CRM provider is specified (CONFIRMED). An adapter would be server-side, never the phone. Needed:

| Item | What is needed |
|---|---|
| Field mapping | Person and identifiers to contact fields; tags and source rep to custom fields; stages mapped. |
| Direction | RECOMMENDATION: one way, RALLY 100 to CRM, first; two-way only for fields the owner names. |
| Identity matching | RALLY person ID stored in the CRM; then phone; then platform+handle. Name alone never matches; unmatched records are created, not guessed. |
| Consent | Name the CRM in a new acknowledgment version before go-live; Do not contact propagates both ways. |
| Dedupe policy | RALLY 100 flags decide; CRM-side merges are read back as merged-into references, never applied blindly. |
| Export format | CSV first: one file per entity with RALLY IDs in every row; works with no integration. |
| Source of truth: stage | RECOMMENDATION: RALLY 100 while leaders work there; if stages move to the CRM, flip ownership. Never both. |
| Source of truth: rewards | RALLY 100, always; the CRM may display read-only. |

### Who may move a reward record

The server sets Ready for review (list: count reaches 100; referral: fourth confirmation with the credited rep set) and sets or clears the count-drop hold; a leader or the owner raises Needs correction and records its resolution; only the owner (v1 default, OD-7) sets Approved, records Paid and writes reversal or correction entries. Transition rules, unticking (returns to In progress before Approved), holds and reversals: Rewards, review and payment tracking.

## 14. First-version scope and later enhancements

### Platform note

Confirmed: the owner's RALLY app is an installable PWA on Supabase. RECOMMENDATION: build RALLY 100 as a phone-first installable PWA with a server-side backend for the shared CRM, ledger and XP; Leader Workspace and Owner Dashboard are desktop-width views of the same app. The team knows this stack, and the server-side count, dedupe and ledger need a backend anyway. On iPhone, push works only from the Home Screen; the install card appears at the 10 milestone (see Reminders for a self-paced experience), and until then reminders are in-app only. Backend placement is OD-6; sharing is not assumed.

### v1 scope (ships first)

Each item is in v1 because a check example fails or the handoff breaks without it.

1. **Welcome & Onboarding**: versioned acknowledgment (install card comes at the 10 milestone).
2. **Game Home with the Wall**: server-computed count, drafts, next milestone line, one primary action, reward strip with CONFIRMED wording.
3. **Mission Select ("Scenes")**: Phone Sweep, Group Chats and Same Shift first, then "All scenes"; Dead end ladder.
4. **Sprint and Chain prompts**: names only, never blocking, no caps.
5. **Add Contact and Sweep**: required fields, Drafts, missing-field labels, phone validation, platform list, "Save and next", "Save and add another", duplicate banners per Formatting and duplicate checks.
6. **My Network**: search, filters, edit, delete with the count-drop sheet, restore.
7. **Server-side dedupe** on every identifier against full history, within a list and across the CRM; "Possible cross-rep match" flags for leaders.
8. **Introductions and the Intro Board** from the first contact, introductions only from Complete entries: stages and outcomes per One set of records, three windows, next action and its owner, since-last-visit digest including leader-made count changes; introduction_made XP only on leader confirmation.
9. **Four requirement confirmations** with name, date, R4 applicability, revocation.
10. **Reward records and ledger**: keys, attribution, five statuses, self-involved flag, "Possible same person" check, holds per Rewards, review and payment tracking, "recorded as paid" separate from money.
11. **My Rewards**: two sections, the reserved incentives panel, paid footer.
12. **XP, levels and badges** with keys; celebrations within budget; reduced motion.
13. **Leader Workspace** scoped to assigned reps: queues, pipeline, confirmations, cross-rep flags and merges, attribution, spot-check marking, next-action reassignment.
14. **Owner Dashboard**: all Persons, per-rep progress, reward records, approvals, Paid recording, filters, audited CSV export, churn indicator, deactivation.
15. **Settings and reminders** (strings in Reminders for a self-paced experience) plus the return line.
16. **Audit log** and **offline draft entry** with Syncing tiles and the reject path.

### Later enhancements

- CSV import and Contact Picker where available, through Import review.
- Outside CRM adapter per Connecting an outside CRM later.
- Team play: Team Wall, Sprint Night, Relay; an opt-in aggregate leaderboard with no tap path to another rep's contacts.
- SMS or email reminders; the owner's additional incentives (OD-3) as new reward types on the same ledger.
- Verification rate per rep; reporting by Scene yield, time-to-100, introductions per month.
- Bulk reassignment of next actions when a leader changes; shareable Wall image at 100 (no contact data).

### Deliberately not in v1

- Automatic messaging to any contact (CONFIRMED RULE).
- Any payment provider or transfer (CONFIRMED RULE: "Paid" is bookkeeping).
- Automated "is this person real" scoring (see Verification that someone is a real personal connection).
- Any leaderboard (CONFIRMED RULE: none may expose a rep's list; the later one is aggregate only).
- A second completion reward at any multiple; daily caps, waiting periods, streak penalties (CONFIRMED RULES).
- A scanner over notes; the hint "Never type card or bank details here" is the control.
- Mascot animation, speech bubbles, a new logo asset.

## 15. Open decisions and assumptions

### Open decisions

**OD-1. Referral approval before the 100 list is complete.** DECIDED (owner decision, 2026-11-01): yes. A Referral Reward is approved on its own requirements, whatever the rep's list count.

**OD-2. Who receives the Referral Reward when two reps know the same person.** Partly decided. List credit is a CONFIRMED RULE (owner decision, 2026-11-01): each rep puts the person on their own list and each counts them once. Still open: which rep receives the single $100 Referral Reward. Options: (A) introducer credit, verified by the leader asking the friend; (B) first to enter, published as a rule; (C) leader discretion with a required reason and no default rule. RECOMMENDATION: (A) as the stated policy, run through (C)'s mechanics; never a split; "first entered by" shown as information only. The Person-ID key blocks a second payout per Person ID. Accepted under OD-2: the uncredited rep's "credited to another rep" line reveals that someone else knows the Person, never who. Also under OD-2: must the rep have recorded an introduction to receive the Referral Reward? RECOMMENDATION: yes, the reward is for bringing the friend in; until decided, the "No introduction recorded" flag lets the owner approve or return.

**OD-3. The owner's additional incentives.** Partly decided (owner decision, 2026-11-01): keep a reserved spot. The incentive list itself is still to come. When it arrives, each incentive becomes its own reward type with its own key and requirement rows. Invent nothing.

**OD-4. Separate leader accounts?** Options: (a) a Leader role on one account type with Leader assignment; (b) a distinct account type. RECOMMENDATION: (a), mirroring RALLY. Either way a leader sees only assigned reps' records (Access and privacy model).

**OD-5. Spot-check required before the List Completion Reward?** Options: (a) required, three entries minimum; (b) recommended, visible, optional; (c) not in the flow. RECOMMENDATION: (b) in v1, owner setting "Leader spot-check required" defaulting to No, with "Spot-check: not done / done by Dana, Apr 2" on the reward record; move to (a) if padded lists appear.

**OD-6. Backend placement.** Shared Supabase project or separate. RECOMMENDATION: decide after OD-4.

**OD-7. Who may Approve and record Paid.** RECOMMENDATION: Owner only for both in v1; a delegate may be named later.

**OD-8. Rewards of deactivated reps.** Options: (a) reviewed and paid normally; (b) Approved only; (c) not paid. RECOMMENDATION: (a) where all requirements were met before deactivation, since a missed day never expires an eligible reward; the owner decides case by case for requirements met after. Includes: a new account that matches a deactivated rep who was already paid the List Completion Reward (the system links or warns and logs; it never pays twice silently).

### Assumptions this blueprint makes

- One company, one organization; a second company requires a tenancy decision first.
- US phone numbers by default; US dollars as integer cents; no payment provider.
- Reps are 18 or older; if under-18 reps are hired, the owner decides on guardian consent first.
- Deleted List Entries are retained, not purged.
- A leader who is also a rep has their own reward records flagged Self-involved and reviewed by the Owner.

### What we need from the owner next

1. Decide OD-2: which rep receives the Referral Reward when two reps know the same person, and whether a recorded introduction is required.
2. Confirm the duplicate rule for one rep's own list (plain-language example in Duplicates and attribution).
3. Send the incentive list (OD-3) when ready; its spot is reserved.
4. Decide OD-4 and OD-5.
5. Approve the "Who sees your contacts" card wording in the new-rep walkthrough.
6. Decide OD-6.
7. Confirm OD-7 (Owner only) or name a delegate.
8. Decide OD-8.

---

## Appendix A. Concept panel: the alternatives considered

Three complete concepts were drafted independently from different design angles, then scored by three independent judges, each with one lens: new-rep delight and speed, business-rule fidelity, and feasibility and mobile craft. Each judge scored six criteria from 0 to 10 (delight, recall support, finish motivation, rule fidelity, phone usability, buildability), 60 points maximum per judge. A fourth angle, an expanding network constellation, failed to produce a valid proposal and was not scored. All three judges independently chose the same winner.

| Concept | Angle | Rep-delight judge | Rule-fidelity judge | Feasibility judge | Total / 180 |
|---|---|---|---|---|---|
| Scenes & Sprints ("Light the Wall") | Recall psychology first | 52 | 48 | 50 | **150** |
| Home Turf | Checkpoint route map | 45 | 45 | 45 | 135 |
| The Deck | Collectible contact cards | 39 | 42 | 39 | 120 |

**Scenes & Sprints (chosen).** A 10×10 Wall of tiles plus Scenes, Sprints, chain prompts and a Sweep. Won on every lens: it is the only concept built around how memory actually retrieves people (context reinstatement, cued recall, spreading from one name to the next), name capture is a single field, the progress display is a grid that reads in one glance, and the whole thing is buildable from a grid, a list and an input with no bespoke map or card engine.

**Home Turf (runner-up).** A winding route from door 1 to door 100 across five blocks with checkpoint landmarks, the panther as the map marker, and a "Handoff Road" for introductions. Strongest sales-floor metaphor and the most meticulous rule machinery of the three. It lost on the render: an SVG route with landmarks, a zoom-out at 50 and a pinned finish line is weeks of polish for a small team and the slowest display to scan on a phone, and its "route" vocabulary collides with the live RALLY sales app. Grafted into the winner: the always-visible "Dead end" button, the "no halfway cash" copy at 50, the delete-sheet copy ("Your count will drop to 41. This does not refund or re-award anything"), the leader's "Count is 98 now, was 100 on [date]" approval block, and the Referral Reward keyed to the master-CRM Person so two reps can never produce two bonuses.

**The Deck (third).** Every person is a contact card; incomplete cards show empty slots; completing a card "forges" it into a 10-page album. Appealing as an object, but the forge and flip animations exceed the motion budget, "forged" competes with the confirmed wording "contacts complete", and albums by life category risk reading as per-category quotas, which the brief forbids. Grafted into the winner: the Sweep order (fewest missing fields first), the "one field away" line on Game Home, and per-Scene counts that drive the stuck ladder's swap suggestion.

## Appendix B. Brand assets in this folder

| File | What it is | Use in RALLY 100 |
|---|---|---|
| `brand/panther-logo-rally-mktg.jpg` | The official mark: black panther head in a white circle, "RALLY MKTG." beneath | Brand mark on every screen, milestone stamp at 10 and 100, "confirmed by RALLY" stamp on approved reward rows. Used unchanged; no new logo is invented. |
| `brand/wordmark-rally-marketing-black.jpg` | "RALLY" heavy wide wordmark with "MARKETING" letter-spaced beneath, black on white | Reference for the wordmark weight and the letter-spaced secondary line treatment ("WALL COMPLETE" at 100). |
| `brand/wordmark-rally-mktg-black.png` | "RALLY" with "M K T G" letter-spaced and thin rules each side, white on black | Primary wordmark treatment on dark surfaces. |
| `brand/wordmark-rally-white-on-black.jpg` | "RALLY" alone, white on black | Compact header wordmark. |
| `brand/website-home-mobile-screenshot.png` | rallymktg.com on a phone | Tone reference: deep black, white type, pill nav, monochrome photography. |

The live RALLY sales app already uses the Outfit typeface (weights 400 to 900) with a 16px corner radius; RALLY 100 keeps both. Owner decision (2026-11-01): RALLY brand colors, black, white and gray, with green for wins. The green is #22B558, the Sold green the RALLY sales app already uses, so RALLY 100 adds no new brand color.

## Appendix C. Document history

| Version | Date | Change |
|---|---|---|
| 0.2 | 2026-11-01 | Owner decisions recorded: referral approval does not wait for the list; both reps count a shared person; outcomes still count toward 100; incentives keep a reserved spot; RALLY brand colors with green for wins, replacing the proposed blue. Added the brand and visual system and a plain-language duplicate example. |
| 0.1 | 2026-11-01 | First complete blueprint. Concept chosen by a three-judge panel from three independent proposals; every section adversarially reviewed on three lenses (rule fidelity, new-rep experience, operations and data integrity) and revised; one cross-section completeness and consistency pass. |
