// Viral Content Science — curriculum data
// Conforms to docs/CONTENT-SPEC.md, section 1.
window.SMU_DATA = window.SMU_DATA || { schools: [] };
SMU_DATA.schools.push({
  id: "viral",
  order: 2,
  name: "Viral Content Science",
  tagline: "Attention is engineered. Learn the mechanics.",
  icon: "🧪",
  hue: 0,
  description: "The psychology and mechanics behind content that spreads: hooks, retention, emotional triggers, curiosity gaps, and share design. For creators who are tired of guessing why one post explodes and ten die quietly. Every lesson turns a vague instinct into a repeatable technique.",
  courses: [
    {
      id: "viral-1",
      level: "Beginner",
      title: "The Anatomy of Attention",
      description: "How virality actually works under the hood: the viewer decision chain, the four metrics that control distribution, first-3-second craft, and the psychology of why people share.",
      lessons: [
        {
          id: "viral-1-1",
          title: "What Viral Actually Means",
          minutes: 9,
          xp: 50,
          skill: "viral",
          intro: "Virality is not luck, magic, or an algorithm's mood. It is a measurable chain of viewer decisions — and every link in that chain is something you can design.",
          sections: [
            {
              h: "Viral is a chain, not a lightning strike",
              body: "Strip the mysticism. A video goes viral because thousands of strangers, one at a time, made the same five decisions: they stopped scrolling, stayed past three seconds, watched most of it, did something (liked, commented, saved), and sent it to someone. Every recommendation system is just a machine that watches those decisions and shows the video to more people while the numbers stay strong. That means virality is not a lottery — it is a funnel, and every stage of the funnel is designable. The hook controls the stop. The first three seconds control the stay. Pacing controls the watch. The payoff controls the engagement. The idea itself controls the send. When a video dies, a practitioner never says 'the algorithm hates me.' They ask: which decision in the chain did viewers refuse to make, and what in the video caused the refusal?"
            },
            {
              h: "The four numbers that decide your reach",
              body: "Learn these before anything else.\n\n- **Hook rate** — the percentage of viewers still watching at the three-second mark. Below roughly 65% on short-form, your opening is leaking; elite hooks hold 80%+.\n- **Average view duration (AVD)** — how much of the video a typical viewer consumes. A 20-second video watched for 14 seconds (70%) beats a 60-second video watched for 20 (33%) in most short-form ranking.\n- **Completion and loop rate** — the share of viewers who reach the end, and the share who watch again. Loops are rocket fuel on TikTok and Reels.\n- **Sends per reach** — shares plus saves relative to impressions. This is the strongest single predictor of breakout distribution, because every send recruits a brand-new viewer for free.\n\nEvery lesson in this school attacks one of these four numbers."
            },
            {
              h: "How the test batch works",
              body: "When you post, the platform does not blast your followers and hope. It runs an audition. The video goes to a small first batch — a few hundred viewers, mixing followers with cold traffic whose interest graph matches the content. The system compares your hook rate, AVD, and sends against the other videos competing for that same attention, that same hour. Win the comparison and you graduate to a larger batch; win again and the waves keep expanding. This explains two things beginners misread. First, the video that 'died at 200 views' was not suppressed — it auditioned and lost. Second, views arriving in staircase jumps days later are normal: you passed a later round. The practical consequence is enormous. Your video is never competing against the entire internet. It is competing against the ten other videos your first 400 viewers saw that session."
            },
            {
              h: "Copy inputs, not outcomes",
              body: "Beginners study viral videos and copy the surface: the song, the transition, the joke. Practitioners copy the inputs: the concept's built-in share trigger, the structure of the opening seconds, the beat placement, the way the payoff lands. You cannot control whether a given video goes viral — timing and luck sit outside the frame. You can absolutely control input quality, and inputs compound. A creator whose baseline hook rate climbs from 55% to 75% has not made one lucky video; they have raised the floor under every video they will ever post. That is the discipline of this entire school: treat each upload as a data point, isolate one input, improve it, run the experiment again. Virality is a byproduct. Input quality is the job."
            }
          ],
          takeaways: [
            "Virality is a funnel of viewer decisions — stop, stay, watch, engage, send — and each stage is designable.",
            "Four numbers rule distribution: hook rate, AVD, completion/loop rate, and sends per reach.",
            "Your post auditions in a small test batch; dying at 200 views means it lost the audition, not that you were suppressed.",
            "Copy the inputs of viral videos, never the surface outcomes."
          ],
          actions: [
            "Open analytics on your last three posts and record hook rate (3-second retention) and AVD for each — this is your baseline.",
            "Watch one viral video in your niche five times and write one sentence per funnel stage describing how the creator won it.",
            "Name the single weakest number in your baseline as the only metric your next post exists to move."
          ],
          quiz: [
            {
              q: "Which metric is the strongest single predictor of breakout distribution?",
              options: ["Hook rate", "Sends per reach (shares + saves)", "Follower count", "Posting time"],
              answer: 1,
              why: "A share or save recruits a new viewer for free, so ranking systems weight it heaviest."
            },
            {
              q: "Your video stalled at 240 views. What most likely happened?",
              options: ["You were shadowbanned", "It lost its first test-batch audition against competing videos", "You posted at the wrong hour", "Your niche is saturated"],
              answer: 1,
              why: "Early stalls almost always mean the first batch's hook rate, AVD, or sends lost the head-to-head comparison."
            },
            {
              q: "A 20-second video with 14s AVD versus a 60-second video with 20s AVD — which usually ranks better in short-form?",
              options: ["The 20-second video: 70% retention beats 33%", "The 60-second video: more raw watch time", "They rank identically", "Neither — length is ignored"],
              answer: 0,
              why: "Short-form systems rank primarily on the percentage of the video consumed, not raw seconds."
            }
          ],
          drill: "Before checking analytics, diagram your most recent post's funnel and mark the timestamp where you would bet viewers left. Then open the retention graph and score your instinct."
        },
        {
          id: "viral-1-2",
          title: "The First Three Seconds",
          minutes: 8,
          xp: 50,
          skill: "viral",
          intro: "You have roughly the length of one eye-blink and one thumb-twitch to earn a viewer. This lesson is the craft of that moment.",
          sections: [
            {
              h: "You are interrupting someone",
              body: "Nobody opens an app hoping to find your video. They are mid-scroll, half-bored, thumb already loaded for the next flick. Your first frame is not an introduction — it is an interruption, and interruptions need a **pattern interrupt**: something that breaks the visual rhythm of the feed. Feeds are full of talking heads in bedrooms, so a talking head in a bedroom is camouflage. Motion where stillness is expected, stillness where motion is expected, an object that does not belong, a sentence that starts mid-thought — these snap the pattern. Practitioners call the metric 'thumb-stop.' The test is brutal and simple: scroll your own draft inside a feed of other videos. If your eye slides over it, so will ten thousand others. You are not competing on quality in second one. You are competing on difference."
            },
            {
              h: "The cold open: cut the throat-clearing",
              body: "Watch a beginner's video and count the wasted seconds: a logo sting, a fade-in, 'hey guys, welcome back,' a breath, context nobody asked for. Every one of those seconds bleeds hook rate. The fix is the **cold open** — start at the most interesting moment of the video, then rewind to explain if you must. The chef starts on the flame kissing the pan, not the grocery run. The storyteller starts on 'so the police officer is now holding my phone,' not 'this happened last Tuesday.' A useful editing rule: after your edit feels tight, delete the first two seconds anyway and see if the video still makes sense. It almost always does — and it almost always performs better. Nothing before the hook. No exceptions until you have earned them."
            },
            {
              h: "The visual grammar of frame one",
              body: "Certain images reliably hold eyes, and you can stack them deliberately.\n\n- **Motion vectors** — movement toward the camera or across frame beats static shots; even a slow push-in reads as 'something is happening.'\n- **Faces and eye contact** — human brains are wired to lock onto faces; direct-to-lens gaze creates an almost social obligation to listen.\n- **High contrast and negative space** — a clean subject against an uncluttered background reads instantly at thumbnail size; visual noise reads as 'skip.'\n- **Mid-action framing** — hands already doing the thing, the door already opening, the reveal already half-visible.\n\nRun the frame-one test on every draft: pause on the first frame, mute it, squint. Can you tell what the video is about and why you should care? If not, reshoot the open — not the caption."
            },
            {
              h: "The 3-second contract",
              body: "Your opening makes a promise: watch this and you will get something specific — a payoff, a reveal, a laugh, a skill. The rest of the video exists to honor that contract. Two failure modes kill beginners. Vague promises: 'this changed my life' stops nobody, because it could mean anything; 'this $12 tool ended my back pain' stops the right people, because specificity signals a real payoff. And broken promises: a spectacular hook with a limp payoff trains your audience to distrust your future hooks — you win the click and lose the relationship. Write the contract in one sentence before you shoot: 'Stay 30 seconds and you will learn/see/feel X.' If you cannot write that sentence sharply, the problem is not your hook. It is your idea, and no edit will save it."
            }
          ],
          takeaways: [
            "Your first frame is an interruption — win with a pattern interrupt, not with polish.",
            "Cold open every video: start at the most interesting moment, cut all throat-clearing.",
            "Frame one should pass the mute-and-squint test: subject clear, stakes implied, zero clutter.",
            "The first 3 seconds are a contract; specificity makes it stop the right people, and the payoff must honor it."
          ],
          actions: [
            "Re-edit your last post: delete everything before the first genuinely interesting moment, even if it feels abrupt.",
            "Shoot tonight's video starting mid-action — hands already moving, result already half-visible.",
            "Write the 3-second contract for your next post as one sentence before you pick up the camera."
          ],
          quiz: [
            {
              q: "What is a 'pattern interrupt' in feed terms?",
              options: ["A jump cut mid-sentence", "Anything that breaks the visual rhythm viewers expect from the feed", "Posting at an unusual time", "A watermark on the video"],
              answer: 1,
              why: "The feed trains an expectation; breaking it is what makes the thumb pause."
            },
            {
              q: "Which opening line best honors the 3-second contract?",
              options: ["'Hey guys, welcome back to the channel'", "'This changed everything for me'", "'This $12 tool ended my back pain in a week'", "'Make sure to like and subscribe first'"],
              answer: 2,
              why: "Specificity signals a concrete payoff and filters for viewers who will actually watch through."
            },
            {
              q: "The frame-one test asks you to pause the first frame, mute it, and check what?",
              options: ["Whether your logo is visible", "Whether the color grade matches your feed", "Whether the subject and reason to care read instantly", "Whether the caption is legible"],
              answer: 2,
              why: "Most viewers decide on frame one at a glance, often with sound off — it must communicate alone."
            }
          ],
          drill: "Take three of your old videos and re-cut only the first three seconds of each using a cold open. Post the strongest one and compare its hook rate against the original."
        },
        {
          id: "viral-1-3",
          title: "Hooks 101: The Three Channels",
          minutes: 10,
          xp: 50,
          skill: "viral",
          intro: "Every scroll-stopping video hooks on up to three channels at once — what viewers hear, what they see, and what they read. Beginners use one. Practitioners stack all three.",
          sections: [
            {
              h: "One moment, three channels",
              body: "A hook is not a sentence. It is the total signal your video emits in its opening moment, and that signal travels on three separate channels. The **verbal hook** is the first spoken line. The **visual hook** is what the frame shows — action, subject, setting, movement. The **text hook** is the on-screen overlay a viewer can read with sound off. Each channel catches a different viewer: commuters watch muted and live on the text channel; multitaskers listen more than they look; visual thinkers judge the frame before either. A video hooked on one channel gambles on catching one type. Stacked correctly, the three channels also reinforce each other — the text raises a question, the visual shows the stakes, the voice starts the answer. The rest of this lesson builds each channel; the stacking rule comes last, because it is where beginners get it wrong."
            },
            {
              h: "Verbal hooks: the first line does the heavy lifting",
              body: "Strong first lines share recognizable DNA. Some proven shapes:\n\n- **The mid-story drop**: 'So the dealership just called the police on me.' Starts inside the action; the brain demands the missing context.\n- **The contrarian snap**: 'Posting daily is killing your account.' Challenges a belief the viewer holds; they stay to defend it or to be convinced.\n- **The specific promise**: 'Three camera settings that make a $500 phone look cinematic.' A numbered, concrete payoff.\n- **The direct callout**: 'If you sell anything online, stop scrolling.' Names the viewer; relevance is the strongest filter.\n\nNotice what none of them do: introduce, greet, or warm up. Delete 'so basically,' 'okay so,' and every syllable before the load-bearing words. Read your first line out loud, cut it by a third, and read it again. Shorter almost always survives."
            },
            {
              h: "Visual and text hooks: the silent salesmen",
              body: "The visual hook obeys the frame-one grammar from the last lesson — motion, faces, contrast, mid-action. What is new here is its narrative job: the frame should pose a question the voice has not answered yet. A man in a suit standing in an empty swimming pool needs no caption to earn three seconds.\n\nThe text hook has its own craft rules. Keep it to six to nine words — reading speed at scroll pace is real. Place it in the upper two-thirds, clear of platform UI safe zones. High contrast, one line if possible, no punctuation clutter. And critically: the text should not transcribe the verbal hook. Duplication wastes a channel. If the voice says 'this mistake cost me $40,000,' the text can say 'the invoice is real' — a second, complementary hook that deepens the itch instead of repeating it."
            },
            {
              h: "Stacking without shouting",
              body: "The mistake with three channels is turning each one to maximum and creating noise: screaming text, chaotic frame, breathless voice. Stacked hooks work by **division of labor**. Give each channel one job. A clean pattern that works across niches: text poses the question ('why is this room worth $30M?'), visual shows the evidence (slow glide through the room), voice opens the story ('the listing agent told me not to film this'). Three hooks, one target, no competition between them. Test your stack the way a stranger meets it: watch muted — does the text-plus-visual pair stop you? Then listen with the screen off — does the first line alone stop you? If either test fails, that channel is dead weight. Rebuild the weak channel; never compensate by making the strong one louder."
            }
          ],
          takeaways: [
            "Every hook travels on three channels — verbal, visual, text — and each catches a different kind of viewer.",
            "First lines win through shape: mid-story drops, contrarian snaps, specific promises, direct callouts.",
            "Text hooks are 6-9 words, safe-zone placed, and must complement — never transcribe — the verbal hook.",
            "Stack channels by division of labor: one question, one evidence, one story-open. Louder is not better."
          ],
          actions: [
            "Write your next post's hook three times — once per channel — on three separate lines before shooting anything.",
            "Audit your last five posts: mark which channels each hook used. Most beginners discover they have been using one.",
            "Steal the shape (not the words) of three first lines from viral videos outside your niche and rewrite them for your topic."
          ],
          quiz: [
            {
              q: "Why should the text hook not transcribe the verbal hook?",
              options: ["Captions are penalized by algorithms", "It wastes a channel that could deliver a second, complementary hook", "Text hooks are only for muted viewers", "Transcription violates safe zones"],
              answer: 1,
              why: "Each channel is an independent chance to deepen curiosity; duplication spends it on nothing."
            },
            {
              q: "Which first line uses the 'mid-story drop' shape?",
              options: ["'Welcome back — today we're talking cars'", "'So the dealership just called the police on me'", "'Five tips for better lighting'", "'You need to hear this'"],
              answer: 1,
              why: "It starts inside the action, forcing the brain to demand the missing context."
            },
            {
              q: "What is the correct test for a stacked hook?",
              options: ["Watch it muted, then listen without the screen — each pair must stop you on its own", "Check that all three channels say the same thing", "Make sure the text is as loud as the voice", "Ask a friend if they like it"],
              answer: 0,
              why: "Real viewers meet your hook muted or half-listening, so each channel combination must hold independently."
            }
          ],
          drill: "Take one idea and produce three versions of its opening — verbal-led, visual-led, text-led. Show all three to someone for two seconds each and ask which they would keep watching."
        },
        {
          id: "viral-1-4",
          title: "High-Arousal Emotions: The Trigger Wheel",
          minutes: 9,
          xp: 50,
          skill: "viral",
          intro: "Content spreads on feeling, not information. But not all feelings spread equally — and the difference is measurable arousal, not positivity.",
          sections: [
            {
              h: "Arousal beats valence",
              body: "The research on why content spreads keeps landing on the same finding: what predicts sharing is not whether an emotion is positive or negative, but how physiologically **activating** it is. High-arousal emotions — awe, amusement, anger, anxiety, excitement, admiration — put the body in motion, and sharing is a motion. Low-arousal emotions — contentment, mild sadness, calm satisfaction — feel pleasant but leave thumbs still. This is why a merely 'nice' video dies while an infuriating one and an awe-inspiring one both explode. It also kills a beginner myth: you do not need people to like your video. You need them activated by it. Map your last ten posts honestly. If most of them aim at 'people will find this pleasant,' you have been producing low-arousal content and wondering why the numbers say sedative."
            },
            {
              h: "The working trigger wheel",
              body: "Six triggers cover most viral content. Learn to name which one a video pulls.\n\n- **Awe** — scale, mastery, transformation: the penthouse reveal, the impossible skill, the 90-day body.\n- **Amusement** — surprise plus safety: the punchline, the fail, the perfectly-timed cut.\n- **Anger** — injustice or violated standards: 'this contractor charged her $12k for this.'\n- **Anxiety** — urgent stakes: 'check your car for this before winter.'\n- **Admiration** — earned excellence: craft videos, discipline stories, restoration content.\n- **Aspiration** — a reachable better self: 'the 5am routine that fixed my focus.'\n\nEach niche has natural pairings. Luxury runs on awe and aspiration. Fitness runs on aspiration and admiration. Consumer advocacy runs on anger and anxiety. Comedy runs on amusement layered over any of the others. Choose the trigger before you script — it decides your pacing, your music, and your ending."
            },
            {
              h: "One video, one dominant emotion",
              body: "Beginners chase every feeling at once and land none. A video that tries to be funny, inspiring, and outrageous in 40 seconds reads as emotionally confused — the viewer never knows what they are supposed to feel, so they feel nothing and scroll. Practitioners pick one dominant trigger and let every craft decision serve it. Awe wants slower pacing, wider shots, music that swells, and a held final frame. Amusement wants tight cuts, abrupt endings, silence where a lesser editor adds music. Anger wants receipts on screen — documents, numbers, timestamps — because outrage without evidence curdles into distrust. You can layer a secondary emotion as seasoning: awe with a wink of humor, anger resolved into relief. But if you cannot name the single feeling a stranger should have at your final frame, the video is not ready to shoot."
            },
            {
              h: "The ethics line (and why it is also strategy)",
              body: "Anger and anxiety are the easiest triggers to pull and the most corrosive to overuse. Manufactured outrage and inflated fear work exactly once per viewer — then you become the account that cried wolf, and your credibility, the asset every future video depends on, is spent. The durable practice: only trigger emotions the content can honor. Real stakes, real injustice, real awe. There is a strategic bonus hiding in the ethics: honored emotion converts viewers into followers, because they trust the next video to deliver a real feeling again, while cheap triggers convert viewers into skeptics. When you audit big accounts that lasted a decade, you find awe, admiration, and amusement doing the heavy lifting, with anger deployed rarely and precisely. Build your wheel the same way. Activation gets the view; honesty gets the subscriber."
            }
          ],
          takeaways: [
            "Sharing is predicted by emotional arousal, not positivity — 'nice' content is a sedative.",
            "Six workhorse triggers: awe, amusement, anger, anxiety, admiration, aspiration — know your niche's natural pair.",
            "One dominant emotion per video; every pacing, music, and ending choice should serve it.",
            "Only trigger what the content can honor — cheap outrage spends credibility you cannot refund."
          ],
          actions: [
            "Label your last ten posts with their dominant trigger — write 'none' honestly where there isn't one.",
            "Script your next post by choosing the trigger first, then listing three craft choices (pacing, sound, ending) that serve it.",
            "Find the top three videos in your niche this month and name the trigger each one pulls."
          ],
          quiz: [
            {
              q: "What best predicts whether an emotion drives sharing?",
              options: ["How positive it is", "How physiologically activating it is", "How rare it is", "How long it lasts"],
              answer: 1,
              why: "High-arousal emotions put the body in motion, and sharing is a motion; valence matters far less."
            },
            {
              q: "A luxury real-estate video should most naturally lead with which trigger pair?",
              options: ["Anger and anxiety", "Awe and aspiration", "Amusement and anger", "Anxiety and admiration"],
              answer: 1,
              why: "Scale and a reachable better self are the native emotional currencies of luxury content."
            },
            {
              q: "Why is manufactured outrage a losing strategy?",
              options: ["Platforms delete angry content", "It only works on small accounts", "It spends viewer trust, and credibility is the asset every future video depends on", "Anger cannot go viral"],
              answer: 2,
              why: "Unhonored triggers turn viewers into skeptics, poisoning the response to everything you post next."
            }
          ],
          drill: "Take one topic and outline it twice: once engineered for awe, once for amusement. Note how the pacing, shot choices, and ending change — that difference is emotional craft."
        },
        {
          id: "viral-1-5",
          title: "Why People Share: The Identity Mirror",
          minutes: 8,
          xp: 50,
          skill: "viral",
          intro: "Nobody shares your video to help you. They share it to say something about themselves. Design for that, and the share button starts working for you.",
          sections: [
            {
              h: "Every share is a self-portrait",
              body: "When someone forwards your video, they are publishing a tiny statement about who they are: I am the friend with taste. I am the one who finds things first. I am smart, I am in on the joke, I care about you. Psychologists call this **social currency** — we share what makes us look good to the people we share with. The uncomfortable implication for creators: your video's quality is only half the equation. The other half is whether sharing it flatters the sharer. A brilliantly useful video that makes the sender look ordinary gets saved, not sent. A merely good video that lets the sender say 'I found this gem' travels for weeks. Before you post, ask the practitioner's question: if someone sends this, what does it say about them? If the answer is 'nothing,' you have built a cul-de-sac."
            },
            {
              h: "The four share motives",
              body: "Almost every send maps to one of four motives, and you can design for each.\n\n- **Status**: 'I discovered this.' Serve it with insider knowledge, obscure finds, and early takes — content that feels un-Googled.\n- **Tribe**: 'This is so us.' Serve it with hyper-specific shared experiences: the gym at 6am crowd, second-year realtors, dads with project cars. Precision creates recognition.\n- **Care**: 'You need this.' Serve it with genuinely useful warnings and fixes aimed at a nameable person — 'send this to a friend who just bought their first car.'\n- **Emotion overflow**: 'I have to show someone.' Serve it with awe or amusement so strong it demands a witness.\n\nNotice that tribe and care shares are addressed to one specific person. That is the highest-value share on any platform — a personal recommendation inside a DM."
            },
            {
              h: "Design the forward, not just the video",
              body: "Practitioners decide who sends the video to whom before writing a single line. The exercise takes thirty seconds: name the sender, name the receiver, write the imaginary text message that accompanies the share. 'Bro this is literally you.' 'Told you the market was shifting.' 'Watch before you book anything.' If you cannot write that message, viewers cannot feel it either, and the share will not happen. This reframes content ideas powerfully. 'Ten gym mistakes' is a topic. 'The gym mistake every beginner's friend silently watches them make' is a forward — it has a built-in sender (the experienced friend) and receiver (the beginner). One clean tactic to activate it: name the receiver out loud in the video or caption. 'Send this to the friend who still skips warm-ups' converts a private chuckle into a delivery instruction."
            },
            {
              h: "Saves: the quiet sibling of shares",
              body: "Saves signal something different from shares — private future value instead of public identity — and platforms treat them as a heavyweight signal because a save predicts a return visit. Content earns saves by being **referenceable**: lists, settings, recipes, frameworks, checklists, anything a viewer knows they cannot absorb in one pass. The craft move is density-on-purpose: pack the video with slightly more usable detail than one viewing can hold, then say so — 'save this for your next shoot day.' A video can be engineered as a share piece or a save piece, and the best formats decide which they are. Emotional, identity-flavored content is share-first. Tactical, stepwise content is save-first. Trying to be both usually dilutes both. Later, in the Expert course, you will build entire assets around save mechanics — for now, just start labeling each idea 'share piece' or 'save piece' before production."
            }
          ],
          takeaways: [
            "People share to say something about themselves — social currency, not charity.",
            "Four motives cover most sends: status, tribe, care, and emotion overflow.",
            "Design the forward: name the sender, the receiver, and the text message that travels with the share.",
            "Shares are public identity; saves are private future value — decide which one each post is engineered for."
          ],
          actions: [
            "For your next post, write the imaginary DM that accompanies a share of it — before you shoot.",
            "Rewrite one of your generic topic ideas into a tribe-specific version aimed at a nameable micro-audience.",
            "Add an explicit receiver line to one post this week: 'send this to the friend who...'"
          ],
          quiz: [
            {
              q: "What is 'social currency' in sharing psychology?",
              options: ["Paying influencers for shares", "The status value a person gains by sharing something", "Platform reward programs", "The number of followers you have"],
              answer: 1,
              why: "People share what makes them look good — discerning, early, funny, caring — to their audience of one or many."
            },
            {
              q: "Which idea has a built-in forward?",
              options: ["'Ten gym mistakes'", "'My workout routine'", "'The gym mistake every beginner's friend silently watches them make'", "'Why I love fitness'"],
              answer: 2,
              why: "It contains a nameable sender and receiver, so the share message writes itself."
            },
            {
              q: "Why do platforms weight saves so heavily?",
              options: ["Saves are rarer than likes", "A save predicts a return visit to the platform", "Saves are public endorsements", "Saved videos earn ad revenue"],
              answer: 1,
              why: "Save behavior signals future session time, which is the platform's core business metric."
            }
          ],
          drill: "Open your DMs and study the last five videos friends actually sent you. For each, name the motive — status, tribe, care, or overflow — and what the share said about the sender."
        },
        {
          id: "viral-1-6",
          title: "Reading Your First Retention Graph",
          minutes: 9,
          xp: 50,
          skill: "analytics",
          intro: "The retention graph is the only honest review your video will ever get. Comments lie, likes flatter — the graph shows you the exact second people gave up.",
          sections: [
            {
              h: "The graph is a map of decisions",
              body: "A retention graph plots what percentage of viewers are still watching at every second of your video. Read left to right, it is a record of thousands of private decisions to stay or leave — no politeness, no bias, no mercy. Learning to read it is the fastest skill-acquisition shortcut in this entire school, because it converts vague feedback ('this video didn't do well') into surgical feedback ('I lose 30% of everyone at second four, right when I start explaining context'). Before reading shapes, calibrate expectations: every video loses a chunk of viewers immediately — mis-targeted impressions bouncing off — so do not mourn the first cliff's existence, only its size. On short-form, holding above roughly 70% at three seconds and above 40-50% at the midpoint puts you in strong territory. Below that, the graph will tell you exactly where the leak is."
            },
            {
              h: "Four shapes, four diagnoses",
              body: "Nearly every graph is a combination of four shapes.\n\n- **The cliff** — a sharp vertical drop. At 0-3 seconds: your hook failed or attracted the wrong audience. Mid-video: you changed topic, stalled, or hit a boring stretch viewers could feel coming.\n- **The steady slope** — a straight downward line. Normal in moderation; steep means your pacing leaks everywhere, usually from low information density and long shots.\n- **The plateau** — a flat stretch. Gold. Whatever is happening there is holding everyone; study it and do more of it.\n- **The bump** — retention rising above an earlier point. Viewers are rewatching a moment. Find what they replayed — a joke, a detail, a satisfying beat — because that is your audience telling you what they came for."
            },
            {
              h: "From shape to fix",
              body: "Diagnosis only matters if it changes the next video. The mapping is mechanical. Early cliff: rebuild the hook using the three-channel stack, or admit the packaging attracted viewers the content was never for — a targeting problem disguised as a hook problem. Mid-video cliff: find the exact second, watch the five seconds before it, and you will almost always find a transition into explanation, a repeated point, or the moment the promise seemed fulfilled — after which viewers rationally left. Steep slope: tighten everything by 20%, cut breaths, shorten shots, remove any sentence that does not add new information. Plateaus and bumps: reverse-engineer them and build your next hook from that exact material. One discipline makes this compound: keep a log. One line per video — where the leak was, what you believe caused it, what you changed. Ten videos later you have a private playbook nobody can copy."
            }
          ],
          takeaways: [
            "The retention graph converts vague failure into surgical feedback: the exact second viewers quit.",
            "Four shapes tell the story: cliffs (event failures), slopes (pacing leaks), plateaus (working material), bumps (rewatched gold).",
            "Every shape maps to a mechanical fix — and mid-video cliffs are usually caused by the five seconds before them.",
            "Log one line per video: leak location, suspected cause, change made. This becomes your private playbook."
          ],
          actions: [
            "Pull retention graphs for your last three videos and label every cliff, slope, plateau, and bump.",
            "For your worst mid-video cliff, rewatch the five seconds before it and write down what likely triggered the exit.",
            "Start your retention log today — a plain note with one line per video."
          ],
          quiz: [
            {
              q: "A sharp retention cliff at second 2 most likely means what?",
              options: ["The video is too long", "The hook failed or the packaging attracted the wrong viewers", "The music was too quiet", "You posted at a bad time"],
              answer: 1,
              why: "Nothing but the hook and audience-match has happened yet, so an early cliff indicts them."
            },
            {
              q: "A bump — retention rising above an earlier level — signals what?",
              options: ["A tracking error", "Viewers skipped ahead", "Viewers are rewatching that moment", "The platform boosted the video"],
              answer: 2,
              why: "Retention above 100% of the previous point means the same seconds were consumed more than once."
            },
            {
              q: "The best first response to a steep steady slope across the whole video is:",
              options: ["Change your niche", "Post more often", "Add a call to action", "Tighten pacing everywhere — cut breaths, shorten shots, raise information density"],
              answer: 3,
              why: "A uniform slope is a pacing leak, not an event failure, so the fix is global compression."
            }
          ],
          drill: "Screenshot your best video's retention graph and your worst video's graph side by side. Write three sentences on what the shapes say the two videos did differently."
        }
      ]
    },
    {
      id: "viral-2",
      level: "Intermediate",
      title: "Hook Engineering",
      description: "The deep craft of the open: curiosity gaps that itch, verbal hooks with proven shapes, visual and text hooks that pass the frame-one test, re-hooks that reset attention, and payoffs that keep the promises your hooks make.",
      lessons: [
        {
          id: "viral-2-1",
          title: "Curiosity Gaps and Open Loops",
          minutes: 10,
          xp: 60,
          skill: "viral",
          intro: "Curiosity is not a mood — it is a measurable itch created by a gap between what someone knows and what they need to know. This lesson teaches you to open that gap on purpose and close it on schedule.",
          sections: [
            {
              h: "The information gap",
              body: "Behavioral economist George Loewenstein described curiosity as the discomfort of an **information gap**: the moment you know that you don't know something specific, your brain treats the missing piece like an itch it must scratch. Two properties make this weaponizable for creators. First, the gap must be visible — a viewer cannot crave an answer to a question they never noticed. Your hook's job is to make the gap impossible to ignore. Second, the gap must feel closable — the viewer has to believe the answer is coming soon, inside this video, and worth the wait. 'You won't believe what happened' opens no gap because it is shapeless. 'The inspector found something behind this wall that ended the sale' opens a precise gap: a specific unknown, a promised reveal, stakes attached. Precision is what turns vague intrigue into a held viewer."
            },
            {
              h: "Calibrating gap width",
              body: "Gaps fail in two directions. Too narrow, and the viewer closes it themselves — 'guess which color we painted the door' is solvable, so nobody waits. Too wide, and the viewer has no foothold — a cryptic tease with no context reads as noise, and the brain dismisses what it cannot begin to model. The working zone sits between: the viewer can form two or three competing guesses but cannot be sure. That uncertainty between plausible answers is the itch. Calibrate with the **guess test**: state your hook to someone and ask what they think the answer is. If they answer instantly and confidently, widen the gap. If they shrug, narrow it by adding context or stakes. 'Why this $8M listing has no kitchen' passes — a viewer can guess (renovation? staging? eccentric buyer?) but cannot know, and the guesses themselves keep them watching to find out who was right."
            },
            {
              h: "Open loops and the Zeigarnik pull",
              body: "An **open loop** is a curiosity gap you deliberately refuse to close right away. The psychology behind it is the Zeigarnik effect: unfinished tasks occupy the mind more than finished ones, so an unresolved question keeps working on the viewer even while other content plays. In practice: open the loop in your hook, then make the viewer earn the close. The classic structure — 'the third mistake on this list cost me a client' — opens at second one and pays off at second forty, dragging viewers across the whole video. Longer content can nest loops: open loop A in the hook, open loop B mid-video, close A, then close B near the end, so there is never a moment when everything feels resolved. The moment all loops close, the rational viewer leaves — which is why practitioners close their final loop in the last two seconds, not the last twenty."
            },
            {
              h: "Loop debt: the account you must not overdraw",
              body: "Every open loop is a debt, and viewers keep ledgers. Close the loop with a payoff that matches the promise and you earn trust — they will follow your next loop further. Close it with something weaker than implied, and you have committed the cardinal sin the audience calls clickbait: the loop paid interest to you and nothing to them. The damage is cumulative and mostly invisible: your next hooks stop working, and you will not know why, because the graph only shows this video, not the grudge from the last one. Three rules keep the ledger clean. Never open a loop whose answer you'd be embarrassed to state plainly. Close every loop you open — an unresolved tease with no payoff reads as contempt. And occasionally over-deliver: a payoff bigger than the promise is the cheapest loyalty program in content."
            }
          ],
          takeaways: [
            "Curiosity is an information gap — it must be visible, specific, and feel closable within the video.",
            "Calibrate gap width with the guess test: two or three competing guesses is the working zone.",
            "Open loops exploit the Zeigarnik effect — close the final loop in the last two seconds, never earlier.",
            "Every loop is debt: match or exceed the promised payoff, or your future hooks stop working."
          ],
          actions: [
            "Rewrite your next hook until it names a specific unknown with stakes — no shapeless 'wait for it' teases.",
            "Run the guess test on one hook with a friend today and adjust the gap width based on their response.",
            "Structure your next 45+ second video with two nested loops, closing the last one inside the final two seconds."
          ],
          quiz: [
            {
              q: "According to the information-gap model, curiosity requires the viewer to:",
              options: ["Be entertained first", "Notice a specific unknown and believe it is closable soon", "Trust the creator already", "See a face in frame one"],
              answer: 1,
              why: "The itch only exists when a person knows exactly what they don't know and expects the answer inside the video."
            },
            {
              q: "'Guess which color we painted the door' fails as a hook because:",
              options: ["It's too long", "The gap is too wide", "The gap is too narrow — viewers solve it and leave", "Doors don't go viral"],
              answer: 2,
              why: "A gap the viewer can close alone generates no need to keep watching."
            },
            {
              q: "Why close your final open loop in the last two seconds rather than earlier?",
              options: ["Endings should be abrupt for the algorithm", "Once all loops close, the rational viewer exits — resolution is the release of attention", "It leaves room for a CTA", "Platforms cut off the last seconds"],
              answer: 1,
              why: "Unresolved questions are what hold attention; resolving them is what releases it."
            }
          ],
          drill: "Watch a 60-second video that held you to the end and map its loops: timestamp where each question opens, where each closes, and how many are open at once at the midpoint."
        },
        {
          id: "viral-2-2",
          title: "Verbal Hooks: Writing Lines That Buy Time",
          minutes: 10,
          xp: 60,
          skill: "viral",
          intro: "A verbal hook has one job: purchase the next five seconds of attention. This is the copywriting lesson for your mouth.",
          sections: [
            {
              h: "The economics of the first sentence",
              body: "Think of attention as currency the viewer spends reluctantly. Your first line is a price tag and a promise at once: it costs them three seconds to process, and it must advertise a return worth far more. Every word that fails to raise the promised return is a tax — which is why compression is the first skill of verbal hooks. Take a draft line and strip it to its load-bearing words. 'So I wanted to talk about something that I think a lot of new creators get wrong about posting' contains one payload — 'new creators get this wrong' — buried under fourteen words of packaging. The compressed version costs less and promises the same, so it converts better. A practical ceiling for short-form: the complete verbal hook lands inside two spoken seconds. Time yourself. Most beginners are shocked to find their 'hook' takes six."
            },
            {
              h: "Six proven shapes and why each works",
              body: "Hooks are not invented from nothing — they are cast from shapes with known psychology.\n\n1. **Negative flag**: 'Stop doing this in your reels.' Losses loom larger than gains; negativity bias buys the pause.\n2. **Specific promise**: 'Three settings that fix muddy audio.' A numbered, bounded payoff feels cheap to collect.\n3. **Contrarian snap**: 'Consistency is overrated.' Belief violation demands resolution.\n4. **Stakes-first story**: 'This mistake cost me $40,000.' Money, danger, and consequence are pre-installed attention magnets.\n5. **Direct callout**: 'If you shoot on an iPhone, this is for you.' Relevance filtering — the right viewers lean in.\n6. **Impossible image**: 'I haven't bought groceries in a year.' A claim the brain cannot reconcile without the explanation.\n\nSteal shapes freely; never steal words. The shape carries the psychology — your niche supplies the flesh."
            },
            {
              h: "Specificity is the multiplier",
              body: "Run any hook through one upgrade before all others: replace every general word with a particular one. 'This tool saves me money' becomes 'this $12 tool saves me about $300 a month.' 'A while ago' becomes 'last Tuesday.' 'A client' becomes 'a wedding photographer in Austin.' Specificity works on three levels at once. It signals credibility — vague claims pattern-match to scams, precise ones to lived experience. It sharpens the curiosity gap — 'about $300 a month' invites the calculating question 'how?' where 'money' invites nothing. And it targets — the wedding photographer detail tells an entire profession this video is theirs. The discipline costs seconds and returns percentages: audit any strong performer in your niche and count the concrete nouns and numbers in the first line. Then count yours. The gap between those counts is usually the gap between the view counts."
            },
            {
              h: "The ban list and the read-aloud pass",
              body: "Certain openers are so overused they now function as skip signals — the viewer's brain has learned that nothing valuable follows them. Retire these permanently: 'Hey guys, welcome back.' 'In this video I'm going to...' 'So basically.' 'Fun fact.' 'Let me tell you a story.' 'You won't believe...' Each announces that the payload hasn't started, which is an invitation to leave. The replacement discipline is the **read-aloud pass**: speak your hook out loud, record it, and listen once as a stranger. You are checking three things — does the payload arrive in the first breath, does the sentence sound like speech rather than an essay, and would you personally stay? Then cut one more word than feels comfortable. Written hooks tolerate flab; spoken hooks do not, because the ear detects filler faster than the eye. Your mouth is the final editor."
            }
          ],
          takeaways: [
            "A verbal hook is a price tag plus a promise — compress until only load-bearing words remain, inside two spoken seconds.",
            "Six castable shapes: negative flag, specific promise, contrarian snap, stakes-first story, direct callout, impossible image.",
            "Specificity multiplies everything: credibility, curiosity, and targeting. Swap general words for particular ones.",
            "Retire skip-signal openers and run every hook through a read-aloud pass before shooting."
          ],
          actions: [
            "Write ten hooks for your next post — at least one per shape — then pick the winner by reading all ten aloud.",
            "Take your last post's first line and rewrite it with three specific details (a number, a name, a timeframe).",
            "Time your current draft's hook with a stopwatch; cut until the payload lands within two seconds."
          ],
          quiz: [
            {
              q: "Why does the 'negative flag' shape ('stop doing this') reliably buy attention?",
              options: ["Negativity bias — potential losses register more strongly than gains", "Commands are polite", "Algorithms boost warnings", "It works only on beginners"],
              answer: 0,
              why: "Brains prioritize threat and loss information, so a flagged mistake outpulls an equivalent promised gain."
            },
            {
              q: "Which rewrite best applies the specificity multiplier?",
              options: ["'This tool is amazing' → 'This tool is really amazing'", "'This tool saves money' → 'This $12 tool saves me about $300 a month'", "'This tool saves money' → 'This tool will change your life'", "'This tool saves money' → 'Tools like this save money'"],
              answer: 1,
              why: "Concrete numbers add credibility, sharpen the how question, and target viewers who care about that math."
            },
            {
              q: "The read-aloud pass exists because:",
              options: ["Captions are generated from audio", "Spoken flab is easier to hear than written flab is to see", "Platforms transcribe your hook", "It warms up your voice"],
              answer: 1,
              why: "The ear catches filler and essay-cadence instantly, making your mouth the best final editor for a spoken line."
            }
          ],
          drill: "Pick one topic and write the same hook in all six shapes. Post the two strongest as separate videos this week and compare their 3-second hold rates."
        },
        {
          id: "viral-2-3",
          title: "Visual Hooks: Winning the Frame-One Test",
          minutes: 9,
          xp: 60,
          skill: "video",
          intro: "Before a single word lands, the frame has already argued for or against you. Visual hooks are the discipline of making that argument on purpose.",
          sections: [
            {
              h: "The frame speaks first",
              body: "Viewers process an image in a fraction of the time it takes to hear a syllable, which means your visual hook fires before your verbal one gets a chance. Whatever frame one shows is your actual first impression — not your script. Practitioners therefore compose the opening frame like a poster: one clear subject, an implied question, zero clutter. The core principle is **legibility at a glance**. A viewer mid-scroll gives you the visual equivalent of a squint; if the frame's meaning survives that squint — a man kneeling beside a flooded kitchen, a chef holding an entirely black egg — you have a hook. If the squint returns 'person in room, talking,' you have camouflage. Audit your own openings at thumbnail size with the sound off. That miniature, silent version is closer to how the feed actually presents you than the full-screen preview you edit in."
            },
            {
              h: "Motion is the cheapest magnet",
              body: "The eye is reflexively drawn to movement — an evolutionary leftover you can rent for free. But motion quality matters more than motion quantity. Purposeful vectors hold: a subject walking toward the lens, a drawer sliding open, a slow push-in on a detail that clearly matters. Chaotic motion repels: whip-fast cuts of unrelated shots read as noise and trigger the skip they were meant to prevent. Three reliable motion patterns for opening frames. The **approach** — subject or camera closing distance, which the brain reads as 'something is about to happen.' The **reveal-in-progress** — a door half-open, a cover half-lifted, catching the action mid-transformation so the viewer arrives at the exact moment of maximum incompleteness. And the **interrupted loop** — an action clearly about to complete (a pour, a catch, a fall) that your cut delays. Each pattern is an open loop rendered in pixels instead of words."
            },
            {
              h: "Composition choices that hook",
              body: "A few compositional tools do disproportionate work in the first frame.\n\n- **Negative space** — empty area around the subject makes it pop at small sizes and leaves clean room for your text hook; cluttered frames force text onto busy backgrounds where it dies.\n- **Scale contrast** — something too big or too small for its context (a tiny person in a vast lobby, an enormous wrench on a laptop) creates an instant question.\n- **Direction of gaze** — if your subject looks at something off-frame, viewers ache to see it; hold the reveal a beat.\n- **Foreground obstruction** — shooting past an object (a doorway, shelves, glass) creates depth and the faint voyeuristic pull of glimpsing something not staged for you.\n\nNone of these require gear. They require deciding the first frame deserves composition at all — which most creators never do."
            },
            {
              h: "Casting the opening image",
              body: "Treat the choice of opening image as casting, not coverage. For any video you have dozens of candidate frames; the discipline is auditioning them against the job description: stop a stranger, imply the premise, leave a gap. A cooking video could open on the chef's face (weak — generic), the finished dish (medium — payoff spoiled but appetite triggered), or the moment the sauce breaks and curdles (strong — a problem in progress, premise implied, resolution owed). Notice the pattern: the strongest opening image is usually the **moment of highest tension**, not the moment of highest beauty. Beauty gets admired; tension gets watched. When you storyboard, mark the single frame of maximum tension in the whole piece and ask whether it can legally open the video. On short-form, it almost always can — chronology is a convention, not a law."
            }
          ],
          takeaways: [
            "The frame fires before the voice: compose frame one like a poster — one subject, implied question, no clutter.",
            "Purposeful motion hooks (approach, reveal-in-progress, interrupted loop); chaotic motion repels.",
            "Negative space, scale contrast, off-frame gaze, and foreground obstruction are free compositional hooks.",
            "Open on the moment of highest tension, not highest beauty — chronology is a convention, not a law."
          ],
          actions: [
            "Review your last five videos at thumbnail size, muted; grade each opening frame pass/fail on the squint test.",
            "Storyboard your next video by first finding its single frame of maximum tension and testing it as the opener.",
            "Reshoot one upcoming opening using an interrupted loop — an action visibly about to complete that you delay."
          ],
          quiz: [
            {
              q: "Why audit opening frames at thumbnail size with sound off?",
              options: ["It saves editing time", "That miniature, silent presentation is how the feed actually first shows you", "Thumbnails are ranked separately", "It reveals color-grade issues"],
              answer: 1,
              why: "Viewers meet your video small, fast, and often muted — the full-screen preview flatters you."
            },
            {
              q: "Which opening image is strongest for a cooking video, by the tension principle?",
              options: ["The chef smiling at camera", "The plated finished dish", "The sauce breaking and curdling mid-cook", "The restaurant exterior"],
              answer: 2,
              why: "A problem in progress implies the premise and owes the viewer a resolution — tension outperforms beauty."
            },
            {
              q: "The 'interrupted loop' motion pattern works because:",
              options: ["Loops boost watch time automatically", "An action visibly about to complete creates an open loop the viewer must see closed", "Slow motion is cinematic", "It hides bad lighting"],
              answer: 1,
              why: "The brain predicts the completion and holds attention until the prediction resolves."
            }
          ],
          drill: "Shoot the same 3-second opening four ways — approach, reveal-in-progress, interrupted loop, and static — and show all four to two people, asking which they would keep watching."
        },
        {
          id: "viral-2-4",
          title: "Text Hooks: On-Screen Copy That Stops Thumbs",
          minutes: 8,
          xp: 60,
          skill: "viral",
          intro: "A huge share of your viewers meet you muted. For them, the text overlay is not decoration — it is the entire hook. Write it like it's the only shot you get.",
          sections: [
            {
              h: "Write for scroll-speed reading",
              body: "On-screen text is read under the worst possible conditions: small screen, moving background, a thumb already in motion. The craft constraints follow directly. Keep the hook to six to nine words — that is what a scrolling eye can swallow in one fixation. Use concrete, short words; 'utilize' costs the same pixels as 'use' and reads slower. Front-load the payload so the first three words carry the gap: 'He paid $90k for this mistake' works even if the eye bails after 'He paid $90k.' Skip punctuation theatrics — one question mark earns its place, three scream desperation. And write in sentence case or clean caps, not alternating styles; decoding effort is abandonment. A useful test: flash your text card at a friend for one second, then ask them to repeat it. If they can't, neither can the feed."
            },
            {
              h: "Placement, contrast, and the safe zones",
              body: "Great text dies in the wrong location. Every platform overlays its own UI — captions, buttons, usernames, sound credits — and text placed under that chrome is simply gone for the viewer. Learn your platform's **safe zones** and treat them as law: keep hook text in the upper-middle band of the frame, clear of the bottom third (captions, sound bar) and the right edge (engagement stack). Contrast is the second killer. White text on a bright sky, black on shadow — both vanish. Solve it structurally, not decoratively: shoot with negative space intended for text, or add a subtle backing bar or drop shadow. Type size should feel slightly too large in the edit; it will feel right on a phone at arm's length. One font, one size for the hook, maybe a second size for a sub-line. Every additional style is a small tax on reading speed."
            },
            {
              h: "The second channel, not an echo",
              body: "The most common intermediate mistake: on-screen text that transcribes the spoken hook word for word. That spends your second channel repeating the first — zero added pull. The professional pattern is **complementary tension**: text and voice each carry a different piece of the gap, so together they itch more than either alone. Voice: 'I almost turned this client down.' Text: 'the invoice was $45,000.' Now the muted viewer has a money mystery, the listening viewer has a story, and the viewer with both has a contradiction demanding resolution. Variants of the pattern: text states the stakes while voice tells the story; text names the audience ('landlords, look up') while voice opens the case; text plants the twist's shadow ('watch his left hand') while voice narrates the surface. Draft the two lines side by side in your notes and check they never share more than a couple of words."
            },
            {
              h: "Sequenced text: the hook that unfolds",
              body: "Text hooks are not limited to one static card. Sequencing text across the first seconds creates a reading rhythm that functions as retention: line one appears (0.0s), line two answers or escalates it (1.2s), line three lands the gap (2.4s). Each new line is a micro open-loop — the viewer stays to read the next. Rules for sequenced text: each line must be readable in under a second; each must escalate, never repeat; and the final line should coincide with your first strong visual beat so the reading rhythm hands off cleanly to the watching rhythm. This technique is also your rescue kit for footage with a weak natural opening — a sequenced text hook can carry three seconds on an otherwise ordinary shot. But use it as reinforcement, not life support: text over dull footage rescues the open, then the dull footage loses the middle."
            }
          ],
          takeaways: [
            "Text hooks are 6-9 words, front-loaded, concrete, readable in one fixation.",
            "Respect safe zones and solve contrast structurally — shoot with text space in mind.",
            "Text and voice should carry complementary tension, never transcribe each other.",
            "Sequenced text lines (each under a second, each escalating) turn reading rhythm into retention."
          ],
          actions: [
            "Rewrite your next text hook to six-to-nine words with the payload in the first three.",
            "Check your platform's current safe zones and build a placement template in your editing app.",
            "Draft your next hook as a voice line and a text line side by side, sharing no more than two words."
          ],
          quiz: [
            {
              q: "Why should hook text be limited to roughly 6-9 words?",
              options: ["Platforms truncate longer text", "That's what a scrolling eye can absorb in one fixation", "Longer text is penalized in ranking", "Fonts render badly beyond that"],
              answer: 1,
              why: "The reading happens during a thumb-flick; one fixation's worth of words is all you're guaranteed."
            },
            {
              q: "Voice says 'I almost turned this client down.' Which text overlay best applies complementary tension?",
              options: ["'I almost turned this client down'", "'the invoice was $45,000'", "'watch till the end!'", "'link in bio'"],
              answer: 1,
              why: "It adds a second, different piece of the gap, so the two channels multiply instead of echo."
            },
            {
              q: "In sequenced text hooks, each new line must:",
              options: ["Repeat the previous line for emphasis", "Be readable in under a second and escalate the gap", "Use a different font", "Appear after the voice finishes"],
              answer: 1,
              why: "Each line is a micro open-loop; repetition or slow reveals break the rhythm that holds the viewer."
            }
          ],
          drill: "Take a muted pass through your feed and screenshot the first three text hooks that stop you. Reverse-engineer each: word count, placement, and what gap the words open."
        },
        {
          id: "viral-2-5",
          title: "The Re-Hook: Resetting Attention Every Five Seconds",
          minutes: 9,
          xp: 60,
          skill: "viral",
          intro: "The hook wins the viewer; it does not keep them. Attention decays on a timer, and re-hooks are how you keep winding it back up.",
          sections: [
            {
              h: "Attention has a half-life",
              body: "The commitment a viewer makes at second three is not a contract for the whole video — it is a short-term loan renewed every few seconds, and the renewal is unconscious. Retention data across short-form shows the same physics everywhere: interest spikes at a stimulus, decays over four to seven seconds, and must be re-spiked before it crosses the leave threshold. This reframes the middle of your video completely. You are not 'delivering content' between hook and ending; you are running a sequence of small attention auctions, and dead air loses them. The practical unit of short-form structure is therefore the **beat** — a five-to-seven-second window that must contain at least one new stimulus: new information, new image, new question, new sound. Watch any high-retention video counting beats on your fingers and the invisible skeleton appears. Nothing coasts for ten seconds. Nothing."
            },
            {
              h: "The re-hook toolkit",
              body: "Re-hooks come in flavors; rotate them so the reset itself doesn't become a pattern the brain tunes out.\n\n- **Verbal loop-openers**: 'but here's the part nobody mentions' / 'and that's when it got weird' / 'the second one matters more.' Each opens a fresh micro-gap mid-stream.\n- **Visual switches**: cut to B-roll, change angle, punch in 20-30%, flip location. The eye re-engages with any new frame.\n- **Sonic resets**: music drop-out, a whoosh, a needle-scratch of silence. Sound changes are pattern interrupts the viewer feels before noticing.\n- **Structural signposts**: 'mistake number three' — list formats carry built-in re-hooks, which is exactly why listicles retain so well.\n- **Stakes escalation**: 'and remember, the deadline was the next morning.' Reintroducing pressure re-inflates sagging tension.\n\nOne per beat is the target; two stacked resets make a moment feel important."
            },
            {
              h: "Placement: spend resets where the graph sags",
              body: "Re-hooks are not distributed evenly — they are deployed against known weak points. Every video has predictable sag zones: right after the hook's promise is acknowledged (second 4-6, where viewers decide the setup is done), the middle third (where the initial gap has lost novelty but the payoff is not yet visible), and just before the payoff (where impatient viewers skip ahead or out). Reinforce those three zones deliberately. The mid-video sag deserves your best material: practitioners hold back a second-best fact or twist specifically to detonate it at the midpoint — the 'midpoint bomb' — rather than front-loading everything and coasting home. Then verify against reality: your retention graph from Lesson 1-6 shows exactly where your audience sags, and it will not perfectly match theory. Two videos of data beats any rule of thumb. Re-hook where *your* graph dips, not where a course told you to."
            },
            {
              h: "The ceiling: resets serve the story",
              body: "There is a failure mode above this skill: the video that is all resets and no substance — whiplash edits, constant 'wait for it,' sirens of urgency over nothing. Viewers feel manipulated within seconds because the resets keep promising escalation that never arrives; each unearned re-hook is a tiny loop debt, and the debts compound into a scroll-away. The governing rule: a re-hook may only point at something real. 'But here's the part nobody mentions' must precede a genuinely under-discussed point. The punch-in must land on a detail worth seeing closer. When your material is thin, the fix is never more resets — it is cutting the video shorter until density returns. A tight 25 seconds beats a padded 50 every time the graph is consulted. Re-hooks are the rhythm section of retention; they keep time so the melody — your actual content — can land."
            }
          ],
          takeaways: [
            "Attention decays in 4-7 second cycles; structure videos as beats, each containing one new stimulus.",
            "Rotate re-hook flavors — verbal loop-openers, visual switches, sonic resets, signposts, stakes escalation.",
            "Deploy resets at known sag zones and hold back a 'midpoint bomb' for the middle third.",
            "Every re-hook must point at something real; thin material needs cutting, not more resets."
          ],
          actions: [
            "Re-watch your last video counting beats: flag every stretch longer than 7 seconds with no new stimulus.",
            "Script your next video with a planned midpoint bomb — a strong fact or twist reserved for the middle third.",
            "Build a personal list of five verbal loop-openers in your own voice — steal shapes, not words."
          ],
          quiz: [
            {
              q: "What is the practical unit of short-form structure implied by attention decay?",
              options: ["The scene", "The 5-7 second beat, each carrying one new stimulus", "The sentence", "The 30-second act"],
              answer: 1,
              why: "Interest decays over roughly 4-7 seconds, so every such window must re-spike attention or lose it."
            },
            {
              q: "The 'midpoint bomb' technique means:",
              options: ["Ending videos abruptly at the middle", "Front-loading all your best material", "Reserving a second-best fact or twist to detonate in the mid-video sag", "Adding an ad break at the midpoint"],
              answer: 2,
              why: "The middle third is a predictable sag zone, and it deserves deliberately held-back material."
            },
            {
              q: "A video packed with 'wait for it' resets over thin content fails because:",
              options: ["Resets are penalized by platforms", "Each unearned re-hook is a loop debt, and the debts compound into distrust and exit", "Viewers prefer long takes", "Text and sound can't be combined"],
              answer: 1,
              why: "Re-hooks that point at nothing train the viewer that your escalations are empty."
            }
          ],
          drill: "Take your lowest-retention video and re-edit only its middle third: add one visual switch, one verbal loop-opener, and cut every beat that carries no new information."
        },
        {
          id: "viral-2-6",
          title: "The Payoff Contract: Hook-Body Match",
          minutes: 8,
          xp: 60,
          skill: "viral",
          intro: "Hooks make promises; bodies keep them or break them. This lesson is about the half of hook engineering nobody screenshots — delivering.",
          sections: [
            {
              h: "Clickbait is a loan you can't repay",
              body: "There is nothing wrong with a dramatic hook — drama is the job. The line between a great hook and clickbait is drawn afterward, by the payoff. If the video delivers what the hook implied, the drama was packaging. If it delivers less, the drama was a lie, and viewers do not file it as a neutral miss: they file it as your character. The costs are asymmetric and delayed. This video may even perform — the hook did its work — but your next ten hooks will convert worse, because a chunk of your audience now discounts your promises. Platforms measure this too: a spike of early abandonment right after the reveal, comments turning on you, poor sends despite strong hook rate. That signature — big open, hollow middle, angry basement — is the fingerprint of broken contracts, and modern ranking systems read it fluently."
            },
            {
              h: "Calibrate the promise to the payload",
              body: "Match problems flow in both directions. Over-promising is the famous sin, but **under-promising** quietly kills more good content: a genuinely valuable video wrapped in a beige hook never gets its audition. Calibration means writing the hook *from* the payoff, not before it. Workflow: finish the script or edit, then write down the single most surprising, valuable, or emotional thing the video actually contains — the payload sentence. Now build the hook as the largest honest advertisement for exactly that sentence. 'This closet has a hidden door' is calibrated if there is a hidden door; 'this house has a secret that shocked the inspector' over the same footage is a debt you cannot cover. The discipline sounds obvious and is practiced by almost no one, because it requires accepting that some finished videos have weak payloads — and the honest fix is improving the video, not inflating the label."
            },
            {
              h: "Payoff engineering: land it, don't leak it",
              body: "A payoff is a moment, and moments can be fumbled in the edit. Three common leaks. **The early spoil**: the reveal is visible in the background, the caption, or the thumbnail before its moment — audit every frame that precedes the payoff for accidental disclosure. **The mumbled landing**: the payoff arrives mid-sentence at the same energy as everything else; instead, give it punctuation — a beat of silence before, a punch-in on it, a music change under it, so the viewer feels the promised moment arriving. **The over-explained aftermath**: the reveal lands, then two more sentences deflate it; end within a breath or two of the payoff, because everything after resolution is retention leak. And where possible, structure the payoff to *exceed* the hook by one notch — promise the hidden door, deliver the hidden door plus what was behind it. Consistent slight over-delivery is how accounts turn viewers into defenders."
            },
            {
              h: "The trust flywheel",
              body: "Zoom out and the contract mechanics become a growth engine. Every kept promise increases the audience's willingness to accept your next hook at face value — which means your hooks can gradually become bolder while remaining honest, because your credibility now covers claims a stranger's wouldn't. This is the **trust flywheel**: honest drama earns belief, belief raises hook conversion, higher conversion grows the audience that already believes you. Established creators you admire are not necessarily writing better hooks than you; they are cashing years of kept promises. The flywheel also explains why buying attention with one inflated claim is such a bad trade — you are selling your future hook conversion for one video's spike. Protect the contract the way a bank protects its rating. In this school's Expert course you'll build formats around this trust; it only works if the foundation poured here is honest."
            }
          ],
          takeaways: [
            "The hook-payoff match, judged after watching, is the line between drama and clickbait.",
            "Write hooks from the payload: the largest honest advertisement for what the video actually contains.",
            "Protect the payoff in the edit — no early spoils, punctuate the landing, end within a breath of resolution.",
            "Kept promises compound into a trust flywheel that raises the conversion of every future hook."
          ],
          actions: [
            "For your next post, write the payload sentence first, then build the hook as its largest honest advertisement.",
            "Audit your last three videos for early spoils — check thumbnails, captions, and background frames before the reveal.",
            "Re-edit one payoff to land with punctuation: a beat of silence before it and a cut or punch-in on it."
          ],
          quiz: [
            {
              q: "What distinguishes a dramatic hook from clickbait?",
              options: ["Word choice", "Volume of the claim", "Whether the payoff delivers what the hook implied", "Whether it uses text or voice"],
              answer: 2,
              why: "The judgment is rendered by the payoff after watching — packaging becomes a lie only when unbacked."
            },
            {
              q: "Why does under-promising quietly kill good content?",
              options: ["Modest hooks are penalized", "A beige hook denies a valuable video its audition", "Viewers dislike honesty", "It shortens AVD"],
              answer: 1,
              why: "Calibration cuts both ways: the hook must be the largest honest advertisement, not the smallest."
            },
            {
              q: "Which is a payoff 'leak' in the edit?",
              options: ["A beat of silence before the reveal", "The reveal visible in the thumbnail before its moment", "A punch-in on the payoff", "Ending shortly after resolution"],
              answer: 1,
              why: "Accidental early disclosure spends the moment before it can land."
            }
          ],
          drill: "Find one video in your niche you'd call clickbait and one with a great payoff. Write the hook and payload sentence of each, then describe the gap or match in one line."
        }
      ]
    },
    {
      id: "viral-3",
      level: "Advanced",
      title: "Retention Engineering",
      description: "The middle of the video is where virality is won or lost. Curve diagnosis, pacing architecture, story structures that hold, seamless loops, emotional sequencing, and the editor's retention toolkit.",
      lessons: [
        {
          id: "viral-3-1",
          title: "Retention Curves Like an Editor",
          minutes: 10,
          xp: 75,
          skill: "analytics",
          intro: "Beginners read retention graphs to grade a video. Editors read them to cut the next one. This lesson upgrades you from coroner to surgeon.",
          sections: [
            {
              h: "Second-order reading",
              body: "You already know the four shapes — cliff, slope, plateau, bump. Advanced reading means interrogating combinations and context. A cliff *after* a plateau is a different animal from a cliff after a slope: the first says 'you held them, then one specific event ejected them,' the second says 'they were already leaving and this was the last straw.' A bump immediately before a cliff often marks a payoff — viewers rewound to savor it, then rationally left because the contract was fulfilled. A slope that steepens gradually across the back half usually means the video outlived its idea; the honest fix is a shorter video, not a better ending. Read every graph twice: once for events (what happened at each inflection) and once for trajectory (what the viewer's patience was doing between events). The events tell you what to cut. The trajectory tells you what to restructure."
            },
            {
              h: "Segment benchmarks and the shape of a winner",
              body: "Judge each segment of the curve against its own standard rather than one global number.\n\n- **0-3 seconds**: expect your steepest loss. Strong short-form holds 70-85% here; this segment answers only for the hook and targeting.\n- **3-10 seconds**: the commitment zone. A healthy curve flattens noticeably here — the viewers who stayed have decided to watch. Continued steep loss means your setup is stalling.\n- **Midsection**: aim for a gentle glide with visible plateaus. Each planned re-hook should be findable in the curve as a flattening; if a reset you edited in leaves no fingerprint, it didn't work.\n- **Final 20%**: the graph's tail reveals ending quality — a flat tail means viewers rode to the credits; a dive at the CTA means your ask is ejecting people.\n\nA winning curve looks like a ski jump: steep, flatten, glide, kick."
            },
            {
              h: "Comparative diagnosis: your library is the lab",
              body: "One graph is an anecdote; your library is a dataset. The advanced move is stacking curves from your own videos and reading the differences, because your audience, niche, and style are held constant — something no external benchmark offers. Practical comparisons that pay: your three best hooks versus your three worst (what do the winning opens share on screen and in script?); the same format at different lengths (where does the 60-second version start underperforming the 35-second one — that point is your format's natural runtime); talking-head versus B-roll-led treatments of similar topics. Build a simple habit: every fifth video, spend twenty minutes on cross-video comparison instead of single-video review. Patterns visible across five curves are structural — they belong to your system, not to any one video — and structural fixes move every future upload at once. This is the cheapest editing lesson you will ever buy."
            },
            {
              h: "From graph to cut list",
              body: "End every analysis with a written cut list, or the reading was entertainment. The translation discipline: each inflection point in the curve becomes one instruction for the next edit, phrased as an action, not an observation. Not 'retention dipped at 14s' but 'the explanation at 12-16s ran four sentences; cap explanations at two sentences and cover them with B-roll.' Not 'the ending sagged' but 'close the final loop at -2 seconds and cut the outro entirely.' Three to five instructions per video is the ceiling — a longer list means you are noting noise, and noise-chasing produces jittery, superstition-driven editing. Then, crucially, carry the list into the next edit session and check items off while cutting. The loop from graph to cut list to next graph, run every video, is retention engineering in its purest form: measurable inputs, measurable outputs, compounding skill."
            }
          ],
          takeaways: [
            "Read curves twice: events (inflections) tell you what to cut; trajectory tells you what to restructure.",
            "Judge segments on their own standards — a winning curve is a ski jump: steep, flatten, glide, kick.",
            "Stack your own videos' curves for comparative diagnosis; cross-video patterns are structural and fix everything at once.",
            "Convert every reading into a 3-5 item action-phrased cut list, and carry it into the next edit."
          ],
          actions: [
            "Stack your best and worst three retention curves side by side and write down what the winners share.",
            "Find your format's natural runtime by comparing the same format at two lengths and locating the divergence point.",
            "Write a cut list from your latest graph — action phrasing only — and pin it where you edit."
          ],
          quiz: [
            {
              q: "A retention bump immediately followed by a cliff most often marks:",
              options: ["A technical glitch", "A payoff — viewers rewound to savor it, then left with the contract fulfilled", "A bad transition", "The algorithm ending the test batch"],
              answer: 1,
              why: "Rewatch then exit is the signature of a delivered promise — the question is whether a new loop should have opened there."
            },
            {
              q: "A planned re-hook that leaves no flattening fingerprint in the curve means:",
              options: ["The graph is broken", "The re-hook worked invisibly", "The re-hook didn't actually reset attention", "Re-hooks never show in curves"],
              answer: 2,
              why: "Effective resets are visible as flattenings; no fingerprint means no effect."
            },
            {
              q: "Why compare curves across your own library rather than against external benchmarks?",
              options: ["External data is always fake", "Your audience, niche, and style are held constant, isolating the variable that changed", "Platforms forbid benchmark data", "Libraries update faster"],
              answer: 1,
              why: "Controlled comparison is only possible when everything but the tested element stays the same."
            }
          ],
          drill: "Run a cross-video session: stack five of your curves, find one pattern that appears in at least three, and write the single structural change it demands."
        },
        {
          id: "viral-3-2",
          title: "Pacing Architecture: Density and Dead Air",
          minutes: 10,
          xp: 75,
          skill: "editing",
          intro: "Pacing is not speed. It is the rate at which you give the viewer new reasons to stay — and it is built in the edit, one ruthless trim at a time.",
          sections: [
            {
              h: "Information density: the real pacing metric",
              body: "Fast cuts do not equal good pacing. A video can cut every second and still feel slow because nothing new arrives; another can hold a single shot for eight seconds and feel gripping because every second deepens the situation. The governing metric is **information density**: new units of meaning per second — a fact, an image, a question, a joke, an escalation. High-retention short-form typically lands a new unit every one to three seconds. Audit your drafts by transcribing the script and bracketing each genuinely new unit; the gaps between brackets are your dead air, whatever the cut rate says. This reframes editing priorities: before reaching for effects, ask 'what does the viewer learn or feel in this second that they didn't have in the last one?' If the answer is nothing, that second is inventory you are paying to store — and the viewer is paying too, in patience."
            },
            {
              h: "Trim at the syllable level",
              body: "Advanced pacing is won in fractions. Cut the breath before each sentence and the trailing half-second after it — dialogue editors call this tightening 'pulling up,' and it routinely shaves 15-20% off runtime with zero content loss. Remove hedges and ramps: 'I think,' 'basically,' 'what I mean is,' 'sort of.' Cut the second half of repeated points — speakers instinctively restate, viewers instinctively leave. Where a demonstration has waiting time (paint drying, dough rising, files loading), jump-cut through it or speed-ramp across it; the viewer's imagination fills gaps faster than reality plays them. Then perform the **watch-once test**: play the tightened cut at natural attention, not editor attention, and mark every moment your own mind wandered. Your wandering is the future audience's exit. Professionals trust this test over their fondness for any clip — the darlings you refuse to kill are usually exactly where the graph will sag."
            },
            {
              h: "Rhythm: density needs dynamics",
              body: "Maximum density everywhere is its own failure — a wall of information at constant intensity flattens into noise, and viewers fatigue-scroll just as surely as they boredom-scroll. What holds humans is **variation**: fast passages made faster by the slow beat before them, a held shot that lands because the preceding ten seconds sprinted. Editors borrow music vocabulary deliberately: verses (steady delivery), a pre-chorus (tightening cuts, rising music), the drop (payoff moment, biggest image), the breakdown (one breath of stillness before building again). Practical application: after tightening everything, deliberately re-insert two or three 'rest beats' — a beat of silence before your midpoint bomb, a slow push-in on the key image, a full second on a reaction face. Rest beats are not dead air, because they carry tension rather than absence. Dead air makes viewers leave; rests make the next hit land harder."
            },
            {
              h: "Length is a pacing decision",
              body: "The final pacing instrument is duration itself. Every idea has a natural runtime — the length at which density stays above threshold from hook to payoff — and forcing an idea past it is the most common self-inflicted retention wound. The tell is in your curve library from the last lesson: if your 55-second videos consistently sag after 35, your ideas are 35-second ideas, and the fix is embracing that, not padding to a length some guru blessed. Cutting to natural runtime has a compounding side effect: percentage-based retention rises, completion and loop rates rise, and the ranking system reads the video as stronger even though the total watch seconds fell. When an idea genuinely warrants length, it must earn each extension with new loops and escalations — length is purchased with structure, never granted by ambition. The editor's question is never 'how long can this be?' It is 'how short can this be while landing everything?'"
            }
          ],
          takeaways: [
            "Pacing is information density — a new unit of meaning every 1-3 seconds — not cut speed.",
            "Pull up every breath, hedge, and repeat; trust the watch-once test over your fondness for clips.",
            "Density needs dynamics: engineer rest beats that carry tension so the hits land harder.",
            "Every idea has a natural runtime; find yours in the curve library and cut to it without mercy."
          ],
          actions: [
            "Transcribe your next script and bracket each new unit of meaning; rewrite until no gap exceeds 3 seconds.",
            "Do a pull-up pass on your current edit: breaths, hedges, restatements, trailing halves of sentences.",
            "Deliberately place two rest beats in your next edit — one before the midpoint bomb, one before the payoff."
          ],
          quiz: [
            {
              q: "A video cuts every second yet feels slow. The most likely cause is:",
              options: ["Wrong aspect ratio", "Low information density — cuts without new units of meaning", "Music too quiet", "Too many rest beats"],
              answer: 1,
              why: "Pacing is measured in new meaning per second; cut rate without new information is motion, not momentum."
            },
            {
              q: "Rest beats differ from dead air because they:",
              options: ["Are shorter", "Carry tension rather than absence", "Always use music", "Only appear at the end"],
              answer: 1,
              why: "A held beat before a payoff builds pressure; empty seconds simply leak viewers."
            },
            {
              q: "Your 55-second videos consistently sag after 35 seconds. The professional response is:",
              options: ["Add stronger music at 35s", "Post less often", "Treat 35 seconds as your ideas' natural runtime and cut to it", "Move the hook to the middle"],
              answer: 2,
              why: "The curve library reveals natural runtime; padding past it wounds retention on every video."
            }
          ],
          drill: "Take a finished 60-second edit and produce a 40-second version by density rules alone — no content 'chunks' removed, only pulled-up air, hedges, and repeats. Post the tighter one."
        },
        {
          id: "viral-3-3",
          title: "Story Structures That Hold: But/Therefore and Nested Loops",
          minutes: 11,
          xp: 75,
          skill: "viral",
          intro: "Retention tricks patch a weak structure; a strong structure barely needs them. This lesson installs the story skeletons that make watching feel involuntary.",
          sections: [
            {
              h: "Kill 'and then': the But/Therefore engine",
              body: "The writers of South Park articulated the cleanest structural rule in narrative: if the beats of your story connect with 'and then,' it is a list wearing a story's clothes. Beats must connect with **but** (a complication reverses direction) or **therefore** (a consequence forces the next move). 'I found a car at auction, and then I bought it, and then I cleaned it' — a viewer leaves whenever they like, because nothing is owed. 'I found a car at auction, **but** the engine was seized, **therefore** I had one weekend to free it before the flip deadline, **but** the first penetrant did nothing...' — now every beat creates a debt the next beat must pay. Rewrite any script by literally writing the connective words between beats. Each 'and then' you find is a place viewers leave. Convert it to a but or a therefore, or cut the beat entirely."
            },
            {
              h: "In medias res and the rewind structure",
              body: "Chronology is the enemy of the open. Starting a story at its beginning means starting at its least interesting point — the moment before anything went wrong. The fix is **in medias res**: open inside the crisis, then rewind. 'The buyer is standing in my driveway and the car will not start' — open there, let the panic register for two seconds, then: 'to explain how bad this is, you need to know what happened Tuesday.' The structure buys three assets at once: a crisis-grade hook, an automatic open loop (how did we get here — and how does it end?), and a re-hook at the rewind point, because the jump backward is itself a pattern interrupt. One craft note: when you rewind, compress ruthlessly. The viewer tolerates backstory only because the crisis is waiting; every backstory second must visibly load the gun the opening scene fired. Return to the crisis before the midpoint sag."
            },
            {
              h: "Nested loops: the structure of un-leavable video",
              body: "A single question, answered, is a reason to leave. Layered questions, staggered, are a cage — a comfortable one. **Nested loops** means opening a second loop before closing the first, so total open tension never hits zero. The pattern for a 60-second piece: loop A opens in the hook (will the deal survive?). Around a third in, loop B opens (the inspector finds something new). Close A around the two-thirds mark — a satisfying payoff that would end a lesser video — but B is still open, carrying the viewer onward. Close B in the final two seconds. Viewers experience this as 'it kept getting better'; structurally, it is simply overlap. Discipline notes: two loops serve most short-form (three at most — beyond that, viewers lose the thread and trust); the loops should share a spine, with B raising A's stakes rather than opening an unrelated tangent; and every loop closes. Always. That ledger from the curiosity lesson still counts."
            },
            {
              h: "The story spine for 45 seconds",
              body: "Here is a working skeleton that fuses everything, timed for short-form.\n\n1. **0-3s — Crisis open** (in medias res): the worst or strangest moment, mid-action.\n2. **3-8s — Stakes**: one sentence on what's at risk and for whom. Loop A is now formal.\n3. **8-20s — Compressed rewind**: how we got here, all beats linked but/therefore.\n4. **20-25s — Midpoint bomb**: complication that opens loop B and raises stakes.\n5. **25-38s — Escalation run**: attempts and reversals, density high, one rest beat.\n6. **38-43s — Payoff**: close loop A with punctuation.\n7. **43-45s — Kicker**: close loop B — a twist, a cost, a laugh — and end within a breath.\n\nDo not worship the timestamps; worship the ordering. Crisis before context. Stakes before process. Bomb before sag. Kicker before outro — and there is no outro."
            }
          ],
          takeaways: [
            "Replace every 'and then' between beats with 'but' or 'therefore' — or cut the beat.",
            "Open in medias res: crisis first, compressed rewind second, return before the midpoint sag.",
            "Nest two loops sharing one spine so open tension never hits zero until the final seconds.",
            "The 45-second spine: crisis, stakes, rewind, bomb, escalation, payoff, kicker — and no outro."
          ],
          actions: [
            "Print your last script and write the literal connective between every pair of beats; convert or cut each 'and then.'",
            "Re-outline your next story to open at its worst moment, with the rewind compressed to one-third of runtime.",
            "Map the 45-second spine onto one upcoming video, marking where each loop opens and closes."
          ],
          quiz: [
            {
              q: "The But/Therefore rule diagnoses weak structure by finding:",
              options: ["Long sentences", "Beats connected by 'and then,' which owe the viewer nothing", "Missing music cues", "Videos without twists"],
              answer: 1,
              why: "Only complication (but) and consequence (therefore) create the debt that obligates the next beat — and the next second of watching."
            },
            {
              q: "In the nested-loop pattern, loop A should close:",
              options: ["In the final frame, after B", "Never — leave it open for a sequel", "Around two-thirds in, while B carries the viewer to the end", "Before loop B opens"],
              answer: 2,
              why: "Staggered closure keeps total open tension above zero from hook to kicker."
            },
            {
              q: "Why must the rewind section be ruthlessly compressed?",
              options: ["Backstory is tolerated only because the opening crisis is waiting", "Rewinds are penalized by ranking systems", "Viewers dislike the past tense", "Compression saves editing time"],
              answer: 0,
              why: "Every backstory second must visibly load the gun the crisis fired, or the borrowed patience runs out."
            }
          ],
          drill: "Take a story you've already posted chronologically and re-cut it in medias res with two nested loops. Compare the two retention curves after 48 hours."
        }
      ]
    }
  ]
});
