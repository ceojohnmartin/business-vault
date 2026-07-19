window.SMU_DATA = window.SMU_DATA || { schools: [] };
SMU_DATA.schools.push({
  id: "instagram",
  order: 3,
  name: "Instagram & Reels",
  tagline: "Master the reel, the grid, and the algorithm",
  icon: "🎬",
  hue: 320,
  description: "The complete Instagram operating system: how Reels distribution actually works, how to shoot and cut for the feed, and how to turn views into followers and followers into a business. Built for creators and brands who want IG to be their flagship platform.",
  courses: [
    {
      id: "instagram-1",
      level: "Beginner",
      title: "Reels Foundations",
      description: "How Instagram distributes content, how a reel is structured, and how to publish work that earns its first thousand real viewers.",
      lessons: [
        {
          id: "instagram-1-1",
          title: "How Instagram Actually Ranks a Reel",
          minutes: 9,
          xp: 50,
          skill: "strategy",
          intro: "Two creators post the same idea; one gets 900 views, the other gets 900,000. The difference is rarely luck — it's that one of them understands what the ranking system is actually measuring.",
          sections: [
            { h: "Two feeds, one interest graph", body: "Instagram runs two distribution games at once. Connected reach is your content shown to people who already follow you, ranked by relationship history: whose posts they like, whose stories they tap through, who they DM. Unconnected reach is the Reels tab and Explore, ranked by interest, not friendship. This is the part most creators miss: Instagram has quietly become an interest graph, like TikTok. The system watches what each user finishes, rewatches, and shares, then hunts for more of it. Your follower count is not a distribution guarantee — it's a warm test audience. Two consequences follow. A 400-follower account can beat a 400k account on any single reel. And every reel competes against every other reel in its topic space, not just against accounts your viewer follows." },
            { h: "The four signals that decide reach", body: "Adam Mosseri has been unusually direct about ranking inputs. For Reels, the heavy hitters are watch time (did they finish, did they rewatch), likes per reach, comments per reach, and the one he keeps naming first: sends per reach — how many viewers shared the reel relative to how many saw it. Note the phrasing: per reach. Ratios, not totals. A reel with 10,000 views and 300 sends beats one with 100,000 views and 300 sends, and gets pushed harder next round. Retention is the gatekeeper — a reel nobody finishes never earns the chance to be shared. Sends are the multiplier — Instagram reads a DM share as the strongest available evidence that more people want this. Build every reel around two questions: what holds them to the end, and what makes someone send it to a friend?" },
            { h: "The test batch: your first 48 hours", body: "When you publish, Instagram doesn't broadcast — it samples. The reel goes to a small batch: a slice of your followers plus non-followers whose watch history resembles your topic. Their behavior — hold rate in the opening seconds, watch-through, sends — decides whether a larger batch goes out. Distribution unfolds as a ladder of these auditions, which is why some reels flatline for two days and then run for two weeks. Practical consequences: don't delete a slow reel inside 48 hours; the ladder can still climb. Don't post twice into your own test window; you'll split your warm audience. And use Trial Reels — Instagram's built-in option that shows a reel to non-followers only — to audition risky hooks without training your existing audience to scroll past you." },
            { h: "Silent caps: recommendation eligibility", body: "Before craft, check the plumbing. Instagram quietly limits reels that carry a TikTok watermark (explicitly downranked), repost someone else's content without meaningful edits (the originality updates favor creators over aggregators), use audio that's unavailable in some regions, or run long — Reels now accepts multi-minute uploads, but Mosseri has said length hurts when it kills completion, so treat under 90 seconds as home turf. Verify your standing in Settings, then Account Status: a strike under 'content you can't recommend' caps you at followers-only reach, and most creators never look. Finally, upload 1080x1920 at high bitrate. A mushy, double-compressed export reads as low quality to humans — and therefore to the system measuring how humans respond." }
          ],
          takeaways: [
            "Instagram is an interest graph: every reel is auditioned to strangers based on topic, not follower count.",
            "The ranking currency is ratios — watch-through, likes, comments, and especially sends per reach.",
            "Distribution is a ladder of test batches; never judge or delete a reel inside 48 hours.",
            "Watermarks, reposts, and Account Status strikes silently cap reach before craft even matters."
          ],
          actions: [
            "Open Settings > Account Status today and confirm you have zero recommendation restrictions.",
            "Audit your last 5 reels: write down sends per reach (shares divided by views) for each and circle the winner.",
            "Post your next experimental hook as a Trial Reel so it tests on non-followers only."
          ],
          quiz: [
            { q: "Which signal has Mosseri repeatedly named as a top ranking input for Reels?", options: ["Sends per reach","Follower count","Posting time","Hashtag count"], answer: 0, why: "Shares-per-view is Instagram's strongest evidence that more people want a piece of content." },
            { q: "Your reel has 2,000 views after 24 hours. Best move?", options: ["Delete it and repost","Leave it — the test ladder can still climb for days","Post it again immediately","Buy engagement to boost it"], answer: 1, why: "Distribution unfolds in staged batches; early flatlines regularly turn into late runs, and deleting resets everything." },
            { q: "What does a TikTok watermark do to a reel on Instagram?", options: ["Nothing measurable","Boosts it as cross-platform proof","Gets it downranked in recommendations","Only affects Stories"], answer: 2, why: "Instagram has publicly said watermarked recycled content is deprioritized in Reels recommendations." }
          ],
          drill: "Pull up your three most recent reels and calculate sends per reach for each. Write one sentence per reel explaining why someone would — or wouldn't — DM it to a friend."
        },
        {
          id: "instagram-1-2",
          title: "Anatomy of a Reel: Hook, Setup, Payload, Payoff",
          minutes: 8,
          xp: 50,
          skill: "viral",
          intro: "Every reel that performs — across every niche — is built on the same four-beat skeleton. Learn it once and you'll never stare at a blank timeline again.",
          sections: [
            { h: "The four-beat skeleton", body: "Beat one: the hook (0-2 seconds) — a promise or a provocation that makes stopping feel smarter than scrolling. Beat two: the setup (2-8 seconds) — the minimum context needed for the payoff to land. Minimum is the key word; context is a tax, and viewers pay it grudgingly. Beat three: the payload — the value itself: the tutorial steps, the transformation, the story's escalation. Beat four: the payoff — the result, punchline, or reveal the hook promised, ideally landing in the final two seconds so completion rate peaks. Watch ten top reels in your niche tonight and you'll see this skeleton under all of them, whether it's a 7-second car reveal or a 60-second talking-head breakdown. Structure isn't a constraint on creativity. It's the reason the creativity gets watched." },
            { h: "The hook is a debt you must repay", body: "A hook is a promise with a timer on it. 'This espresso machine costs more than my car' obligates you to show the machine, the absurdity, and ideally the price — fast. When the payload underdelivers, viewers don't just leave; they remember, and your next reel's test batch inherits the skepticism. This is why hook-first creators who never studied payoffs plateau: they win the first 3 seconds and lose seconds 4 through 30. Practical rule: write the payoff first, then reverse-engineer the biggest honest promise it supports. If your payoff is a decent-but-ordinary editing tip, don't hook with 'this changed my life' — hook with specificity instead: 'the 2-second trick editors use to make cuts invisible.' Specificity scales trust. Hype spends it." },
            { h: "Endings that trigger the algorithm twice", body: "Amateurs fade out. Professionals engineer the last two seconds. Option one: the loop — end on a frame that visually matches your opening frame, so the replay feels seamless and viewers accidentally watch twice; rewatches pour straight into watch time. Option two: the button — a sharp final line or visual punch that lands and cuts immediately, no outro, no 'thanks for watching.' Dead air at the end is where completion percentage goes to die. Option three: the handoff — a single CTA earned by the value just delivered: 'Part 2 is on my profile' or 'Send this to the friend who needs it.' One CTA, never three. Every additional ask cuts compliance because a confused viewer does nothing. Pick the ending before you shoot; it changes how you film everything." },
            { h: "The skeleton across three formats", body: "Talking head: hook is your first sentence plus an expressive frame; setup is one line of context; payload is your 3 points cut tight; payoff is the conclusion your hook promised. Voiceover B-roll: hook is your most arresting shot paired with the boldest claim; setup is a quick orientation shot; payload alternates VO points with matching visuals; payoff is the hero shot held slightly longer. POV or skit: hook is the on-screen premise text ('POV: the client says just make it go viral'); setup is the situation escalating; payload is the tension peaking; payoff is the punchline — then cut instantly. Same skeleton, three costumes. Master one format for 30 days before adding a second; format-hopping is the most common beginner growth killer." }
          ],
          takeaways: [
            "Every performing reel follows hook > setup > payload > payoff — write the payoff first.",
            "Context is a tax: keep setup to the absolute minimum the payoff requires.",
            "Never fade out — end on a loop, a button, or one earned CTA.",
            "Master a single format for 30 days before adding another."
          ],
          actions: [
            "Storyboard your next reel in four labeled beats on paper before you open the camera app.",
            "Rewatch your best-performing reel and mark the timestamp where each beat starts.",
            "Cut every frame of outro from your next edit — end within one second of the payoff landing."
          ],
          quiz: [
            { q: "In the four-beat structure, what should you write first?", options: ["The caption","The hook","The setup","The payoff"], answer: 3, why: "Reverse-engineering the hook from the payoff keeps the promise honest and deliverable." },
            { q: "Why is a long setup dangerous?", options: ["Context is a tax viewers pay grudgingly — they leave before the payload","Instagram penalizes context","It weakens the hashtags","It costs more to film"], answer: 0, why: "Viewers tolerate only the minimum context needed for the payoff; every extra second bleeds retention." },
            { q: "The strongest reel ending avoids which of these?", options: ["A single earned CTA","A slow outro thanking viewers","A seamless loop","A sharp final button"], answer: 1, why: "Outro dead air collapses completion rate — the reel should end within a second of the payoff." }
          ],
          drill: "Take one reel from a creator you admire and write out its four beats with timestamps. Then write the four beats for your own version of the same idea in your niche."
        },
        {
          id: "instagram-1-3",
          title: "The First Three Seconds: Hooks Built for Instagram",
          minutes: 9,
          xp: 50,
          skill: "viral",
          intro: "On Instagram you don't get three seconds — you get about one and a half before the thumb decides. Here's how to win that moment with all three hook channels firing at once.",
          sections: [
            { h: "The triple hook: three channels, one moment", body: "A reel opens on three channels simultaneously: what the viewer sees (visual), what they read (text overlay), and what they hear (first spoken line or sound). Weak reels hook on one channel and waste the other two — a talking head saying something great over a static, boring frame with no text. Strong reels stack all three: the visual is mid-action, the text overlay poses a tension, the first line makes a claim. Crucially, the three channels should not say the same thing. If your text repeats your spoken line word for word, you've spent two channels on one idea. Let the text add friction to the audio: you say 'I edited this reel in ten minutes,' the text reads 'client paid $1,200.' Now there's a gap the viewer needs closed — and closing gaps is what watching is." },
            { h: "Verbal hooks: patterns that earn the pause", body: "Six verbal hook patterns cover most winning reels. The negative warning: 'Stop putting hashtags in your comments.' The specific number: 'Three camera angles make any car look $50k more expensive.' The curiosity gap: 'Nobody talks about the real reason reels die at 200 views.' The bold claim: 'Your grid matters more than your last ten reels.' The direct callout: 'If you shoot food content, this will save you an hour a day.' The story cold-open: 'The client called at 11pm and said delete everything.' Notice what's absent: greetings. 'Hey guys, welcome back' is a scroll command. Write five hooks for every reel and say them out loud — the winner is usually obvious the moment you hear it. Under twelve words. Front-load the tension word." },
            { h: "Visual hooks: motion, oddity, mid-action", body: "The eye is drawn by three things before the brain reads a single word: motion, faces, and anomaly. Open with movement into frame — a car door swinging, a pour hitting the glass, you sitting down fast — rather than a static tableau warming up. Start mid-action: the cake already being sliced, the drone already banking. Viewers join stories in progress happily; what they won't do is wait for one to start. Anomaly works because the brain flags whatever breaks pattern: an espresso machine on a mountain, a suit in the gym, ninety-nine tripods in a hallway. And faces: eyes-to-lens with a real expression outperforms a neutral face reliably — expression is information. Test for yourself: scrub your feed and screenshot the ten frames that stopped you. Count how many contain motion, a face, or an anomaly. Usually ten." },
            { h: "Text hooks: six to nine words, top third", body: "Overlay text is the hook channel most beginners either skip or bloat. Rules that hold: six to nine words, one or two lines, placed in the top third where the eye lands first, clear of Instagram's UI. High contrast — white text with a subtle stroke or backing bar survives any background. It must be readable in under a second at arm's length on a phone; if you squint, cut words. Structure the line as tension, not summary: 'How I shoot luxury interiors' is a label; 'the $12 trick behind $2M listing videos' is a hook. Numbers and specifics beat adjectives every time — '9 words' outperforms 'a few words.' And keep the text on screen for at least the first two seconds; viewers who arrive muted or distracted use it as their entry point into the reel." }
          ],
          takeaways: [
            "Hook on all three channels at once — visual, text, audio — and make each add new tension.",
            "Verbal hooks: under twelve words, tension word first, never a greeting.",
            "Open mid-action with motion, a face, or an anomaly — never a static warm-up.",
            "Overlay text: 6-9 words, top third, high contrast, readable in one second."
          ],
          actions: [
            "Write five different hooks for your next reel, say them aloud, and film only the strongest.",
            "Re-edit an underperforming reel by replacing just its first two seconds and repost it as a Trial Reel.",
            "Screenshot the next ten frames that stop your scroll and label each: motion, face, or anomaly."
          ],
          quiz: [
            { q: "Your overlay text should relate to your spoken hook by:", options: ["Crediting the audio track","Repeating it exactly for reinforcement","Adding a new tension the audio doesn't contain","Summarizing the whole reel"], answer: 2, why: "Duplicated channels waste attention; a gap between text and audio creates a question the viewer stays to close." },
            { q: "Which opening is the strongest visual hook?", options: ["A slow fade-in from black","A static logo card","You waving and saying hi","A car door mid-swing as you enter frame"], answer: 3, why: "Motion and mid-action entry exploit the eye's pre-conscious attraction to movement — no warm-up, story already in progress." },
            { q: "Ideal overlay hook length is:", options: ["6-9 words","Two full sentences","As long as needed","One word"], answer: 0, why: "6-9 words is readable in under a second at phone distance while still carrying real tension." }
          ],
          drill: "Take one topic and write it as all six verbal hook patterns (warning, number, curiosity gap, claim, callout, cold-open). Post the best one; save the other five for future reels."
        },
        {
          id: "instagram-1-4",
          title: "Shooting Vertical: Framing, Light, and Safe Zones",
          minutes: 8,
          xp: 50,
          skill: "video",
          intro: "The phone in your pocket out-specs the cameras that shot early Netflix docs. What separates amateur reels from clean ones is not gear — it's five habits you can adopt today.",
          sections: [
            { h: "Settings before you ever press record", body: "Do this once and never think about it again. Shoot 4K at 30fps — the extra resolution lets you punch in 20-30% in the edit for a fake second angle without visible quality loss. Use the back camera; it's dramatically sharper than the selfie lens. Wipe the lens every single time you shoot — the number one cause of that hazy amateur glow is pocket grease. Lock exposure and focus by pressing and holding on your subject, so the image doesn't pulse brighter and darker mid-take as clouds move or you shift position. Turn on the grid overlay for level horizons. If your phone offers it, shoot in the highest bitrate or 'HDR off' mode for cleaner uploads — HDR footage often looks blown out once Instagram compresses it. Five settings, thirty seconds, permanent upgrade." },
            { h: "Framing for 9:16 and the safe zones", body: "Vertical framing has its own grammar. Put eyes in the top third of frame, not dead center — centered eyes leave awkward headroom and dead chin space. Leave deliberate negative space where your overlay text will live; think of the frame as a layout, not just a picture. Then respect the UI: Instagram's caption, audio credit, and CTA buttons bury roughly the bottom 20% of the frame, and the like/comment/share rail eats the right edge. Anything critical — faces, text, the product — lives in the middle 60% of the screen. Shoot slightly wider than feels right; you can always punch in, but you cannot recover a cropped-off forehead. Before any real shoot, record five seconds, open it in the Reels composer, and check what the interface actually covers." },
            { h: "Light is 80% of production value", body: "A $50k camera in bad light loses to a phone in good light — every time. The cheapest cinematic upgrade on earth is a window: put your subject facing it at roughly 45 degrees, camera between window and subject, and you get soft directional light with natural falloff that flatters every face. Kill overhead lights; they carve raccoon shadows under eyes. Outdoors, overcast is a gift — the sky becomes a giant softbox — and the hour after sunrise or before sunset paints everything golden and expensive. Avoid harsh midday sun on faces; if you're stuck in it, find open shade and let the bright background blow out slightly. When you're ready to spend, one $30-100 LED panel with a diffuser as a key light will do more for your footage than any lens, gimbal, or camera-body upgrade." },
            { h: "Stability, coverage, and shooting 3x", body: "Handheld is fine — shaky is not. Tuck your elbows into your ribs, hold the phone with both hands, and move from your knees like you're carrying a full glass of water. Hold every shot for at least four to five seconds even if you'll only use one; you need clean in and out points to cut on. Then shoot coverage like an editor: every scene in a wide (establishes place), a medium (carries action), and a tight (delivers detail and emotion). Add one insert — hands, texture, a reflection — per scene. The rule that saves every edit: shoot three times more than you think you need. Fifteen minutes of deliberate coverage produces a better 30-second reel than an hour of random clips, because editing is selection, and you can't select what you never shot." }
          ],
          takeaways: [
            "4K/30, back camera, wiped lens, locked exposure — set once, benefit forever.",
            "Eyes in the top third; keep everything critical inside the middle 60% of frame, clear of IG's UI.",
            "One window at 45 degrees beats expensive gear — light is 80% of production value.",
            "Shoot wide/medium/tight coverage of every scene and capture 3x more than you need."
          ],
          actions: [
            "Set your camera to 4K/30 and turn on the grid overlay right now.",
            "Film the same 10-second clip facing a window, then under ceiling lights — compare them side by side.",
            "On your next shoot, capture every scene in wide, medium, and tight before moving on."
          ],
          quiz: [
            { q: "Why shoot 4K when Instagram delivers at 1080p?", options: ["Instagram ranks 4K higher","It lets you punch in 20-30% in the edit as a fake second angle","It makes files smaller","4K uploads skip compression"], answer: 1, why: "The resolution headroom means crops and punch-ins stay sharp after Instagram's 1080p delivery." },
            { q: "Where should critical content sit in a vertical frame?", options: ["The bottom fifth","Anywhere — the UI is transparent","The middle 60%, clear of caption and side-rail zones","The far right edge"], answer: 2, why: "Instagram's caption block and engagement rail cover the bottom and right of the frame." },
            { q: "The single cheapest way to make footage look professional is:", options: ["Shooting at noon in full sun","A gimbal","A better lens","A window at 45 degrees to your subject"], answer: 3, why: "Soft directional window light adds more perceived production value than any equipment purchase." }
          ],
          drill: "Shoot one everyday action (making coffee, opening a laptop) as a wide, a medium, a tight, and one insert — then cut them into a 10-second sequence. Notice how coverage alone creates rhythm."
        },
        {
          id: "instagram-1-5",
          title: "Captions, Hashtags, and Instagram SEO",
          minutes: 8,
          xp: 50,
          skill: "marketing",
          intro: "Hashtags stopped being a growth hack years ago — but captions and keywords quietly became one. This lesson rebuilds your metadata game for how Instagram search actually works now.",
          sections: [
            { h: "The first line is your second hook", body: "Only the first line of your caption shows under a reel before '...more' — which makes it prime real estate, not an afterthought. Its job mirrors your video hook: reward the tap or deepen the tension. Weak first lines describe ('Had fun shooting this one'); strong first lines extend the promise ('The full lighting setup costs less than dinner') or open a loop the video didn't close ('The third angle is the one clients pay for'). After the fold, structure for skimmers: one idea per line, blank lines between thoughts, a payload the video couldn't fit — the recipe, the settings, the checklist. Long captions work when they earn their length; time spent reading counts toward the dwell signals Instagram watches. End with exactly one CTA that matches the reel's job: follow, save, send, or comment." },
            { h: "Keywords are the new hashtags", body: "Instagram search has grown into a real discovery surface — people type 'luxury kitchen ideas' and 'how to edit reels' into it daily, and Instagram has been open about ranking results on keyword relevance. The system reads keywords from your caption, your on-screen text, your name field, and — because speech is transcribed — the words you actually say in the video. So say your keywords out loud. A reel about golden-hour car photography should contain the spoken phrase 'golden hour car photography,' have it in the caption's first two lines, and echo it in the overlay text. This isn't keyword stuffing; it's writing like a human who names things precisely instead of vaguely. 'This trick is insane' is invisible to search. 'This CapCut speed-ramp trick' is findable for years — search traffic is the closest thing Instagram has to evergreen distribution." },
            { h: "Hashtags in the current era: metadata, not reach", body: "Instagram removed the ability to follow hashtags and Mosseri has said plainly that hashtags don't meaningfully drive distribution — they help the system categorize content, little more. So the old rituals are dead: no 30-tag blocks, no #fyp #viral #explorepage confetti, no hiding tags in the first comment like contraband. Current best practice: three to five hashtags that describe the content the way a librarian would — niche and specific (#carphotography, #reelsediting, #luxuryrealestate), not aspirational (#rich, #blessed, #viralreels). Think of them as one more classification hint stacked on top of your keywords, worth thirty seconds of attention and no more. If you're spending more time on hashtags than on your hook, your effort allocation is inverted. The hook moves thousands of views; the hashtags move dozens." },
            { h: "Comments: the metadata you don't write", body: "Comments are ranking fuel — comments per reach is a core signal — and you have more influence over them than you think. Seed conversation by ending with a question that's cheap to answer ('Which edit was smoother, A or B?') rather than an essay prompt. Controversy-lite works: take a defensible position ('overlay text is ruining luxury content') and let the disagreement fill your comment section. Then work the room: reply to every comment in the first hour — each reply doubles the comment count and tells Instagram the post is generating conversation, and replying within the test-batch window matters most. Pin the comment that best extends the discussion or answers the obvious question. One more move: reply to a good comment with a follow-up reel — Instagram's reply-with-reel feature turns one viewer's question into your next post's hook, pre-validated." }
          ],
          takeaways: [
            "The caption's first line is a second hook — extend the promise or open a new loop.",
            "Say your keywords out loud, write them in the caption, and echo them in overlay text — search is evergreen reach.",
            "Use 3-5 librarian-style hashtags as metadata; the 30-tag era is over.",
            "Reply to every comment in the first hour — replies double comment count inside the test window."
          ],
          actions: [
            "Rewrite the first caption line on your next reel until it adds tension the video doesn't already contain.",
            "Pick your core topic phrase and make sure your next reel says it aloud, captions it, and overlays it.",
            "Set a 15-minute timer after your next post and reply to every single comment."
          ],
          quiz: [
            { q: "According to Instagram's own leadership, hashtags primarily:", options: ["Help categorize content, with little distribution effect","Are required for the Reels tab","Boost older posts","Drive massive reach"], answer: 0, why: "Mosseri has said hashtags don't meaningfully drive reach — they're classification hints, so 3-5 specific tags suffice." },
            { q: "Why say your keywords out loud in the video?", options: ["It sounds more confident","Spoken audio is transcribed and indexed for search","It replaces the caption","Instagram boosts loud audio"], answer: 1, why: "Speech-to-text feeds Instagram search, so spoken keywords make the reel findable." },
            { q: "The best comment-bait question is:", options: ["A deep philosophical prompt","No question at all","A cheap-to-answer either/or question","Asking people to tag five friends"], answer: 2, why: "Low-effort questions ('A or B?') maximize comment volume because answering costs the viewer two seconds." }
          ],
          drill: "Take your niche's five most common search phrases (type them into IG search and note the autocomplete). Write one reel concept per phrase where the phrase appears spoken, on screen, and in line one of the caption."
        },
        {
          id: "instagram-1-6",
          title: "A Profile That Converts Views into Follows",
          minutes: 7,
          xp: 50,
          skill: "branding",
          intro: "A viral reel sends thousands of strangers to your profile — where most accounts lose 95% of them in four seconds. Your profile is a landing page. Build it like one.",
          sections: [
            { h: "The four-second audit", body: "A visitor from a reel gives your profile roughly four seconds: photo, name line, first bio line, top of grid — then follow or gone. Run the audit on yourself. Profile photo: does it read at thumbnail size, face or logo clearly visible? Name field: this is searchable, so it should carry your keyword, not just your name — 'Marcus | Car Photography' beats 'Marcus' for discovery and for instant comprehension. Bio line one: who it's for and what they get, in plain words — 'Reels editing systems for real estate agents,' not 'Dreamer. Doer. Coffee addict.' Bio line two: proof or specificity — years, clients, results, niche. Line three: one CTA with one link. Every element answers the visitor's only real question: if I follow, what do I get next week?" },
            { h: "Pinned reels are your trailer", body: "You get three pins at the top of your grid — treat them as a movie trailer for the follow decision. Pin one: your best performer, because social proof compounds and it's your strongest first impression. Pin two: your format sampler — the reel that best represents what you post weekly, so expectations get set honestly. Pin three: your conversion piece — the reel that most often turns viewers into followers or customers (check profile visits and follows per reel in your insights to find it). Refresh pins monthly; a six-month-old pin with dated numbers quietly ages your whole account. One more habit: when any reel starts running hot, pin it for the duration of its surge — profile visitors arriving from that reel get instant confirmation they're in the right place." },
            { h: "Grid, highlights, and first impressions", body: "Your grid now previews in a taller 3:4 crop, so covers designed as squares get their tops and bottoms shaved — design for 3:4 and check every cover before publishing. The grid's job is pattern: a visitor should sense a repeatable theme in one glance — consistent tones, recurring composition, readable cover titles. It doesn't need to be rigid; it needs to be coherent. Highlights are your FAQ shelf: 'Start here,' 'Results,' 'Gear,' 'About' — four or five, with matching covers, each answering a question a near-follower actually has. Delete the 2019 vacation highlights. Everything above the fold is either building the case for the follow or diluting it; there is no neutral pixel on a profile. Audit monthly with a stranger's eyes, or better, hand your phone to an actual stranger." },
            { h: "The repeatable promise", body: "People don't follow content; they follow a repeatable promise — the expectation that a specific kind of value arrives on a schedule. 'Follow' is a subscription decision, and subscriptions need a clear product. This is why accounts with one sharp lane grow faster than talented generalists: 'daily 30-second lighting tutorials' is a subscribable promise; 'my life and interests' is not, until you're already famous. Make the promise explicit. Say it in your bio ('New car cinematography breakdown every Tuesday'), say it at the end of high-performing reels ('I post one of these every week'), and then — the part that actually builds the habit — keep it with unreasonable consistency. The fastest audit in this course: write your promise in ten words. If you can't, your visitors can't either, and the follow button stays gray." }
          ],
          takeaways: [
            "Visitors decide in four seconds: photo, keyworded name field, benefit-first bio, coherent grid.",
            "Use your three pins as a trailer: best performer, format sampler, conversion piece.",
            "Design covers for the 3:4 grid crop and curate highlights like an FAQ shelf.",
            "Growth follows a ten-word repeatable promise — state it, then keep it relentlessly."
          ],
          actions: [
            "Rewrite your name field today to include your niche keyword.",
            "Write your repeatable promise in ten words or fewer and put it in bio line one.",
            "Set your three pinned reels using insights: best reach, best format sampler, most follows-per-view."
          ],
          quiz: [
            { q: "Why put a keyword in your name field instead of just your name?", options: ["Instagram requires it","It increases reel retention","It looks more professional","The name field is searchable and instantly communicates your lane"], answer: 3, why: "The name field feeds Instagram search and answers 'what do I get?' in the four-second audit window." },
            { q: "Your three pinned reels should be:", options: ["Best performer, format sampler, conversion piece","Three personal moments","Your three newest posts","Three random favorites"], answer: 0, why: "Pins are a trailer for the follow decision — proof, expectation-setting, and conversion." },
            { q: "The core reason people tap follow is:", options: ["A witty bio","A repeatable promise they want delivered on schedule","High follower counts","Frequent posting alone"], answer: 1, why: "Following is a subscription decision, and subscriptions require a clear, repeatable product." }
          ],
          drill: "Hand your profile to someone who doesn't follow you and give them five seconds. Ask them: what does this account post, and who is it for? If they can't answer both, fix the element that failed."
        }
      ]
    },
    {
      id: "instagram-2",
      level: "Intermediate",
      title: "Retention and the Edit",
      description: "Engineer watch time second by second: retention mechanics, Instagram-native editing styles, text systems, sound strategy, and a grid that converts.",
      lessons: [
        {
          id: "instagram-2-1",
          title: "Retention Engineering: Holding Every Second",
          minutes: 10,
          xp: 60,
          skill: "viral",
          intro: "Views are a lagging indicator. Retention is the lever. This lesson teaches you to read a retention curve like an editor and fix the exact second where viewers leave.",
          sections: [
            { h: "Reading the curve: three failure signatures", body: "Open any reel's insights and study the retention graph — it's a confession. Signature one: the cliff, a steep drop in seconds 0-3. That's a hook failure; the promise wasn't clear or the frame was static. Signature two: the slow bleed, a steady downward slope with no plateau. That's a pacing failure — nothing is wrong, but nothing is pulling either; viewers leave the moment attention wanders. Signature three: the mid-reel ledge, a sudden drop at a specific timestamp. Scrub to that second and you'll find the culprit: a topic change, a long static shot, an ad-smelling moment, a lull before the payoff. Working targets to aim at, not platform gospel: hold well over half your viewers past second three, and push completion above 80% on anything under fifteen seconds. Diagnose first; the fix depends on which signature you see." },
            { h: "Pattern interrupts every two to four seconds", body: "Attention decays on a timer, and the timer is short. The craft answer is the pattern interrupt: a deliberate change that resets the viewer's attention clock before it expires. The toolkit — a cut to a new angle, a punch-in (that 20-30% zoom your 4K footage allows), a B-roll insert, a text pop, a sound effect, a speed change, a prop entering frame. Rhythm matters more than quantity: something should shift every two to four seconds in standard content, faster in montages, slower — deliberately — in luxury content where the held shot is the statement. The mistake is randomness. Interrupts should land on structure: a new angle for each new point, a punch-in on the key phrase, B-roll exactly when you name the thing. Watch any top editor's reel frame by frame; the interrupts are metronomic." },
            { h: "Open loops and delayed payoffs", body: "A pattern interrupt resets attention; an open loop holds it hostage. Open a question early that only the ending answers: 'the third mistake is the one that cost me a client' forces a viewer to survive mistakes one and two. Structural versions: the countdown ('three setups, saving the best for last'), the teased reveal (show the finished plate for half a second, then cut to raw ingredients), the withheld number ('what this shoot cost — at the end'). Stack loops at different scales: a micro-loop per section ('but here's where it gets weird') nested inside the macro-loop of the reel's core promise. Two rules keep this honest. Close every loop you open — an unpaid loop is a betrayed viewer who won't trust your next hook. And never delay a payoff past the value you're providing along the way; loops buy patience, they don't replace substance." },
            { h: "Cut the dead air — all of it", body: "The fastest retention gain isn't adding anything; it's deleting. First pass on any talking edit: strip every breath, 'um,' false start, and the half-second gaps between sentences. Tools automate this — CapCut and Descript-style editors detect silence — but do a manual pass too, because the worst dead air isn't silence, it's redundancy: the sentence that restates the previous one, the second example proving an already-proven point, the throat-clearing intro before the actual intro. A disciplined rule: your rough cut should lose 20-40% of its runtime before polish. Then apply the harshest test in editing — play each second and ask, does this earn the next second? Not 'is it good' — earning is stricter. Viewers don't leave because something bad happened. They leave because nothing was happening. Silence in the room where you edit; ruthlessness on the timeline." }
          ],
          takeaways: [
            "Diagnose retention drops by signature: cliff = hook, slow bleed = pacing, ledge = one bad moment at a timestamp.",
            "Fire a structured pattern interrupt every 2-4 seconds — cuts, punch-ins, B-roll, text pops, SFX.",
            "Open loops early and close every one; nested loops at micro and macro scale carry viewers to the end.",
            "Cut 20-40% of your rough cut: every second must earn the next."
          ],
          actions: [
            "Pull the retention graph on your last three reels and label each drop: cliff, bleed, or ledge.",
            "Re-edit one old reel adding a pattern interrupt every three seconds, then compare completion rates.",
            "On your next edit, do a silence-and-redundancy pass before any polish — target minus 25% runtime."
          ],
          quiz: [
            { q: "A sudden retention drop at exactly 0:07 most likely means:", options: ["Wrong posting time","Bad hashtags","A specific weak moment at that timestamp — scrub and find it","The reel is too short"], answer: 2, why: "A mid-reel ledge points at one culpable moment: a topic shift, static shot, or lull you can locate and cut." },
            { q: "Pattern interrupts work best when they are:", options: ["Only sound effects","Saved for the ending","Random and constant","Structural — landing on new points, key phrases, and named objects"], answer: 3, why: "Interrupts tied to structure reset attention while reinforcing meaning; random ones become noise." },
            { q: "The rough-cut discipline taught here is:", options: ["Lose 20-40% of runtime by cutting dead air and redundancy","Keep everything and speed it up 2x","Cut only the intro","Add B-roll until it feels full"], answer: 0, why: "Deletion is the fastest retention gain — viewers leave when nothing is happening." }
          ],
          drill: "Take your worst-retaining reel, find its single biggest drop-off second, and re-edit only that moment (cut it, replace it, or cover it with B-roll). Repost as a Trial Reel and compare curves."
        },
        {
          id: "instagram-2-2",
          title: "Editing Styles That Win on Instagram",
          minutes: 10,
          xp: 60,
          skill: "editing",
          intro: "Instagram is not TikTok with different fonts. The feed has its own aesthetic economy — and editors who understand it make the same footage perform twice as hard.",
          sections: [
            { h: "The Instagram aesthetic: polish wins here", body: "Every platform trains its audience. TikTok rewards raw, chaotic, front-camera authenticity; Instagram — born as a photography app — still pays a premium for intentionality: composed frames, considered color, typography that looks designed rather than defaulted. This doesn't mean sterile. It means choosing a lane and executing it cleanly. The four dominant IG editing lanes: clean lifestyle (natural light, soft grade, unhurried cuts), luxury cinematic (dark tones, specular highlights, slow moves, foley-heavy sound), kinetic montage (beat-locked cuts, speed ramps, whips), and deadpan lo-fi (static frame, dry text, one joke — polish disguised as none). Pick one as your home lane. The account that ships one style thirty times builds recognition; the account that ships six styles five times each builds confusion. Your lane is a brand asset before it's an edit choice." },
            { h: "The cut vocabulary every IG editor needs", body: "Learn the names; they sharpen your eye. Cut on action: cut mid-movement — hand reaching, door closing — so the motion carries across the splice and hides it. Match cut: link two shots by shape or motion (round steering wheel to round espresso cup) for effortless scene changes. J-cut: the next shot's audio arrives before its picture, pulling viewers forward — the single most underused trick in voiceover reels. L-cut: picture changes while previous audio lingers. Whip pan: end shot A panning fast, start shot B panning the same direction; the blur welds them. Jump cut: deliberately chop time in a static frame — the grammar of talking-head pacing. Speed ramp: velocity shifts inside one clip, slow-fast-slow, for drama on reveals. Use each because the moment calls for it, not because the effect exists. Motivated cuts are invisible; unmotivated ones are noise." },
            { h: "Cutting to music like a pro", body: "Beat-synced editing is table stakes; the pros are playing a subtler game. First, cut slightly early: place the cut two to three frames before the beat, so the new shot lands as the beat hits — cutting exactly on the beat reads late because the eye needs a moment to register. Second, vary shot length: a montage of uniform one-second shots hypnotizes in the bad way. Alternate half-second hits with two-second breathers; tension comes from variation. Third, cut the structure, not just the beat: save your hero shot for the drop, put your B-roll during verses, and treat a musical pause as a chance for a freeze or a speed ramp. Fourth, mix wide-medium-tight rhythmically — three tights in a row feels claustrophobic, three wides feels distant. Mute the music occasionally while editing; if the cut still has rhythm silent, it's genuinely well cut." },
            { h: "Tools and export: protecting your pixels", body: "The tool matters less than the operator, but know the landscape. CapCut remains the fastest path from phone to polished reel — templates, auto-captions, beat detection. Instagram's own Edits app is built for exactly this workflow and exports clean, watermark-free video with IG-native fonts. Premiere Pro or DaVinci Resolve earn their complexity when you need real color work, multi-format masters, or team workflows. Whatever you cut in, protect the export: 1080x1920, high bitrate (30-50 Mbps is safe headroom), H.264 or HEVC. Never download a video from one platform and re-upload it elsewhere — double compression is how footage gets that greasy, artifacted look, and watermarks kill recommendations outright. Keep master files; export fresh per platform. And upload from the original file over Wi-Fi so Instagram's compressor gets the best possible source to chew on." }
          ],
          takeaways: [
            "Instagram pays a premium for intentional polish — pick one editing lane and own it for 30 posts.",
            "Master the core cut vocabulary: cut on action, match cut, J-cut, L-cut, whip pan, jump cut, speed ramp.",
            "Cut 2-3 frames before the beat, vary shot lengths, and save the hero shot for the drop.",
            "Export 1080x1920 at high bitrate from master files — never re-upload compressed or watermarked video."
          ],
          actions: [
            "Name your home editing lane in writing and list its three signature moves.",
            "Recut one existing montage placing every cut 2-3 frames ahead of the beat — feel the difference.",
            "Add one J-cut to your next voiceover reel: let the audio of the next scene start half a second early."
          ],
          quiz: [
            { q: "A J-cut is:", options: ["A jump cut in the middle of a sentence","Audio of the next shot arriving before its picture","A vertical crop technique","Cutting on a drum hit"], answer: 1, why: "Leading with the incoming audio pulls viewers forward into the next scene before they see it." },
            { q: "Why cut 2-3 frames BEFORE the musical beat?", options: ["It avoids copyright detection","It saves timeline space","The new shot lands as the beat hits, since the eye needs a beat to register","Instagram syncs audio automatically"], answer: 2, why: "Cutting exactly on the beat reads late; the slight early offset makes impact land on the hit." },
            { q: "Double compression happens when you:", options: ["Add two LUTs","Export at 4K","Use two fonts","Download a compressed video and re-upload it to another platform"], answer: 3, why: "Re-uploading already-compressed video stacks artifacts — always export fresh from master files." }
          ],
          drill: "Find a match cut opportunity in your b-roll library (two objects sharing a shape or motion) and build a 3-shot sequence around it. Bonus: hide one cut on action inside the same sequence."
        },
        {
          id: "instagram-2-3",
          title: "Text on Screen: Hierarchy, Timing, Placement",
          minutes: 8,
          xp: 60,
          skill: "editing",
          intro: "On-screen text is a second voice track — it catches skimmers, reinforces key beats, and feeds Instagram's search index. Most creators treat it as decoration. Editors treat it as typography.",
          sections: [
            { h: "One idea per card, six to nine words", body: "Text on screen fails in two directions: too little (a bare auto-caption doing nothing) or too much (a paragraph nobody can read at reel speed). The working unit is the card — one idea, six to nine words, on screen long enough to be read 1.5 times. The math: average readers process roughly three words per second on a phone, so a seven-word card needs about three seconds minimum. Hierarchy inside a card comes from contrast: one or two keywords emphasized by size, weight, or a single accent color — never all three at once. Numbers, prices, and proper nouns are always emphasis candidates; connective words never are. If a sentence genuinely needs fifteen words, split it into two sequential cards and let the first one end mid-tension so the second earns its moment. Text is pacing. Cards are cuts you can read." },
            { h: "Timing: text as rhythm, not wallpaper", body: "The amateur move is slapping one caption block over the whole reel. The pro move is choreography: text enters in sync with the beat it belongs to — landing with the spoken phrase, the musical hit, or the visual reveal it annotates. Pop-in animation should be fast and small: two to three frames of scale-up (roughly 90% to 100%) reads as snappy; half-second bounces read as a PowerPoint. Remove text the moment its job is done; lingering text competes with the next moment. For talking content, styled auto-captions are now baseline viewer expectation — but edit them: fix errors (they're indexed by search), break lines at natural speech pauses, and emphasize the payoff words. The test is simple: watch your reel muted. If the text alone carries the argument's skeleton, skimmers are served. Then watch it with sound and confirm the text never fights the voice." },
            { h: "Placement: the frame is a layout", body: "Placement rules come from two masters: Instagram's interface and the human eye. The interface: the bottom fifth of frame sits under the caption and audio credit, and the right edge lives beneath the like/comment/share rail — text there is furniture nobody sees. The eye: attention lands top-third first, which is why hooks belong there; supporting text sits center-safe; and nothing important ever goes within the outer 5% margin, which some devices crop. Beyond safety, placement is composition — that negative space you shot in lesson four exists precisely so text has a home that doesn't sit on your subject's face. Keep placement consistent across the reel: text that teleports around the frame forces the eye to hunt, and hunting is friction, and friction is drop-off. Pick zones — hook zone, body zone — and stay in them like a designer working a grid." },
            { h: "A type system, not a font choice", body: "Brands don't pick fonts per post; they run a system. Yours needs exactly two typefaces: a display face with personality for hooks and hero cards, and a workhorse (clean geometric or grotesque sans) for captions and body text. Then lock the variables: two sizes, one accent color pulled from your grade, one emphasis style, same stroke-or-shadow treatment on every reel. Legibility rules that never bend: white text with a 2-4px dark stroke or a subtle backing bar survives any footage; thin weights die on video; all-caps works for three-word hooks and murders twelve-word sentences. Save the whole thing as presets in CapCut, Edits, or Premiere so applying your system takes seconds. The payoff compounds: after thirty reels, viewers recognize your content mid-scroll before they register your name — typography quietly doing brand work while it does retention work." }
          ],
          takeaways: [
            "Work in cards: one idea, 6-9 words, on screen for ~3 words per second of reading time.",
            "Choreograph text to beats and remove it when its job is done — the muted watch test tells the truth.",
            "Respect UI safe zones: bottom fifth and right rail are dead; hooks live top-third.",
            "Run a locked type system — two fonts, two sizes, one accent — saved as presets."
          ],
          actions: [
            "Build your text preset today: display font, body font, accent color, stroke treatment — save it in your editor.",
            "Watch your last reel muted; note every moment the text fails to carry the argument, and fix the worst one.",
            "Re-time one reel's text so every card lands exactly on its spoken phrase or beat."
          ],
          quiz: [
            { q: "How long should a seven-word text card stay on screen?", options: ["About three seconds — viewers read ~3 words per second","The whole reel","Half a second","One second"], answer: 0, why: "Cards need enough time to be read about 1.5 times at phone reading speed." },
            { q: "Which zone is safe for your hook text?", options: ["Far right edge","Top third, inside the margins","Under the audio credit","Bottom fifth of frame"], answer: 1, why: "The eye lands top-third first, and that zone is clear of Instagram's caption block and engagement rail." },
            { q: "A durable text system uses:", options: ["Five colors to stay exciting","A new font per post for variety","Two typefaces with locked sizes, one accent color, saved as presets","Only auto-captions untouched"], answer: 2, why: "Constraints create recognition and speed; unedited auto-captions and font-hopping create noise." }
          ],
          drill: "Take one 30-second reel script and design its complete text pass on paper first: every card, its exact words, its zone, and the beat it enters on. Then execute it in your editor."
        },
        {
          id: "instagram-2-4",
          title: "Sound Strategy: Trending Audio, Original Audio, and Silence",
          minutes: 8,
          xp: 60,
          skill: "viral",
          intro: "Sound is half the reel — it sets mood in the first half-second, signals trend membership to the algorithm, and separates premium content from noise. Here's the full audio playbook.",
          sections: [
            { h: "How audio actually affects distribution", body: "Trending audio is not a magic reach button, but it does two real things. First, it gives the system a classification hint — reels sharing an audio get grouped, and if that audio's cluster is hot, your entry gets auditioned against warm demand. Second, it borrows mood instantly: a recognized sound carries pre-loaded emotional context, so your first second works less hard. Finding trends early: watch for the arrow icon next to audio names in your feed (Instagram's rising-audio marker), check what appears repeatedly in your niche's top reels this week, and save candidates to your audio library the moment you see them. Timing matters — a trend is a wave, and you want days two through ten, not week four. One caveat that outranks all of this: business accounts face licensing limits on commercial music, so check availability before building a concept around a song." },
            { h: "Original audio and the voiceover mix", body: "For educational and story content, your voice is the asset — original audio also means that if a reel hits, other creators using your sound become distribution. Record clean: quiet room, phone or mic 15-30cm from your mouth, soft furnishings to kill echo; bathroom reverb reads amateur instantly. Then mix with intent. Voice sits on top, clear and consistent. Music underneath at a level where you'd forget it's there until it stops — if you can transcribe the lyrics while following the speech, it's too loud. Duck the music further during dense information and let it breathe back up during b-roll pauses. Choose instrumental tracks under voiceover; lyrics fight speech for the same processing channel in the listener's brain. Master loud enough that phone speakers carry it, but leave headroom — distorted peaks on a reveal moment undo a whole edit's polish." },
            { h: "Sound design: the invisible retention layer", body: "Watch a top creator's reel twice — once for picture, once with eyes closed. The second pass reveals the machinery: a whoosh under every text pop, a soft click on each cut, a riser building into the reveal, a bass hit landing on the payoff. Sound effects are pattern interrupts for the ear, resetting attention without touching the visuals. The luxury tier goes further with foley: the door thunk of a German sedan, espresso hitting the cup, the zip of a garment bag — recorded close and mixed forward, these textures create the ASMR-adjacent intimacy that premium content trades on. Application rules: SFX should be felt, not noticed — mix them low; match acoustic character to brand (airy and soft for wellness, tight and mechanical for automotive); and never let an effect land without a visual reason. Two or three well-placed sounds per reel beat twenty." },
            { h: "Strategic silence and the sound-off viewer", body: "Silence is a pattern interrupt too — maybe the strongest one. When music cuts out completely for a beat before the reveal, the drop hits twice as hard; contrast is the mechanism, and most creators leave it unused because silence feels like risk. Luxury and ASMR-lane content can run ambient-only — no music at all, just foley and room tone — and the confidence of that choice is itself a status signal. Meanwhile, design for the viewer who scrolls muted or half-listening: your text pass (last lesson) must carry the argument alone, key numbers belong on screen, and the reel's core promise should be legible without a single decibel. The audit: watch once muted — does it work? Once with eyes closed — does it work? A reel that passes both tests is bulletproof; most reels pass neither." }
          ],
          takeaways: [
            "Trending audio classifies your reel into hot clusters and borrows mood — ride waves in days 2-10.",
            "Mix voice on top, instrumental music tucked under, ducked during dense info.",
            "SFX and foley are ear-side pattern interrupts — felt, not noticed, and always visually motivated.",
            "A dropped-out beat of silence doubles a reveal; muted-watch and eyes-closed tests certify the mix."
          ],
          actions: [
            "Save five rising audios (arrow icon) from your niche to your library this week.",
            "Remix your last voiceover reel: duck the music 6dB under speech and add one whoosh, one click, one riser.",
            "Build one reel with a full music dropout in the beat before its reveal."
          ],
          quiz: [
            { q: "The real distribution value of trending audio is:", options: ["It unlocks longer reels","It boosts hashtag reach","It bypasses the test batch","Classification into a hot content cluster plus instant borrowed mood"], answer: 3, why: "Shared audio groups reels together for recommendation, and familiar sounds preload emotional context." },
            { q: "Under a voiceover, music should be:", options: ["Instrumental and tucked low, ducked during dense speech","Absent always","Loud enough to sing along","Lyrical and prominent"], answer: 0, why: "Lyrics compete with speech for the listener's language processing; the bed supports, never competes." },
            { q: "Cutting all sound for a beat before a reveal works because:", options: ["It saves file size","Contrast makes the drop land harder","Instagram boosts quiet reels","Viewers rewind to check their volume"], answer: 1, why: "Silence is the strongest ear-side pattern interrupt — the payoff gains impact from the gap before it." }
          ],
          drill: "Watch your niche's current #1 performing reel with your eyes closed and list every sound event with its timestamp. Recreate that exact sound map under one of your own edits."
        },
        {
          id: "instagram-2-5",
          title: "Covers and the Grid: Your Profile Is a Storefront",
          minutes: 8,
          xp: 60,
          skill: "photo",
          intro: "Reels get discovered in the feed, but follows happen on the profile — and binge sessions happen on the grid. Cover design is conversion design.",
          sections: [
            { h: "Why covers earn disproportionate returns", body: "A cover does its work in three places: on your grid, where a profile visitor decides whether to binge; in search and Explore surfaces, where it competes as a thumbnail; and months later, when your reel resurfaces to someone scrolling your profile for proof you're worth hiring. Creators obsess over the first three seconds of video and then let Instagram grab a random blurry frame as the cover — surrendering the storefront. The economics: a cover takes five extra minutes per reel and keeps working for the lifetime of the account. Profile viewers are your highest-intent audience — they clicked through, they're evaluating — and the grid is the merchandising wall they judge. Treat every cover as a small poster: one image, one title, one promise. Accounts that binge well grow compounding followers from old content; covers are the interface of the binge." },
            { h: "Designing a cover that reads at thumbnail size", body: "The cover's enemy is size: on the grid it renders smaller than a postage stamp. Design for that reality. Title text: three to five words, huge — think 25-40% of frame height for the text block — in your display font, high contrast against a clean area of the image. Image: one subject, clear silhouette, no clutter; a face with a genuine expression or a hero object shot works; wide busy scenes die at thumbnail size. Composition: keep the title and subject inside the center, because the grid now crops previews to 3:4 while the full cover is 9:16 — design in 9:16, verify in 3:4, and never place text in the crop-loss zones at top and bottom. The acid test: zoom your phone out until the cover is thumbnail-sized. Read the title in one second? Ship it. Squint even slightly? Redesign." },
            { h: "Grid systems: pattern without prison", body: "A strong grid reads as a system in one glance — and systems are built from constraints, not accidents. Choose yours: a consistent grade (same LUT family, same warmth) so tones harmonize; a recurring composition motif; one accent color that repeats; cover templates that alternate in a rhythm (title-card, clean image, title-card) so the grid has visual breathing room. What you're engineering is the visitor's one-glance inference: 'this account does one thing, well, on purpose.' Avoid the two failure modes. Prison: a grid so rigid (checkerboards, elaborate multi-post mosaics) that it dictates content instead of serving it — mosaics also shatter when the grid crop changes. Chaos: six styles, six fonts, random tones — the visual signature of an account that hasn't decided what it is. Audit monthly at arm's length: blur your eyes and check that the pattern survives." },
            { h: "The five-minute cover workflow", body: "Make covers a production step, not an afterthought. During the edit, flag your strongest frame — or better, shoot a dedicated cover still during the shoot itself: five seconds of your subject holding the hero pose, shot in the same setup, gives you a clean, sharp source no video frame-grab matches. Drop it into your cover template (build one in Canva, CapCut, or Edits with your fonts and accent color pre-loaded), swap image and title, export at 1080x1920. Upload it in the Reels composer's cover step and — critical, missed constantly — check the 3:4 grid preview crop before publishing. Keep a running document of cover titles: they're promises, so write them like hooks, not labels ('Shot this on a phone' beats 'BTS shoot day'). Total cost: five minutes. Total effect: your storefront stops depending on whichever frame the algorithm grabbed while you weren't looking." }
          ],
          takeaways: [
            "Covers work on the grid, in search, and in future client evaluations — never let IG auto-pick a frame.",
            "Design covers as posters: 3-5 word title, one clear subject, readable at thumbnail size.",
            "Build the grid as a system — consistent grade, repeating accent, template rhythm — checked with the blur test.",
            "Shoot a dedicated cover still on set and always verify the 3:4 grid crop before publishing."
          ],
          actions: [
            "Build your reusable cover template today with fonts and accent color pre-loaded.",
            "Replace the covers on your three most-viewed reels with designed versions.",
            "On your next shoot, capture a five-second dedicated cover still for every concept."
          ],
          quiz: [
            { q: "Why shoot a dedicated cover still instead of grabbing a video frame?", options: ["It changes the aspect ratio","Video frames are copyrighted","A posed still is sharper and cleaner than any frame grab","Instagram requires stills"], answer: 2, why: "Motion blur and compression make frame grabs soft; a deliberate still gives poster-grade source material." },
            { q: "The grid preview crops your 9:16 cover to:", options: ["16:9","It doesn't crop","1:1 square","3:4 — so keep text and subject centered"], answer: 3, why: "The profile grid shows a 3:4 crop, so anything near the top and bottom edges of a 9:16 cover is lost." },
            { q: "A healthy grid system avoids:", options: ["Elaborate multi-post mosaics that dictate content","Cover templates","A consistent color grade","A repeating accent color"], answer: 0, why: "Mosaic grids imprison content decisions and break whenever Instagram changes the grid crop." }
          ],
          drill: "Zoom out on your profile until your grid looks like a contact sheet. Score yourself 1-10 on 'reads as a system in one glance.' Identify the single post breaking the pattern and redesign its cover."
        }
      ]
    },
    {
      id: "instagram-3",
      level: "Advanced",
      title: "Formats, Stories, and Systems",
      description: "Ride trends while they're rising, weaponize carousels and Stories, build DM-first funnels, and read your analytics like an editor reads a timeline.",
      lessons: [
        {
          id: "instagram-3-1",
          title: "Trend-Jacking: Riding Formats While They're Rising",
          minutes: 9,
          xp: 75,
          skill: "viral",
          intro: "Trends are free distribution — but only inside a narrow window, and only when you adapt the skeleton instead of copying the skin. This is the professional's trend operating procedure.",
          sections: [
            { h: "The trend lifecycle and the second wave", body: "Every format moves through four phases. Origination: one creator invents something and it explodes. Early adoption: sharp creators translate it into their niches while demand outstrips supply — the algorithm has learned viewers want this pattern and hasn't saturated them yet. Saturation: everyone's aunt has posted it; performance reverts to baseline. Parody: the format itself becomes the joke, which is its funeral and occasionally a second, smaller window. The money is in phase two — roughly days two through ten of a trend's life on Instagram, often after it's already peaked on TikTok, since formats typically migrate with a lag. Ride the second wave: early enough that supply is scarce, late enough that the pattern is proven. Waiting for certainty is how you arrive at saturation holding a shovel." },
            { h: "The ten-minute daily trend scan", body: "Trend awareness is a practice, not a talent. The scan: five minutes in the Reels tab on a clean-ish signal (your professional viewing trains your recommendations — engage with your niche deliberately), noting any structure you've now seen three times — three occurrences from unrelated accounts is your signal, not one. Two minutes on audio: tap rising audios (arrow icon), check how many reels use them and how recent the growth is; low count plus steep recency equals early. Three minutes on a competitor watch list: ten accounts in your lane, plus five in adjacent big niches — beauty and fitness formats migrate into business and real estate reliably, so adjacent lanes show you the future. File everything into a saved collection called Formats with a one-line note on the skeleton. By week four you'll have a private trend database your competitors don't." },
            { h: "Adaptation: steal the skeleton, never the skin", body: "The amateur copies the trend's surface — same joke, same script, same product. The professional extracts the skeleton: what structural mechanism makes this work? Take a trend where creators show 'what the client asked for' versus 'what I delivered.' The skeleton is expectation-versus-reality with escalating reveal. Skinned for real estate: the listing photos versus the walkthrough. For fitness: the plan on paper versus week six. For luxury retail: the unboxing versus the moment it's worn. Keep the trend's recognizable markers — the audio, the pacing, the text rhythm — because those trigger the pattern recognition that earns the borrowed reach. Change the content underneath so it serves your positioning and could only have come from you. The test: would someone who's seen the trend recognize it (yes) and would your regular audience still learn your value from it (also yes)? Both or don't post." },
            { h: "The dignity filter: when to skip", body: "Not every trend deserves your brand. Run three filters before committing. Brand-code alignment: a luxury positioning survives a clever format adaptation but not a screaming face-zoom with comic sans — if executing the trend requires violating your visual codes, skip or elevate it until it fits. Audience service: borrowed reach is worthless if the viewers it brings will never care about your actual work; a trend that attracts pure entertainment-seekers to a B2B service account produces vanity numbers and muddies your account's topic classification. Effort economics: a trend needing two days of production will likely be saturated by your publish date — fast-turnaround trends favor fast producers, so know your production speed and pick trends accordingly. Roughly one in five trends you notice should survive all three filters. The discipline to skip is what keeps your account an author rather than an echo." }
          ],
          takeaways: [
            "The profitable window is the second wave — days 2-10, after proof, before saturation.",
            "Run a daily ten-minute scan: Reels tab, rising audio, competitor list — three sightings equals a signal.",
            "Adapt the skeleton (structure, audio, pacing) and replace the skin with your niche's tension.",
            "Filter every trend for brand codes, audience fit, and production speed — skip four of five."
          ],
          actions: [
            "Build your competitor watch list today: 10 in-lane accounts plus 5 adjacent-niche format leaders.",
            "Create a saved collection called Formats and file three current trends with one-line skeleton notes.",
            "Take one rising trend this week and write its skeleton in one sentence, then your niche's skin for it."
          ],
          quiz: [
            { q: "The best moment to enter a trend is:", options: ["The moment one creator posts it","Days 2-10, once the pattern is proven but supply is scarce","After a month of proof","When it becomes a parody"], answer: 1, why: "The second wave balances proof with scarcity — saturation returns the format to baseline performance." },
            { q: "What should you preserve when adapting a trend?", options: ["The original script word for word","Nothing — change everything","The recognizable markers: audio, pacing, structure","Only the hashtags"], answer: 2, why: "Those markers trigger the pattern recognition that carries the trend's borrowed reach; the content underneath becomes yours." },
            { q: "A trend fails the dignity filter when:", options: ["It uses trending audio","It's less than a week old","It comes from another niche","Executing it requires breaking your brand's visual codes"], answer: 3, why: "Borrowed reach never justifies violating positioning — elevate the format to fit or skip it." }
          ],
          drill: "Find one format currently working in a niche far from yours (cooking, beauty, gaming). Write its skeleton, then script a full adaptation for your niche keeping the audio and pacing markers intact."
        },
        {
          id: "instagram-3-2",
          title: "Carousels: The Quiet Reach Machine",
          minutes: 9,
          xp: 75,
          skill: "strategy",
          intro: "While everyone fights in the Reels arena, carousels quietly rack up saves, dwell time, and second-chance impressions. A disciplined carousel practice is the most underpriced asset on Instagram.",
          sections: [
            { h: "Why carousels punch above their weight", body: "Three structural advantages, all mechanical. Dwell time: every swipe is seconds of engaged attention, and a ten-slide carousel can hold a reader for forty-plus seconds — reel-grade watch time from static images. Second-chance delivery: Instagram can reserve a carousel to the same viewer starting from a later card if they didn't swipe the first time — one post, multiple impressions, a mechanic no other format gets. Save gravity: carousels are the natural home of reference content — checklists, frameworks, breakdowns — and saves are the signal that says 'lasting value' louder than any like. Add that carousels now support up to twenty slides and can carry music, and you have a format built for depth in an ecosystem starving for it. The play is not carousels instead of Reels; it's carousels as the save-and-authority layer of a portfolio Reels can't provide alone." },
            { h: "Slide one is a cover; slide two is a contract", body: "Slide one competes in the feed like any post, so build it like a reel hook translated to print: a bold title carrying tension ('Your grid is costing you follows'), large type, one strong visual, and a subtle swipe cue — an arrow, a peeking edge of slide two, an unfinished sentence. Slide two is where carousels die: if it's a slow throat-clearing ('First, some context...'), the swipe stops and the post flatlines. Make slide two pay immediately — deliver the first real insight, the most surprising stat, the before-photo. Think of it as a contract: slide one promised, slide two proves the promise is real, slides three onward collect on earned trust. Write your carousel's content first, then choose the single strongest atom of it and move that to slide two. Momentum, once established, carries a reader through eight more swipes with ease." },
            { h: "Four architectures that work", body: "Architecture one, the listicle: numbered points, one per slide, sequenced so the strongest points sit at positions two and last — people screenshot endings. Architecture two, the story arc: before, struggle, turn, after — transformation narratives with the reveal deliberately held to the final slide, pulling swipes like an open loop. Architecture three, the tutorial deck: one step per slide with a visual per step; the natural save magnet, so say 'save this' explicitly — asking measurably lifts saves. Architecture four, the photo dump: curated casual — eight to fifteen images that feel effortless but are sequenced with intent (strongest image first, narrative rhythm through the middle, human moment last); the format of choice for lifestyle and luxury accounts building intimacy without a hard message. Rotate architectures across the month, but keep your type system and grade constant so every deck is recognizably yours." },
            { h: "Design and caption mechanics", body: "Design rules carried over from your text system, tightened for print: generous margins, one idea per slide, type never below phone-legible size, real contrast, and your accent color doing wayfinding — numbering, highlights, the swipe cue. Keep a master template with slide layouts pre-built; production for a ten-slide deck should be under an hour. The caption plays a different role than under a reel: the slides carry the content, so the caption carries the conversation — a personal note on why you made this, one detail that didn't fit the deck, and a CTA aimed at the format's strengths: 'Save this for your next shoot' or 'Send this to your editor.' Saves and sends, remember, are the currencies. Last mechanical detail: check the deck in 3:4 if you designed in 4:5 or square — crops shift, and a beheaded title on slide one undoes the whole build." }
          ],
          takeaways: [
            "Carousels earn dwell time, saves, and second-chance delivery — a mechanic exclusive to the format.",
            "Slide one hooks like a poster; slide two must pay immediately or the deck dies.",
            "Rotate four architectures: listicle, story arc, tutorial deck, photo dump — under one visual system.",
            "Point the CTA at saves and sends, the two currencies carousels naturally mint."
          ],
          actions: [
            "Turn your best-performing reel topic into a ten-slide tutorial deck this week.",
            "Build a reusable carousel template with cover, body, and end-card layouts.",
            "Move your strongest point to slide two on your next deck — pay the reader before you make them work."
          ],
          quiz: [
            { q: "Second-chance delivery means:", options: ["Instagram may reshow an unswiped carousel to the same viewer starting from a later slide","Carousels never expire","Slides get individual hashtags","Reposting a carousel twice"], answer: 0, why: "The re-serve mechanic gives one carousel multiple shots at the same viewer — unique to the format." },
            { q: "The most common carousel failure point is:", options: ["Slide one","Slide two delivering context instead of value","Too many slides","Music choice"], answer: 1, why: "If slide two doesn't immediately prove the cover's promise, swipe momentum dies and dwell time collapses." },
            { q: "The CTA under a tutorial carousel should target:", options: ["Likes","Story reshares only","Saves and sends","Link clicks"], answer: 2, why: "Reference content naturally earns saves and DM shares — the two strongest ranking currencies." }
          ],
          drill: "Deconstruct the top three carousels in your niche this month: write down their architecture, what slide two does, and where the strongest point sits. Build your next deck applying the winning pattern."
        },
        {
          id: "instagram-3-3",
          title: "Stories: The Retention Engine",
          minutes: 9,
          xp: 75,
          skill: "marketing",
          intro: "Reels acquire strangers; Stories turn them into people who would notice if you disappeared. This is where relationship — and revenue — actually compounds.",
          sections: [
            { h: "Stories are for depth, not reach", body: "Get the mental model right: Stories barely reach non-followers. Their ranking is relationship-driven — Instagram orders story trays by interaction history: whose stories you watch to the end, who you reply to, whose profile you visit. So the KPI isn't views; it's position in your followers' tray and the depth of attention once opened. Why this matters commercially: story viewers are your true audience — the people who buy, book, and refer. A creator with 100k followers and 800 story views has a broadcast problem; a creator with 8k followers and 2k story views has a business. Stories also feed back into feed ranking: every poll tap and reply teaches Instagram that a viewer has a relationship with you, which lifts your reels in their feed. Reels are your cold traffic; Stories are your warm room. Different rooms, different behavior." },
            { h: "Daily architecture: 3-7 frames with a spine", body: "Random story spam trains people to skip you. Instead, run a daily arc of three to seven frames with a narrative spine. Frame one — the re-hook: motion, a face, or a bold claim, because tray thumbnails compete too, and a static coffee cup earns a skip. Frames two and three — the substance: today's build, insight, or behind-the-scenes with context. One interactive frame — a poll, slider, or question box placed mid-sequence, not tacked on the end where completion is lowest. Final frame — a soft landing: the takeaway, a tease of tomorrow, or a low-pressure CTA. Keep individual frames tight; talking frames under fifteen seconds each, text frames readable in three. The completion pattern to fight: trays bleed viewers with every additional frame, so front-load and sequence with the same retention logic as a reel. Twenty focused seconds beats three rambling minutes." },
            { h: "The interactive stack: taps are relationship data", body: "Every sticker interaction is a double win: it deepens that viewer's ranking relationship with you, and it hands you audience intelligence no analytics dashboard offers. Use the stack deliberately. Polls: binary, low-effort, high-volume — make both options flattering ('Shooting today' vs 'Editing today') so tapping costs nothing socially. Sliders: even cheaper, good for temperature checks on aesthetics or ideas. Question boxes: highest effort, highest value — the answers are your next month's content calendar written in your audience's own vocabulary; screenshot and answer them in subsequent frames, which manufactures more replies. Quizzes: teach while engaging. The strategic layer: run a poll on a content direction before producing it ('Full lighting breakdown or client-pricing breakdown next?') — you get validation, and every voter is psychologically pre-committed to watching the result they asked for." },
            { h: "Selling in Stories without burning the room", body: "Stories are where Instagram selling actually happens — but the room tolerates selling in proportion to the value that preceded it. Run roughly 80/20: four value-days for every one ask-day, or inside a single day's arc, four value frames before one offer frame. When you do sell, sell like a person: show the thing in use, tell one specific client story, answer the top three objections in question-box format, use a countdown sticker for genuine deadlines only — fake urgency reads instantly and permanently. Link stickers go on the offer frame with a verb on them ('Get the preset pack'), not a bare URL. And master the reply-driven close: 'Reply STORY and I'll send you the details' moves the conversation into DMs, where the relationship signal is strongest and conversion happens at hit rates public posts never touch. The room is small and warm. Treat it that way." }
          ],
          takeaways: [
            "Stories rank by relationship — measure tray position and completion, not raw views.",
            "Run a daily 3-7 frame arc: re-hook, substance, one mid-sequence interactive, soft landing.",
            "Sticker taps are double wins: ranking signal plus audience intelligence for your calendar.",
            "Sell at 80/20 with story-based proof, verb-labeled link stickers, and reply-driven DM closes."
          ],
          actions: [
            "Post a 4-frame story arc today: hook, insight, poll, takeaway — and note your completion rate.",
            "Run a question box asking 'What are you stuck on with [your topic]?' and answer three replies in frames.",
            "Plan your week on the 80/20 rhythm: mark exactly which day carries the ask."
          ],
          quiz: [
            { q: "Story reach is primarily driven by:", options: ["Posting hour","Frame count","Hashtags on frames","Relationship signals — watch history, replies, profile visits"], answer: 3, why: "Story trays are ordered per-viewer by interaction history, which is why depth beats volume." },
            { q: "Where should the interactive sticker sit in a daily arc?", options: ["Mid-sequence, where completion is still high","The first frame","On every frame","Always the last frame"], answer: 0, why: "Trays bleed viewers frame by frame; a mid-sequence sticker catches more taps than one tacked on the end." },
            { q: "The 80/20 story rhythm means:", options: ["Sell in 80% of stories","Four value moments for every one ask","Post 80 stories a month","80% of frames are polls"], answer: 1, why: "The warm room tolerates selling in proportion to the value that precedes it." }
          ],
          drill: "For five consecutive days, run a structured story arc and log completion rate from first to last frame. Identify which frame type consistently bleeds viewers and cut or fix it in week two."
        },
        {
          id: "instagram-3-4",
          title: "Broadcast Channels, DMs, and Keyword Funnels",
          minutes: 8,
          xp: 75,
          skill: "marketing",
          intro: "The feed rents you attention; the DM inbox is the closest thing Instagram gives you to owning it. Build the pipes that move people from viewer to conversation.",
          sections: [
            { h: "The DM layer is where the business lives", body: "Instagram's center of gravity has shifted to messaging — Mosseri has said more photo and video sharing now happens in DMs than in Stories or the feed. That's why sends-per-reach ranks so heavily, and it's why serious creators build a DM layer under their content. Three properties make DMs commercially decisive. Attention quality: a DM notification gets opened at rates feed posts never see. Relationship signal: every conversation lifts your entire content's ranking for that person — DM'ing followers is algorithmic fertilizer. Conversion context: sales close in conversation, and a warm DM thread is the shortest path from 'saw your reel' to 'sent the deposit.' Structure your pipeline explicitly: Reels create strangers, Stories warm them, DMs convert them. Most accounts build the first floor and wonder where the revenue is. It's upstairs." },
            { h: "Broadcast channels: your push-notification asset", body: "A broadcast channel is a one-to-many message thread your followers opt into — effectively an email list inside Instagram, with push notifications you don't pay reach tax on. Setup that works: name it like a product, not a feed ('The Editing Room,' 'Off Market') so joining feels like membership; seed it with a clear promise pinned at the top; keep cadence at three to five messages weekly. What performs in-channel: voice notes (startlingly intimate at scale), early drops before the feed gets them, one-question polls, quick wins too small for a reel, and honest behind-the-scenes including failures. Growth levers: the join prompt appears when non-members visit, so mention the channel in reels ('the full settings list is in my channel'), pin a story highlight explaining it, and gate one genuinely valuable resource inside. Treat it like a newsletter with a personality, not a second feed to neglect." },
            { h: "Comment-keyword funnels", body: "The mechanic that quietly powers most creator monetization on Instagram: 'Comment GRADE and I'll DM you the free preset.' Why it compounds: the comment inflates comments-per-reach during the reel's ranking window, and the DM delivery opens a one-to-one thread — a double signal plus a captured conversation, all from one CTA. Execution: the keyword should be memorable and on-theme; the promised asset must be genuinely worth the friction (a checklist, template, or mini-tutorial — not a sales page in a trench coat); and delivery must be fast, which is why automation tools like ManyChat dominate this workflow — though at low volume, manual delivery with a personal line attached converts even better. Rules of hygiene: deliver exactly what was promised before any pitch, keep one keyword per reel, and don't run the play on every post — scarcity keeps the mechanic feeling like access, not a lead trap." },
            { h: "DM craft: from reply to relationship", body: "Once conversations start, craft determines what they become. Reply to story-reactions and comment-driven DMs within hours while intent is warm; a day-old reply meets a cold reader. Open like a human — reference the thing they actually said, never paste an opener that smells templated. Voice notes escalate trust dramatically for high-value conversations; hearing a real voice collapses the parasocial distance a text thread maintains. The selling discipline: never pitch in message one; the sequence is acknowledge, add value or answer fully, then — only when the fit is obvious — offer the next step as a door, not a push ('If you want, I can send the package details'). Track loosely: a simple note or label system for leads, clients, and collaborators keeps threads from dying in the pile. The inbox is a garden. Tend it daily, fifteen minutes, same time." }
          ],
          takeaways: [
            "The pipeline is Reels acquire, Stories warm, DMs convert — build all three floors.",
            "A broadcast channel is an in-app newsletter with push notifications: name it like a product, feed it 3-5 times weekly.",
            "Keyword funnels double-dip signals: comments during ranking plus a captured DM thread.",
            "In DMs: fast, human, value-first — voice notes for high-value threads, pitch only as a door."
          ],
          actions: [
            "Launch or rename your broadcast channel with a product-grade name and a pinned promise.",
            "Run one keyword funnel this week with a genuinely valuable deliverable — track comments and DM opens.",
            "Block 15 minutes daily for inbox tending: replies first, then story-reaction conversations."
          ],
          quiz: [
            { q: "Why do comment-keyword funnels rank AND convert?", options: ["They increase follower count directly","They trick the algorithm","Comments lift ranking in the test window while DM delivery opens a one-to-one thread","Keywords are indexed as hashtags"], answer: 2, why: "The mechanic stacks a public ranking signal with a private conversation — two assets from one CTA." },
            { q: "A broadcast channel is best treated as:", options: ["A group chat with superfans","A place for daily sales pitches","A second feed for reposts","An in-app newsletter with push notifications and a clear promise"], answer: 3, why: "Named like a product and fed consistently, it's owned-audience infrastructure inside Instagram." },
            { q: "The correct first move when a lead DMs you is:", options: ["Acknowledge their actual message and answer fully before any offer","Send a templated pitch","Wait two days to seem busy","Send your price list"], answer: 0, why: "Value-first, human, and fast is what converts — pitching in message one burns warm intent." }
          ],
          drill: "Write your first keyword funnel end to end: the reel CTA line, the keyword, the delivery message, and the follow-up message for people who reply. Ship it on your next strong reel."
        },
        {
          id: "instagram-3-5",
          title: "Reading Reels Analytics Like an Editor",
          minutes: 10,
          xp: 75,
          skill: "analytics",
          intro: "Analytics isn't a scoreboard — it's an editing suite for your strategy. This lesson turns Instagram's insights into specific, cuttable, testable decisions.",
          sections: [
            { h: "The five ratios that matter", body: "Raw numbers flatter and deceive; ratios tell the truth. Build your dashboard on five. Watch-through: average watch time divided by reel length — the master retention metric, comparable across reels of different lengths. Sends per reach: shares divided by views — your distribution multiplier and Instagram's favorite signal. Follows per reach: new followers divided by views — measures whether the content attracts people who want more of you, the difference between viral and useful-viral. Saves per reach: your authority metric — high saves flag content people intend to return to. Profile visits per reach: hook-to-curiosity conversion. Ignore likes almost entirely; they're the cheapest action and predict nothing. Track the five in a simple sheet per reel, because Instagram's interface shows you one post at a time and patterns only appear in rows. Ten minutes weekly. The sheet is the strategy." },
            { h: "Retention graph forensics", body: "The retention curve is a frame-accurate confession, so interrogate it like an editor. Load a reel's graph next to the reel itself and map every drop to its exact content moment: the 25% cliff at second one is your hook; a ledge at 0:09 is that slow transition you almost cut; a wobble at 0:18 is the second example that proved nothing new. Now look for the rarer, richer signal — bumps: a retention rise means people scrubbed back and rewatched; whatever caused it (a dense visual, a fast list, a surprising claim) is a technique to repeat deliberately. Then act like an editor, not an analyst: the response to a diagnosed drop is a cut list — open the project file, remove or repair the guilty seconds, and apply the lesson forward to the next three reels. One diagnosed second, fixed, is worth more than an hour admiring dashboards." },
            { h: "The weekly iteration ritual", body: "Growth is a loop: publish, measure, hypothesize, test. Run it weekly, thirty minutes, same day. Step one: rank the week's posts by watch-through and separately by sends per reach — the lists usually differ, and the difference is information (held attention versus triggered sharing). Step two: for the top and bottom post on each list, write one sentence — why, specifically, in craft terms: 'hook posed a question the title already answered,' 'the payoff landed at 80% instead of the end.' Step three: extract exactly one hypothesis for next week: 'cold-open story hooks beat claim hooks for me,' 'reels under 20 seconds are lifting follows per reach.' Step four: design next week's content so at least two posts test that hypothesis while the rest run proven patterns. One variable at a time, written down, or you're not iterating — you're just posting with anxiety." },
            { h: "Trial Reels: your private laboratory", body: "Trial Reels solve the experimenter's dilemma: testing risky ideas used to mean burning your warm audience's patience and your grid's coherence. A trial shows the reel to non-followers only — your followers don't see it, and it doesn't appear on your main grid view — making it a clean read on cold-audience performance, which is exactly the audience growth comes from. Use trials for: hook A/B tests (same reel, two openings, run both), format experiments outside your lane, volume-testing topics before committing a series to one, and re-testing old winners with new packaging. Instagram surfaces comparative stats and can convert a winning trial into a normal post, or auto-post it if it overperforms. The discipline that makes trials compound: change one variable per trial and log results in your sheet. A month of disciplined trials outputs something priceless — a validated playbook of what cold audiences want from you, before you spend real production budget on it." }
          ],
          takeaways: [
            "Judge reels by five ratios — watch-through, sends, follows, saves, profile visits per reach — never raw views.",
            "Map every retention drop and bump to an exact content second, then respond with a cut list.",
            "Run the weekly ritual: rank, explain in craft terms, extract one hypothesis, test it twice next week.",
            "Use Trial Reels as a non-follower lab — one variable per trial, everything logged."
          ],
          actions: [
            "Build your tracking sheet today with the five ratios as columns; backfill your last ten reels.",
            "Do retention forensics on your best and worst reel: write the timestamp and cause of each major drop.",
            "Launch one Trial Reel this week testing a single variable against your current default."
          ],
          quiz: [
            { q: "Why prefer watch-through percentage over average watch time?", options: ["Instagram hides watch time","It normalizes for length, making reels comparable","It includes likes","It updates faster"], answer: 1, why: "Dividing watch time by reel length lets a 12-second and a 60-second reel be judged on the same scale." },
            { q: "A bump upward in the retention graph usually means:", options: ["The reel was reshared","A tracking error","Viewers scrubbed back and rewatched that moment","New followers arrived"], answer: 2, why: "Rewatch spikes mark moments dense or surprising enough to repeat — a technique signal, not noise." },
            { q: "The core discipline of Trial Reels is:", options: ["Only trialing trends","Running five variables at once","Posting trials daily","One variable per trial, results logged"], answer: 3, why: "Single-variable tests with a written log are what turn trials into a validated cold-audience playbook." }
          ],
          drill: "Take your best-performing reel and script two alternative hooks for the identical body. Run both as Trial Reels in the same week and record which wins on watch-through and sends."
        }
      ]
    },
    {
      id: "instagram-4",
      level: "Expert",
      title: "Growth Engineering",
      description: "Engineer shares, build owned formats and series, master loop mechanics and scripting, and multiply reach through collabs — growth as a designed system, not a hope.",
      lessons: [
        {
          id: "instagram-4-1",
          title: "The Send Flywheel: Engineering Shareability",
          minutes: 10,
          xp: 90,
          skill: "strategy",
          intro: "Sends per reach is the closest thing Instagram has to a cheat code — and it can be engineered. This lesson is about designing content for the person who receives it, not just the person who watches it.",
          sections: [
            { h: "Why the share is the apex signal", body: "Think about what a DM share costs the sender: they interrupt a friend, attach their taste to your content, and stake a little social capital on it landing. That cost is why Instagram weights sends so heavily — a share is the only engagement action that risks something. It's also self-propagating in a way no other signal is: the recipient watches in the DM thread (more watch time), often replies (conversation data), sometimes forwards again (chain sharing), and occasionally follows — all attributed to your reel. One send can cascade into a dozen high-quality signals. The strategic reframe that changes everything downstream: stop asking 'will my audience like this?' and start asking 'who, specifically, would send this — and to whom?' If you cannot name the sender-recipient pair, the reel has no share engine, whatever its other merits." },
            { h: "The seven share triggers", body: "Shares cluster around seven psychological triggers; deliberate creators build reels on one. Identity: 'this is so us' — content that articulates a shared experience better than the sender could ('POV: your editor asks for the raw files'). Utility: reference material the recipient tangibly needs — the checklist, the settings, the template. Status: sharing it makes the sender look smart, early, or connected; insider knowledge and sharp analysis run on this. Awe: spectacle or craft so strong the share is involuntary. Humor: the lowest-friction trigger and the most competitive arena. Advocacy: content that argues a position the sender holds but hasn't articulated — they share it as ammunition. Specific summons: the direct-address mechanic — 'send this to the friend who still shoots vertical video in horizontal mode' names the recipient and turns sharing into a small social act between two people. Pick one trigger per reel and commit." },
            { h: "Design for the recipient", body: "Here's the inversion that separates expert content design: the share is a message from sender to recipient, and your reel is the envelope. So design the envelope for the recipient's first three seconds, not just the browsing viewer's. The recipient arrives with zero context inside a DM thread — your reel must re-hook cold, which argues for self-contained openings over lore-dependent ones on share-engineered posts. Give the sender a caption-ready meaning: the reel should make one clean point that survives being forwarded without commentary, because most shares arrive bare. And leave room for the sender's voice — content that's 95% complete but invites a reaction ('the third one is aimed directly at you') outperforms content that closes every loop, because the share needs to start a conversation, not end one. You're not making a broadcast. You're manufacturing a message two friends will have about you." },
            { h: "Measuring and tuning the flywheel", body: "Set a sends-per-reach baseline from your last twenty reels, then segment by trigger: which of the seven do your top-decile sharers respond to? Most accounts discover they have one or two natural share lanes — a fitness educator's utility posts might triple the send rate of their humor posts, or vice versa; the data decides, not your self-image. Then tune deliberately. Test direct-address summons CTAs against no-CTA endings — measured lift is common, but cringe is a real tax, so match the summons to your brand voice and never stack it on a reel whose trigger is status (insiders don't need instructions to share). Watch the interplay with retention: share-optimized reels sometimes sacrifice watch-through, and the algorithm wants both, so your portfolio needs retention anchors alongside share engines. The flywheel turns when one or two reels a week are explicitly engineered to travel." }
          ],
          takeaways: [
            "A share risks the sender's social capital — that cost is why sends outrank every other signal.",
            "Build each share-engineered reel on one of seven triggers: identity, utility, status, awe, humor, advocacy, summons.",
            "Design for the recipient: cold-context hooks, one forwardable point, room for the sender's commentary.",
            "Baseline sends per reach, segment by trigger, and tune with tests — your share lane is empirical, not assumed."
          ],
          actions: [
            "Compute sends per reach on your last 20 reels and tag each with its dominant share trigger.",
            "Script one reel this week designed for a named sender-recipient pair and one specific trigger.",
            "Test one direct-address summons ending ('send this to...') against your normal ending and compare send rates."
          ],
          quiz: [
            { q: "Why does Instagram weight sends above likes?", options: ["A share costs the sender social capital, making it the highest-proof signal of value","DMs load faster","Likes are being removed","Sends are rarer data"], answer: 0, why: "Sharing risks something — the sender's taste and a friend's attention — so it evidences real value." },
            { q: "Designing 'for the recipient' means:", options: ["Tagging friends in captions","Making the reel re-hook with zero context and carry one forwardable point","Adding more hashtags","Longer intros for background"], answer: 1, why: "Shares arrive bare in DM threads; the reel must land cold and give the sender a clean message." },
            { q: "A 'specific summons' CTA is:", options: ["A link in bio","Ask everyone to share","Name the exact recipient: 'send this to the friend who...'","A giveaway requirement"], answer: 2, why: "Naming the recipient converts a vague ask into a small social act between two real people." }
          ],
          drill: "Open your DMs and study the last ten reels friends actually sent you. Tag each with its trigger and note what the sender wrote. Reverse-engineer the pattern into your next share-engineered reel."
        },
        {
          id: "instagram-4-2",
          title: "Series and Owned Formats: Manufacturing Anticipation",
          minutes: 10,
          xp: 90,
          skill: "strategy",
          intro: "One-off bangers build views; owned formats build an audience that shows up on schedule. This is how you stop renting attention and start compounding it.",
          sections: [
            { h: "Why series outperform one-offs", body: "A series stacks advantages a standalone reel can't touch. Recognition: by episode four, your format's opening two seconds function as a hook by themselves — the audience has been trained, so your retention curve starts higher. Binge depth: a new viewer who likes episode nine has eight more waiting, converting one discovery into a session — and every additional watched episode multiplies the relationship signals that lift your future distribution to that viewer. Anticipation: numbered episodes create a standing open loop; 'Part 7' implies six proven parts behind it and more coming, which converts casual viewers into followers because following becomes the only way to not miss the next one. Production leverage: a locked format collapses decision fatigue — you're filling a proven container, not reinventing structure weekly. The compounding is the point: one-offs restart from zero; series inherit their own momentum." },
            { h: "Designing the container", body: "A format is a repeatable container with a variable payload. The container — the constants: a recognizable opening line or shot ('Rating my clients' car photos, episode 12'), a fixed structure with named beats, consistent grade and typography, a signature ending. The payload — what changes: this week's subject, submission, location, case. Design tests before committing: Repeatability — can you list twenty payloads right now? If you can't, it's a concept, not a format. Ownability — does the container carry your fingerprint (your framing, your one-liner rhythm, your visual codes), or could any account in your niche run it interchangeably? Ceiling — does the format showcase what you actually sell or want to be known for? A hilarious format that never touches your positioning grows an audience for the format, not for you. Prototype three episodes before announcing anything — announcing a series and abandoning it publicly is worse than never starting." },
            { h: "Packaging: numbers, names, and covers", body: "Packaging is where series mechanics get mechanical. Number the episodes visibly — in the cover title, the overlay text, the first spoken line — because numbering does psychological work: it signals commitment, implies a back catalog, and creates the collect-them-all pull. Name the series like a show, two or three words with texture ('Grid Surgery,' 'Sunday Selects'), and say the name every episode; you're building a search asset and a mental shelf. Covers get a dedicated series template — same layout, same accent, episode number prominent — so the series reads as a striped set on your grid and a visitor can binge it by sight. Support structure: pin the strongest episode, keep a story highlight with the full run, and end each episode with a next-episode tease when you genuinely know what's next. One more habit: seed episode ideas from comments and question boxes, then credit the commenter — audiences fuel series they feel co-ownership of." },
            { h: "The format portfolio and knowing when to kill", body: "Expert accounts run a portfolio: two or three proven owned formats carrying the schedule, plus one experimental slot where next quarter's format gets discovered. The proven formats deliver reliability — audiences and algorithms both reward rhythm; the experimental slot prevents the slow death of running one format past its fatigue point. And formats do fatigue: watch for watch-through decaying across episodes, sends flattening while views hold (people still watch, but it's stopped being remarkable), and your own production enthusiasm sagging — the audience always smells that last one. The decision at fatigue isn't binary. Evolve: same container, raised stakes or new payload class. Rest: series go on hiatus and return refreshed — 'season two' is legitimate packaging. Kill: retire it publicly and gracefully, ideally into a highlight archive. What you never do is let a flagship format quietly limp — a decaying flagship teaches your audience that your quality bar moved." }
          ],
          takeaways: [
            "Series compound: trained hooks, binge sessions, standing open loops, and collapsed production overhead.",
            "A format = fixed container + variable payload; require twenty listable payloads before committing.",
            "Package like a show: visible episode numbers, a two-word name said aloud, a dedicated cover template.",
            "Run 2-3 proven formats plus one experimental slot; evolve, rest, or kill at fatigue — never limp."
          ],
          actions: [
            "Draft one format container this week: opening line, three named beats, signature ending — and list 20 payloads.",
            "Prototype episodes 1-3 before announcing; publish only when all three hold your quality bar.",
            "Audit any existing recurring content for fatigue: chart watch-through across its last six episodes."
          ],
          quiz: [
            { q: "The 'twenty payloads' test exists to:", options: ["Satisfy the algorithm","Fill a content calendar automatically","Guarantee viral episodes","Separate a durable format from a one-idea concept"], answer: 3, why: "If you can't list twenty variable payloads, the container will exhaust itself within a month." },
            { q: "Visible episode numbering primarily creates:", options: ["A standing open loop and implied back catalog that converts viewers to followers","Longer captions","Higher production cost","Better SEO"], answer: 0, why: "Numbers signal commitment and make following the mechanism for not missing what's next." },
            { q: "The right response to format fatigue is:", options: ["Ignore it — formats recover alone","Evolve, rest, or retire it deliberately — never let it limp","Delete the whole series","Post it more often"], answer: 1, why: "A decaying flagship quietly lowers your perceived quality bar; fatigue demands a deliberate decision." }
          ],
          drill: "Take your three best-performing reels ever and ask: which one was secretly episode one of a series? Design its container, list its payloads, and script episode two."
        },
        {
          id: "instagram-4-3",
          title: "Loop Theory: Engineering the Rewatch",
          minutes: 9,
          xp: 90,
          skill: "viral",
          intro: "When a viewer watches your 8-second reel three times, your watch time reads near 300% — and the algorithm reads obsession. Rewatches are a craft, not an accident.",
          sections: [
            { h: "The mathematics of the loop", body: "Average watch time isn't capped at your reel's length — rewatches stack, which is how short reels post the absurd retention numbers that trigger heavy distribution. This creates a distinct strategic lane: the loop reel, five to ten seconds, engineered so the replay is either irresistible or literally unnoticed. The economics favor it disproportionately: a 6-second reel watched 2.5 times signals harder than a 60-second reel watched to 70%, and it costs a fraction of the production. But the lane has rules. The content must reward repetition — density, beauty, or seamlessness — because a boring loop is just a short boring reel. And your portfolio still needs longer anchors for authority and follows; loops win reach and watch-time signals but rarely close the 'I need to follow this person' argument alone. Think of loops as your distribution artillery: cheap rounds, fired often, softening the field for the content that converts." },
            { h: "The seamless loop: invisible seams", body: "The purest form: a reel whose last frame flows into its first so cleanly the viewer doesn't register the restart and watches again involuntarily. Construction techniques: end and begin on the same framing with matching action — a pour that completes as the reel restarts mid-pour; cut both ends on motion (cut on action applies to loops doubly, since movement across the seam hides it); match audio so the music or ambient bed cycles without a bump — trim to the bar line, not the visual alone. Plan it at the shoot: film your opening action twice, once for the start, once for the end, same framing, and the edit becomes assembly instead of surgery. The quality bar is binary — a loop either disappears or it doesn't — so test it on someone who doesn't know: if they scrub back asking 'wait, did that loop?', you've shipped the effect and earned the confusion rewatch on top of the seamless one." },
            { h: "Density rewatches: too much to catch once", body: "The second rewatch engine is informational: pack more into the reel than one viewing can absorb. Techniques: layered composition — the foreground carries the main action while the background hides a second joke or detail viewers catch on pass two; fast lists — seven tips in fifteen seconds guarantees the viewer missed two and knows it; blink-and-miss inserts — a two-frame flash of something surprising that half-registers and demands verification; text-audio divergence — the overlay text carries different information than the voiceover, so one pass literally cannot capture both channels. The comment section becomes your accomplice: 'watch it again, top right corner' from a viewer is the highest-value comment a reel can receive, spawning rewatches from every reader. Calibration matters — density should feel generous, not hostile. The viewer should finish pass one satisfied and pass two rewarded, never punished for watching only once." },
            { h: "The withheld beat and the ethics line", body: "The third engine is structural: endings that send viewers back. The ambiguous ending — a final beat readable two ways sends viewers to pass two to adjudicate. The missing third beat — set up a pattern of three, deliver two, and let the third land in the first second of the loop, welding ending to beginning with an itch. The retro-context reveal — a final line that recasts everything prior ('now watch his left hand'), the single most reliable rewatch instruction in the format. Now the line you don't cross: engineered confusion must resolve on rewatch. If pass two doesn't pay the itch — if the ambiguity was emptiness dressed as depth — you've converted a rewatch into a betrayal, and betrayed viewers don't just leave; they stop trusting your hooks, which quietly taxes every future reel's opening seconds. The test: does the second viewing genuinely deliver? Rewatch bait that pays is craft. Rewatch bait that doesn't is churn with extra steps." }
          ],
          takeaways: [
            "Rewatches stack watch time past 100% — short loop reels are a distinct, cheap, high-signal lane.",
            "Seamless loops: matching framing and action at both ends, audio trimmed to the bar, tested on a fresh viewer.",
            "Density rewatches: layered backgrounds, fast lists, blink-and-miss inserts, text-audio divergence.",
            "Withheld beats and reveals must pay off on pass two — unresolved confusion taxes all future hooks."
          ],
          actions: [
            "Shoot one 6-8 second seamless loop this week, filming your opening action twice for the seam.",
            "Add one background detail to your next reel worth catching on a second pass — then watch the comments.",
            "Recut an old reel to end with a retro-context line ('now watch the...') and trial it against the original."
          ],
          quiz: [
            { q: "Why can average watch time exceed 100% of reel length?", options: ["Longer captions add time","Instagram rounds up","Rewatches accumulate into the same metric","Ads extend the reel"], answer: 2, why: "Replays stack — which is why engineered loops post retention numbers long reels can't touch." },
            { q: "The most reliable seam-hiding technique in a loop is:", options: ["A watermark","Slowing the last second","A fade to black","Cutting both ends on matching motion"], answer: 3, why: "Movement across the splice — cut on action at the seam — carries the eye past the restart." },
            { q: "Engineered ambiguity crosses the ethics line when:", options: ["The second viewing doesn't resolve or reward the confusion","It's posted twice","It uses trending audio","The reel is under 10 seconds"], answer: 0, why: "Unpaid confusion is betrayal, and betrayed viewers discount your every future hook." }
          ],
          drill: "Storyboard a 7-second loop for your niche where the final action completes in the first second of the replay. Note the exact frame of the seam, then shoot and cut it."
        },
        {
          id: "instagram-4-4",
          title: "Scripting for Voiceover and Talking-Head Reels",
          minutes: 11,
          xp: 90,
          skill: "video",
          intro: "The best-performing talking reels aren't improvised — they're written like radio and delivered like conversation. This is the scripting craft nobody sees on screen.",
          sections: [
            { h: "Write for the ear, not the eye", body: "Prose written to be read fails when spoken — the ear can't rewind. Rules for spoken scripts: one idea per sentence, sentences deliverable in one breath, no stacked clauses ('which, when you consider, means...' dies aloud). Target 150-170 words per minute of runtime — a 45-second reel is 110-125 words, which should terrify you into economy. Use spoken-register vocabulary: 'use' not 'utilize,' contractions everywhere, the rhythm of how you actually talk to one person. The editing pass that fixes everything: read it aloud, twice, and cut every word your mouth stumbled on — stumbles are the script's error messages. Then run the flow test: record a scratch take on your phone and listen back at 1.5x; the weak sentences announce themselves at speed. Great VO scripts look almost embarrassingly simple on paper. That's the tell that they'll sound like thinking, not reciting." },
            { h: "Script architecture: hook, tax, payload, callback", body: "Structure the script in four zones matched to the reel skeleton. The hook line: twelve words or fewer, tension word early, written last after drafting five options. The context tax: everything the viewer must know for the payload to land, compressed to two sentences maximum — and here's the highest-leverage edit in scripting: delete your first sentence. Drafts almost always warm up before starting, and the real script begins at sentence two; check yours, it's uncanny. The payload: your points in the strongest order — second-best first, best last, weakest in the middle where attention is most forgiving; number them aloud ('third one matters most') to build a countdown open loop. The callback: end by paying the hook's exact promise in its own words — if you opened with 'the 2-second trick,' the last line names the trick in two seconds. Callbacks close the loop with an audible click, and that click is what fingers remember when deciding whether to follow." },
            { h: "Matching voice to picture", body: "For voiceover-B-roll reels, the script and shot list are one document — write them in two columns. The noun-matching rule: when the VO names a thing, the viewer sees that thing within about half a second; every violated match forces a micro-reconciliation that reads as boredom. The J-cut discipline: let each new VO sentence begin a beat before its matching visual arrives — audio leading picture pulls the viewer through cuts (this is the J-cut from your editing lessons doing narrative work). Cut B-roll on syllable stress: shot changes land on the emphasized word, not between words, which is why professionally cut VO reels feel inevitable. And build breathing room into the script itself — a written pause ('...and that's when it broke') gives the edit a place for the hero shot to hold without competition from your voice. Scripts that ignore the picture produce edits that fight themselves; two-column scripts produce edits that assemble." },
            { h: "Delivery: performance without performing", body: "The camera subtracts energy — flat delivery on set reads as dead on screen — so deliver at roughly 120% of your natural intensity: slightly more pace variation, slightly more emphasis, a face that moves. It'll feel like too much; on playback it reads as alive. Specific tools: downward inflection at sentence ends for authority (upward inflection makes claims sound like questions); a deliberate half-second pause before your most important line — silence is a spoken pattern interrupt that makes the next words land pre-emphasized; hit the stressed syllable of your key nouns and numbers. Practical protocol: your first take is a warm-up by definition, so plan for three to five; deliver to the lens as if it's one specific person you like (write their name above the script if it helps); and record two extra takes of just the hook line at different energies — the edit will thank you, because the hook take you choose determines the retention curve everything else inherits." }
          ],
          takeaways: [
            "Write spoken-register: one-breath sentences, 150-170 wpm, cut every word you stumble on aloud.",
            "Architecture: 12-word hook, two-sentence context tax (delete your first sentence), ordered payload, callback ending.",
            "Two-column scripts: nouns matched to visuals within half a second, J-cuts leading picture, cuts on syllable stress.",
            "Deliver at 120% energy with downward inflections and planned pauses; the first take is always a warm-up."
          ],
          actions: [
            "Rewrite your next script after reading it aloud twice — cut everything your mouth tripped over.",
            "Delete the first sentence of your current draft and see if the script improves (it almost always does).",
            "Record your next hook line five times at escalating energy and pick the winner in the edit, not on set."
          ],
          quiz: [
            { q: "A 45-second voiceover reel should run about:", options: ["250 words","110-125 words","60 words","As many as fit"], answer: 1, why: "Spoken delivery lands at 150-170 words per minute; scripts written past that force rushed, muddy takes." },
            { q: "The 'delete your first sentence' rule works because:", options: ["It shortens captions","First sentences are too long","Drafts warm up before starting — the real script begins at sentence two","Hooks belong in captions"], answer: 2, why: "Written throat-clearing is nearly universal; cutting it starts the reel at the actual beginning." },
            { q: "In VO-B-roll editing, shot changes should land:", options: ["Every two seconds exactly","Only on musical beats","Between sentences only","On the stressed syllable of key words"], answer: 3, why: "Cutting on syllable stress fuses voice and picture so the edit feels inevitable rather than assembled." }
          ],
          drill: "Take a published reel of yours and transcribe it. Rewrite the transcript with every rule above — one-breath sentences, deleted opener, callback ending — then reshoot and trial both versions."
        },
        {
          id: "instagram-4-5",
          title: "Collabs, Remixes, and Borrowed Audiences",
          minutes: 9,
          xp: 90,
          skill: "marketing",
          intro: "The fastest way to reach a new warm audience isn't ads — it's showing up inside another creator's distribution with their endorsement attached. Instagram built native tools for exactly this.",
          sections: [
            { h: "Collab posts: one reel, two engines", body: "Instagram's Collab feature makes a single post appear on both creators' profiles, with merged likes, comments, and reach — your reel gets auditioned to their audience carrying their implicit endorsement, and vice versa. The mechanics reward it doubly: the combined engagement concentrates signals on one post instead of splitting them across two uploads, and each audience is warm to its own creator, so baseline retention starts higher than any cold audience would give you. Partner selection is where most collabs die: choose adjacent, not identical. An identical account shares your exact audience (nothing new gained) and competes for your exact positioning (confusion added). Adjacent means heavy audience overlap in interest but different core value — the car photographer collabing with the detailing brand, the realtor with the mortgage educator, the fitness coach with the meal-prep creator. Their followers should think 'obviously relevant to me' and 'I don't already have one of these.'" },
            { h: "Structuring a collab worth both audiences", body: "The collab content itself needs a reason to exist beyond the partnership. Formats that work: the crossover episode — run your owned format with them as the payload (instant fit, pre-trained audience); the friendly challenge — both perspectives on one task, disagreement included, because contrast is content; the value split — each covers the half of a problem they own (the shoot and the edit, the listing and the loan). Handle asymmetry honestly: when follower counts differ, the smaller account typically brings disproportionate effort — production, editing, concept — and the larger account brings distribution; that's a fair trade, name it plainly in the pitch. Speaking of the pitch: lead with a specific concept and what's in it for their audience, show your craft floor with links to your three best reels, and make saying yes require nothing but showing up. Vague 'let's collab sometime' messages are deleted on sight — a scoped, dated, one-shoot proposal gets answers." },
            { h: "Remixes and reply-reels: permissionless collaboration", body: "You don't need a yes to borrow context. Remix lets you build side-by-side or stitched responses to public reels — your commentary, reaction, or counter-demonstration attached to content that already has momentum; the craft is adding a genuinely new layer (expertise, correction, escalation) rather than pure reaction-face, which the format has aged out of. Reply-with-reel turns any comment on your posts into the opening frame of a new reel — the single most underused conversion mechanic on the platform, because it lets your audience write your hooks: a skeptical comment becomes a rebuttal reel, a question becomes a tutorial, and the original commenter becomes your most invested sharer. Strategic layer: these mechanics let smaller accounts insert themselves into larger conversations on merit. A sharp remix correcting a big account's technique — respectful, precise, demonstrably right — routinely outperforms anything the same creator posts into the void, because it inherits a live audience mid-debate." },
            { h: "Seeding, whitelisting, and the paid bridge", body: "For brand-side operators, borrowed audiences scale further through paid mechanics. Seeding: sending product to aligned creators with zero posting obligation — counterintuitively, the no-strings version outperforms contracted posts for authenticity, and one genuine unprompted feature outweighs five deliverables-checklist integrations. Whitelisting and partnership ads: creators grant the brand permission to run paid promotion through the creator's own handle — the ad arrives wearing a trusted face instead of a brand logo, and CPMs consistently reward that. The organic bridge matters for creators too: a collab post that overperforms organically is the ideal candidate for boost spend, because paid distribution amplifies proven engagement instead of gambling on untested creative. Rules regardless of side: disclose partnerships properly (the paid-partnership label exists; use it), keep creative control where the audience trust lives — with the creator — and evaluate everything on the same ratios you track organically. Borrowed audiences still judge you in three seconds." }
          ],
          takeaways: [
            "Collab posts merge reach and engagement onto one post — choose adjacent partners, never identical ones.",
            "Structure collabs as crossover episodes, friendly challenges, or value splits; pitch with a scoped, dated concept.",
            "Remix and reply-with-reel are permissionless collabs — insert expertise into live conversations on merit.",
            "Seeding without obligation and whitelisted partnership ads scale borrowed trust; disclose properly, always."
          ],
          actions: [
            "List five adjacent-not-identical accounts and draft one scoped collab pitch with a specific concept and date.",
            "Answer your best recent comment with a reply-reel this week.",
            "If you run a brand: seed product to three aligned creators with explicitly zero posting obligation."
          ],
          quiz: [
            { q: "The ideal collab partner is:", options: ["Adjacent: overlapping audience interest, different core value","Any account in another country","Your closest competitor","The biggest account that will answer"], answer: 0, why: "Adjacency delivers a warm, relevant audience without positioning confusion or zero-sum overlap." },
            { q: "Reply-with-reel is powerful because:", options: ["It doubles your post count","Your audience's comments become pre-validated hooks with an invested first sharer","It avoids the algorithm","It requires no editing"], answer: 1, why: "A real question or objection is a hook proven to matter, and the commenter becomes your advocate." },
            { q: "In creator seeding, the no-obligation approach wins because:", options: ["It skips disclosure rules","It's cheaper to ship","Unprompted genuine features carry authenticity that contracted posts can't fake","Creators post more often"], answer: 2, why: "Audiences discount checklist integrations; one authentic feature outperforms five obligated ones — and disclosure still applies when partnerships exist." }
          ],
          drill: "Find one large account in your niche whose recent reel contains a technique you can genuinely improve upon. Script a respectful, precise remix that demonstrates the better method in under 30 seconds."
        }
      ]
    },
    {
      id: "instagram-5",
      level: "Master",
      title: "The Creative Director's Standard",
      description: "Agency-grade Instagram: signature visual languages, production pipelines that turn one shoot into thirty assets, the luxury aesthetic, editorial direction, and full account architecture.",
      lessons: [
        {
          id: "instagram-5-1",
          title: "Building a Signature Visual Language",
          minutes: 12,
          xp: 110,
          skill: "branding",
          intro: "The highest compliment on Instagram isn't a comment — it's being recognized mid-scroll before your handle loads. That recognition is designed, codified, and defended. Here's how agencies build it.",
          sections: [
            { h: "The thumb-stop signature", body: "Luxury houses figured this out a century ago: Hermes orange, the Tiffany blue box, Cartier's red — attribution without a logo. On Instagram the same mechanism operates at scroll speed. A signature visual language means a stranger who has seen three of your posts can identify the fourth from a single frame, muted, with the handle covered. That pre-conscious recognition does compounding work: it converts impressions into brand deposits even from viewers who never engage, it starts your retention curve higher because familiarity reads as safety, and it makes your content un-copyable in the only way that matters — competitors can steal a format, but they cannot steal accumulated recognition. The audit that starts this work: pull your last twelve posts into a grid, cover the handle, and ask a stranger what ties them together. If the answer is 'nothing,' you have content. You don't yet have a language." },
            { h: "The four codes", body: "A visual language is built from four codes, each locked deliberately. Color: two base tones plus one accent, enforced through a consistent grade — the accent is your orange box, appearing in wardrobe, props, text highlights, and covers; on a hue-organized feed, owning a color is owning real estate. Typography: one display face, one workhorse, locked sizes and treatments (your lesson-eight system, now elevated to law). Grade: a repeatable color treatment — a LUT family plus grain, halation, or contrast curve — applied to every frame; the grade is the accent's delivery mechanism and the fastest single code to establish. Motif: a recurring compositional or gestural element — centered one-point symmetry, hands entering frame from the right, the same opening camera move, a recurring object. Two codes make a style. Four codes, held for ninety days, make a signature. The discipline isn't choosing them; it's refusing everything outside them." },
            { h: "Codify it or lose it", body: "The difference between a creator with taste and a creative director is a document. Agencies write style bibles because taste held in one person's head cannot be delegated, scaled, or defended in a disagreement. Yours needs one page: the four codes specified precisely (hex values, font names and sizes, LUT and grain settings, the motif described in one sentence), plus the part most people skip — do/don't frame pairs. Screenshot six of your frames that nail the language and six that violate it, side by side, annotated with one line each. The don't column is where the language actually gets sharp, because style is defined by what it refuses. This document is what you hand an editor, a second shooter, or a freelancer — and what you check their first draft against. If you can't write the page, you don't have a language yet; you have a mood. Write the page." },
            { h: "Evolving without breaking", body: "Languages that never evolve calcify; languages that change constantly never existed. The working ratio is 70/20/10: seventy percent of output executes the codes exactly, twenty percent stretches one code at a time (a new motif variation, a seasonal accent shift), ten percent experiments freely — and the experiments that work graduate into next quarter's codes. The cardinal rule of evolution: never change two codes at once. Shift your grade OR your typography in a given season, never both, because recognition survives single-variable drift and dies in redesigns. Watch the market too: when your codes get widely imitated — and success guarantees imitation — resist the panic rebrand. The originator's move is to deepen, not flee: push the codes further, execute at a level imitators can't sustain, and let consistency arbitrate authorship. The audience always knows who was first. They only forget when the original blinks." }
          ],
          takeaways: [
            "A signature means attribution without a logo — identifiable from one muted frame with the handle covered.",
            "Lock four codes: color (2 base + 1 accent), typography, grade, and a recurring motif — held for 90 days.",
            "Write the one-page style bible with do/don't frame pairs; undocumented taste can't be delegated or defended.",
            "Evolve at 70/20/10 and never change two codes at once — recognition survives drift, not redesigns."
          ],
          actions: [
            "Run the stranger test today: twelve recent posts, handle covered — write down what they say ties them together.",
            "Define your four codes on one page with exact hex values, fonts, grade settings, and motif.",
            "Build your do/don't board: six frames that nail the language, six that violate it, one annotation each."
          ],
          quiz: [
            { q: "The stranger test checks whether:", options: ["Your hashtags match","Your posting cadence is consistent","Your captions are readable","Your last twelve posts are identifiable as yours without the handle"], answer: 3, why: "Signature means pre-conscious attribution — if a stranger can't name what ties your grid together, there's no language yet." },
            { q: "When evolving a visual language, the cardinal rule is:", options: ["Never change more than one code at a time","Follow every trend's aesthetic","Rebrand annually","Change all codes together for impact"], answer: 0, why: "Recognition survives single-variable drift; simultaneous changes read as a different account." },
            { q: "When competitors imitate your codes, the master move is:", options: ["Legal threats","Deepen and out-execute the codes — consistency arbitrates authorship","Copy them back","Immediate rebrand"], answer: 1, why: "Fleeing your own language surrenders the recognition you built; the originator wins by pushing further." }
          ],
          drill: "Choose one luxury or heritage brand and reverse-engineer its four codes from its Instagram grid in writing. Then draft your own four codes in the same format — this document becomes your style bible's first page."
        },
        {
          id: "instagram-5-2",
          title: "The Production Pipeline: One Shoot, Thirty Assets",
          minutes: 12,
          xp: 110,
          skill: "video",
          intro: "Agencies don't shoot content; they shoot inventory. The difference between a creator who burns out and a studio that ships daily is a pipeline — and it fits in one lesson.",
          sections: [
            { h: "Think in asset matrices, not posts", body: "Before any camera moves, the matrix gets built: content pillars down the left, formats across the top — talking-head reels, VO b-roll pieces, loops, carousels, story arcs, covers. Every cell is a potential asset, and a single well-planned shoot day should fill twenty to thirty cells. The pre-production discipline that makes this possible: hooks are written before the shoot, not found in the edit. Ten scripted hooks means ten reels are already half-made and the shot list becomes a shopping list — you know exactly which visuals each script needs, which setups they share, and what the cover still for each must be. Compare the amateur loop: shoot something, stare at footage, hope an idea emerges, post once, repeat forever. The matrix inverts it — ideas first, capture second, assembly third. Volume stops being a grind and becomes a logistics problem, and logistics problems have solutions." },
            { h: "The batch day: choreography of a shoot", body: "A three-hour batch block, run like a call sheet. Hour one: setups — group every script by location and lighting so you move the camera the minimum number of times; three setups can carry a month. Shoot every scene in coverage (wide, medium, tight, plus one insert — permanent law), and capture everything in 4K so punch-ins manufacture extra angles in post. Hour two: the wardrobe trick — swap tops between setups so assets read as different days; audiences perceive variety through clothing and framing far more than through location. Hour three: the sweep — dedicated cover stills for every concept, five seconds of seamless-loop action shot twice for the seam, b-roll of hands, details, and textures against future scripts, and two spare hook deliveries per script at different energies. Everything is captured against a checklist, because the most expensive sentence in content production is 'we'll grab that next time.'" },
            { h: "Post-production as an assembly line", body: "Raw footage becomes inventory through a pipeline with stations. Ingest: files renamed and binned the same day by pillar and script — a naming convention (date_pillar_script_take) turns a folder of chaos into a searchable library. Selects: one pass marking usable takes before any editing begins; editors call this the radio edit when it's voice-first — lock the spoken spine, then dress it. Assembly: edit templates do the heavy lifting — preset text styles, transition recipes, your grade, sound-design kit (whoosh, click, riser, bass hit) all pre-loaded, so a reel is assembled in forty minutes, not built from zero in four hours. Versioning: the multiplier most creators never use — one strong body cut gets three different scripted hooks stitched on, yielding three testable assets from one edit; your Trial Reel lab tells you which hook travels. Export masters into a dated library. The library is the business asset; posts are just its distribution." },
            { h: "The calendar as an operations document", body: "A content calendar that lists topics is a wish. An operations calendar tracks state: every asset moves through scripted, shot, cut, reviewed, scheduled — and you can read the pipeline's health in one glance: too much in 'scripted' means shoot days are the bottleneck; assets dying in 'reviewed' means your approval standard is vague (next lesson fixes that). Weekly operating rhythm: Monday the review gate — last week's numbers against this week's queue; midweek a batch shoot if inventory runs thin; Friday scripts written for the following week, so shoot days never start from a blank page. Kill criteria, decided in advance: an asset that sits in 'cut' for three weeks unposted is dead — archive it without ceremony, because a pipeline that hoards mediocre inventory clogs. The target state is boring: four weeks of finished assets scheduled, experiments running through trials, no heroics, no blank-page panic. Boring pipelines produce fearless content." }
          ],
          takeaways: [
            "Build the pillar-by-format matrix and write all hooks before the shoot — capture becomes a shopping list.",
            "Batch days: minimal setups, full coverage in 4K, wardrobe swaps for perceived variety, cover stills for everything.",
            "Post runs as stations — ingest, selects, template assembly, hook versioning — with a searchable master library.",
            "Track assets by state (scripted > shot > cut > reviewed > scheduled) with pre-agreed kill criteria."
          ],
          actions: [
            "Build your asset matrix this week: pillars down, formats across — and identify the 10 easiest cells to fill.",
            "Write 10 hooks and their shot requirements, then schedule one 3-hour batch shoot against them.",
            "Create your edit template with text presets, grade, and a 4-sound design kit pre-loaded."
          ],
          quiz: [
            { q: "Hooks are written before the shoot because:", options: ["Hooks can't be changed later","It saves caption time","Scripted hooks turn the shot list into a precise shopping list of needed visuals","Editors demand it"], answer: 2, why: "Ideas-first inverts the amateur loop — capture serves known edits instead of hoping footage yields ideas." },
            { q: "Hook versioning means:", options: ["Posting the same reel thrice","Saving old hooks in a document","Testing thumbnail fonts","Stitching three different hooks onto one body cut for three testable assets"], answer: 3, why: "One edit plus three scripted openings yields three assets, and trials reveal which opening travels." },
            { q: "An asset stuck in 'cut' for three weeks should be:", options: ["Archived — hoarded mediocre inventory clogs the pipeline","Moved back to scripted","Polished further","Posted immediately regardless"], answer: 0, why: "Pre-agreed kill criteria keep the pipeline flowing; ceremony around dead assets is pure drag." }
          ],
          drill: "Run a one-hour micro batch: three scripted hooks, one location, full coverage, wardrobe swap halfway. Count the finished assets it yields by end of week — then extrapolate what a true 3-hour block would produce."
        },
        {
          id: "instagram-5-3",
          title: "The Luxury Look: Premium Aesthetics on Instagram",
          minutes: 12,
          xp: 110,
          skill: "video",
          intro: "Luxury on Instagram is not gold filters and jet emojis — it's restraint, executed with total control. This is the grammar agencies use to make brands feel expensive on a phone screen.",
          sections: [
            { h: "The grammar of restraint", body: "Premium reads as the confidence to withhold. Where standard reels fire a pattern interrupt every two seconds, luxury edits hold shots for two to four — the held frame announces that the image can survive scrutiny, and that announcement is the status signal. Negative space does the same work spatially: a watch small in a vast dark frame communicates more expense than a watch filling it, because emptiness on a screen fighting for attention is conspicuous consumption of the viewer's most limited resource. Information behaves identically — the luxury edit withholds: no price, no feature list, no hard sell, sometimes no product name until the final frame, if at all. Scarcity of information mirrors scarcity of goods. The paradox a master understands: this restraint still obeys retention law — the held shot must be composed well enough to sustain the hold, and the withheld information is itself the open loop. Luxury pacing is retention engineering wearing a better suit." },
            { h: "Camera and light: control is the aesthetic", body: "The luxury look is mostly the absence of accident. Movement: slow, motivated, machine-smooth — a creeping push-in on a gimbal or slider, a measured orbit, never handheld urgency; if the camera moves, it moves like it costs money. Light: controlled speculars — the crisp highlight rolling along a car's shoulder line, the single glint on crystal; hard light used deliberately for edge and shape where amateur instinct floods everything soft. Palette: two or three tones, deep blacks that stay black, and one material allowed to glow. Depth: shallow focus isolating the subject from an out-of-focus world — context is implied, never itemized. Motion cadence: shoot for a 24fps feel and resist slow-motion-everything; reserve speed changes for one moment so the single ramp means something. Every choice traces to one principle: nothing in frame is unconsidered. Viewers can't name production control, but they price it instantly and unconsciously." },
            { h: "Sound: the half of luxury nobody sees", body: "Close your eyes during any high-end commercial and it still feels expensive — that's the mix doing brand work. Foley forward: the German-engineered door thunk, fabric settling on a hanger, the pour, the clasp, leather's creak — recorded close, mixed prominent, these textures are the ASMR economy of premium content, delivering the tactile experience the screen can't. Music understated or absent: a sparse piano figure, a low ambient bed, or confident silence; nothing that begs. The trending-audio question answers itself here — a luxury brand chasing a meme sound is a maitre d' doing a dance challenge; the codes collapse on contact. Dynamics matter more than loudness: quiet passages that let the foley breathe, one considered swell where the edit peaks, and a mix mastered so phone speakers keep the detail. The complete grammar: restraint in picture, intimacy in sound. Most accounts get neither; premium accounts get both on purpose." },
            { h: "Copy, pacing, and what luxury never does", body: "The caption voice completes the look. Luxury copy is short, declarative, unhurried — print-ad cadence: 'Four years in development. Available Thursday.' No exclamation marks, no emoji confetti, no 'don't miss out' — urgency is the opposite of abundance, and abundance is the posture. CTAs become invitations: 'Enquire' does what 'LINK IN BIO NOW' cannot, because the brand that doesn't chase signals it doesn't need to. The don't list is the actual syllabus — luxury never: begs for follows, explains its own jokes, posts engagement-bait questions, discounts publicly, overposts (three impeccable posts a week beat daily adequacy; frequency itself is a luxury variable), or breaks character for a trend. And the deepest rule, the one agencies charge for: consistency IS the luxury. One off-code post — a shrieking caption, a mushy export, a beggy CTA — spends brand equity that took months to deposit. The premium account is the one that never blinks." }
          ],
          takeaways: [
            "Luxury = restraint under total control: 2-4 second holds, negative space, withheld information as the open loop.",
            "Camera and light choices signal cost: motivated slow movement, controlled speculars, deep blacks, one glowing material.",
            "The mix is half the look: close foley forward, music sparse or absent, dynamics over loudness.",
            "Copy in print-ad cadence, CTAs as invitations, and a strict never-list — consistency itself is the luxury."
          ],
          actions: [
            "Recut one existing reel to luxury pacing: double every hold, remove all but one speed change, cut any begging CTA.",
            "Record three close foley textures from your product or environment and mix them forward in your next edit.",
            "Write your brand's never-list — five things your account will not do — and pin it in your style bible."
          ],
          quiz: [
            { q: "Negative space reads as premium because:", options: ["It's easier to edit","Emptiness on an attention-starved screen is conspicuous confidence","It loads faster","Instagram boosts minimalism"], answer: 1, why: "Wasting frame real estate signals the image doesn't need to shout — scarcity as status, spatially." },
            { q: "The luxury approach to trending audio is:", options: ["Use every trend within 48 hours","Only instrumental trends","Almost never — chasing memes collapses the brand codes","Only with permission"], answer: 2, why: "A premium posture can't beg for relevance; the codes require the brand to never blink." },
            { q: "Which is on the luxury never-list?", options: ["Slow push-ins","Three posts per week","Foley-forward sound","Public discounting and urgency copy"], answer: 3, why: "Urgency and discounts signal need; abundance — the luxury posture — never chases." }
          ],
          drill: "Take a $20 object and make it read expensive in a 15-second reel using only the grammar: held shots, negative space, controlled light, close foley, no music, five words of copy. The object is the exam."
        },
        {
          id: "instagram-5-4",
          title: "Editing Direction: Giving Notes Like a Creative Director",
          minutes: 11,
          xp: 110,
          skill: "editing",
          intro: "At some point you stop cutting everything yourself — and discover that directing an edit is a harder craft than editing. Great notes are specific, intentional, and executable. Here's the system.",
          sections: [
            { h: "The three-pass review: never mix altitudes", body: "Amateur review sessions bounce between 'the story drags' and 'that font is wrong' in the same breath — and produce revisions that fix neither. Professional review runs three passes at fixed altitudes, never mixed. Pass one, structure: does the hook promise land, is the payload ordered right, does the ending pay the open loops — watched once, no pausing, notes only after. Structural notes may kill whole sections; that's why they come first, because there's no sense polishing a scene that shouldn't exist. Pass two, rhythm: cut points, pacing, pattern-interrupt cadence, the breath of the thing — this is where you scrub frame by frame. Pass three, polish: grade consistency, text timing, mix levels, export hygiene. The discipline sounds bureaucratic and saves entire days: an editor who receives structure notes, then rhythm notes, then polish notes ships version three as final. An editor who receives all three mixed ships version seven, resentfully." },
            { h: "Notes an editor can execute", body: "A note has three parts: location, observation, intention. 'At 0:07, the cut lands after the beat — pull it two frames earlier so the reveal hits on the downbeat.' Timecode, problem, desired effect. Compare the notes that plague this industry: 'make it pop,' 'it's not quite there,' 'can it feel more premium?' — these aren't notes, they're moods, and they force the editor to guess at your taste through revisions that each cost a day. Learn the shared vocabulary so your notes compress: 'J-cut the interview under the b-roll,' 'this transition telegraphs the reveal — hold the wide instead,' 'let it breathe before the CTA.' One more distinction masters make: separate must-fix from consider. 'Must: the hook take is the weakest of the five we shot — swap for take three. Consider: the grade feels half a stop hot on the skin tones.' Editors execute must-lists and weigh consider-lists, and the separation preserves both your standards and their judgment." },
            { h: "Retention data enters the review room", body: "The creative director's unfair advantage over pure-taste reviewers: the analytics from lessons past now direct the notes. Bring the retention curve of the account's last ten reels into every review and note against the patterns, not just the timeline. If drop-offs cluster at the 8-12 second mark across recent posts, then this cut's 10-second mid-section gets scrutiny before anything else — 'our audience historically bleeds here; compress these two beats into one.' If loop reels are outperforming, pass one asks whether this edit's ending can close its loop. Trial Reel results feed the hook conversation: 'claim hooks are losing to cold-open story hooks three trials running — restructure the open.' This is the difference between reviewing an edit and directing a channel: each note serves the account's empirical pattern, not the reviewer's mood that morning. Data doesn't replace taste. It aims taste at what the audience already proved." },
            { h: "The QC gate and growing your editor", body: "Nothing ships without the checklist — mechanical, boring, and the reason agencies look flawless: safe zones respected (nothing critical in the bottom fifth or right rail), text card timing at reading speed, captions synced and typo-free (they're search-indexed), first frame strong (it's the grid thumbnail until the cover uploads), mix peaks controlled with voice above music, loop seam checked on repeat, export at 1080x1920 high-bitrate from the master, cover attached, 3:4 crop verified. Tape it above the desk. Then the longer game: growing an editor into an extension of your taste. Brief with references, not just scripts — 'this pacing, that grade' with links. Run recut exercises: hand them a published reel and its raw footage, have them cut it blind, compare choices — differences are your coaching syllabus. Praise specifically ('the J-cut into the reveal was the right instinct'), correct against the style bible rather than your mood, and note when to stop noting: a session that fixes eighty percent ships; the last twenty percent of polish rarely moves a single metric the audience feels." }
          ],
          takeaways: [
            "Review in three fixed passes — structure, rhythm, polish — and never mix altitudes in one session.",
            "Notes = timecode + observation + intention, split into must-fix and consider; 'make it pop' is a mood, not a note.",
            "Direct with data: note against the account's retention patterns and trial results, not the morning's taste.",
            "Ship through a mechanical QC gate, and grow editors with references, recut exercises, and style-bible corrections."
          ],
          actions: [
            "Write your QC checklist today — start from this lesson's list, add your brand's specifics, tape it up.",
            "Review your next edit (yours or an editor's) in three strictly separated passes and log notes per pass.",
            "Convert three vague notes you've given or received into timecode + observation + intention format."
          ],
          quiz: [
            { q: "Why must structure notes precede polish notes?", options: ["There's no sense polishing a scene that shouldn't exist","Editors prefer it","Structure notes are shorter","Polish is harder"], answer: 0, why: "Fixed-altitude passes prevent wasted revisions — structural kills come before any frame gets polished." },
            { q: "Which is a properly formed edit note?", options: ["It's not there yet, keep going","At 0:14, the text card outlasts its line — out two frames after 'settings' so the reveal lands clean","I don't like the middle","Make it feel more premium"], answer: 1, why: "Location, observation, intention — the editor can execute it in one pass without guessing." },
            { q: "Bringing retention data into review means:", options: ["Skipping taste entirely","Reading view counts aloud","Noting against the account's proven drop-off and hook patterns","Only reviewing viral posts"], answer: 2, why: "Data aims taste: historical bleed points and trial results tell you where this edit needs scrutiny first." }
          ],
          drill: "Take any published reel in your niche and write a full three-pass review as if directing its editor: structural notes, then rhythm notes with timecodes, then polish notes, each split into must-fix and consider."
        },
        {
          id: "instagram-5-5",
          title: "The 90-Day Account Architecture",
          minutes: 13,
          xp: 110,
          skill: "strategy",
          intro: "This is the capstone: the full agency engagement, compressed. Diagnose an account, design a 90-day build, run the weekly operating system, and scale beyond your own hands.",
          sections: [
            { h: "Diagnose before you prescribe", body: "Every engagement starts with an audit, and the audit has four lenses. Positioning: what is this account's ten-word repeatable promise, and does every surface — name field, bio, pins, grid — say it? Usually it exists nowhere but the owner's head. Portfolio: inventory the last sixty days by format and pillar; compute the five ratios per format; find what's quietly working (a format with double the account's average sends is a buried lead) and what's ballast. Funnel: trace the path from stranger to revenue — reel to profile to follow to story to DM to sale — and find the broken stair; most accounts have reach with no capture (no keyword funnels, dead broadcast channel) or capture with no reach. System: is there a pipeline, a calendar with states, a visual language, or is every post an act of improvisation? Write the diagnosis as three sentences: what's working, what's broken, what's missing. Strategy is triage before it's anything else." },
            { h: "Three phases, ninety days", body: "Days 1-30, volume and signal: ship four to five reels weekly across three hook styles and three formats, run Trial Reels on every genuinely new idea, hold daily stories at the 3-7 frame arc, and touch nothing conclusive — this phase buys data, and the discipline is resisting conclusions until day 30, when the ratio sheet names your two winning formats. Days 31-60, concentration: collapse production onto the winners — one becomes an owned, numbered series; keep the experimental slot at ten percent, launch the broadcast channel once story completion proves a warm core, and begin one adjacent-audience collab. Days 61-90, conversion and compounding: keyword funnels on the two best-performing topics, the DM operating rhythm from your expert lessons, a second series if capacity allows, and the 90-day report: five-ratio trends, funnel conversion at each stair, and next quarter's thesis. Volume, then focus, then monetization — in that order, because each phase's output is the next phase's input." },
            { h: "The weekly creative review", body: "The operating system that keeps a 90-day plan alive is a thirty-minute weekly meeting — run it even if the whole team is you. Fixed agenda, five items. Scorecard: the five ratios, week over week, on one screen — trends, not points, and no vanity metrics allowed in the room. Wins forensics: this week's best performer, explained in craft terms specific enough to repeat deliberately. Losses forensics: worst performer, same treatment, no flinching and no excuses about the algorithm. Pipeline health: assets per state, bottleneck named, next batch shoot scheduled. One decision: a single strategic adjustment for the coming week — one, because single-variable weeks are readable and five-change weeks teach nothing. Log every decision with its rationale in a running document; six months of decision logs is the difference between a strategy and a sequence of moods. Post-mortems without blame, decisions without drama, and the meeting ends on time. Boring, again, is the goal. Boring compounds." },
            { h: "Scaling beyond your own hands", body: "The account that depends entirely on you has a ceiling at exactly your hours. Scaling order matters: editor first — editing is the most hours for the least irreplaceable-you; your style bible, edit templates, and QC gate make the handoff survivable, and recut exercises make it good. Then a producer or manager for pipeline state, scheduling, and inbox triage. Writers come last: voice is the hardest thing to delegate and the most damaging to get wrong — when you hire one, they draft in your documented voice and you keep final pass on hooks, the load-bearing sentences. Your own role migrates to creative director: taste, veto, the weekly review, and the four codes' defense. Two failure modes end accounts at this stage — the founder who delegates the standard along with the labor and goes generic within a quarter, and the founder who delegates nothing and burns out within two. The one thing that must never leave your hands: the signature. Everything else is process, and process transfers." }
          ],
          takeaways: [
            "Audit through four lenses — positioning, portfolio ratios, funnel stairs, system — and write a three-sentence diagnosis.",
            "Run 90 days as volume (1-30), concentration on proven winners (31-60), then conversion machinery (61-90).",
            "Hold a weekly 30-minute review: scorecard, win/loss forensics, pipeline health, exactly one decision — all logged.",
            "Scale in order — editor, producer, writer — migrating yourself to taste, veto, and defense of the signature."
          ],
          actions: [
            "Run the four-lens audit on your own account this week and write the three-sentence diagnosis.",
            "Draft your 90-day plan with phase gates: what specifically must be true on day 30 and day 60 to proceed.",
            "Schedule the weekly review as a recurring calendar block and run the first one using the five-item agenda."
          ],
          quiz: [
            { q: "Phase one (days 1-30) exists primarily to:", options: ["Build the broadcast channel","Hire the team","Maximize revenue immediately","Buy clean data through volume and trials before concentrating"], answer: 3, why: "Concentration before evidence is guessing; the first month's job is generating the ratio data that names your winners." },
            { q: "The weekly review permits how many strategic changes?", options: ["Exactly one, so the next week's results stay readable","Five, one per agenda item","None — strategy is quarterly","As many as insights suggest"], answer: 0, why: "Single-variable weeks make cause and effect legible; multi-change weeks teach nothing." },
            { q: "The first hire for a scaling account should be:", options: ["A growth consultant","An editor — most delegable hours, protected by the style bible and QC gate","A second on-camera talent","A scriptwriter"], answer: 1, why: "Editing consumes the most transferable hours, and your documentation makes the handoff safe; voice is delegated last." }
          ],
          drill: "Write the full 90-day architecture for an account you don't run — a local business or creator you know. Diagnosis, phases with gates, weekly agenda, first-hire plan. Teaching the system to someone else's account is the final exam."
        }
      ]
    }
  ]
});
