window.SMU_DATA = window.SMU_DATA || { schools: [] };

// ─────────────────────────────────────────────────────────────
// Trend Intelligence Library — 22 entries
// Majority: evergreen viral mechanics that never expire.
// Minority: current-era formats worth riding while they last.
// ─────────────────────────────────────────────────────────────

SMU_DATA.trends = [
  {
    id: "tr-01",
    name: "The Open-Loop Cold Open",
    type: "format",
    status: "evergreen",
    platforms: ["TikTok", "Instagram", "YouTube Shorts"],
    description: "The video starts mid-story with a claim or question it refuses to resolve until the end — 'I almost lost the whole deal because of one sentence' — and the payoff lands in the final two seconds.",
    whyItWorks: "Open loops exploit the Zeigarnik effect: the brain files unresolved tension as urgent and holds attention until it closes. Algorithms read the resulting near-flat retention curve and completion rate as quality, so distribution compounds. The loop is doing the retention work your visuals alone can't.",
    adapt: [
      "Write the payoff sentence first, then reverse-engineer an opening line that promises it without revealing it.",
      "Cut every second of context before the loop opens — start inside the moment, not before it.",
      "Plant one mid-video 'reminder tease' at the 40-50% mark so drop-prone viewers recommit.",
      "Close the loop in the last 2 seconds, then hard-cut to black — no outro, no trailing logo."
    ],
    fitsIf: "You have real stories with genuine stakes — client wins, near-disasters, surprising results.",
    skipIf: "Your payoff is weak; an open loop that closes on nothing trains viewers to distrust your hooks.",
    example: "A luxury realtor opens on a doorway shot: 'The buyer walked out of this $4M listing in 90 seconds — and it made the sale.' Walkthrough b-roll plays as she explains the psychology, and the final beat reveals the walkout was a negotiation tactic she engineered."
  },
  {
    id: "tr-02",
    name: "Silent Luxury / No-Talking Content",
    type: "format",
    status: "evergreen",
    platforms: ["Instagram", "TikTok"],
    description: "No voiceover, no talking head — just meticulously sequenced b-roll, real ambient sound, and restraint. The quiet is the flex.",
    whyItWorks: "Absence of pitch reads as confidence; luxury codes are built on understatement, and silence signals you don't need to persuade. Diegetic sound (an espresso pour, a car door thunk) triggers mild ASMR response, and with no language barrier the format travels globally, widening the interest graph the algorithm can test you against.",
    adapt: [
      "Pick one 60-90 minute ritual — morning prep, detailing a car, plating a dish — and shoot 25-30 clips of 2-4 seconds each.",
      "Record real audio close to the source; foley the moments your phone mic missed.",
      "Cut on action so motion carries across every edit, holding shots 1.5-2.5 seconds.",
      "Grade toward one palette — warm neutrals or cool desaturation — never both.",
      "Add at most one line of text at the open; let the sequence do the talking."
    ],
    fitsIf: "Your product, space, or process is genuinely beautiful and you can shoot with patience.",
    skipIf: "Your value is your ideas or personality — silence hides exactly what people would follow you for.",
    example: "A watch dealer films the Saturday open: cloth wiping the vitrine, a bracelet settling on a tray, the wind of a mainspring in macro, morning light crossing the boutique floor. Caption: 'Saturday, 8:42am.' Nothing else."
  },
  {
    id: "tr-03",
    name: "Text-Hook Over B-Roll",
    type: "format",
    status: "evergreen",
    platforms: ["Instagram", "TikTok"],
    description: "A single bold text line sits over looping b-roll for the entire video — the caption or on-screen body text carries the actual content. The video is a billboard; the words are the product.",
    whyItWorks: "Most feed viewing starts muted, and text hooks bypass sound entirely. The static-text-over-motion combination creates a low-effort consumption promise — viewers know the cost of watching within 0.5 seconds. Loop-friendly short durations (5-8 seconds) drive multiple rewatches, and rewatch rate is one of the strongest ranking signals on both platforms.",
    adapt: [
      "Write the text line as a complete standalone idea — specific, first-person, slightly confessional: 'I raised my prices 40% and lost zero clients.'",
      "Pair it with b-roll that signals context, not literal illustration — hands on a keyboard, a city drive, a gym rack.",
      "Keep the clip 5-8 seconds so it loops before the viewer decides to leave.",
      "Move the full lesson into the caption using short lines and white space, ending with a soft CTA."
    ],
    fitsIf: "You think in sharp one-liners and have a backlog of decent b-roll — this is the highest-leverage low-production format there is.",
    skipIf: "Your one-liners are generic; the format has zero production to hide weak writing behind.",
    example: "A business coach loops 6 seconds of a whiteboard session under the text 'The client who haggles hardest churns fastest.' The caption tells the story of the data behind it and ends with 'Save this for your next discovery call.'"
  },
  {
    id: "tr-04",
    name: "The Pattern-Interrupt Cut",
    type: "editing",
    status: "evergreen",
    platforms: ["TikTok", "YouTube Shorts", "Instagram"],
    description: "An editing rhythm that changes something on screen every 1.5-2 seconds — angle, zoom, text pop, b-roll insert — so the visual field never settles.",
    whyItWorks: "The brain's orienting response fires on novelty; each cut resets attention before boredom can begin. Retention analytics show swipe decisions cluster at moments of visual stasis, so removing stasis removes exits. It's the editing-room version of a slot machine: variable, rhythmic, unresolvable.",
    adapt: [
      "Shoot your talking head from two angles (or punch in 20-30% digitally) and alternate on every sentence.",
      "Insert 1-2 second b-roll cutaways on every concrete noun you say.",
      "Add text pops only on the load-bearing words, animated in-place, never scrolling.",
      "Audit the final cut: if any shot exceeds 3 seconds, split it or cover it.",
      "Cut on action — start each new shot mid-gesture so motion stitches the edit together."
    ],
    fitsIf: "You do talking-head education and your retention curve sags between the hook and the payoff.",
    skipIf: "Your brand voice is calm and premium — frantic cutting reads as cheap in luxury contexts.",
    example: "A sales trainer delivers a 45-second objection-handling script as 28 cuts: A-cam, B-cam punch-in, a phone screen insert on 'send this exact text,' and a whip to a whiteboard for the framework — no shot breathing longer than 2 seconds."
  },
  {
    id: "tr-05",
    name: "POV Framing",
    type: "format",
    status: "evergreen",
    platforms: ["TikTok", "Instagram"],
    description: "The video casts the viewer as a character — 'POV: your realtor actually answers the phone' — and plays the scene from their eyes or their side of the interaction.",
    whyItWorks: "Second-person framing collapses the distance between watching and experiencing; mirror-neuron engagement makes the viewer rehearse the scenario as their own. It also pre-filters the audience — only people who recognize themselves in the premise stop, which concentrates watch time among exactly the viewers the algorithm should find more of.",
    adapt: [
      "List the 10 moments your ideal client actually lives through — objections, anxieties, small wins — and write each as a 'POV:' line.",
      "Shoot from the viewer's physical position: camera at eye height, your delivery straight down the lens.",
      "Play the scene rather than describing it — real dialogue, real pacing, one beat of humor or relief.",
      "End inside the scene; resolution can live in the caption or the comments."
    ],
    fitsIf: "You serve a clearly defined customer whose inner monologue you genuinely know.",
    skipIf: "You'd be guessing at the audience's experience — an off-key POV reads instantly as an outsider cosplaying.",
    example: "A private-aviation broker shoots 'POV: it's 6am, your flight got canceled, and your broker texts first.' The camera plays the client's phone view: the incoming text, the rebooked tail number, the car already en route."
  },
  {
    id: "tr-06",
    name: "Day-in-the-Life",
    type: "format",
    status: "evergreen",
    platforms: ["TikTok", "Instagram", "YouTube"],
    description: "A compressed, timestamped tour through a real working day — 5am to 9pm in 45 seconds — built from short clips and honest texture.",
    whyItWorks: "Parasocial curiosity is bottomless: people follow people, and routine is the most relatable narrative container that exists. Timestamps act as micro-open-loops ('what does 2pm look like?'), and the format converts lurkers into followers because it sells a life, not a product — the softest possible pitch with the hardest identity pull.",
    adapt: [
      "Film 15-20 clips of 2-3 seconds across one real day; capture transitions (doors, cars, elevators) — they're free momentum.",
      "Timestamp 5-7 moments on screen; skip nothing that makes the day feel human, including the unglamorous parts.",
      "Voiceover in past tense, conversational, written after the edit so it matches the rhythm.",
      "Anchor one 'signature moment' viewers will associate with you — the same coffee shop, the same desk shot — repetition builds the brand.",
      "End on the day's honest result: a number, a signed deal, or a lesson."
    ],
    fitsIf: "Your day contains visible, differentiated work — showings, shoots, builds, negotiations.",
    skipIf: "Your day is eight hours of the same screen; forcing glamour into it reads as performance.",
    example: "A commercial real-estate developer runs '5:41am' gym clip, '7:15' site walk in a hard hat, '11:00' lender call from the car, '3:30' punch-list dispute, '8:56pm' signed LOI on the kitchen counter. Voiceover: 'Nobody claps for Tuesday. Tuesday is where the money is.'"
  },
  {
    id: "tr-07",
    name: "Before / After Transformation",
    type: "format",
    status: "evergreen",
    platforms: ["Instagram", "TikTok", "YouTube Shorts"],
    description: "The oldest conversion engine on the internet: show the starting state, compress the process, land the reveal. Physique, renovation, detail, rebrand — the mechanics never change.",
    whyItWorks: "Contrast is pre-attentive — the gap between states communicates value faster than any explanation could. The reveal delivers a completion dopamine hit, and because the transformation is proof rather than claim, it converts skeptics that testimonial-style content never reaches. Save rates spike because viewers bookmark it as evidence and aspiration.",
    adapt: [
      "Shoot the 'before' with the same framing, lens, and light you'll use for the 'after' — matched frames double the perceived delta.",
      "Compress process into 3-5 fast beats; process is seasoning, not the meal.",
      "Hold the reveal until at least 70% through, and tease it once mid-video.",
      "Cut the reveal on a beat drop or a hard sound accent — audio sells the moment.",
      "State one number in the caption: hours, dollars, days, pounds."
    ],
    fitsIf: "Your work produces visible change on a repeatable cadence.",
    skipIf: "Your results are internal or slow — faking visual contrast erodes the trust the format depends on.",
    example: "A yacht-detailing company locks the camera on the transom: oxidized and chalky in shot one, then four 1-second process beats — compound, polish, sealant, water beading — into a mirror-finish reveal at golden hour. Caption: '31 hours. Same boat.'"
  },
  {
    id: "tr-08",
    name: "The Comment-Reply Flywheel",
    type: "strategy",
    status: "evergreen",
    platforms: ["TikTok", "Instagram"],
    description: "Treat your comment section as a content assignment desk: every strong question becomes its own video, filmed as a direct reply pinned to that comment.",
    whyItWorks: "Reply videos inherit proven demand — someone literally asked — so hook risk drops to near zero. The original commenter and their graph get notified, seeding early engagement velocity, and answering publicly signals responsiveness that compounds parasocial trust. It's audience research, ideation, and distribution fused into one loop.",
    adapt: [
      "End videos with a question that invites specifics, not just opinions — 'What's the objection you can't beat?'",
      "Screen comments daily; flag any question two or more people ask in different words.",
      "Use the native reply-with-video feature so the comment renders on screen as your hook.",
      "Answer in under 60 seconds with one concrete framework, then ask the next question."
    ],
    fitsIf: "You're building authority in a niche where the audience has endless practical questions.",
    skipIf: "Your comment section is still empty — run broader hook-driven content first to fill the top of the funnel.",
    example: "A financing broker posts one rate-strategy video; a comment asks 'does this work for jumbo loans?' The reply video, shot in one take at his desk, opens with the comment on screen and clears 10x the reach of the original — then feeds three more reply videos."
  },
  {
    id: "tr-09",
    name: "The Ranked Countdown",
    type: "format",
    status: "evergreen",
    platforms: ["YouTube Shorts", "TikTok", "Instagram"],
    description: "A numbered list delivered in descending order — '5 clauses I never sign, number 1 has cost people millions' — with the strongest item held for last.",
    whyItWorks: "Numbers set a visible progress bar in the viewer's head, and descending order weaponizes it: leaving at number 3 feels like abandoning a story before the ending. Front-loading the promise that number 1 is the best creates a nested open loop, and the list structure makes the content feel skimmable even though the viewer watches every second.",
    adapt: [
      "Rank honestly — your genuinely best item last; a weak number 1 breaks the contract and the rewatch.",
      "Keep 3-5 items maximum for sub-60-second videos; seven items is a retention graveyard.",
      "Show the countdown number on screen at each transition as a progress cue.",
      "Tease number 1 in the hook with a stake attached: what it costs to not know it.",
      "Spend uneven time: 5 seconds on item five, 15 on item one."
    ],
    fitsIf: "Your expertise breaks naturally into discrete, rankable insights with a clear crown jewel.",
    skipIf: "Your material is one connected argument — chopping it into a fake list weakens both the logic and the retention.",
    example: "A luxury travel advisor runs '4 hotel upgrades money can't buy — number 1 works at any five-star on earth.' Items descend from niche to universal, and number 1 (a specific way to route requests through the concierge before arrival) is the one viewers screenshot."
  },
  {
    id: "tr-10",
    name: "The Speed-Ramp Reveal",
    type: "editing",
    status: "evergreen",
    platforms: ["Instagram", "TikTok"],
    description: "A velocity edit: footage accelerates through the approach, hits a hard slow-motion moment on the money frame, then snaps back to speed — usually synced to a beat drop.",
    whyItWorks: "Contrast in time works like contrast in imagery — the slowdown tells the viewer's nervous system 'this frame matters' without a word of explanation. The ramp compresses boring travel time and dilates the emotional peak, which lifts both AVD and rewatches, since the sync moment is satisfying enough to loop.",
    adapt: [
      "Shoot at 60fps minimum (120 if your phone allows) so the slow segment stays buttery.",
      "Choose one money frame — the door opening, the logo hitting light, the turn toward camera — and ramp around it.",
      "Map the ramp to the track: accelerate through the build, hit 20-30% speed exactly on the drop.",
      "Add a subtle 4-8% zoom during the slow segment to keep micro-motion alive.",
      "Use velocity curves, not linear speed changes — ease in and out of the ramp."
    ],
    fitsIf: "You shoot anything with motion and a reveal — cars, spaces, fashion, product unveilings.",
    skipIf: "Your footage is static talking or screen content; a ramp with no motion reads as a glitch.",
    example: "A supercar dealer films the roller door opening at 120fps: ramp accelerates the walk through the showroom, slams to 25% as the nose of the car catches the first strip of sunlight, then snaps to full speed on the rev. One cut, one ramp, one post."
  },
  {
    id: "tr-11",
    name: "Green-Screen Commentary",
    type: "format",
    status: "evergreen",
    platforms: ["TikTok", "Instagram"],
    description: "The creator appears keyed over a screenshot, headline, chart, or listing and reacts to it directly — pointing, zooming, annotating the artifact behind them.",
    whyItWorks: "The artifact borrows credibility and curiosity the creator doesn't have to build — a headline or chart is a pre-made hook with built-in context. Pointing at evidence activates a teacher-student frame that positions the creator as interpreter, and the layered composition (person + document) gives the eye two things to process, which suppresses early swipes.",
    adapt: [
      "Pick artifacts with inherent tension: surprising numbers, bad advice going viral, a listing priced wrong.",
      "Open by reading or highlighting the single most provocative element within 2 seconds.",
      "Physically gesture at what you reference — the pointing is the production value.",
      "Take a clear position the artifact doesn't; commentary without a verdict is narration.",
      "Zoom or crop the artifact between beats so the background itself keeps changing."
    ],
    fitsIf: "You have real expertise and opinions in a niche that generates public artifacts — news, data, listings, ads.",
    skipIf: "You'd be reacting to reactions; third-hand commentary has no authority to borrow.",
    example: "A wealth manager keys himself over a viral 'rent vs. buy' chart, circles the assumption everyone missed — a 2% maintenance figure — and rebuilds the math on screen in 40 seconds. Verdict in the last line: 'The chart isn't wrong. It's answering the wrong question.'"
  },
  {
    id: "tr-12",
    name: "The Contrarian Take",
    type: "strategy",
    status: "evergreen",
    platforms: ["X", "LinkedIn", "TikTok"],
    description: "Content built to disagree — with common advice, with the industry default, with the audience's comfortable assumption — argued from real experience.",
    whyItWorks: "Disagreement is a pattern interrupt at the level of ideas: the brain flags violated expectations for deeper processing. Contrarian posts polarize the comment section, and argument threads are pure engagement fuel that algorithms read as heat. Done honestly, it also carves positioning — the strategist who says the opposite of everyone is the one who gets remembered.",
    adapt: [
      "Attack ideas, never people — 'the 5am club is broken advice' outperforms and outlasts naming its gurus.",
      "Earn the take: lead with the experience or data that entitles you to the opinion.",
      "Steelman the popular view in one line before you dismantle it — it disarms the reflexive defenders.",
      "Hold one contrarian lane rather than disagreeing with everything; serial contrarians decay into noise."
    ],
    fitsIf: "You hold genuine minority positions backed by results and can argue without flinching at pushback.",
    skipIf: "You'd be manufacturing disagreement for reach — audiences smell rage-bait and the trust cost compounds.",
    example: "A luxury marketing consultant posts: 'Scarcity marketing is killing high-end brands. The waitlist is a discount in disguise.' Three client anecdotes, one framework, and a comment section split perfectly down the middle — which is the point."
  },
  {
    id: "tr-13",
    name: "ASMR-Grade Sound Design",
    type: "sound",
    status: "evergreen",
    platforms: ["TikTok", "Instagram"],
    description: "Content where amplified, hyper-clean diegetic sound is the star: the click of a pen, steam wand hiss, leather creak, keyboard clatter — mixed loud and intimate.",
    whyItWorks: "Close-mic'd texture triggers autonomous sensory response in a large slice of viewers and reads as 'premium' to everyone else — sound fidelity is a subconscious proxy for product quality. Sound-led videos also survive the mute problem in reverse: they convert scrollers into headphone viewers, and headphone viewers watch longer.",
    adapt: [
      "Record sound separately and close — a $100 lav or shotgun mic inches from the source beats any camera mic.",
      "Choose 5-8 'hero sounds' in your process and build the edit around them, cutting picture to sound rather than the reverse.",
      "Mix diegetic sound 20-30% louder than feels natural; restraint is for the visuals, not the audio.",
      "Skip music entirely or duck it far under the texture — competing layers kill the effect.",
      "Caption with a headphone cue: a small note that says listen with sound."
    ],
    fitsIf: "Your craft has inherent audio texture — food, fashion, cars, barbering, packaging, workshops.",
    skipIf: "Your process is silent or your recording environment is uncontrollably noisy.",
    example: "A bespoke tailor films a fitting with the mic on the fabric: shears through wool, chalk strokes, the zip of the tape measure, pins into canvas. No music, no voice. The comment section is entirely people saying they watched it four times."
  },
  {
    id: "tr-14",
    name: "Early Trending-Audio Adoption",
    type: "sound",
    status: "evergreen",
    platforms: ["TikTok", "Instagram"],
    description: "The mechanic of catching a rising sound in its growth window — typically under 30k uses — and mapping your niche onto it before saturation.",
    whyItWorks: "Platforms actively push content using audio they're promoting, because sounds are a discovery surface — viewers tap a sound to see more. Riding a sound early means competing with hundreds of videos instead of hundreds of thousands, and familiar audio lowers the viewer's processing cost: they already know the rhythm, so your twist on it lands faster.",
    adapt: [
      "Scroll your niche's feed for 10 minutes daily; save any sound you hear twice with an upward-arrow trending badge.",
      "Check use count — the window is roughly 5k-30k uses; past 100k you're late.",
      "Map the sound's structural beat (the drop, the punchline, the pause) onto a moment from your business.",
      "Ship within 24-48 hours of spotting it; velocity is the entire edge.",
      "Never force it — a sound with no natural mapping to your niche is a skip, not a stretch."
    ],
    fitsIf: "You can produce fast and your brand tolerates a playful register alongside authority content.",
    skipIf: "Your approval chain takes a week — a trending sound cleared by committee arrives embalmed.",
    example: "A jet-charter brand catches a rising 'anticipation build' sound at 12k uses and maps the drop to cabin doors opening on the tarmac at sunset. Same-day shoot, same-day post, and the sound page funnels curious viewers straight to their profile for a week."
  },
  {
    id: "tr-15",
    name: "The Photo-Dump Carousel",
    type: "format",
    status: "evergreen",
    platforms: ["Instagram"],
    description: "A 10-20 slide carousel of loosely curated moments — candids, details, screenshots, one imperfect frame on purpose — that reads like a camera roll, not a campaign.",
    whyItWorks: "Carousels earn a second impression: if a viewer doesn't swipe, Instagram often reserves the post with the next slide, doubling the at-bats. The casual aesthetic signals intimacy — 'you're seeing the unedited version' — which builds parasocial closeness polished grids can't. Every swipe is an engagement event, and 10 swipes from one viewer is a loud quality signal.",
    adapt: [
      "Lead with the second-best image; hold the best for slide 3-4 so early swipes get rewarded.",
      "Mix registers deliberately: two candids, one detail macro, one screenshot, one text-note slide, one behind-the-scenes.",
      "Write the caption as a diary entry or numbered slide-by-slide key.",
      "Include exactly one 'imperfect' frame — motion blur, off-center — as an authenticity anchor.",
      "End on a slide with a question or save-prompt; the last slide is CTA real estate."
    ],
    fitsIf: "You post polished content already and need a format that humanizes the brand between campaigns.",
    skipIf: "Every image you have is studio-grade — a photo dump of perfect photos is just a slow ad.",
    example: "A luxury interior studio dumps a project month: a marble slab in the warehouse, a napkin sketch, two install candids, a client text screenshot ('I actually gasped'), the finished room, and a final slide reading 'Projects for autumn: 2 spots.'"
  },
  {
    id: "tr-16",
    name: "Episodic Series Architecture",
    type: "strategy",
    status: "evergreen",
    platforms: ["TikTok", "YouTube", "Instagram"],
    description: "Numbered, recurring content with a consistent title card and premise — 'Cold Calling Strangers, Ep. 14' — engineered so each episode advertises the whole catalog.",
    whyItWorks: "Series convert single views into binge sessions: a viewer who likes episode 14 backfills the archive, and binge behavior is a massive session-time signal. The numbered format manufactures appointment viewing and gives the algorithm a clean cluster to recommend as a unit. It also solves the creator's hardest problem — deciding what to make — by turning ideation into iteration.",
    adapt: [
      "Choose a premise with natural episodic fuel: a build, a challenge with a counter, a recurring segment.",
      "Lock the packaging — same title formula, same opening 2-second visual signature, same episode number placement.",
      "Open every episode with a 3-second premise recap for first-time viewers; never assume context.",
      "Number visibly and reference the series in captions so newcomers know there's a catalog.",
      "Commit to 10 episodes before judging — series compound late, not early."
    ],
    fitsIf: "You can sustain a premise weekly and want followers rather than one-off viewers.",
    skipIf: "You abandon formats quickly — a dead series at episode 3 is more visible than no series at all.",
    example: "A business broker runs 'Buying Businesses With Strangers' — each episode reviews one real listing from a marketplace, scores it against his 5-point framework, and ends with 'buy, pass, or negotiate.' Episode 9 sends viewers back to episode 1."
  },
  {
    id: "tr-17",
    name: "The Match-Cut Transition Chain",
    type: "editing",
    status: "evergreen",
    platforms: ["Instagram", "TikTok"],
    description: "A sequence of edits where an object, gesture, or shape in one shot becomes the bridge into the next — a closing car door becomes a closing laptop becomes a closing deal folder.",
    whyItWorks: "Match cuts exploit continuity expectation: the brain predicts the motion completing and gets rewarded when it completes somewhere new. That micro-surprise fires on every cut, making the edit itself the entertainment. Well-executed chains get shared as craft — editors and creators send them to each other, and shares to niche insiders seed high-value distribution.",
    adapt: [
      "Storyboard the chain backwards from your final frame; match cuts are planned on paper, not found in the timeline.",
      "Match one element per cut — position in frame, direction of motion, or silhouette — and keep it consistent.",
      "Shoot each bridge action twice: the outgoing motion and the incoming motion, with overlap to trim.",
      "Cut on the exact frame of peak motion; even two frames of hesitation breaks the spell.",
      "Limit the chain to 4-6 cuts — past that, the novelty flattens."
    ],
    fitsIf: "You or your editor can plan shots and you want content that showcases production craft as brand signal.",
    skipIf: "You need volume this month — match-cut chains cost 5x normal edit time for one post.",
    example: "A luxury fashion house chains a silk scarf pulled off a rack into a curtain sweeping open into a car cover sliding off a coupe into the same silk knotted at the collar — four matches, twelve seconds, one campaign line at the end."
  },
  {
    id: "tr-18",
    name: "Three-Minute Shorts & the Mini-Doc",
    type: "format",
    status: "rising",
    platforms: ["YouTube Shorts", "TikTok"],
    description: "Vertical short-form stretched toward its new ceiling — 2-3 minute documentary-style pieces with narration, chapters, and an actual arc, sitting between a Short and a video.",
    whyItWorks: "Platforms extended short-form duration limits because longer verticals hold users in-app longer; total-watch-time-per-impression now competes with completion rate as the ranking currency. A 2-minute vertical that holds 60% delivers far more absolute watch time than a 30-second clip at 90%, and the doc register signals substance that pure clip content can't.",
    adapt: [
      "Structure in chapters: cold-open hook, 15-second setup, three escalating beats, a paid-off ending.",
      "Re-hook every 25-30 seconds with a mini open loop — treat it as four chained Shorts.",
      "Write narration like a doc VO: present tense, concrete nouns, no throat-clearing.",
      "Reserve the format for stories that earn the length; pad a 60-second idea to 3 minutes and the retention curve will convict you.",
      "Use a J-cut into each new chapter — let the next scene's audio lead the picture by half a second."
    ],
    fitsIf: "You have genuine stories with stakes — deals, builds, turnarounds — and can write narration.",
    skipIf: "Your content is tips and reactions; those still win at 30-45 seconds.",
    example: "A restoration shop runs a 2:40 vertical mini-doc: 'This 1967 barn find was worth $400k. The owner didn't know.' Discovery, inspection beats, the valuation call as the climax, and a quiet final shot of the car on the lift."
  },
  {
    id: "tr-19",
    name: "Search-First Content (Social SEO)",
    type: "strategy",
    status: "peak",
    platforms: ["TikTok", "YouTube", "Instagram"],
    description: "Engineering content to rank in-app search — younger users search TikTok and Instagram before Google — by matching titles, on-screen text, and spoken words to literal query phrasing.",
    whyItWorks: "Search traffic inverts the feed's decay curve: instead of 48 hours of distribution, a ranked video compounds for months, surfacing at the exact moment of intent. Platforms index spoken audio, on-screen text, and captions, so keyword alignment across all three is a genuine ranking lever — and search viewers convert harder because they arrived with a problem, not a thumb-flick.",
    adapt: [
      "Mine the search bar's autocomplete in your niche; the suggestions are demand data in plain sight.",
      "Say the exact query out loud in the first 3 seconds, put it on screen verbatim, and repeat it in the caption.",
      "Build answer-shaped content: one query, one complete answer, no detours.",
      "Cover a query cluster with separate videos rather than one omnibus — each phrasing is its own doorway.",
      "Revisit rankings monthly; refresh winners with updated versions that link back via comments or series."
    ],
    fitsIf: "Your niche has evergreen how-to and cost/comparison demand — real estate, finance, fitness, services.",
    skipIf: "Your content is entertainment or trend-dependent; nobody searches for a vibe.",
    example: "A real-estate agent builds a search cluster: 'how much do you need to buy a house in Miami,' 'Miami closing costs explained,' 'first-time buyer mistakes Miami.' Each video opens by speaking the query verbatim; six months later they're still the top results, feeding two-a-week DMs."
  },
  {
    id: "tr-20",
    name: "Comment-to-DM Automation Funnels",
    type: "platform",
    status: "peak",
    platforms: ["Instagram"],
    description: "The 'comment WORD and I'll send it to you' mechanic: a keyword comment triggers an automated DM delivering a lead magnet, link, or offer directly in the inbox.",
    whyItWorks: "It converts a passive view into three compounding events — a comment (ranking fuel), a DM thread (Instagram weights DM relationships heavily in feed and story ranking), and a captured lead. The keyword also acts as a micro-commitment: typing the word is a self-selected raise of the hand, so the DM list it builds is warmer than any email pop-up.",
    adapt: [
      "Create a lead magnet that completes the video's promise — the checklist, the template, the exact script mentioned.",
      "Choose a one-word trigger that echoes the content ('AUDIT', 'BLUEPRINT'), never a generic 'INFO'.",
      "Set up the automation through an official API tool, then test the flow from a friend's account before posting.",
      "Write the DM like a person: deliver the asset first, then one question that starts a real conversation.",
      "Cap the mechanic at roughly one in four posts — every-post harvesting reads as a vending machine."
    ],
    fitsIf: "You have an offer, a lead list to build, and assets worth requesting.",
    skipIf: "You have nothing to deliver yet — an automation funnel pointed at no offer just burns goodwill.",
    example: "A sales consultant posts an objection-handling breakdown and says 'comment SCRIPT and I'll DM you the full word-for-word framework.' 1,400 comments feed the automation; the follow-up question in the DM — 'what do you sell?' — books 22 discovery calls that week."
  },
  {
    id: "tr-21",
    name: "The Anti-Polish Correction",
    type: "strategy",
    status: "rising",
    platforms: ["TikTok", "Instagram", "LinkedIn"],
    description: "A deliberate swing away from produced content: front-camera monologues, unedited single takes, visible mess, native captions — authenticity as an aesthetic position.",
    whyItWorks: "As AI-generated and agency-polished content floods feeds, production value stops signaling effort and starts signaling advertising — the scroll-past reflex now keys on gloss. Lo-fi delivery reads as unmediated, which borrows the trust codes of a video call from a friend. The catch: the polish leaves, but the writing can't — anti-polish is a production choice, never a preparation choice.",
    adapt: [
      "Keep the thinking sharp and the container rough: scripted structure delivered conversationally in one take.",
      "Shoot front camera, natural light, real environment — the office mess stays in frame.",
      "Use native text and captions rather than motion graphics.",
      "Preserve one imperfection per video — a pause, a laugh, a restart — as the authenticity signature.",
      "Alternate registers: lo-fi for ideas and takes, produced for proof and portfolio."
    ],
    fitsIf: "Your value is judgment and ideas, and your audience is fatigued by ad-shaped content.",
    skipIf: "You sell visual craft — a videographer posting rough content is arguing against their own invoice.",
    example: "A luxury brand strategist parks the tripod era: 60-second front-camera takes from the car after client meetings, one idea each, zero b-roll. Engagement triples because it feels like intel from a friend, not a campaign."
  },
  {
    id: "tr-22",
    name: "The LinkedIn Video Land Grab",
    type: "platform",
    status: "rising",
    platforms: ["LinkedIn"],
    description: "LinkedIn's push into a dedicated vertical video feed — short-form professional content competing in an arena where most B2B players still post text and stock graphics.",
    whyItWorks: "Every platform overpays early adopters of the format it's betting on, and LinkedIn is distributing video aggressively while supply is thin — the exact arbitrage TikTok offered in 2019 and Reels in 2020. Competition density is a fraction of TikTok's, the audience arrives with commercial intent, and a face on camera compounds trust in a feed built on resumes.",
    adapt: [
      "Repurpose your sharpest talking-head content, but re-hook it for a professional lens — outcomes, numbers, career stakes.",
      "Keep it native: upload directly, use LinkedIn captions, and open with the insight rather than a channel intro.",
      "Target 45-90 seconds with one business-relevant idea per video.",
      "Post 2-3 videos weekly alongside text posts; the formats cross-promote each other in profile visits.",
      "Anchor each video to a first-comment CTA — LinkedIn's algorithm rewards comment depth over reactions."
    ],
    fitsIf: "You sell B2B, consulting, or high-ticket services and already have short-form reps from other platforms.",
    skipIf: "Your buyer genuinely never opens LinkedIn — arbitrage on an empty room is still an empty room.",
    example: "A commercial-property advisor ports his best 60-second market breakdowns to LinkedIn with re-cut hooks ('Office vacancies just did something nobody predicted'). Ninety days in, video drives more inbound than five years of text posts — because almost no competitor is on camera yet."
  }
];
