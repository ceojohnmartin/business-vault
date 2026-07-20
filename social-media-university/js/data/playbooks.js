// Generator playbooks — powers the offline AI Content Creator tools.
// Spec: docs/CONTENT-SPEC.md section 6. Every template usable verbatim.
window.SMU_DATA = window.SMU_DATA || { schools: [] };

SMU_DATA.playbooks = {

  // ── 120 hooks ─────────────────────────────────────────────────────────────
  // cat: curiosity|status|fear|desire|controversy|tutorial|story|proof
  hooks: [
    // curiosity (15)
    { t: "Nobody talks about this part of {topic} — and it's the part that decides everything", cat: "curiosity", niches: ["creator", "business"] },
    { t: "I found the one thing every viral {niche} video has in common", cat: "curiosity", niches: ["creator", "business"] },
    { t: "This is the {topic} secret people charge {number}k to teach", cat: "curiosity", niches: ["business", "sales"] },
    { t: "Wait for what happens at second {number}", cat: "curiosity", niches: ["creator", "lifestyle"] },
    { t: "There's a reason your {topic} isn't working — and it's not what you think", cat: "curiosity", niches: ["creator", "fitness"] },
    { t: "The weirdest thing happened when I stopped posting for {timeframe}", cat: "curiosity", niches: ["creator"] },
    { t: "I asked {number} millionaires the same question. One answer kept coming back.", cat: "curiosity", niches: ["business", "luxury"] },
    { t: "You've been opening your videos wrong. Here's the frame-one fix.", cat: "curiosity", niches: ["creator"] },
    { t: "The algorithm isn't hiding your content. Something else is.", cat: "curiosity", niches: ["creator", "business"] },
    { t: "What {number} hours of studying viral {niche} videos taught me in 60 seconds", cat: "curiosity", niches: ["creator", "business"] },
    { t: "Everyone copied the trend. Nobody noticed the real reason it worked.", cat: "curiosity", niches: ["creator", "fashion"] },
    { t: "Open your camera roll. The best content you'll post this month is already in it.", cat: "curiosity", niches: ["lifestyle", "travel", "creator"] },
    { t: "This one-sentence change doubled my watch time overnight", cat: "curiosity", niches: ["creator"] },
    { t: "The part of {topic} they cut out of every tutorial", cat: "curiosity", niches: ["creator", "food"] },
    { t: "I can tell how far your account will go from one thing on your profile", cat: "curiosity", niches: ["creator", "business"] },

    // status (15)
    { t: "POV: you walk in and you're already the {niche} person everyone follows", cat: "status", niches: ["creator", "lifestyle"] },
    { t: "Old money doesn't post like this — and that's exactly why it works", cat: "status", niches: ["luxury", "fashion"] },
    { t: "The difference between a $500 client and a $50,000 client is this one sentence", cat: "status", niches: ["business", "sales"] },
    { t: "How to look like a {number}-person team when it's just you and a phone", cat: "status", niches: ["creator", "business"] },
    { t: "Rich people don't buy {topic}. They buy what it says about them.", cat: "status", niches: ["luxury", "sales", "cars"] },
    { t: "This is what a personal brand worth {number}k a month actually looks like", cat: "status", niches: ["business", "creator"] },
    { t: "You don't need a Rolex to signal taste. You need this.", cat: "status", niches: ["luxury", "fashion"] },
    { t: "First class isn't a seat. It's a content strategy.", cat: "status", niches: ["travel", "luxury"] },
    { t: "Quiet luxury, loud results: the {niche} aesthetic that sells without selling", cat: "status", niches: ["luxury", "realestate"] },
    { t: "Why the best in {niche} never post daily — and still own the feed", cat: "status", niches: ["luxury", "business"] },
    { t: "Dress the set, not just yourself — instant authority on camera", cat: "status", niches: ["creator", "business"] },
    { t: "The {number} status cues that make strangers assume you're the expert", cat: "status", niches: ["business", "sales"] },
    { t: "Stop posting like a fan. Start posting like the person they study.", cat: "status", niches: ["creator", "fitness"] },
    { t: "Your competitors post content. You're about to post proof of taste.", cat: "status", niches: ["luxury", "fashion", "realestate"] },
    { t: "This is how {niche} authorities open videos — and why you instantly trust them", cat: "status", niches: ["business", "creator"] },

    // fear (15)
    { t: "You're one weak hook away from the algorithm forgetting you exist", cat: "fear", niches: ["creator"] },
    { t: "If your first 3 seconds look like this, you've already lost the viewer", cat: "fear", niches: ["creator", "business"] },
    { t: "Delete this from your captions before it kills your reach", cat: "fear", niches: ["creator", "lifestyle"] },
    { t: "The posting mistake quietly capping you at {number} views", cat: "fear", niches: ["creator"] },
    { t: "Your niche gets crowded in {timeframe}. Here's how to move first.", cat: "fear", niches: ["business", "realestate", "fitness"] },
    { t: "Nobody will tell you why your engagement dropped. I will.", cat: "fear", niches: ["creator"] },
    { t: "Stop. That trending sound is about to date your entire feed.", cat: "fear", niches: ["creator", "fashion"] },
    { t: "The follower-count trap that's bleeding creators dry", cat: "fear", niches: ["creator", "business"] },
    { t: "If you can't answer this one question, your content strategy is a coin flip", cat: "fear", niches: ["business", "creator"] },
    { t: "Posting daily with no system is how accounts die in silence", cat: "fear", niches: ["creator"] },
    { t: "This 'harmless' editing habit is training viewers to swipe away", cat: "fear", niches: ["creator"] },
    { t: "Your best video flopped for a reason — and it wasn't the content", cat: "fear", niches: ["creator"] },
    { t: "The {niche} market doesn't punish bad content. It punishes forgettable content.", cat: "fear", niches: ["business", "realestate", "sales"] },
    { t: "Every day you don't post, someone louder takes your spot", cat: "fear", niches: ["creator", "business"] },
    { t: "You have about {timeframe} before this format stops working. Use it.", cat: "fear", niches: ["creator"] },

    // desire (15)
    { t: "Imagine posting {number} times a week and never running out of ideas", cat: "desire", niches: ["creator", "business"] },
    { t: "What {goal} actually feels like — and the shortest path there", cat: "desire", niches: ["fitness", "business", "creator"] },
    { t: "One reel. {number} inbound leads. Zero ad spend. Here's the anatomy.", cat: "desire", niches: ["business", "realestate", "sales"] },
    { t: "The {timeframe} content system that runs while you live your life", cat: "desire", niches: ["creator", "lifestyle"] },
    { t: "You're {number} good videos away from a completely different life", cat: "desire", niches: ["creator", "fitness"] },
    { t: "This is the calm of knowing exactly what to post tomorrow", cat: "desire", niches: ["creator", "lifestyle"] },
    { t: "Build it once, post it forever: the evergreen {topic} engine", cat: "desire", niches: ["business", "creator"] },
    { t: "The DM you'll get when your content finally clicks: 'how much do you charge?'", cat: "desire", niches: ["business", "sales", "creator"] },
    { t: "From invisible to invited: how {niche} creators start getting flown out", cat: "desire", niches: ["travel", "fashion", "creator"] },
    { t: "A phone, a window, and {timeframe} a day — everything you need to {goal}", cat: "desire", niches: ["creator", "lifestyle"] },
    { t: "Your dream client is scrolling right now. This is the video that stops them.", cat: "desire", niches: ["business", "realestate", "sales"] },
    { t: "What if every post pulled leads for {timeframe} instead of 24 hours?", cat: "desire", niches: ["business", "sales"] },
    { t: "The moment strangers start quoting your content back to you", cat: "desire", niches: ["creator", "business"] },
    { t: "Turn one filming day into {number} pieces of content — full breakdown", cat: "desire", niches: ["creator", "business"] },
    { t: "This is the video that turns followers into buyers while you sleep", cat: "desire", niches: ["business", "sales"] },

    // controversy (15)
    { t: "Posting every day is ruining your account. I'll die on this hill.", cat: "controversy", niches: ["creator"] },
    { t: "Hot take: your {niche} content flops because it's too polished", cat: "controversy", niches: ["luxury", "creator", "business"] },
    { t: "Engagement pods are a scam — and everyone in one already knows it", cat: "controversy", niches: ["creator", "business"] },
    { t: "Unpopular opinion: hashtags haven't mattered for years", cat: "controversy", niches: ["creator"] },
    { t: "Your 'value content' is the reason nobody follows you", cat: "controversy", niches: ["business", "creator"] },
    { t: "The gurus are wrong about {topic} — their own analytics prove it", cat: "controversy", niches: ["business", "creator"] },
    { t: "Stop niching down. It's the worst advice in {niche} right now.", cat: "controversy", niches: ["creator", "business"] },
    { t: "Trending audio is a crutch, and the retention data backs me up", cat: "controversy", niches: ["creator"] },
    { t: "I'd rather have {number} true fans than 100k dead followers — so would your bank account", cat: "controversy", niches: ["creator", "business"] },
    { t: "Follower count is a vanity metric. Watch time pays the bills.", cat: "controversy", niches: ["creator", "business"] },
    { t: "Most {niche} advice is recycled from 2019. Here's what's true now.", cat: "controversy", niches: ["fitness", "business", "creator"] },
    { t: "Your editing is too good. Yes, that's a problem.", cat: "controversy", niches: ["creator"] },
    { t: "Going viral is the worst thing that can happen to an unprepared account", cat: "controversy", niches: ["creator"] },
    { t: "Faceless pages are eating personal brands for breakfast. Deal with it.", cat: "controversy", niches: ["creator", "business"] },
    { t: "The 'post and pray' crowd is going to hate this one", cat: "controversy", niches: ["creator", "business"] },

    // tutorial (15)
    { t: "How to write a hook in 30 seconds using the {number}-word rule", cat: "tutorial", niches: ["creator", "business"] },
    { t: "The exact camera settings I use for every {niche} shoot", cat: "tutorial", niches: ["cars", "realestate", "food"] },
    { t: "Copy this posting schedule if you only have {number} hours a week", cat: "tutorial", niches: ["business", "creator"] },
    { t: "3 CapCut moves that make phone footage look cinematic", cat: "tutorial", niches: ["creator", "travel"] },
    { t: "How to batch {number} videos in one afternoon — full walkthrough", cat: "tutorial", niches: ["creator", "business"] },
    { t: "The caption formula that turns viewers into commenters, step by step", cat: "tutorial", niches: ["creator", "business"] },
    { t: "Do this to your lighting before you ever press record", cat: "tutorial", niches: ["creator", "fashion"] },
    { t: "How I research {topic} content ideas in 10 minutes flat", cat: "tutorial", niches: ["creator", "business"] },
    { t: "Turn one long video into {number} clips: the exact chopping method", cat: "tutorial", niches: ["creator", "business"] },
    { t: "The 5-shot sequence that makes any {niche} b-roll look expensive", cat: "tutorial", niches: ["cars", "luxury", "food"] },
    { t: "How to end your videos so people actually follow", cat: "tutorial", niches: ["creator"] },
    { t: "Set up your profile like a landing page in {number} minutes", cat: "tutorial", niches: ["business", "creator"] },
    { t: "The teleprompter-free way to sound natural on camera", cat: "tutorial", niches: ["creator", "business"] },
    { t: "Find your content pillars with one page and {number} minutes", cat: "tutorial", niches: ["creator", "business"] },
    { t: "Shoot it once, post it everywhere: the cross-posting workflow", cat: "tutorial", niches: ["creator", "business"] },

    // story (15)
    { t: "POV: you finally {goal} and nobody claps", cat: "story", niches: ["business", "fitness"] },
    { t: "I posted every day for {timeframe}. Here's what nobody warns you about.", cat: "story", niches: ["creator"] },
    { t: "A stranger recognized me from one video. That's when it got real.", cat: "story", niches: ["creator", "lifestyle"] },
    { t: "I deleted {number} videos and my account started growing. Let me explain.", cat: "story", niches: ["creator"] },
    { t: "My worst video outperformed my best one. The reason changed how I post.", cat: "story", niches: ["creator"] },
    { t: "Day one: {number} followers and a shaky phone clip. Here's day 365.", cat: "story", niches: ["creator", "fitness"] },
    { t: "The client who fired me taught me more about {topic} than any course", cat: "story", niches: ["business", "sales"] },
    { t: "I copied a viral format beat for beat. It flopped. Here's the lesson.", cat: "story", niches: ["creator"] },
    { t: "Everyone said {niche} was saturated. I posted anyway.", cat: "story", niches: ["fitness", "realestate", "creator"] },
    { t: "The DM that changed my business came from a video I almost deleted", cat: "story", niches: ["business", "creator"] },
    { t: "I burned out at {number} posts a week. This is the system that saved me.", cat: "story", niches: ["creator", "lifestyle"] },
    { t: "Three years ago I couldn't hold a camera steady. Yesterday a brand called.", cat: "story", niches: ["creator", "travel"] },
    { t: "The night my video passed a million views, I learned what actually matters", cat: "story", niches: ["creator"] },
    { t: "I gave myself {timeframe} to make content work. This was the plan.", cat: "story", niches: ["creator", "business"] },
    { t: "My first {number} videos were terrible. Thank god I posted them.", cat: "story", niches: ["creator"] },

    // proof (15)
    { t: "{number} views in {timeframe} — here's the exact post, unedited", cat: "proof", niches: ["creator", "business"] },
    { t: "This hook took my average watch time from 3 seconds to 19", cat: "proof", niches: ["creator"] },
    { t: "I tested {number} thumbnails on the same video. The winner surprised me.", cat: "proof", niches: ["creator"] },
    { t: "Screenshot receipts: what changed when I fixed my first 3 seconds", cat: "proof", niches: ["creator"] },
    { t: "Same video, two captions, {number}x difference in saves. Here's why.", cat: "proof", niches: ["creator", "business"] },
    { t: "We ran this format {number} times. It cleared 100k views every single time.", cat: "proof", niches: ["creator", "business"] },
    { t: "The analytics don't lie: this is the exact second your viewers leave", cat: "proof", niches: ["creator"] },
    { t: "My client went from unknown to booked out in {timeframe} with one format", cat: "proof", niches: ["business", "realestate", "sales"] },
    { t: "Watch the retention graph spike the moment the pattern interrupt hits", cat: "proof", niches: ["creator"] },
    { t: "I tracked {number} viral {niche} videos. Most opened the exact same way.", cat: "proof", niches: ["creator", "fitness", "cars"] },
    { t: "Before: 200 views. After this one change: {number}. Nothing else touched.", cat: "proof", niches: ["creator"] },
    { t: "This carousel got saved {number}x more than my reels. Breakdown inside.", cat: "proof", niches: ["business", "creator"] },
    { t: "Posted at 7am vs 7pm, same video — the results end the debate", cat: "proof", niches: ["creator"] },
    { t: "Zero followers, {number} videos, one rule — here's the growth curve", cat: "proof", niches: ["creator", "fitness"] },
    { t: "The three-line caption that outsold my entire email list", cat: "proof", niches: ["business", "sales"] }
  ],

  // ── 88 content ideas — 8 per niche ────────────────────────────────────────
  // format: talking-head|voiceover-broll|pov|tutorial|vlog|carousel|text-on-screen
  ideas: [
    // luxury (8)
    { idea: "Silent morning in a five-star suite — no talking, only diegetic sound: espresso pour, curtain pull, watch clasp. Hold every action a beat longer than feels natural; end on the skyline reveal.", niche: "luxury", format: "pov", platform: "Instagram" },
    { idea: "'What $40 vs $400 vs $4,000 gets you' — same category (dinner, hotel night, watch service), three tiers, hard cut on a price card between each. Save the highest tier's best detail for the final 5 seconds.", niche: "luxury", format: "voiceover-broll", platform: "TikTok" },
    { idea: "Rank five luxury brand codes — packaging, scent, typography, silence, service — and explain why old money never explains itself. One cut per code, finger-count on screen.", niche: "luxury", format: "talking-head", platform: "YouTube Shorts" },
    { idea: "Carousel: '9 details that quietly signal luxury in your content' — negative space, serif type, muted grade, slow pacing, natural materials. One example frame per slide, verdict on the last.", niche: "luxury", format: "carousel", platform: "Instagram" },
    { idea: "A day with a private concierge: what actually happens behind the scenes — calls being made, cars arriving, a table reset twice before the guest lands. Respectful, access-driven, no client faces.", niche: "luxury", format: "vlog", platform: "YouTube" },
    { idea: "Text-on-screen over slow hotel-lobby footage: 'Luxury is not the price. It is the absence of friction.' Three lines, three beats, letters fading in with the music swell.", niche: "luxury", format: "text-on-screen", platform: "Instagram" },
    { idea: "Tutorial: shoot a watch like a campaign ad with one phone, one desk lamp, and a black t-shirt as the backdrop — macro mode, specular highlight on the crystal, slow 10-degree rotation.", niche: "luxury", format: "tutorial", platform: "TikTok" },
    { idea: "POV: your first business-class flight — hands-only shots: boarding pass, champagne flute, the lie-flat button, window shade at cruise altitude. No face, no voiceover, one caption line.", niche: "luxury", format: "pov", platform: "TikTok" },

    // cars (8)
    { idea: "Cold-start POV at sunrise: key in hand, door thunk, exhaust note echoing through an empty parking garage. No music until the first rev — then the beat drops with the throttle.", niche: "cars", format: "pov", platform: "TikTok" },
    { idea: "Voiceover breakdown: 'Why this $30k car photographs like a $300k car' — low front three-quarter angle, foreground occlusion through leaves, golden hour only, reflections managed with position not filters.", niche: "cars", format: "voiceover-broll", platform: "Instagram" },
    { idea: "Tutorial: the 6-shot rolling-shot sequence you can film from a passenger seat with a phone and a gimbal — wheel spin, badge pan, driver profile, mirror pull, low pavement blur, hero wide.", niche: "cars", format: "tutorial", platform: "YouTube Shorts" },
    { idea: "Full paint correction compressed into 60 seconds: macro swirl marks to mirror-finish reveal, cut on every wipe, satisfying foam and towel sounds boosted in the mix.", niche: "cars", format: "vlog", platform: "Instagram" },
    { idea: "Carousel: 'The 7 angles that sell a car online' — front three-quarter low, wheel detail, interior stitch close-up, dash at dusk, rear badge, engine bay, driver POV. One slide per angle with the why.", niche: "cars", format: "carousel", platform: "Instagram" },
    { idea: "'Things car salespeople say, translated' — hard cut between each line and what it actually means. Deadpan delivery, zoom punch-in on every translation.", niche: "cars", format: "talking-head", platform: "TikTok" },
    { idea: "Text-on-screen real-cost check: insurance, tires, depreciation counters ticking up over b-roll of the car carving a canyon road. Final card: the honest monthly number.", niche: "cars", format: "text-on-screen", platform: "YouTube Shorts" },
    { idea: "POV: you just got handed the keys to detail your dream client's Porsche — the walk-around inspection, the nervous first drive to the wash bay, gloves on, checklist out.", niche: "cars", format: "pov", platform: "TikTok" },

    // realestate (8)
    { idea: "'What $1M buys you in three different cities' — same budget, three walkthrough clips, price-card transitions, one honest pro and con per property. End on 'which one would you pick?'", niche: "realestate", format: "voiceover-broll", platform: "TikTok" },
    { idea: "Talking-head from the kitchen island: '3 things I check in the first 5 minutes of any showing' — cut to an insert shot the moment you name each one: water pressure, panel age, floor slope.", niche: "realestate", format: "talking-head", platform: "Instagram" },
    { idea: "One continuous gimbal take: door-open reveal, glide through the hallway, save the best room and the view for the final 4 seconds. No cuts — the single take is the flex.", niche: "realestate", format: "pov", platform: "Instagram" },
    { idea: "Carousel: 'The listing photo order that gets more showings' — hero exterior first, kitchen by slide 3, bathrooms never first, twilight shot as the closer. Real listing examples, annotated.", niche: "realestate", format: "carousel", platform: "Instagram" },
    { idea: "Tutorial: shoot an entire listing with just a phone — expose for the windows, corners at knee height, vertical panorama for tall rooms, 0.5x lens only in large spaces.", niche: "realestate", format: "tutorial", platform: "YouTube Shorts" },
    { idea: "Day-in-the-life, unfiltered: 6am gym, 8am inspection, a deal dies at noon, a signed offer at 6pm. Honest, not highlight-reel — the lost deal is the retention engine.", niche: "realestate", format: "vlog", platform: "YouTube" },
    { idea: "Text-on-screen myth-buster over walkthrough b-roll: 'You don't need 20% down' — then the actual first-time-buyer programs and real numbers, one card per beat.", niche: "realestate", format: "text-on-screen", platform: "TikTok" },
    { idea: "Storytime: the showing that went wrong — a pipe burst mid-tour — and why the way you handled it is what actually sold the house. Punch in on the turning point.", niche: "realestate", format: "talking-head", platform: "YouTube Shorts" },

    // fitness (8)
    { idea: "'Fix your form in 15 seconds' — side-by-side wrong vs right deadlift, red/green overlay, exactly one cue per rep: 'push the floor away.' Loopable ending back to the first frame.", niche: "fitness", format: "tutorial", platform: "TikTok" },
    { idea: "POV: the gym at 5am when it's empty — chalk dust drifting through window light, knurling close-up, the echo of the first rep. Minimal text: 'nobody claps at 5am. that's the point.'", niche: "fitness", format: "pov", platform: "Instagram" },
    { idea: "Myth-bust at the whiteboard: 'Cardio isn't killing your gains — this is' — then the actual recovery math: sleep hours, protein grams, weekly volume. One number circled per cut.", niche: "fitness", format: "talking-head", platform: "YouTube Shorts" },
    { idea: "Carousel: 'The 6 meals I actually eat at 2,800 calories' — real plates shot top-down in the same light, macros on each slide, grocery list on the last one.", niche: "fitness", format: "carousel", platform: "Instagram" },
    { idea: "75 days told in 60 seconds: same mirror, same time, same shorts — jump cut per week, date stamp in the corner, zero music until day 50, then it kicks in.", niche: "fitness", format: "vlog", platform: "TikTok" },
    { idea: "Voiceover-broll: 'What a rest day should actually look like' — the walk, the meal prep, the sauna, the sleep tracker close-up. Calm pacing that mirrors the message.", niche: "fitness", format: "voiceover-broll", platform: "Instagram" },
    { idea: "Text-on-screen over one heavy set: 'The set doesn't start until it hurts' — three lines timed to land exactly at the sticking point of the lift.", niche: "fitness", format: "text-on-screen", platform: "TikTok" },
    { idea: "Tutorial: a complete pull day with one dumbbell — five exercises, rep ranges on screen, filmed in a living room to prove the no-gym point.", niche: "fitness", format: "tutorial", platform: "YouTube Shorts" },

    // business (8)
    { idea: "Whiteboard breakdown: how a $10 product becomes a $100M brand — unit economics drawn live in 45 seconds, one marker, no cuts during the math. The no-cut math IS the credibility.", niche: "business", format: "talking-head", platform: "YouTube Shorts" },
    { idea: "Voiceover over your real workday: 'Nobody claps when you send the invoice' — the unglamorous truth of self-employment. Slow b-roll, honest narration, no hustle-porn music.", niche: "business", format: "voiceover-broll", platform: "Instagram" },
    { idea: "Carousel: 'The 5 emails that run my business' — outreach, follow-up, proposal, onboarding, referral ask. One real template per slide, blurred client names for proof.", niche: "business", format: "carousel", platform: "LinkedIn" },
    { idea: "POV: your first client call after quitting your job — shaky coffee, notes app open, the long pause before you say your price out loud. Text overlay carries the inner monologue.", niche: "business", format: "pov", platform: "TikTok" },
    { idea: "Tutorial: price your service in 10 minutes — cost floor, market anchor, value ceiling. Draw the three lines, pick above the middle, and stop apologizing.", niche: "business", format: "tutorial", platform: "Instagram" },
    { idea: "Storytime: the client I fired and the revenue that doubled afterward — including the exact two-sentence boundary script you can copy tonight.", niche: "business", format: "talking-head", platform: "TikTok" },
    { idea: "Text-on-screen over office b-roll: 'Revenue is vanity. Profit is sanity. Cash flow is oxygen.' One claim per beat, one real number under each.", niche: "business", format: "text-on-screen", platform: "LinkedIn" },
    { idea: "24 hours before launch: checklist anxiety, final payment-flow test, the refresh-refresh-refresh moment the first sale lands. Film the screen, not just your face.", niche: "business", format: "vlog", platform: "YouTube" },

    // sales (8)
    { idea: "Roleplay both sides of a cold call — split screen, you as rep and prospect. Freeze-frame on each objection, counter appears as text, then the scene resumes.", niche: "sales", format: "talking-head", platform: "TikTok" },
    { idea: "Carousel: '7 lines that kill deals (and what to say instead)' — one swap per slide, styled like text-message screenshots so they read instantly.", niche: "sales", format: "carousel", platform: "LinkedIn" },
    { idea: "'The discovery question that doubled my close rate' — tell the story of the exact deal it saved, then give the question word for word at the end. Classic open loop.", niche: "sales", format: "talking-head", platform: "Instagram" },
    { idea: "Tutorial: handle 'it's too expensive' in three moves — acknowledge, isolate, reframe — with word-for-word scripts on screen for each move.", niche: "sales", format: "tutorial", platform: "YouTube Shorts" },
    { idea: "POV: the silence after you state your price — eyes steady, clock ticking, don't fill the pause. Single text line: 'first one to talk loses.'", niche: "sales", format: "pov", platform: "TikTok" },
    { idea: "Voiceover over a real sales day: 47 dials, 3 conversations, 1 booked demo — the honest math of pipeline, narrated over car and desk b-roll with the tally on screen.", niche: "sales", format: "voiceover-broll", platform: "Instagram" },
    { idea: "Text-on-screen: 'People don't buy the drill. They buy the hole. Sell the finished wall.' — three-beat escalation over workshop b-roll, hold the last card.", niche: "sales", format: "text-on-screen", platform: "LinkedIn" },
    { idea: "Storytime: the deal I walked away from on purpose — the bad-fit client, the awkward call, and the bigger referral that came back six weeks later.", niche: "sales", format: "talking-head", platform: "YouTube Shorts" },

    // lifestyle (8)
    { idea: "Sunday reset with zero talking: sheets snapped, fridge restocked, planner spread, candle lit — every action's natural sound boosted to ASMR level, cuts landing on the beat.", niche: "lifestyle", format: "vlog", platform: "Instagram" },
    { idea: "POV: your 5-to-9 before the 9-to-5 — alarm, cold face wash, one journal line, gym bag by the door, sunrise commute. Fast cuts, warm grade, one text line at the end.", niche: "lifestyle", format: "pov", platform: "TikTok" },
    { idea: "Carousel: 'My 12 non-negotiables for a calm week' — one habit per slide, all photographed in the same soft morning light so the set feels like one system.", niche: "lifestyle", format: "carousel", platform: "Instagram" },
    { idea: "'The 8pm rule that fixed my sleep, skin, and mood' — a practical wind-down protocol delivered straight to camera, with the three steps as on-screen text.", niche: "lifestyle", format: "talking-head", platform: "TikTok" },
    { idea: "Voiceover: a week of tiny upgrades — better coffee, fresh flowers, phone charging outside the bedroom — 'romanticize the boring parts and the big parts follow.'", niche: "lifestyle", format: "voiceover-broll", platform: "Instagram" },
    { idea: "Tutorial: build a capsule morning routine in 20 real-time minutes — timer in the corner, every step timeboxed on screen, no fantasy 4am nonsense.", niche: "lifestyle", format: "tutorial", platform: "YouTube Shorts" },
    { idea: "Text-on-screen over golden-hour walking footage: 'You don't need a new life. You need a new default.' — one line per beat, last line held through the outro.", niche: "lifestyle", format: "text-on-screen", platform: "TikTok" },
    { idea: "Apartment tour: everything under $50 that made the space feel expensive — quick pans, price tag on screen for each item, total cost as the final card.", niche: "lifestyle", format: "vlog", platform: "YouTube" },

    // fashion (8)
    { idea: "Outfit transitions on the beat drop — use the doorway as a natural wipe, three fits, same pose, hold the final look two extra beats so it registers.", niche: "fashion", format: "pov", platform: "TikTok" },
    { idea: "Carousel: 'Build 10 outfits from 6 pieces' — flat lays on the same background, the combination formula written on each slide, capsule list on the last.", niche: "fashion", format: "carousel", platform: "Instagram" },
    { idea: "'Stylist rules I stole from tailors' — pinch the shoulder seam, check the trouser break at the shoe, sleeve to the wrist bone. One cut per rule, insert shot proving each.", niche: "fashion", format: "talking-head", platform: "YouTube Shorts" },
    { idea: "Tutorial: thrift like a reseller — fabric first, label second, silhouette third — filmed live in-store with the actual finds and what each would resell for.", niche: "fashion", format: "tutorial", platform: "TikTok" },
    { idea: "GRWM with voiceover: dressing for the pitch meeting — 'dress for the chair you want at the table' — narrated over cufflink, collar, and shoe-shine detail shots.", niche: "fashion", format: "voiceover-broll", platform: "Instagram" },
    { idea: "POV: the fitting-room mirror when the outfit finally works — slow push-in, the smile you can't hide, the price-tag flip as the punchline.", niche: "fashion", format: "pov", platform: "TikTok" },
    { idea: "Text-on-screen over street-style b-roll: 'Expensive-looking is a skill, not a budget' — five free upgrades (steam it, hem it, roll it, tuck it, one metal accent), one per beat.", niche: "fashion", format: "text-on-screen", platform: "Instagram" },
    { idea: "48 hours at fashion week from the standing section — the queues, the street snaps, one borrowed invite, and an honest recap of what it's actually like without front-row status.", niche: "fashion", format: "vlog", platform: "YouTube" },

    // food (8)
    { idea: "One-pan recipe shot 90% top-down: hands and pan only, hard cut on every sizzle, ingredient amounts as minimal text, full recipe pinned in the caption.", niche: "food", format: "tutorial", platform: "Instagram" },
    { idea: "POV: the first bite test of your own recipe — steam rising, the cheese pull, eyes flick to camera, verdict in exactly one word. The one-word restraint is the format.", niche: "food", format: "pov", platform: "TikTok" },
    { idea: "'What a restaurant kitchen sounds like at 6pm' — tickets printing, pans hitting flame, expo calling orders. Pure sound design over handheld kitchen b-roll, no music.", niche: "food", format: "voiceover-broll", platform: "YouTube Shorts" },
    { idea: "Carousel: '5 knife skills that cut prep time in half' — grip, rock chop, claw, bias cut, batonnet. One photo and one coaching cue per slide.", niche: "food", format: "carousel", platform: "Instagram" },
    { idea: "Myth-bust at the counter: 'Searing does not lock in juices — here's what it actually does' — side-by-side test on screen, scale-weighed results as the receipt.", niche: "food", format: "talking-head", platform: "YouTube Shorts" },
    { idea: "Feeding two people for $40 a week — receipts on screen, every meal shown, honest verdicts including the one dinner that failed. The failure earns the trust.", niche: "food", format: "vlog", platform: "YouTube" },
    { idea: "Text-on-screen over slow pour and drizzle shots: 'Salt early. Acid late. Taste always.' — the three rules, one per beat, logo-free and loopable.", niche: "food", format: "text-on-screen", platform: "TikTok" },
    { idea: "Tutorial: plate like a chef with a spoon and a squeeze bottle — the swipe, the cluster, height in the center, negative space on the rim. Before/after of the same dish.", niche: "food", format: "tutorial", platform: "TikTok" },

    // travel (8)
    { idea: "POV: landing somewhere you've never been — cabin window on descent, passport stamp thunk, first street sounds, first bite of street food. Four beats, no narration.", niche: "travel", format: "pov", platform: "TikTok" },
    { idea: "'48 hours in Tokyo for under $300' — running cost ticker on screen: trains, konbini meals, capsule hotel. End card shows the final total against the estimate.", niche: "travel", format: "voiceover-broll", platform: "YouTube Shorts" },
    { idea: "Carousel: 'The 8 apps that plan my entire trip' — one screenshot per slide with the exact use case and the one setting most people miss.", niche: "travel", format: "carousel", platform: "Instagram" },
    { idea: "'Flight attendant habits I stole for long-haul flights' — hydration math, seat strategy, the jetlag light-exposure protocol. Straight to camera with insert shots.", niche: "travel", format: "talking-head", platform: "TikTok" },
    { idea: "Tutorial: shoot cinematic travel b-roll completely alone — tripod walk-through shots, 0.5x doorway reveals, foreground framing through objects, and the 10-second timer trick.", niche: "travel", format: "tutorial", platform: "Instagram" },
    { idea: "Text-on-screen over sweeping location shots: 'The trip costs less than the excuses' — real flight and hostel prices appearing one per beat.", niche: "travel", format: "text-on-screen", platform: "TikTok" },
    { idea: "The travel day nobody posts: missed connection, airport floor, the rebooking line — and why it was still worth it. Honest anti-highlight-reel storytelling.", niche: "travel", format: "vlog", platform: "YouTube" },
    { idea: "'Tourist trap vs local spot' — same dish, same city, split-screen comparison, price and taste verdicts, hard cuts between the two tables.", niche: "travel", format: "voiceover-broll", platform: "Instagram" },

    // creator (8)
    { idea: "'I analyzed my 10 worst videos so you don't repeat them' — the flop autopsy: one flop, one on-screen takeaway, one fix. Self-deprecating but surgical.", niche: "creator", format: "talking-head", platform: "YouTube Shorts" },
    { idea: "Tutorial: the full phone-only filming setup under $150 — light, mic, mount — with exact placement: light 45 degrees off-axis, lens at eye level, mic out of frame at chest height.", niche: "creator", format: "tutorial", platform: "TikTok" },
    { idea: "Carousel: 'The content calendar I run as a solo creator' — batch day, edit day, engage day. One slide each with the actual hours blocked and what happens in them.", niche: "creator", format: "carousel", platform: "Instagram" },
    { idea: "POV: hitting record for take 27 — the hair fix, the sigh, the fake-smile reset. Text: 'nobody sees this part.' Relatability is the whole play.", niche: "creator", format: "pov", platform: "TikTok" },
    { idea: "Voiceover over an edit session: 'Your video wins or dies on the timeline' — waveforms, cut points, and the retention graph overlaid on the exact moments viewers left.", niche: "creator", format: "voiceover-broll", platform: "Instagram" },
    { idea: "Text-on-screen over desk b-roll: 'Post the video. The confidence comes after, not before.' — three beats, held final card, loop back to the first frame.", niche: "creator", format: "text-on-screen", platform: "TikTok" },
    { idea: "A full batch day: six videos filmed in four hours — outfit changes as scene markers, the shot list on screen, honest time-stamps including the slump at hour three.", niche: "creator", format: "vlog", platform: "YouTube" },
    { idea: "'How I'd grow from zero if I kept my knowledge but lost my followers' — the exact 90-day plan: one pillar, one format, one platform, 3 posts a week, weekly retention review.", niche: "creator", format: "talking-head", platform: "YouTube Shorts" }
  ],

  // ── 10 script frameworks ──────────────────────────────────────────────────
  scripts: [
    {
      name: "The Problem-Agitate-Reveal",
      structure: [
        "0-3s: Name the problem in the viewer's exact words — no greeting, no intro.",
        "3-10s: Agitate — show the cost of the problem with one vivid, specific consequence.",
        "10-20s: Tease the fix without giving it ('there's one change that fixes this').",
        "20-45s: Reveal the fix in 2-3 concrete steps, each one visual if possible.",
        "45-55s: Compress it into one memorable rule they can repeat.",
        "55-60s: Single CTA tied to the payoff, not to you."
      ],
      example: "Your reels die at 3 seconds and it's not the algorithm. Every day you post, you burn an idea a competitor will steal next month and run further with. The fix is one sentence. Before you film, write the caption's first line — that's your hook, spoken word for word to camera. Then cut everything before it. No 'hey guys,' no context. Rule: the video starts where the interesting part starts. Try it on your next post and comment 'HOOK' if you want ten more openers.",
      bestFor: "Educational content where the audience already feels the pain — coaching, fitness, business, creator tips."
    },
    {
      name: "The Open Loop Listicle",
      structure: [
        "0-3s: Promise a numbered list and flag one item as the twist ('number 4 feels illegal').",
        "3-8s: Item 1 — your second-strongest point, delivered fast to set the pace.",
        "8-30s: Items 2-3 — one line each, cut on every item, visual change per item.",
        "30-45s: The flagged item — slow down, punch in, give it double the screen time.",
        "45-60s: Final item plus a callback to the loop you opened, then CTA to save."
      ],
      example: "Five things that make phone footage look expensive — and number four feels like cheating. One: shoot at sunrise, the light does the grading for you. Two: wipe your lens, half of 'bad quality' is a smudge. Three: lock exposure before you hit record. Four: put something in the foreground — a doorway, a glass, a shoulder — instant depth, instant cinema. Five: slow your movements to half speed. Save this for your next shoot; you'll forget number three otherwise.",
      bestFor: "Tips content on TikTok and Reels where saves and rewatches are the goal."
    },
    {
      name: "The Contrarian Take",
      structure: [
        "0-3s: State the opposite of common advice as fact — no hedging.",
        "3-12s: Acknowledge why everyone believes the common advice (steelman it in one line).",
        "12-30s: Present your evidence — a number, a result, a named mechanism.",
        "30-50s: Give the replacement behavior — what to do instead, step by step.",
        "50-60s: Invite the fight: ask who disagrees and why."
      ],
      example: "Posting every day is shrinking your account. I know — consistency is king, everyone says it. But the algorithm distributes by average watch time, not by volume, and daily posting quietly drops your quality until your average tanks. Ranking follows your worst habits. Instead: three posts a week, each one rewritten twice and cut 20 percent shorter than feels safe. My reach tripled the month I halved my output. Disagree? Tell me in the comments — bring your retention graph.",
      bestFor: "Authority building and comment-driven reach; works best when you genuinely hold the position."
    },
    {
      name: "The Transformation Arc",
      structure: [
        "0-3s: Show the 'after' first — the result, the reveal, the payoff frame.",
        "3-10s: Hard cut to the 'before' — make the gap feel almost embarrassing.",
        "10-35s: The bridge — 2-3 turning points, each one a specific decision, not a montage cliche.",
        "35-50s: The honest cost — what it took, what you'd skip next time.",
        "50-60s: Hand the viewer step one of their own arc."
      ],
      example: "This clip got 2 million views. Here's the account eleven months ago: 41 followers, videos shot in a dark kitchen, me reading off a script like a hostage. Three things changed. I picked one topic and refused to leave it. I started cutting the first five seconds off every video — the interesting part was always buried. And I studied one viral video a day, frame by frame. Cost: two hundred bad takes and one deleted account. Your step one: pick the topic tonight.",
      bestFor: "Story-driven growth content, fitness journeys, business builds — anywhere before/after proof exists."
    },
    {
      name: "The Steal-My-System Sprint",
      structure: [
        "0-3s: 'Steal my exact system for X' — ownership transfer language, zero preamble.",
        "3-10s: Credential in one line — the result the system produced, stated plainly.",
        "10-45s: The system as 3-4 numbered steps, each with a tool, a time, or a template named.",
        "45-55s: The one mistake that breaks the system — insurance against failure.",
        "55-60s: CTA to comment a keyword for the written version."
      ],
      example: "Steal my exact batching system — six videos, four hours, every single Sunday. It's kept me posting daily for two years without burnout. Step one: Monday to Friday, dump ideas into one note, no judging. Step two: Sunday 9am, pick six and write only the hooks — 20 minutes. Step three: film in two outfits so it reads as different days. Step four: edit nothing on Sunday; editing is a Tuesday problem. The mistake that breaks it: skipping the hook-writing step. Comment 'BATCH' and I'll send the checklist.",
      bestFor: "Productivity, business, and creator-workflow content that converts viewers into leads via keyword comments."
    },
    {
      name: "The Myth Autopsy",
      structure: [
        "0-3s: Hold up the myth and call the time of death ('this advice needs to die').",
        "3-12s: Show the myth in the wild — quote it the way people actually say it.",
        "12-30s: Cut it open — explain the mechanism that proves it wrong, with one number.",
        "30-50s: Replace it — what the top 1% do instead, demonstrated not described.",
        "50-60s: One-line epitaph for the myth, then CTA to share with someone who still believes it."
      ],
      example: "'Post at 6pm, that's when engagement peaks' — this advice needs to die. You've seen the heat-map charts; I used to screenshot them too. Here's the mechanism: your post is tested on a small batch of followers first, and that test cares about how fast they watch, not what the clock says. A strong video posted at 4am beats a weak one at 'peak time' every single week — I've run it. What matters: hook strength and average watch time. Time of death for the myth: today. Send this to the friend still scheduling for 6pm.",
      bestFor: "Analytics and strategy content; positions you as the person who reads data instead of repeating it."
    },
    {
      name: "The Silent Demonstration",
      structure: [
        "0-3s: The most satisfying or intriguing action of the whole video, shown first.",
        "3-15s: Begin the process from the start — real sound only, boosted and crisp.",
        "15-40s: Escalate detail — tighter shots, faster cuts, every action completing on screen.",
        "40-55s: The reveal — the finished result, held for a full 3 seconds, no cut.",
        "55-60s: One caption line on screen does all the talking; loop back to frame one."
      ],
      example: "No spoken script — the text plan: open on the final espresso pour in macro. Cut to the empty machine. On-screen line one (at 5s): 'the $200 machine everyone says can't make cafe-quality shots.' Actions carry the middle: grind, tamp, lock, pull — each sound crisp, each cut on the action. Line two (at 40s): 'technique is the upgrade.' Hold the finished cup 3 full seconds. Final line: 'recipe in the caption.' The video loops cleanly back to the opening pour.",
      bestFor: "ASMR-leaning niches — food, detailing, luxury, crafts — and any creator who hates talking to camera."
    },
    {
      name: "The Case Study Receipt",
      structure: [
        "0-3s: The result as a bare number on screen — no context, maximum curiosity.",
        "3-10s: What everyone assumes produced the result — then deny it.",
        "10-35s: The real cause, walked through with the actual artifacts: screenshots, drafts, timestamps.",
        "35-50s: Generalize it into a principle the viewer can apply without your resources.",
        "50-60s: CTA to save the breakdown or comment for the full teardown."
      ],
      example: "Forty-one thousand views from an account with 900 followers. Everyone assumes it was luck or a trending sound — it was neither; the sound was original audio. Here's the receipt: the retention graph spikes at second 7, exactly where I cut to the text card 'this is the part nobody shows you.' That card is a pattern interrupt — a visual reset that re-hooks drifting viewers. The principle: plan one deliberate interrupt every 7 to 10 seconds. Save this and audit your last three videos against it tonight.",
      bestFor: "Proof-driven growth content; builds trust fast because the evidence is on screen, not claimed."
    },
    {
      name: "The POV Narrative",
      structure: [
        "0-3s: Set the scene with a 'POV:' text card over the first shot — viewer becomes the protagonist.",
        "3-20s: Live the scene in first person — hands, doors, screens; the camera is their eyes.",
        "20-40s: Introduce the tension beat — the thing that almost goes wrong or feels unearned.",
        "40-55s: The emotional payoff shot, held longer than comfortable.",
        "55-60s: Close with one line of text that reframes the whole scene."
      ],
      example: "Spoken lines are optional — the text spine: 'POV: it's 5am and your alarm is a choice now, not a punishment.' Shots as their eyes: hand silencing the phone, cold water, laces pulled tight, gym door heavier than it should be. Tension beat at 25s: the text 'day 1 felt like this too. so did day 40.' Payoff: the mirror shot, held 4 seconds, no flex, just recognition. Final card: 'nobody claps at 5am. that's the point.' Original audio: room tone and breath.",
      bestFor: "Emotional resonance and shares — fitness, lifestyle, entrepreneurship; the viewer tags 'this is us.'"
    },
    {
      name: "The Objection Flip",
      structure: [
        "0-3s: Voice the objection exactly as your buyer says it — their words, not yours.",
        "3-10s: Agree with the legitimate part of it — disarm before you counter.",
        "10-30s: Flip it — show how the objection is actually the argument for buying/acting.",
        "30-50s: Proof beat — one client story or number that embodies the flip.",
        "50-60s: Low-pressure CTA: invite a DM conversation, not a purchase."
      ],
      example: "'I can't afford a detailer every month.' Honestly? Fair — it's a real cost, and I'd never pretend otherwise. But flip it: paint correction after two years of neglect runs eight hundred dollars; maintenance detailing runs sixty a month. You're not choosing between spending and saving — you're choosing which bill arrives. My longest client started with one seat clean because his resale value scared him. Three years later his trade-in appraised eleven hundred over book. If the math interests you, DM me 'MATH' and I'll run yours.",
      bestFor: "Sales, real estate, and service businesses converting skeptical viewers into DM conversations."
    }
  ],

  // ── 12 caption formulas ───────────────────────────────────────────────────
  captions: [
    {
      name: "Hook-Context-CTA",
      formula: "Line 1: restate the video's hook in different words (this line shows before 'more').\nLines 2-4: one short paragraph of context the video didn't have time for.\nLine 5: blank line, then a single CTA with a specific keyword or action.",
      example: "The first 3 seconds decide the next 30.\n\nI cut the greeting off 40 videos before I believed it. Every 'hey guys, welcome back' was a tax the viewer paid before anything happened — and most refused to pay it.\n\nComment 'OPENERS' and I'll send you 10 hook lines that skip the tax."
    },
    {
      name: "The One-Liner Mic Drop",
      formula: "One sentence. Under 12 words. No hashtags on the line. It should read like a quote card — the video is the essay, the caption is the title.",
      example: "Consistency is loud in a way talent never has to be."
    },
    {
      name: "The Mini-Essay",
      formula: "Line 1: a confession or bold claim that stands alone.\nParagraphs 2-3: the story in 3-5 short sentences, one idea per sentence.\nParagraph 4: the lesson, stated once, no repetition.\nFinal line: an open question to the reader.",
      example: "I almost deleted the video that changed my business.\n\nIt sat in drafts for nine days. Too simple, I thought. Everyone knows this already. I posted it at 11pm mostly to stop thinking about it.\n\nIt outperformed six months of 'better' content — because obvious to you is brand new to the person three steps behind you.\n\nWhat's sitting in your drafts right now?"
    },
    {
      name: "The Listicle Save-Bait",
      formula: "Line 1: 'X things...' promise matching the video.\nLines 2-6: the list itself, numbered, one line each — give real value in the caption, don't tease.\nFinal line: 'Save this for [specific future moment].'",
      example: "5 checks before you post any reel:\n1. Does frame one work with no sound?\n2. Is the first line of the caption a hook, not a description?\n3. Cut the first 2 seconds — does it still make sense? Post that version.\n4. Watch it muted. Then with sound only. Both must hold.\n5. One CTA, not three.\n\nSave this for tonight's post."
    },
    {
      name: "The Question Opener",
      formula: "Line 1: a genuine question the target viewer argues about.\nLines 2-3: your position in two sentences, taking a clear side.\nFinal line: explicitly ask for theirs in the comments.",
      example: "Would you rather have 10k true fans or 500k passive followers?\n\nI've watched accounts with 8k followers out-earn accounts with half a million, because depth converts and breadth just decorates. The feed rewards attention, but the bank rewards trust.\n\nWhich would you take — and be honest about why."
    },
    {
      name: "The Contrarian Caption",
      formula: "Line 1: 'Unpopular opinion:' plus the take.\nParagraph 2: the strongest version of the opposing view, stated fairly in one sentence.\nParagraph 3: your evidence in 2-3 sentences with one concrete number.\nFinal line: invite disagreement directly.",
      example: "Unpopular opinion: your content isn't undervalued — it's underedited.\n\nYes, the algorithm buries good creators sometimes; that part is real.\n\nBut I re-cut ten 'buried' videos for creators last year, changing nothing except removing 20% of the runtime. Nine of ten outperformed the originals. The message was never the problem. The pacing was.\n\nTell me I'm wrong — with your retention graph."
    },
    {
      name: "The Behind-the-Scenes Confession",
      formula: "Line 1: puncture the polished version of what they just watched.\nParagraph 2: the messy truth in 2-4 sentences — takes, failures, doubt.\nFinal line: normalize it for the reader ('if you're there right now...').",
      example: "That 'effortless' 30-second video? Take 23.\n\nThe first ten takes, I forgot my own hook. Around take 15 I sat on the floor and questioned the whole account. The lighting died twice. The dog barked through the best one.\n\nIf you're twenty takes deep tonight wondering if it's worth it — this is what it looks like when it's working."
    },
    {
      name: "The Value Stack",
      formula: "Line 1: 'Inside this [video/carousel]:' \nLines 2-5: bullet each thing they'll get, benefit-first phrasing.\nLine 6: time cost, stated honestly ('90 seconds').\nFinal line: save/share CTA tied to a use case.",
      example: "Inside this breakdown:\n- The 3-shot sequence that makes any car look $100k (works on a phone)\n- Where to stand so reflections work for you, not against you\n- The one golden-hour setting most people never touch\n- My exact edit order, cut by cut\n\nAll of it in 90 seconds.\n\nShare it with the friend who still shoots at noon."
    },
    {
      name: "The Comment Trigger",
      formula: "Line 1: name the outcome the resource delivers.\nLine 2: exactly what to comment (one word, capitalized).\nLine 3: what happens next and when — set the expectation precisely.",
      example: "I turned this framework into a one-page checklist you can keep on your phone.\n\nComment 'CHECKLIST' — one word.\n\nI send it by DM within 24 hours, no email required, no funnel, just the PDF."
    },
    {
      name: "The Social Proof Receipt",
      formula: "Line 1: the result, numbers first.\nParagraph 2: context that makes the number believable — the starting point and the timeframe.\nParagraph 3: the single biggest lever, named plainly.\nFinal line: CTA to the deeper resource.",
      example: "212,000 views. 41 new clients asked about pricing. Zero dollars in ads.\n\nContext, because numbers without context are noise: this account had 1,400 followers when the video went up, and the run took six weeks, not six days.\n\nThe lever wasn't the topic. It was answering every single comment in the first two hours — the algorithm read the conversation as demand.\n\nFull teardown is pinned to my profile."
    },
    {
      name: "The Soft Sell",
      formula: "Lines 1-3: pure value — a complete tip that works without buying anything.\nLine 4: blank line, then one sentence acknowledging what you sell, no pressure language.\nFinal line: a passive path ('link's there if you want it') — confidence, not chase.",
      example: "Fix your talking-head lighting tonight: face a window, kill the overhead light, and put a white pillowcase on the table in front of you as a bounce. That's 80% of a studio look for free.\n\nIf you want the other 20%, my full home-studio guide covers the exact gear under $150.\n\nLink's in the bio if it's useful — the pillowcase trick works either way."
    },
    {
      name: "The Cliffhanger Carousel",
      formula: "Line 1: tell them which slide holds the payoff ('slide 7 is the one').\nLine 2: what the payoff does for them, one sentence.\nLine 3: a reason to read the slides in order anyway.\nFinal line: save CTA framed around returning to it.",
      example: "Slide 7 is the one people screenshot.\n\nIt's the exact posting-week template — days, formats, and time slots filled in, ready to copy.\n\nBut slides 2 through 6 are why the template works, and the template fails without the why.\n\nSave this now; you'll want it Sunday when you're planning the week."
    }
  ],

  // ── 40 CTAs ───────────────────────────────────────────────────────────────
  // goal: follow|comment|share|save|dm|link
  ctas: [
    // follow (7)
    { text: "Follow — I post one of these breakdowns every Tuesday and Friday.", goal: "follow" },
    { text: "I'm documenting the whole build in public. Follow to watch it happen.", goal: "follow" },
    { text: "This is part 3 of 12. Follow so the next one lands in your feed.", goal: "follow" },
    { text: "Follow if you're building this year — everything I post is a tool, not a highlight reel.", goal: "follow" },
    { text: "New to the page? Start with the pinned video, then follow for the weekly system drops.", goal: "follow" },
    { text: "I only teach what I've tested on my own account. Follow to get the receipts as they happen.", goal: "follow" },
    { text: "If this saved you an hour, following costs you one tap.", goal: "follow" },

    // comment (8)
    { text: "Comment 'SYSTEM' and I'll send you the template.", goal: "comment" },
    { text: "Comment 'HOOKS' and I'll DM you my full list of 50 openers.", goal: "comment" },
    { text: "Drop a ✋ if you've made this mistake — I'll reply with the fix that worked for me.", goal: "comment" },
    { text: "Which one are you trying first? Tell me below — I read every comment for the first two hours.", goal: "comment" },
    { text: "Disagree? Make your case in the comments. Best counter-argument gets pinned.", goal: "comment" },
    { text: "Comment your niche and I'll reply with the format I'd start with for it.", goal: "comment" },
    { text: "Comment 'CHECKLIST' — one word — and the PDF hits your DMs within 24 hours.", goal: "comment" },
    { text: "What did I miss? Add your best tip below and let's build the master list in the comments.", goal: "comment" },

    // share (6)
    { text: "Send this to the friend who's been talking about starting for six months.", goal: "share" },
    { text: "Share this with your business partner before your next content meeting.", goal: "share" },
    { text: "Know someone still doing it the old way? This is your excuse to send it.", goal: "share" },
    { text: "Tag the person who needs to hear number 3.", goal: "share" },
    { text: "Share this to your story and tag me — I reshare my favorite takes every Friday.", goal: "share" },
    { text: "This took me two years to learn. Sharing it takes you two seconds.", goal: "share" },

    // save (8)
    { text: "Save this for Sunday when you're planning the week's content.", goal: "save" },
    { text: "You won't remember step 4 tomorrow. Save it now.", goal: "save" },
    { text: "Save this and run the checklist before your next post goes live.", goal: "save" },
    { text: "This is a reference, not a reel. Save it to your editing folder.", goal: "save" },
    { text: "Save now, thank yourself at the next shoot.", goal: "save" },
    { text: "Bookmark this one — you'll want the exact settings when you're on location.", goal: "save" },
    { text: "Save this before the scroll takes it. You'll need it the day a video flops.", goal: "save" },
    { text: "Watch it once for the idea. Save it for the execution.", goal: "save" },

    // dm (6)
    { text: "DM me 'AUDIT' and I'll look at your last three posts — no charge, no pitch.", goal: "dm" },
    { text: "Stuck on your niche? DM me the word 'PIVOT' and tell me what you do — I'll answer personally.", goal: "dm" },
    { text: "DM me 'MATH' and I'll run these numbers for your situation.", goal: "dm" },
    { text: "If you're a business owner filming your own content, DM me 'SETUP' for my exact gear list.", goal: "dm" },
    { text: "Questions on this? My DMs are open — voice notes welcome, I reply to all of them.", goal: "dm" },
    { text: "DM me 'PLAN' with your posting goal and I'll send back a one-week schedule to start with.", goal: "dm" },

    // link (5)
    { text: "The full free guide is linked in my bio — no email wall, just the PDF.", goal: "link" },
    { text: "Link in bio for the complete 30-day calendar — every day pre-filled.", goal: "link" },
    { text: "I put the extended version on YouTube — link's in the bio, it's 12 minutes deeper.", goal: "link" },
    { text: "Grab the template pack at the link in my profile — the first three are free.", goal: "link" },
    { text: "Everything I used in this video is listed at the link in bio, cheapest option first.", goal: "link" }
  ],

  // ── 4 content calendars ───────────────────────────────────────────────────
  calendars: [
    {
      name: "The Authority Builder",
      cadence: "5 posts/week",
      days: [
        { day: "Mon", post: "Educational reel: one specific problem, one complete fix. Problem-Agitate-Reveal structure, 30-45s. This is your 'proof of expertise' anchor for the week." },
        { day: "Tue", post: "Carousel: a framework, checklist, or template from Monday's topic, designed for saves. Slide 1 is a hook, the last slide is a keyword-comment CTA." },
        { day: "Wed", post: "Engagement day — no post. Spend 30 minutes replying to every comment and leaving 10 thoughtful comments on larger accounts in your niche." },
        { day: "Thu", post: "Contrarian talking-head: take a stand against common advice in your field. Invite disagreement explicitly. This is your comment-section engine." },
        { day: "Fri", post: "Case study or receipt post: a result (yours or a client's) with the mechanism explained. Screenshots beat claims. CTA: DM keyword." },
        { day: "Sat", post: "Behind-the-scenes story or POV: the unpolished process behind Monday's expertise. Humanizes the authority you built all week." },
        { day: "Sun", post: "Rest and prep: batch-write next week's five hooks, review this week's retention graphs, note which post earned the most saves — do more of that." }
      ]
    },
    {
      name: "The Viral Sprint",
      cadence: "7 posts/week",
      days: [
        { day: "Mon", post: "Trend adaptation: take one rising format or sound and rebuild it around your niche. Post before noon; trends decay daily." },
        { day: "Tue", post: "Open Loop Listicle: '5 things...' with one flagged twist item. Optimized for rewatches — keep it under 35 seconds." },
        { day: "Wed", post: "POV or silent-demonstration video: pure visual storytelling, original audio, loopable ending. Your shareability play." },
        { day: "Thu", post: "Reply-to-comment video: answer the best question from this week's comments. Cheap to make, high relevance, trains commenters to keep asking." },
        { day: "Fri", post: "Big swing: your most ambitious idea of the week — the one that needs real production. Friday-to-Sunday gives it the longest test window." },
        { day: "Sat", post: "Remix day: re-cut your best-performing video from the last 60 days with a new hook and tighter pacing. Winners deserve second lives." },
        { day: "Sun", post: "Story-arc post: a personal narrative with a transformation structure. Weekend audiences give longer watch time to emotional content." }
      ]
    },
    {
      name: "The Sustainable Solo",
      cadence: "3 posts/week",
      days: [
        { day: "Mon", post: "Flagship educational post: your best idea of the week, fully produced. One post that teaches beats five that fill space." },
        { day: "Tue", post: "No post. 20 minutes of comment replies on Monday's post during the first-day window — this is where its reach is decided." },
        { day: "Wed", post: "Carousel or text-on-screen remix of Monday's topic: same idea, second format. One idea, two assets, zero extra research." },
        { day: "Thu", post: "No post. Idea capture day: add five raw ideas to your running note. Never film on an empty list." },
        { day: "Fri", post: "Personality post: story, POV, or behind-the-scenes. The trust-builder that makes Monday's teaching land harder next week." },
        { day: "Sat", post: "No post. Optional: 15 minutes engaging with your niche's larger accounts — comments there are discovery for you." },
        { day: "Sun", post: "Batch hour: write three hooks, film what you can, schedule the week. One hour, entire week handled." }
      ]
    },
    {
      name: "The Local Business Engine",
      cadence: "4 posts/week",
      days: [
        { day: "Mon", post: "Customer-problem reel: answer the question you get asked most at the counter or on calls. Film it once, answer it forever." },
        { day: "Tue", post: "No post. Respond to every review, comment, and DM from the weekend — response speed is a local ranking signal and a trust signal." },
        { day: "Wed", post: "Behind-the-scenes: the process, the prep, the team at work. Local customers buy from faces, not logos. 20-30 seconds, real sound." },
        { day: "Thu", post: "Proof post: before/after, customer result, or a review turned into a short story (with permission). Geo-tag every time." },
        { day: "Fri", post: "Offer or event post: whatever you want the weekend crowd to know — one offer, one clear action, posted by 11am." },
        { day: "Sat", post: "Story-only day: real-time stories from the busiest day — the line, the plates, the sold-out shelf. Scarcity documented, not claimed." },
        { day: "Sun", post: "No post. Plan the week: pick Monday's question, Thursday's proof, Friday's offer. Fifteen minutes with a coffee." }
      ]
    }
  ],

  // ── 8 shot lists ──────────────────────────────────────────────────────────
  shotlists: [
    {
      name: "Luxury Car Feature",
      scenario: "A 60-90 second cinematic feature of one car, shot at golden hour with a phone and optional gimbal.",
      shots: [
        { shot: "Hero establishing: full car in environment", angle: "Low, knee height, front three-quarter", movement: "Slow 3-second push-in", purpose: "Instant scale and status; the low angle makes the car dominate the frame" },
        { shot: "Headlight detail with reflection", angle: "Macro, lens 10cm from the light", movement: "Slow lateral slide", purpose: "Texture and craftsmanship cue; specular highlights read as expensive" },
        { shot: "Wheel and brake caliper", angle: "Ground level, side-on", movement: "Static, let a reflection pass", purpose: "Enthusiast credibility shot — the audience that comments lives here" },
        { shot: "Door open into interior stitch detail", angle: "Over-the-door, tilted down", movement: "Rack focus from door edge to stitching", purpose: "Transition from exterior to interior chapter; focus pull adds cinema" },
        { shot: "Driver POV: hand on wheel, engine start", angle: "Over-the-shoulder from passenger side", movement: "Handheld with slight natural sway", purpose: "Puts the viewer in the seat; the start button press is the mid-video re-hook" },
        { shot: "Rolling shot past camera", angle: "Static tripod at ground level, car passes left to right", movement: "None — the car provides the motion", purpose: "Motion energy without a chase car; pan-free framing looks deliberate" },
        { shot: "Rear badge at dusk, lights on", angle: "Center-locked, slightly below badge height", movement: "Slow pull-back reveal", purpose: "Closing image; taillight glow at dusk is the money frame for the thumbnail" },
        { shot: "Loop frame: return to hero angle, now at dusk", angle: "Same as shot 1", movement: "Static hold, 2 seconds", purpose: "Day-to-dusk bookend makes the edit feel produced and makes the loop seamless" }
      ]
    },
    {
      name: "Real Estate Listing Walkthrough",
      scenario: "A vertical walkthrough reel of a listing, one continuous energy, best room saved for last.",
      shots: [
        { shot: "Front door approach and open", angle: "Chest height, centered on the door", movement: "Walking push-in, open door mid-stride", purpose: "The 'come with me' invitation — entering is the hook action" },
        { shot: "Entry hallway glide", angle: "0.5x wide, held level", movement: "Smooth walk, no pan", purpose: "Establishes flow of the home; wide lens adds volume without distortion tricks" },
        { shot: "Kitchen reveal", angle: "Corner-to-corner diagonal from the entry point", movement: "Slow arc toward the island", purpose: "Kitchens sell homes — give it the longest single hold of the video" },
        { shot: "Detail insert: counter material or fixture", angle: "45 degrees, close", movement: "Static", purpose: "Pattern interrupt between big rooms; quality cue for the price point" },
        { shot: "Primary bedroom from doorway", angle: "Doorframe as natural frame-within-frame", movement: "Two steps in, then hold", purpose: "Doorway framing creates a reveal beat without an edit" },
        { shot: "Bathroom: mirror-safe pass", angle: "Angled off the mirror's reflection line", movement: "Brief glide, 2 seconds max", purpose: "Prove it's renovated without catching the camera operator in the mirror" },
        { shot: "The best feature: view, yard, or terrace", angle: "Start on interior, walk through the threshold", movement: "Inside-to-outside transition with exposure shift", purpose: "The saved-for-last payoff; the exposure bloom on exit feels like a reveal" },
        { shot: "Agent to camera on the terrace or lawn", angle: "Eye level, rule-of-thirds left", movement: "Static", purpose: "Face plus CTA: price, beds/baths, and 'DM for the private tour' in one breath" }
      ]
    },
    {
      name: "Talking-Head Authority Setup",
      scenario: "Coverage plan for a scripted talking-head video so the edit can cut for pace without jump-cut whiplash.",
      shots: [
        { shot: "A-camera main take: full script", angle: "Eye level, lens at arm's length, rule-of-thirds", movement: "Locked off", purpose: "The spine of the edit; eye level reads as peer-to-peer, not lecture" },
        { shot: "B-angle safety: full script again or key lines", angle: "30-45 degrees off-axis, slightly tighter", movement: "Locked off", purpose: "Cutting A-to-B on emphasis words replaces jump cuts with intentional angle changes" },
        { shot: "Punch-in insert: hands, notebook, or product", angle: "Top-down or 45 degrees over the desk", movement: "Static or slow slide", purpose: "Visual proof for claims; every 'here's the thing' deserves a cutaway" },
        { shot: "Screen capture or phone-over-shoulder", angle: "Over-the-shoulder onto the screen", movement: "Static", purpose: "Receipts: analytics, examples, drafts — evidence beats assertion" },
        { shot: "Wide environmental frame", angle: "Full room, subject small in frame", movement: "Static", purpose: "Pattern interrupt for long videos; also establishes the credibility of the space" },
        { shot: "Direct-to-lens CTA take", angle: "Same as A-camera but 10% tighter", movement: "Slow 2-second push-in", purpose: "The tightening frame subconsciously raises stakes exactly when you ask for the action" }
      ]
    },
    {
      name: "Cafe / Restaurant Feature",
      scenario: "A 45-60 second feature of a food spot — atmosphere first, food as the star, owner as the face.",
      shots: [
        { shot: "Signature dish hero: the best 2 seconds of the whole shoot", angle: "Top-down or 45 degrees, tight", movement: "Slow rotate or drizzle happening live", purpose: "Cold-open hook; lead with the most appetizing frame you have" },
        { shot: "Exterior and signage", angle: "Across the street, eye level", movement: "Walking approach", purpose: "Findability — viewers screenshot this frame to remember the place" },
        { shot: "Door open with ambient sound", angle: "Behind the entering customer", movement: "Follow through the door", purpose: "Sound design beat: espresso machine, chatter, music — atmosphere is the product" },
        { shot: "Hands-only prep sequence: 3 quick actions", angle: "Counter height, tight on hands", movement: "Cut on each action", purpose: "Craft proof; cutting on action hides the cuts and keeps energy up" },
        { shot: "The pour, pull, or plate-up in macro", angle: "Level with the cup or plate rim", movement: "Static, action provides motion", purpose: "The ASMR centerpiece — boost this audio in the mix" },
        { shot: "Customer reaction or first bite", angle: "Across the table, candid framing", movement: "Handheld, natural", purpose: "Social proof; a real reaction outsells any adjective" },
        { shot: "Owner one-liner to camera", angle: "Eye level at the counter", movement: "Static", purpose: "One sentence: what they're proudest of. Faces build regulars" },
        { shot: "Closing wide: room at its busiest, grade warm", angle: "Corner high angle taking in the whole room", movement: "Slow push", purpose: "End on abundance and warmth; caption CTA carries the address" }
      ]
    },
    {
      name: "Fitness Session Coverage",
      scenario: "Coverage for a training session that can be cut into a main video plus 3-4 shorter clips.",
      shots: [
        { shot: "Gym-entry POV: bag drop, shoes, chalk", angle: "First person, chest height", movement: "Natural walking", purpose: "Ritual opening viewers recognize; sets the POV narrative option" },
        { shot: "Working set: full body in frame", angle: "Side-on at hip height, whole range of motion visible", movement: "Locked off", purpose: "The form-check master shot; coaches and commenters judge from here" },
        { shot: "Same set: face and effort", angle: "Front 45 degrees, tight on face and shoulders", movement: "Slight handheld", purpose: "Emotion track — the strain at the sticking point is your retention beat" },
        { shot: "Detail inserts: grip, knurling, plates loading", angle: "Macro, low", movement: "Static, cut on the plate clink", purpose: "Texture and sound design; the plate sound is the edit's percussion" },
        { shot: "Rest-period honesty: sitting, breathing, staring", angle: "Wide, subject small against the gym", movement: "Static", purpose: "The unglamorous beat that makes the effort believable" },
        { shot: "PR attempt or final set with spotter", angle: "Two angles if possible — side master plus front tight", movement: "Locked off both", purpose: "The climax; never gamble the money moment on one angle" },
        { shot: "Post-set walk-away, hands on head", angle: "Behind the subject, low", movement: "Slow follow", purpose: "The victory-lap frame — this is the thumbnail and the loop-out shot" }
      ]
    },
    {
      name: "Product Unboxing / Reveal",
      scenario: "A premium unboxing built for retention — the reveal is engineered, not just recorded.",
      shots: [
        { shot: "Sealed box hero on clean surface", angle: "45 degrees, negative space around the box", movement: "Slow push-in", purpose: "Anticipation frame; clean staging signals the product's tier" },
        { shot: "Seal cut or tape pull in macro", angle: "Directly above the blade line", movement: "Static, real audio boosted", purpose: "The commitment moment — crisp sound makes viewers 'feel' the open" },
        { shot: "Lid off, first glimpse — but not the full product", angle: "High 45, product still half-covered by paper", movement: "Hold 1 second, then hands enter", purpose: "Open loop: showing 80% and withholding 20% buys the next ten seconds" },
        { shot: "Accessories and packaging layers laid out", angle: "Top-down flat lay, arranged as you go", movement: "Speed-ramped assembly", purpose: "Completeness and value stack without narration" },
        { shot: "The full reveal in hand", angle: "Eye level, product between lens and face", movement: "Slow raise into frame", purpose: "The payoff — hold it 3 full seconds before any cut" },
        { shot: "Function demo: the one thing it does best", angle: "Whatever angle proves the claim most clearly", movement: "Minimal — clarity beats style here", purpose: "Move from desire to justification; this shot converts" },
        { shot: "Beauty closing loop: product staged like an ad", angle: "Low, backlit, shallow depth", movement: "Slow orbit", purpose: "The frame people screenshot; loops cleanly back to the sealed box" }
      ]
    },
    {
      name: "Day-in-the-Life Vlog Kit",
      scenario: "A repeatable shot system for day-in-the-life content — shoot these 8 every time and the edit assembles itself.",
      shots: [
        { shot: "Morning anchor: the same first action every episode", angle: "Fixed position you never change — tripod spot marked", movement: "Static", purpose: "Series consistency; returning viewers recognize the opening instantly" },
        { shot: "Transit shot: walking, driving, or commuting", angle: "Low forward-facing, horizon steady", movement: "Motion from the vehicle or stride", purpose: "The connective tissue between chapters; speed-ramp material" },
        { shot: "Work block: hands and screen or tools", angle: "Over-the-shoulder or top-down", movement: "Two static setups, cut between them", purpose: "The substance — what you actually do, shown not narrated" },
        { shot: "The mid-day face-to-camera check-in", angle: "Handheld selfie framing, eye level", movement: "Walking or seated, natural", purpose: "The narrative voice: one honest sentence about how the day is really going" },
        { shot: "Food or coffee beat", angle: "45 degrees, tight, steam or pour visible", movement: "Static", purpose: "The universal pause beat every audience relates to; sound design moment" },
        { shot: "A problem or friction moment — film it, don't skip it", angle: "Whatever is fastest to grab; imperfect is fine", movement: "Handheld", purpose: "The tension beat that separates story from slideshow" },
        { shot: "Golden-hour outside frame", angle: "Subject or environment against low sun", movement: "Slow pan or static", purpose: "The visual dessert; grades beautifully and lifts the whole edit" },
        { shot: "Night close: same framing family as the morning anchor", angle: "Mirror of shot 1 in darkness", movement: "Static", purpose: "Bookend structure — morning and night frames make any day feel authored" }
      ]
    },
    {
      name: "Fashion Lookbook / Outfit Feature",
      scenario: "One outfit (or three) shot for a beat-synced vertical edit with transition potential.",
      shots: [
        { shot: "Full-length hero: outfit head to toe", angle: "Chest height, camera vertical, subject centered", movement: "Static — the pose does the work", purpose: "The complete look registered in one frame; this is the cover candidate" },
        { shot: "Fabric texture in macro", angle: "Raking side light across the weave", movement: "Slow slide", purpose: "Quality signal — texture close-ups are why the outfit reads expensive" },
        { shot: "Detail chain: cuff, collar, hem, shoe", angle: "Tight, one detail per shot", movement: "Cut on the beat, one detail per beat", purpose: "Rhythm section of the edit; four cuts of visual percussion" },
        { shot: "Movement pass: walk toward camera", angle: "Low, slightly up at the subject", movement: "Subject walks; camera static", purpose: "Drape and motion — clothes are designed to move, show it" },
        { shot: "Turn or spin with fabric flare", angle: "Waist height", movement: "Static camera, 120fps if available", purpose: "The slow-motion money shot for the mid-edit breath" },
        { shot: "Transition trigger: hand covers lens or doorway wipe", angle: "Matched entry/exit framing for the next look", movement: "Fast wipe motion", purpose: "The seam for outfit changes — match the frame and the cut disappears" },
        { shot: "Attitude closer: lean, look-back, or over-shoulder", angle: "Three-quarter back view, face returning to lens", movement: "Slow push", purpose: "Personality frame that ends the edit on confidence, not clothing" }
      ]
    }
  ],

  // ── 11 b-roll sets — one per niche ────────────────────────────────────────
  broll: [
    {
      niche: "luxury",
      items: [
        "Espresso pouring into a porcelain cup, macro, steam backlit by window light",
        "Watch clasp closing on a wrist, shot at f/1.8 or portrait mode, sound boosted",
        "Hotel curtain pulled open to reveal a skyline, exposure blooming on the reveal",
        "Leather bag or wallet placed on marble, top-down, hard side light for texture",
        "Elevator doors closing in a mirrored lobby, symmetrical center framing",
        "Champagne poured in slow motion, bubbles catching a single light source",
        "Hands adjusting a blazer cuff, shallow depth, negative space to the left",
        "Car door closing with a heavy thunk, exterior low angle, audio clean",
        "Fountain pen signing thick paper stock, macro on the nib",
        "Candle flame in a dim suite, static 4-second hold for pacing breaks",
        "Room-service cloche lifted, steam escaping, camera level with the plate",
        "Polished shoes stepping onto marble, ground-level tracking shot"
      ]
    },
    {
      niche: "cars",
      items: [
        "Cold start: exhaust tip close-up, vapor in morning air, audio untouched",
        "Key or fob in hand walking toward the car, low behind-the-back angle",
        "Wheel turning slowly into frame, ground level, brake caliper visible",
        "Light bar or headlight signature powering on at dusk, static macro",
        "Driver's glove-and-wheel shot through the side window, shallow focus",
        "Reflections sliding across the hood on a slow rolling shot",
        "Seatbelt pulled and clicked, interior detail, sound crisp",
        "Gear selector or drive-mode dial turning, macro with focus breathing",
        "Foam cannon blanket sliding down paint during a wash, satisfying pace",
        "Badge close-up with rack focus from raindrops to emblem",
        "Garage door rising to reveal the car in silhouette, backlit",
        "Tail lights receding into a tunnel at night, static tripod frame"
      ]
    },
    {
      niche: "realestate",
      items: [
        "Front door key turning and door swinging open, handheld POV",
        "Sunlight moving across hardwood floors, static time-compressed shot",
        "Curtains billowing at an open balcony door, backlit and slightly overexposed",
        "Faucet running in a stone sink, macro on the water breaking",
        "Staging details: coffee-table book opened, throw pillow karate-chopped",
        "Pool surface reflections at golden hour, low across the water",
        "Staircase ascended POV with hand sliding along the rail",
        "City or yard view revealed by a slow step through sliding doors",
        "Agent's hand placing keys into a client's hand, tight shot",
        "Neighborhood establishing: tree-lined street, slow drive-by or walking shot",
        "Oven door opened in a staged kitchen, warm interior light spilling out",
        "Twilight exterior with every interior light on, static wide, the hero frame"
      ]
    },
    {
      niche: "fitness",
      items: [
        "Chalk clapped between hands, dust drifting through gym window light",
        "Barbell knurling macro with fingers wrapping the bar",
        "Plates sliding onto the sleeve, collar clipped, cut on each clink",
        "Shoes laced tight, ground-level, morning light",
        "Sweat drops hitting the platform, slow motion if available",
        "Water bottle condensation, tight shot between sets",
        "Rope slams from a low front angle, dust and fibers airborne",
        "Empty gym wide shot at 5am, one figure entering frame",
        "Protein shake blender vortex, top-down macro",
        "Foam rolling and wincing, honest recovery beat",
        "Wrist wraps wound and cinched, tight on the hands",
        "Silhouette stretch against bright windows, static hold for the outro"
      ]
    },
    {
      niche: "business",
      items: [
        "Laptop opening in a dark room, keyboard glow on the face",
        "Coffee poured beside a legal pad with visible handwriting",
        "Whiteboard marker writing one word, squeak audible, macro",
        "Invoice or proposal PDF on screen, slow scroll, numbers legible",
        "Handshake in natural light, waist-level medium shot",
        "Sticky notes rearranged on a wall, time-compressed",
        "Phone flipped face-down before deep work, tight shot with a thud",
        "Desk at night: single lamp, tea steam, cursor blinking on an empty doc",
        "Calendar app week view filling with blocks, screen capture",
        "Walking into an office lobby with a bag, low tracking shot",
        "Notification badge count climbing, macro on the phone screen",
        "Sunrise through office blinds striping across a desk"
      ]
    },
    {
      niche: "sales",
      items: [
        "Headset going on, mic bending to the mouth, tight profile shot",
        "CRM pipeline board on screen, deals dragging between stages",
        "Tally marks filling a notepad — dials, conversations, bookings",
        "Handwritten follow-up note sealed into an envelope, top-down",
        "Phone mid-ring on the desk, hand hesitating one beat before answering",
        "Calendar invite acceptance popping on screen, punch-in on 'accepted'",
        "Whiteboard funnel drawn live: wide top, narrow bottom, one number per stage",
        "Firm handshake across a table with paperwork blurred in the foreground",
        "Rejection beat: call ended, exhale, next number dialed immediately",
        "Commission or invoice-paid notification, screen macro",
        "Car door closing outside the prospect's building, briefcase in hand",
        "End-of-day desk: headset down, board full, lights off last"
      ]
    },
    {
      niche: "lifestyle",
      items: [
        "Bed sheets snapped flat in morning light, slow motion",
        "Pour-over coffee blooming, macro on the grounds rising",
        "Journal page: one line written, pen cap clicked, top-down",
        "Window opened, sheer curtain lifting in the breeze",
        "Fresh flowers trimmed and dropped into a vase, counter-level shot",
        "Skincare bottle pump in the mirror, tight over-shoulder",
        "Book spine cracked open beside a mug, cozy corner framing",
        "Farmers-market produce loaded into a tote, hands-only",
        "Golden-hour walk: shadow stretching ahead on pavement, ground-level",
        "Candle lit with a match, flame catch in macro, sound crisp",
        "Meal-prep containers lined up and lidded, satisfying top-down grid",
        "Phone placed on a charger outside the bedroom, lights off behind"
      ]
    },
    {
      niche: "fashion",
      items: [
        "Garment rack slide: hangers pushed one by one, tight on the rail",
        "Steam pass over a shirt, wrinkles vanishing in real time",
        "Fabric texture in raking light — weave, knit, or denim macro",
        "Belt threaded through loops, waist-level tight shot",
        "Watch or jewelry laid onto a flat lay, one piece per beat",
        "Mirror check: collar adjusted, subject seen only in reflection",
        "Shoes unboxed from tissue paper, crinkle audio boosted",
        "Tailor's chalk marking a hem, macro with hands",
        "Outfit flat lay assembling itself via stop-motion cuts",
        "Fitting-room curtain pulled with a hook screech, transition-ready",
        "Walking shot: hem and shoes only, low tracking from behind",
        "Look-back over the shoulder at golden hour, slow motion, hair moving"
      ]
    },
    {
      niche: "food",
      items: [
        "Butter hitting a hot pan, instant sizzle, macro at rim level",
        "Onion dice: knife rocking, claw grip visible, top-down",
        "Salt sprinkled from height, backlit crystals falling",
        "Cheese pull stretched slowly between plate and fork",
        "Sauce spoon-drag across a warm plate, chef plating grammar",
        "Steam escaping a lifted pot lid, backlit against a dark background",
        "Dough kneaded and folded, flour dust in side light",
        "Espresso extraction in macro: tiger-striping into the cup",
        "Herb chiffonade scattered as garnish, tweezers or fingertips",
        "Ticket rail filling during service, quick rack focus down the line",
        "Cast-iron sear flip, flame flare-up, one-take confidence",
        "The finished dish rotating slowly on a turntable, restaurant lighting"
      ]
    },
    {
      niche: "travel",
      items: [
        "Cabin window on descent: wing, cloud break, first glimpse of the city",
        "Passport stamp thunk, macro on the page",
        "Rolling suitcase wheels over cobblestone, ground-level tracking",
        "Train platform board flipping or updating, tight on the destination line",
        "Street-food vendor flame flare, handheld from the queue",
        "Hotel key card tap and green light, door pushing open POV",
        "Map app pin drop, screen macro with thumb scrolling the route",
        "Local currency counted at a cafe table, top-down",
        "Sunrise over rooftops from a hostel balcony, static 5-second hold",
        "Crosswalk flood of pedestrians, high angle, speed-ramped",
        "Backpack zipped and shouldered in one motion, tight shot",
        "Airport window silhouette: traveler watching planes, wide and quiet"
      ]
    },
    {
      niche: "creator",
      items: [
        "Ring light powering on, glow blooming across the desk",
        "Phone locked into a tripod mount, click audible, macro",
        "Lav mic clipped to a collar, tight over-shoulder shot",
        "Timeline scrubbing in an editing app, screen capture with cuts visible",
        "Take counter: fingers to lens showing take number, jump-cut series",
        "Waveform bouncing during a voiceover record, screen macro",
        "SD card ejected and swapped, fingers-only, shallow focus",
        "Storyboard sticky notes rearranged on a wall, time-compressed",
        "Retention graph on screen, cursor hovering the drop-off cliff",
        "Batch-day wardrobe: three outfits laid over a chair back",
        "The upload button clicked, progress bar filling, punch-in on 100%",
        "Notifications rolling in, phone face-up, screen glow in a dark room"
      ]
    }
  ],

  // ── 12 edit recipes ───────────────────────────────────────────────────────
  editRecipes: [
    {
      name: "The Speed-Ramp Reveal",
      app: "CapCut",
      steps: [
        "Shoot one continuous move toward your subject (walk-in, gimbal push, or slow pan) at 60fps.",
        "On the timeline, tap the clip, then Speed, then Curve, and choose Montage as your starting shape.",
        "Drag the curve so the approach runs at 3-4x and crashes to 0.3x exactly on the reveal frame.",
        "Cut the clip one beat after the reveal — never let the slow section overstay.",
        "Align the ramp's impact frame to the loudest beat of your track; nudge frame by frame until it snaps.",
        "Add a 2-frame motion blur (Effects, then Blur, directional) on the fast section only."
      ],
      effect: "Turns an ordinary approach shot into a cinematic reveal; the speed contrast makes the subject feel important without any extra gear."
    },
    {
      name: "The J-Cut Conversation Flow",
      app: "Premiere Pro",
      steps: [
        "Stack your talking-head A-roll on V1/A1 and your b-roll on V2.",
        "Where b-roll should appear, keep the A-roll audio running and cut only the video — hold Alt and select just the video track edit point.",
        "Slide the b-roll in so its picture starts 8-15 frames BEFORE the sentence that describes it ends — the audio leads the picture.",
        "Trim every b-roll clip to end on a completed action (a door closes, a hand exits frame).",
        "Add a 2-frame audio crossfade at each cut point (Ctrl+Shift+D) to erase edit clicks."
      ],
      effect: "The audience hears the next idea before they see it, which makes cuts feel inevitable instead of abrupt — the invisible-edit standard of broadcast TV."
    },
    {
      name: "The Punch-In Emphasis",
      app: "CapCut",
      steps: [
        "Find every emphasis word in your talking-head take — the claims, numbers, and punchlines.",
        "At each one, split the clip (scissors icon) exactly on the first frame of the word.",
        "On the second half, open Transform and set scale to 110-115% — never more, or it reads as a gimmick.",
        "Alternate direction across the video: center punch, then slight left, then slight right, so repetition doesn't dull it.",
        "Return to 100% scale at the next natural sentence break, cutting (not zooming) back out.",
        "Cap it at one punch-in per 8-10 seconds; scarcity is what keeps the emphasis working."
      ],
      effect: "Simulates a two-camera shoot with one phone and keeps AVD up by resetting visual attention on every key claim."
    },
    {
      name: "The Quiet Luxury Grade",
      app: "DaVinci Resolve",
      steps: [
        "In the Color page, drop highlights slightly (Gain down to ~0.9) so nothing in the frame glows or clips.",
        "Lift shadows just off black (Lift +0.02) for a soft, expensive haze — crushed blacks read as cheap drama.",
        "Desaturate globally to 80-85%, then use a Hue vs Sat curve to pull saturation OUT of greens and push warmth INTO skin and wood tones only.",
        "Add a subtle vignette (Window, circular, soft 50%+) darkening corners by no more than 10%.",
        "Apply 2-4% film grain (Effects, Film Grain, 35mm preset) so digital footage stops looking clinical.",
        "Check the vectorscope: skin tones should sit on the skin-tone line; everything else should cluster near center."
      ],
      effect: "The muted, tactile 'old money' look — low contrast, warm neutrals, zero neon — that makes phone footage read like a fashion campaign."
    },
    {
      name: "The Beat-Synced Montage",
      app: "CapCut",
      steps: [
        "Add your track first, then tap the audio and use Beats, Auto-generate to drop markers on every beat.",
        "Rough-cut your clips in story order above the audio, ignoring the markers on the first pass.",
        "Second pass: drag every cut point to snap to a beat marker — cuts on the beat, action WITHIN the beat.",
        "Reserve the downbeats (the strong 1-count) for your best shots; fill the off-beats with detail inserts.",
        "Where a clip must span two beats, add a subtle 105% scale keyframe across it so nothing sits static.",
        "Mute all clip audio except 2-3 chosen diegetic hits (a door, a rev, a clink) boosted over the music."
      ],
      effect: "Professional music-video rhythm; the viewer's pulse locks to the edit and swiping away starts to feel like interrupting a song."
    },
    {
      name: "The Text Pop Hook",
      app: "CapCut",
      steps: [
        "Write your hook as 3 short text blocks of 2-5 words each — never one long sentence on screen.",
        "Place block one on frame one. It must be readable in under a second: bold sans-serif, white with a black stroke, upper third.",
        "Animate each block in with a 2-frame Pop or Typewriter (In animation, duration 0.2s) — anything slower kills the pace.",
        "Time blocks two and three to the natural stresses of your spoken hook, not to even spacing.",
        "Add a single 'tick' or 'boom' sound effect (Sounds, search 'pop') at 20% volume under each text landing.",
        "Delete all three blocks by second 4 — lingering hook text signals the video hasn't started yet."
      ],
      effect: "Captures sound-off scrollers (the majority) in the first second and gives the hook a visual heartbeat that doubles the chance of surviving second three."
    },
    {
      name: "The Masked Transition Wipe",
      app: "Premiere Pro",
      steps: [
        "Shoot both scenes with a matching foreground object passing fully across the lens (a doorframe, a pillar, your own hand).",
        "Stack scene B under scene A on the timeline, overlapping by about one second at the pass.",
        "On scene A, add a Crop effect (or a mask on Opacity) and keyframe its edge to follow the passing object frame by frame — usually 6-10 keyframes.",
        "Match the motion speed: if the wipe object moves fast, your keyframes should cover the frame in 4-6 frames total.",
        "Add 1-frame directional blur at the midpoint of the wipe to hide any edge mismatch.",
        "Play it at full speed and then at half speed — it must survive both, because viewers rewatch transitions."
      ],
      effect: "A seamless in-camera-looking transition between locations or outfits — the signature move of high-end travel and fashion edits."
    },
    {
      name: "The Retention Reset",
      app: "CapCut",
      steps: [
        "Watch your rough cut and mark every 7-10 second span with no visual change — these are your leak points.",
        "At each leak, insert exactly one pattern interrupt: a punch-in, a b-roll cutaway, a text card, or a 0.5s zoom transition — rotate types, never repeat twice in a row.",
        "Keep each interrupt under a second; it's a slap on the table, not a scene.",
        "Re-time so no interrupt lands mid-word — snap them to sentence boundaries or beat markers.",
        "Export, watch on your phone at arm's length, and count seconds between visual changes on your fingers; anything past 8 gets one more interrupt."
      ],
      effect: "Systematically flattens the mid-video retention cliff; the viewer's attention is re-hooked on a schedule instead of by luck."
    },
    {
      name: "The Clean Podcast Multicam Cut",
      app: "DaVinci Resolve",
      steps: [
        "Sync all angles by audio waveform: select the clips, right-click, Auto Sync Audio, Based on Waveform.",
        "Create a multicam clip and cut on the LISTENER during reactions, not just the speaker — reaction shots carry the emotion.",
        "Switch angles on sentence boundaries or beats of silence, never mid-word; aim for a cut every 5-15 seconds.",
        "Go one frame past each planned cut point before switching — cutting a hair late feels natural, a hair early feels jumpy.",
        "On the Fairlight page, run Voice Isolation or a light noise reduction, then a compressor (2:1, slow attack) so both voices sit level.",
        "Normalize the final mix to -14 LUFS for social delivery."
      ],
      effect: "Broadcast-feeling conversation coverage from static cameras — the pacing of the cuts supplies the energy the locked-off shots lack."
    },
    {
      name: "The Cinematic Slow-Mo Open",
      app: "Final Cut Pro",
      steps: [
        "Shoot your opening shot at 120fps (or 240 on a phone that supports it) with shutter locked at roughly double the frame rate.",
        "Drop it on the timeline and retime to 25-40%: Modify, Retime, Custom — with Video Quality set to Optical Flow for silk-smooth motion.",
        "Cut INTO the slow motion mid-action (a jump already airborne, water already splashing) — never show the wind-up.",
        "Hold the slow-mo for a maximum of 3 seconds, then hard-cut to real time; the speed snap is your first pattern interrupt.",
        "Layer a low-end riser or ambient swell under the slow section that cuts dead silent on the transition to real time.",
        "Grade the slow-mo shot 10% more contrasty than the rest so the open feels like a title sequence."
      ],
      effect: "A film-trailer cold open: the slow-mo buys awe, and the snap to real time delivers the jolt that carries viewers into the body of the video."
    },
    {
      name: "The ASMR Sound Design Pass",
      app: "Premiere Pro",
      steps: [
        "Mute your music track entirely and watch the cut — list every action that SHOULD make a sound (pour, click, zip, sizzle).",
        "Record or source a clean effect for each one; even recording the real object on your phone in a quiet room beats stock.",
        "Lay each effect on its own track, synced to the exact impact frame — audio 1-2 frames early reads as perfectly in sync.",
        "Boost these diegetic sounds 4-6dB above where feels natural; on phone speakers, subtlety disappears.",
        "Bring music back at no more than 30% volume, and duck it 3dB under every featured sound with keyframes or the ducking tool.",
        "Add one near-silent moment (room tone only) before your most important beat — silence is the loudest emphasis you own."
      ],
      effect: "The tactile, satisfying sound bed that makes luxury, food, and detailing content feel physical — viewers rewatch for the sounds alone."
    },
    {
      name: "The Vintage Film Look",
      app: "DaVinci Resolve",
      steps: [
        "Start with a slight highlight roll-off: pull Gain down and Soft Clip on so bright areas bloom gently instead of clipping.",
        "Shift the shadows toward teal-green and mids toward warm amber using the Color Wheels — small moves, 0.02-0.05 max.",
        "Add halation (Effects, Halation or a soft-glow node keyed to highlights) so light sources bleed slightly red-orange.",
        "Apply 35mm film grain at 4-6% opacity and add a subtle Gate Weave (Film Look Creator) for organic frame movement.",
        "Crop or letterbox to 4:5 with thin borders, and drop a barely-visible white vignette to mimic aged lens falloff.",
        "Finish with a 12-frame fade-in from black — vintage edits never smash-cut in."
      ],
      effect: "The nostalgic 'shot on film' texture that signals taste and slows the scroll — especially potent for fashion, travel, and lifestyle brands."
    }
  ]
};
