window.SMU_DATA = window.SMU_DATA || { schools: [] };
SMU_DATA.schools.push({
  id: "editing",
  order: 9,
  name: "Video Editing",
  tagline: "Turn raw footage into content people can't skip",
  icon: "🎞️",
  hue: 190,
  description: "The post-production craft that decides whether footage becomes retention or gets swiped: cuts, pacing, sound design, color, motion graphics, and the pro pipeline that ships it all fast. Built for creators editing in CapCut, Premiere Pro, DaVinci Resolve, or Final Cut who want their work to feel agency-made.",
  courses: [
    {
      id: "editing-1",
      level: "Beginner",
      title: "The Cut Is the Content",
      description: "Editing as retention engineering: a lean CapCut workflow, the core cut vocabulary, pacing for the feed, on-screen text that gets read, and exports that survive platform compression.",
      lessons: [
        {
          id: "editing-1-1",
          title: "Editing Is Retention Engineering",
          minutes: 8,
          xp: 50,
          skill: "editing",
          intro: "Nobody rewatches a video because the footage was pretty. They rewatch because the edit never gave them a reason to leave. This lesson reframes your entire job before you learn a single tool.",
          sections: [
            {
              h: "Your Real Job: Defending Attention",
              body: "Every one to two seconds, a viewer runs a silent vote: keep watching or swipe. The edit is where you win or lose that vote, over and over, until the video ends. Platforms rank on average view duration (AVD) and completion rate, which means the algorithm is literally measuring the quality of your cuts.\n\nSo redefine the job. You are not 'assembling clips.' You are removing the moment before boredom — the breath before the sentence, the half-second after the action lands, the setup nobody needed. Great social edits do not feel fast; they feel **dense**. Every second on the timeline has earned its place by doing work: delivering information, emotion, or a reason to stay for the next second. When you start judging frames by that standard, your delete key becomes your most-used tool — which is exactly how professionals work."
            },
            {
              h: "Read the Retention Curve Like a Timeline",
              body: "Your analytics hand you an edit review for free. Pull up the retention graph on any recent post and lay it mentally against your timeline.\n\n- **A cliff in the first 3 seconds** means the hook frame or opening cut failed — viewers bailed before the premise landed.\n- **A steady mid-video slope** means pacing sagged: too much air between ideas, cuts too far apart.\n- **A sudden dip at one timestamp** points at a specific moment — find that exact cut and study what you did.\n- **A bump or spike** means people rewound and rewatched; whatever you did there, do it again on purpose.\n\nThis loop — post, read the curve, diagnose the cut — is how editors improve ten times faster than people who just 'try to make it better.' The graph tells you precisely which second lost the room."
            },
            {
              h: "Pattern Interrupts Every 2-4 Seconds",
              body: "The brain habituates fast. Hold one unchanged frame for long enough and attention drifts, even if the words are good. The fix is the pattern interrupt: change something visible or audible every 2-4 seconds.\n\nYou have cheap interrupts and expensive ones. Cheap: a punch-in (scale the same shot 110-120% at a cut), a text pop, a sound effect, a color flash on a keyword. Expensive: a new angle, a b-roll insert, a location change. Strong edits mix both so the rhythm never becomes predictable — because a *predictable* interrupt stops interrupting.\n\nThe discipline is not 'add more stuff.' It is scheduling novelty. Scrub any high-retention short frame by frame and count the changes; you will rarely find four seconds where nothing moves. That density is manufactured in the edit, and from today, it is your baseline."
            },
            {
              h: "The 20 Percent Rule",
              body: "Here is the most reliable quality upgrade in editing: when you think the cut is finished, make it 20 percent shorter. Not by talking faster — by deleting.\n\nCut the second example that proves the same point. Cut the sentence that re-states the hook. Cut the two seconds of walking before the action starts and the one second of smiling after it ends. Enter every scene as late as possible and leave it as early as possible — screenwriters have used that rule for a century and it maps perfectly onto a 45-second vertical.\n\nBeginners protect footage because it was hard to shoot. Professionals know the audience never sees the effort, only the result. A 34-second video that keeps 60 percent of viewers will outperform the 60-second version of the same idea almost every time, because AVD and completion both climb when the fat is gone."
            }
          ],
          takeaways: [
            "The edit is retention engineering: platforms rank on AVD, so every cut is an algorithm decision.",
            "Your retention graph is a per-second review of your edit — diagnose cliffs, slopes, dips, and rewatch spikes.",
            "Schedule a pattern interrupt every 2-4 seconds: punch-ins, text pops, SFX, angle changes, b-roll.",
            "When the cut feels done, delete 20 percent — enter late, leave early, kill repeated points."
          ],
          actions: [
            "Open the retention graph on your last three videos and write one sentence per video naming the exact second you lost people.",
            "Re-edit your most recent video 20 percent shorter and post it as a new cut.",
            "Scrub a high-performing short in your niche frame by frame and count seconds between visible changes."
          ],
          quiz: [
            {
              q: "A retention graph shows a sharp dip at 0:14 of an otherwise steady video. What is the editor's correct move?",
              options: ["Shorten the whole video by 20 percent", "Find the exact cut at 0:14 and study what happened there", "Add background music", "Change the thumbnail"],
              answer: 1,
              why: "A localized dip points at a specific moment — the graph is telling you precisely which cut lost viewers."
            },
            {
              q: "What is the cheapest pattern interrupt available on a single-camera talking-head clip?",
              options: ["Reshooting from a second angle", "A drone establishing shot", "A punch-in that scales the same shot 110-120% at a cut", "Hiring a motion designer"],
              answer: 2,
              why: "A punch-in needs no new footage — scaling the existing shot at a cut resets attention for free."
            },
            {
              q: "Why does the 20 percent rule usually improve performance?",
              options: ["Shorter videos are always ranked higher", "Deleting filler raises AVD and completion rate on the seconds that remain", "It reduces file size for upload", "Platforms penalize videos over 60 seconds"],
              answer: 1,
              why: "Trimming fat means a larger share of the video is worth watching, which lifts the retention metrics platforms actually rank on."
            }
          ],
          drill: "Take any 60-second clip you have and cut it to 45 seconds without losing a single idea — delete air, not information."
        },
        {
          id: "editing-1-2",
          title: "CapCut: Zero to First Cut",
          minutes: 9,
          xp: 50,
          skill: "editing",
          intro: "CapCut is the fastest path from raw phone footage to a publishable short, and most people use 10 percent of it badly. This is the lean setup and the 15-minute assembly workflow.",
          sections: [
            {
              h: "Set Up the Project Right",
              body: "Open CapCut, create a new project, and before anything else set the aspect ratio to 9:16 in the format menu — editing in the wrong ratio and cropping later is the most common beginner time-waste. Your export target is 1080x1920; shoot and edit at 30fps for talking content, 60fps if you plan to slow anything down.\n\nImport all clips for the video at once so the media panel becomes your bin. Drag your main clip to the timeline first — this is your spine — and keep b-roll on the track above it. Two habits that pay off immediately: pinch to zoom the timeline so you can see individual words in the audio waveform, and keep snapping on so clips butt against each other without gaps. A one-frame black gap between clips is invisible on the timeline and glaring on export."
            },
            {
              h: "The Core Five Tools",
              body: "CapCut has hundreds of features. Five of them are 80 percent of every edit:\n\n1. **Split** — place the playhead, split, delete the half you do not need. This is the cut. You will do it hundreds of times per video.\n2. **Speed** — basic speed for tightening slow moments (1.1-1.2x on talking is often invisible), curve speed for ramps later.\n3. **Volume + fade** — every music clip gets a fade out; every clip's level gets checked.\n4. **Auto captions** — generate, then hand-fix every line. Auto-caption errors read as carelessness.\n5. **Extract audio / detach** — separates sound from picture so you can cut them independently, which unlocks J-cuts and L-cuts.\n\nLearn where these five live until your hands find them without looking. Tool fluency is editing speed, and editing speed is the difference between posting daily and posting monthly."
            },
            {
              h: "The 15-Minute Assembly Workflow",
              body: "Work in passes, never all at once. Pass one, **the rough cut**: play the spine clip top to bottom and split-delete every mistake, retake, and dead breath. Do not polish anything yet. Pass two, **the tighten**: play it again and trim every cut 2-3 frames closer than feels comfortable — social pacing lives slightly tighter than natural speech. Pass three, **text and b-roll**: add the hook text on frame one, captions throughout, and drop b-roll over any claim that can be shown instead of said. Pass four, **sound**: music under everything at low volume, one or two sound effects on your biggest moments, fades on the ends.\n\nEach pass has one job, so your brain never switches modes mid-timeline. A 45-second talking video should assemble in about 15 minutes once this loop is habit. Speed here is not vanity — it is what makes consistency survivable."
            }
          ],
          takeaways: [
            "Set 9:16 before editing anything; export at 1080x1920 and edit at your shooting frame rate.",
            "Five tools are 80 percent of CapCut: split, speed, volume, auto captions, and detach audio.",
            "Edit in single-purpose passes: rough cut, tighten, text and b-roll, then sound.",
            "Trim cuts 2-3 frames tighter than feels natural — social pacing runs ahead of speech."
          ],
          actions: [
            "Build one CapCut project today using the four-pass workflow and time yourself.",
            "Practice split-delete on a throwaway clip until you can make 20 cuts in under 2 minutes.",
            "Generate auto captions on an old video and count the errors you would have shipped."
          ],
          quiz: [
            {
              q: "What should you set before making a single cut in a CapCut project?",
              options: ["The export bitrate", "A color filter", "The 9:16 aspect ratio", "Background music"],
              answer: 2,
              why: "Editing in the wrong ratio means recomposing every shot later — format comes before content."
            },
            {
              q: "Why detach audio from a clip?",
              options: ["It reduces export time", "It lets you cut sound and picture independently, enabling J-cuts and L-cuts", "It improves microphone quality", "CapCut requires it for captions"],
              answer: 1,
              why: "Separated audio and video can be trimmed on different frames, which is the mechanical basis of J- and L-cuts."
            },
            {
              q: "In the four-pass workflow, what is the only job of the first pass?",
              options: ["Adding captions and hook text", "Split-deleting mistakes, retakes, and dead air", "Color grading", "Choosing music"],
              answer: 1,
              why: "The rough cut removes everything unusable first — polishing before the structure exists wastes time on footage you may delete."
            }
          ],
          drill: "Shoot 60 seconds of yourself talking, then produce a finished 30-second cut in CapCut using only the core five tools — no effects, no transitions."
        },
        {
          id: "editing-1-3",
          title: "Cuts 101: Hard Cuts, J-Cuts, L-Cuts",
          minutes: 8,
          xp: 50,
          skill: "editing",
          intro: "Transitions get the YouTube tutorials, but 95 percent of professional editing is just cuts — placed with intent. Learn the four foundational cut types and when each one earns its frame.",
          sections: [
            {
              h: "The Hard Cut and Cutting on Action",
              body: "The hard cut — one frame ends, the next begins — is the default of all cinema and all social. Its power move is **cutting on action**: make the cut in the middle of a movement, not before or after it. A hand reaches for a door in shot one; the cut lands mid-reach; shot two completes the motion from a new angle. The viewer's eye is tracking the movement, so the cut becomes invisible.\n\nOn social this translates directly: cut while the coffee pours, while the car door swings, while the hand gestures — never during stillness if motion is available. Stillness-to-stillness cuts feel like slideshows.\n\nA related micro-skill: trim the outgoing clip 2-3 frames before the action fully completes and let the incoming clip finish it. The slight overlap of momentum is what makes two shots feel like one continuous event."
            },
            {
              h: "J-Cuts and L-Cuts: Let Sound Lead",
              body: "Named for their shape on a timeline. In a **J-cut**, the audio of the next shot arrives before its picture — you hear the cafe for a beat, then you see it. In an **L-cut**, the previous shot's audio continues under new picture — the speaker keeps talking while b-roll shows what they describe.\n\nThese two cuts are why professional edits feel smooth and amateur edits feel like PowerPoint. Hard-cutting sound and picture on the same frame creates a subtle jolt every time; offsetting them by even 8-15 frames lets one sense bridge the transition while the other changes.\n\nThe workhorse use on social is the L-cut over b-roll: detach your talking-head audio, keep it running, and cut the picture to inserts while the voice carries the story. The audience barely registers that the visual changed — retention holds because the audio thread never broke."
            },
            {
              h: "Jump Cuts: The Native Accent of Social",
              body: "A jump cut splices two moments of the same framing, making the subject visibly 'jump.' Film school calls it an error. Social media made it a dialect — the talking-head jump cut compresses time, deletes breaths, and signals pace.\n\nBut raw jump cuts in identical framing look twitchy. The pro version alternates: cut the pause *and* punch in 115 percent, next cut return to full frame. The scale change turns each jump into a deliberate rhythm beat instead of a stutter. Keep punch-in levels consistent (pick two sizes and alternate; random zoom amounts read as sloppy).\n\nOne warning: jump cuts delete time, and time is sometimes the content. Do not jump-cut a genuine emotional beat or a payoff moment — let those breathe in a single unbroken take. Compression is for setup; presence is for payoff."
            },
            {
              h: "The Match Cut: Your First Signature Move",
              body: "A match cut links two shots through matching shape, motion, or composition: a round watch face cuts to a round steering wheel; a hand closing a laptop cuts to a hand closing a car door in the same screen position. It is the most learnable 'wow' cut in editing because it costs nothing — it is planned, not rendered.\n\nThe recipe: pick two shots where the key object sits in the same third of the frame at similar scale, and if possible with motion traveling the same direction. Cut at the moment of maximum similarity. Add a subtle whoosh SFX and the seam disappears entirely.\n\nUse match cuts at structural moments — transitioning between locations, before-and-after reveals, chapter changes — not randomly. One clean match cut per video reads as craft. Five read as a showreel, and showreels do not retain."
            }
          ],
          takeaways: [
            "Cut on action: place cuts mid-movement so the viewer's tracking eye hides the seam.",
            "J-cuts lead with sound, L-cuts trail with sound — offsetting audio and picture by 8-15 frames is what smoothness is.",
            "Tame jump cuts by alternating punch-in sizes; compress setup, never the payoff.",
            "Match cuts are planned in the shoot and placed at structural moments — one per video, maximum impact."
          ],
          actions: [
            "Recut one old video adding L-cuts: detach the audio and let the voice run under three b-roll inserts.",
            "Film two shots designed as a match cut — same object position, same motion direction — and cut them today.",
            "Watch one minute of any Netflix drama and count the J- and L-cuts; notice how rarely sound and picture cut together."
          ],
          quiz: [
            {
              q: "In an L-cut, what happens at the edit point?",
              options: ["The next shot's audio starts before its picture", "The previous shot's audio continues under the new picture", "Both audio and picture cut on the same frame", "The picture freezes while audio continues"],
              answer: 1,
              why: "The L shape on a timeline is outgoing audio extending under the incoming clip's video."
            },
            {
              q: "Why does cutting on action make a cut feel invisible?",
              options: ["Motion blur hides compression artifacts", "The viewer's eye is tracking the movement, so attention rides through the seam", "It forces a faster frame rate", "Platforms boost videos with more motion"],
              answer: 1,
              why: "A tracked movement carries attention across the cut — the brain completes the motion instead of registering the edit."
            },
            {
              q: "What separates a professional talking-head jump cut from an amateur one?",
              options: ["Using a transition effect on every jump", "Alternating consistent punch-in sizes so each jump reads as a rhythm beat", "Cutting only on even seconds", "Adding a flash frame between cuts"],
              answer: 1,
              why: "A deliberate scale change turns the framing jump into intentional pacing instead of a twitch."
            }
          ],
          drill: "Take one talking clip and produce two versions: one with raw jump cuts, one alternating 100/115 percent punch-ins. Watch both on your phone and feel the difference."
        },
        {
          id: "editing-1-4",
          title: "Pacing: Cut Rhythm for the Feed",
          minutes: 7,
          xp: 50,
          skill: "editing",
          intro: "Two edits can contain identical footage and identical cuts, and one will hold 20 points more retention — purely on rhythm. Pacing is the least visible, most decisive skill in editing.",
          sections: [
            {
              h: "Cut Frequency by Format",
              body: "There is no single correct pace — there is a correct pace per format, and knowing the baselines keeps you honest.\n\n- **Talking head:** a visible change every 3-5 seconds, counting punch-ins and text pops, with actual cuts on every deleted breath.\n- **B-roll montage:** shots run 0.5-2 seconds each, tied to the music grid.\n- **Tutorial or process content:** slower — 4-8 seconds per shot, because comprehension is the retention mechanic and rushing loses the viewer a different way.\n- **Cinematic or luxury mood pieces:** 2-4 seconds per shot, letting composition breathe; here, cutting too fast cheapens the footage.\n\nThe common beginner error is one speed everywhere — machine-gun cutting a tutorial or letting a talking head idle. Diagnose your format first, then set the metronome. Baselines are starting points; the retention graph is the final judge."
            },
            {
              h: "Rhythm Is Variation, Not Speed",
              body: "Fast is not the goal — *pattern with surprise* is. A drum machine playing sixteenth notes at maximum tempo is boring within four bars; a drummer who drops one beat out commands attention. Edits work identically.\n\nThe practical technique is the long-short-short pattern: after a run of quick cuts, hold one shot noticeably longer. That held shot becomes the emphasis — the audience feels the change of gear and leans in. Reverse it too: after a slow, breathing section, a sudden burst of three half-second cuts jolts attention awake.\n\nSilence is a pacing tool of the same rank. Cutting the music entirely for two seconds before your key line is the audio equivalent of a held frame — the drop in stimulation is itself a pattern interrupt. Edit the energy curve on purpose: build, release, build. Flat pacing, fast or slow, is what viewers experience as boring."
            },
            {
              h: "Trimming Air: The Frame-Level Discipline",
              body: "Beyond shot-to-shot rhythm, pacing lives at the frame level. Every take contains air: the inhale before a sentence, the 'um' as a thought loads, the quarter-second of settling after an action completes. Individually invisible; collectively, they are why a video feels slow without anyone being able to say why.\n\nThe discipline: at every cut, trim the outgoing clip to the last meaningful frame and the incoming clip to the first meaningful frame, then take 2-3 more frames off each side. Playback at this tightness feels slightly aggressive in the editor and exactly right on a phone in a feed — the feed context adds impatience that your editing suite does not have.\n\nDo one full pass of your timeline dedicated purely to air removal. On a 60-second video this pass routinely finds 6-10 seconds of nothing. That is 10 percent more density for zero new footage."
            }
          ],
          takeaways: [
            "Set cut frequency by format: 3-5s changes for talking heads, 0.5-2s for montage, slower for tutorials.",
            "Rhythm means variation — use long-short-short patterns and held shots to create emphasis.",
            "Cutting music to silence before a key line is a pacing move, not an absence.",
            "Do a dedicated air-removal pass: trim to meaningful frames, then take 2-3 more."
          ],
          actions: [
            "Run an air-removal pass on your current edit and log how many seconds you recovered.",
            "Recut one montage so every cut lands on the music grid, then break the grid once for your best shot.",
            "Watch your last video and mark every moment the pacing stays flat for more than 6 seconds."
          ],
          quiz: [
            {
              q: "A luxury property montage feels cheap after editing. The most likely pacing cause is:",
              options: ["Shots held too long", "Cutting too fast for the format — mood pieces need 2-4 seconds per shot to breathe", "Too many J-cuts", "Music that is too quiet"],
              answer: 1,
              why: "Cinematic content depends on composition having time to register; machine-gun pacing signals low value."
            },
            {
              q: "What does the long-short-short pattern accomplish?",
              options: ["It reduces render time", "The held shot after quick cuts becomes an emphasis beat the audience feels", "It matches the platform's preferred bitrate", "It hides continuity errors"],
              answer: 1,
              why: "Changing rhythmic gear is what creates emphasis — the contrast marks the moment as important."
            },
            {
              q: "Why should cuts feel slightly too tight inside the editing app?",
              options: ["Editors always play footage slower", "Feed viewing adds impatience the editing suite lacks, so editor-comfortable pacing plays slow on phones", "Export always adds frames", "It compensates for caption reading time"],
              answer: 1,
              why: "The consumption context is a distracted feed — pacing must be calibrated to it, not to focused editing-room attention."
            }
          ],
          drill: "Take 20 seconds of any montage and cut it three ways: all 1-second shots, all 3-second shots, and a long-short-short mix. Watch all three back to back."
        },
        {
          id: "editing-1-5",
          title: "Text on Screen That Gets Read",
          minutes: 8,
          xp: 50,
          skill: "editing",
          intro: "The majority of feed viewing starts muted, which means your text layer is often the whole video. Most creators treat it as decoration. Treat it as a second script.",
          sections: [
            {
              h: "Captions: Small, Clean, Safe",
              body: "Auto-generate captions, then hand-fix every line — names, jargon, and homophones fail constantly, and a caption typo reads as carelessness on the whole brand.\n\nFormatting rules that survive every platform:\n\n- One or two lines maximum per caption block; three lines forces re-reading and covers the frame.\n- Keep captions inside the safe zone: off the bottom 25 percent (buried under the platform UI and description) and out of the top 12 percent (username overlays).\n- Word-by-word or small-chunk timing beats full sentences — the moving text itself is a retention device.\n- Pick one caption style per brand and never improvise it per video: one font, one size, one highlight color.\n\nContrast is non-negotiable: white text with a subtle black stroke or drop shadow survives every background. Colored text with no stroke disappears the moment your footage brightens."
            },
            {
              h: "Hook Text: The 5-8 Word Billboard",
              body: "Frame one of your video needs a text hook — a 5-8 word overlay stating the premise or the open loop: 'the editing mistake killing your retention' or 'I priced this apartment wrong on purpose.' It does three jobs at once: it stops the mute scroller, it doubles as your cover text, and it frames how the first spoken line lands.\n\nPlacement: upper-middle third, dead center horizontally, large enough to read at thumbnail size — squint-test it. Hold it on screen for the first 1.5-3 seconds, then remove it; hook text that lingers past its job becomes clutter.\n\nWrite the hook text *before* you edit, because it is a promise the edit must keep. If the overlay promises 'the mistake,' the mistake must arrive fast, and the edit should be structured to pay that promise on time. Text and cut structure are one system, not two."
            },
            {
              h: "Emphasis Without Chaos",
              body: "Once captions run, emphasis is your volume knob. The toolkit: pop a keyword to 110-120 percent scale on the beat it is spoken, switch one word to your accent color, or hard-cut a full-screen text card for the single most important line. Pair the pop with a soft SFX tick and the emphasis lands in both senses at once.\n\nThe rule that keeps this professional: emphasize at most one element every few seconds, and reserve full-screen cards for one or two moments per video. When everything bounces, nothing is emphasized — constant animation reads as noise, and the viewer's eye stops trusting your signals.\n\nBuild a tiny hierarchy and stick to it: captions (constant, quiet), keyword pops (frequent, small), color accents (occasional), full-screen cards (rare, structural). A consistent hierarchy trains your audience to read your videos the way you intend — which is exactly what a design system is."
            }
          ],
          takeaways: [
            "Hand-fix every auto caption; keep blocks to 1-2 lines inside safe zones with stroke or shadow contrast.",
            "Frame one carries a 5-8 word hook text — written before the edit, removed once its job is done.",
            "Emphasis is hierarchy: quiet captions, small keyword pops, rare full-screen cards.",
            "One text system per brand — same font, size, and accent color on every video."
          ],
          actions: [
            "Define your caption style today: font, size, position, highlight color. Save it as a preset.",
            "Write hook text for your next three videos before shooting anything.",
            "Audit your last video at thumbnail size — if the hook text is not readable squinting, resize it."
          ],
          quiz: [
            {
              q: "Why keep captions out of the bottom 25 percent of a vertical frame?",
              options: ["Viewers read top to bottom", "Platform UI and the description overlay bury that zone", "It renders slower there", "Fonts blur near frame edges"],
              answer: 1,
              why: "The feed interface covers the lower frame — text placed there is unreadable in the wild even though it looks fine in the editor."
            },
            {
              q: "The main reason to write hook text before editing is:",
              options: ["It speeds up captioning", "The overlay is a promise the edit must be structured to keep", "Fonts load faster", "Platforms index text in the first frame"],
              answer: 1,
              why: "Hook text sets a payoff contract — the cut structure has to deliver on it fast, so it must exist first."
            },
            {
              q: "What happens when every caption word animates and changes color?",
              options: ["Retention rises from extra motion", "Emphasis dies — constant animation means no signal stands out", "Export bitrate increases", "The algorithm flags the video"],
              answer: 1,
              why: "Emphasis only works against a quiet baseline; when everything shouts, the viewer stops trusting the signals."
            }
          ],
          drill: "Recaption 15 seconds of an old video with a strict hierarchy: plain captions, exactly two keyword pops, one color accent. No other animation allowed."
        },
        {
          id: "editing-1-6",
          title: "Export Like You Mean It",
          minutes: 7,
          xp: 50,
          skill: "editing",
          intro: "Every platform recompresses your upload, and most quality loss people blame on 'the algorithm' happens right here. Exporting is a craft step, not a save button.",
          sections: [
            {
              h: "The Settings That Actually Matter",
              body: "For vertical social, the reliable recipe: 1080x1920, H.264 codec, frame rate matching your edit (30 or 60fps — never let the exporter resample 30 to 60, which duplicates frames and stutters), and a bitrate of 12-20 Mbps. Higher bitrates are not wasted even though platforms recompress: the cleaner your master, the better the platform's re-encode looks, because compression artifacts compound.\n\nAudio: AAC, 320 kbps, and check your loudness — music-bed videos that peak at maximum volume get crushed by platform normalization, so keep true peaks under -1 dB.\n\nExport a master file to your archive at these settings before any platform-specific version. The upload is disposable; the master is your asset. Six months from now, when a clip becomes relevant again, you will repost from the master — not from a screen recording of your own compressed upload."
            },
            {
              h: "Why Your Upload Looks Worse Than Your Export",
              body: "Platforms re-encode aggressively to save bandwidth, and the codec spends its limited bits where the image is simple. That means certain footage survives and certain footage dies.\n\nSurvives: clean, well-lit shots, strong contrast, deliberate composition, moderate motion. Dies: heavy film grain and fine noise (the encoder wastes bits trying to preserve randomness and smears everything), low-light footage (noise again), rapid strobing cuts, and confetti-like fine detail.\n\nTwo practical defenses. First, expose properly when shooting — noise is a compression multiplier you cannot fix in post. Second, if you love a grain aesthetic, use coarse, subtle grain rather than fine dense grain, and accept the platform will soften it. Preview honestly: upload a private or draft version and watch it on a phone over cellular. That — not your editor's preview window — is the image your audience actually receives."
            },
            {
              h: "The Pre-Flight Checklist",
              body: "Ship every video through the same 60-second checklist:\n\n1. **Phone watch, muted** — does the video work silently? Do captions carry it?\n2. **Phone watch, sound on** — are levels comfortable? Does music smother the voice anywhere?\n3. **First-frame check** — is frame one a strong image with readable hook text? Some placements use it as the de facto thumbnail.\n4. **Safe-zone check** — play it inside a platform preview or overlay template; confirm no text sits under UI elements.\n5. **End check** — does the video end on the last meaningful frame, not two seconds of dead air that murders completion rate?\n\nThis list exists because every one of these failures is invisible in a desktop editor and obvious in a feed. Professionals do not have better eyes; they have better checklists. Run it every time, even when you are sure."
            }
          ],
          takeaways: [
            "Export 1080x1920, H.264, matching frame rate, 12-20 Mbps — and archive a master before uploading.",
            "Platform recompression punishes noise, grain, and low light; clean bright footage survives.",
            "Keep audio true peaks under -1 dB so loudness normalization does not crush your mix.",
            "Run the five-point pre-flight checklist on a phone, every video, no exceptions."
          ],
          actions: [
            "Create and save an export preset with the correct recipe in your editor today.",
            "Watch your last upload on cellular data next to your master file and note the differences.",
            "Write the five-point checklist somewhere visible in your workspace."
          ],
          quiz: [
            {
              q: "Why export at a high bitrate when platforms recompress anyway?",
              options: ["It skips platform re-encoding", "A cleaner master gives the platform encoder better input, so the final result degrades less", "It increases resolution", "It improves audio sync"],
              answer: 1,
              why: "Compression artifacts compound — recompressing an already-artifacted file looks far worse than recompressing a clean one."
            },
            {
              q: "Which footage suffers most under platform compression?",
              options: ["Bright, high-contrast product shots", "Slow camera moves", "Low-light footage with fine noise", "Static text cards"],
              answer: 2,
              why: "Encoders waste bits on random noise and then smear it — low light is a compression multiplier."
            },
            {
              q: "Two seconds of dead air after your last line mainly damages:",
              options: ["Export file size", "Completion rate, since viewers swipe before the video technically ends", "Caption timing", "Audio loudness"],
              answer: 1,
              why: "Completion is measured to the final frame — trailing air guarantees viewers leave before the end."
            }
          ],
          drill: "Export the same 15-second clip twice — once at 6 Mbps, once at 18 Mbps — upload both as private drafts, and compare them on your phone."
        }
      ]
    },
    {
      id: "editing-2",
      level: "Intermediate",
      title: "The Working Editor's Toolkit",
      description: "Graduating to a pro NLE and pro ears: a lean Premiere Pro setup, transitions that carry meaning, four-layer sound design, beat mapping, speed ramps, and the a-roll/b-roll dance.",
      lessons: [
        {
          id: "editing-2-1",
          title: "Premiere Pro for Social: A Lean Setup",
          minutes: 10,
          xp: 60,
          skill: "editing",
          intro: "Premiere Pro rewards editors who configure once and edit forever. This is the vertical-first setup, the shortcuts that make cutting physical, and the three-pass structure pros run on every job.",
          sections: [
            {
              h: "Sequence Settings and the Vertical Workflow",
              body: "Create a 1080x1920 sequence preset at your shooting frame rate and save it — never let Premiere infer settings from a randomly dropped clip. If you shoot 4K, edit with proxies: right-click your media, create proxies at quarter resolution, and toggle them with the proxy button. Your timeline scrubs like butter and the export still uses full-resolution originals.\n\nOrganize before cutting: bins for A-ROLL, B-ROLL, AUDIO, GFX, and a SELECTS bin you populate during review. Thirty seconds of bin discipline saves twenty minutes of scrubbing per edit.\n\nIf your source footage is horizontal, resist auto-reframe as a default — it tracks faces adequately but makes compositional choices a human should make. Use it as a first pass on long timelines, then hand-correct every shot where the subject or the action is not the whole story."
            },
            {
              h: "Make Cutting Physical: The Shortcut Set",
              body: "Editing speed lives in your left hand. The shortcuts that matter:\n\n- **J, K, L** — shuttle backward, pause, forward; tap L twice for 2x review. Review at speed, cut at speed.\n- **I and O** — mark in and out on source or timeline.\n- **Q and W** — ripple trim previous and next edit to the playhead. These two keys are the air-removal pass: park the playhead where the content should start, hit Q, done.\n- **Cmd/Ctrl+K** — add edit at playhead (the split).\n- **Shift+Delete** — ripple delete, closing the gap automatically.\n\nDrill Q and W until they are reflex; they collapse the click-drag-trim-close-gap dance into single keystrokes. An editor fluent in ripple trimming cuts a talking head three to four times faster than a mouse-only editor, and speed is what keeps your judgment fresh for the decisions that actually matter."
            },
            {
              h: "Captions and Essential Graphics",
              body: "Premiere's transcription is built in: Window, Text, Transcribe, then generate captions from the transcript. Fix errors in the text panel — it edits like a document — and every correction ripples to the timeline. Style the captions once (font, size, position, stroke) and save the style to your Creative Cloud library so every future project inherits it in two clicks.\n\nFor hook text and titles, live in the Essential Graphics panel. Build your hook-text template with your brand font and safe-zone positioning, save it as a Motion Graphics template (.mogrt), and stop rebuilding the same title from scratch every edit.\n\nThis is the deeper Premiere lesson: the app is a template machine. Anything you have styled twice should exist as a preset — caption styles, title templates, effect presets, export presets. Editors who template compound; editors who rebuild stay slow forever."
            },
            {
              h: "The Three-Pass Edit Structure",
              body: "Professional edits run in passes with names.\n\n1. **The radio edit** — cut the audio story first. Eyes on the transcript and waveform, build the spoken narrative so it flows perfectly with the screen ignored. If the video works as a podcast clip, the spine is right.\n2. **The visual pass** — now serve the spine: b-roll over claims, punch-ins on emphasis, angle changes on topic shifts, hook text and captions.\n3. **The polish pass** — sound design, music levels, color, and a final air-trim at 1x on a phone-sized preview.\n\nThe order is the point. Editors who polish while structuring redo work constantly — you will grade a clip you later delete. Lock structure, then decorate. On a 60-second short the radio edit is typically 40 percent of total edit time, and it is the 40 percent that decides whether the video works."
            }
          ],
          takeaways: [
            "Save a 1080x1920 sequence preset and edit 4K through quarter-res proxies.",
            "Q and W ripple trims plus JKL shuttling make cutting physical — drill them to reflex.",
            "Style captions and hook text once, save as presets and .mogrt templates, reuse forever.",
            "Run three named passes: radio edit, visual pass, polish pass — structure before decoration."
          ],
          actions: [
            "Build and save your vertical sequence preset and one caption style today.",
            "Edit your next video using only keyboard trims — no mouse dragging on clip edges.",
            "Do a radio edit of an old video: listen with the monitor off and note every structural fix you hear."
          ],
          quiz: [
            {
              q: "What do proxies change about a 4K editing workflow?",
              options: ["They export faster at lower quality", "You scrub lightweight copies while export still uses full-resolution originals", "They convert footage to vertical", "They reduce audio file size"],
              answer: 1,
              why: "Proxies are edit-time stand-ins only — playback gets light, and the render pulls the real files."
            },
            {
              q: "The radio edit pass is complete when:",
              options: ["All captions are styled", "The spoken story flows perfectly with the screen ignored", "Music is beat-mapped", "Color is matched across shots"],
              answer: 1,
              why: "The radio edit builds the audio spine — if it works as pure audio, the structure is sound."
            },
            {
              q: "In Premiere, pressing Q with the playhead parked mid-clip will:",
              options: ["Add a marker", "Ripple trim the previous edit point to the playhead, closing the gap", "Split the clip", "Toggle proxies"],
              answer: 1,
              why: "Q is ripple trim previous — one keystroke replaces the click, drag, trim, and gap-close sequence."
            }
          ],
          drill: "Set a 10-minute timer and rough-cut a talking clip in Premiere using only J, K, L, I, O, Q, W, and ripple delete."
        },
        {
          id: "editing-2-2",
          title: "Transitions That Earn Their Place",
          minutes: 9,
          xp: 60,
          skill: "editing",
          intro: "A transition is a sentence connector — 'meanwhile,' 'suddenly,' 'later.' Used without meaning, it is noise between sentences. This lesson is when to transition, which one, and which to never touch.",
          sections: [
            {
              h: "The Default Is a Cut",
              body: "Start from this rule: every transition must justify replacing a cut. A hard cut is invisible, instant, and free; a transition costs 10-30 frames of viewer time and calls attention to itself. It earns that cost only when it communicates something a cut cannot:\n\n- **Time passing** — a dissolve or speed-blur bridge says 'later.'\n- **Location change** — a whip pan or match cut says 'meanwhile, elsewhere.'\n- **Energy shift** — a hard music-synced wipe kicks the video into a new gear.\n- **Conceptual link** — a match cut argues that two things are the same.\n\nAudit any transition against that list; if it communicates nothing, replace it with a cut and the edit gets faster and cleaner simultaneously. The strongest social edits often contain one deliberate transition total — placed at the structural hinge of the video — and pure cuts everywhere else."
            },
            {
              h: "Motion-Matched Transitions: The Whip and the Blur",
              body: "The whip pan is social's signature seam: the outgoing shot pans fast into blur, the incoming shot arrives already panning the same direction, and the cut hides inside the shared motion. The craft is in the matching — direction must match, speed must feel continuous, and you cut at maximum blur on both sides.\n\nShoot for it deliberately: end shots with a fast pan and begin shots with one, both directions, so the edit has options. In post, add 2-4 frames of directional blur at the seam and a whoosh SFX timed to the movement; the sound carries half the illusion.\n\nThe same logic powers zoom transitions (punch toward a subject, arrive punching out of the next) and object wipes. The unifying principle is **motion vector continuity**: the eye is moving in a direction and speed, and the incoming shot honors that momentum. Break the vector and the seam shows instantly."
            },
            {
              h: "Masked Wipes and the Foreground Pass",
              body: "The most invisible transition in the toolkit: something crosses the frame in the foreground — a person walking past, a car sweeping through, a pillar as the camera moves — and the cut hides behind it. Mask the incoming shot to the moving object's edge, keyframe the mask across the frame with the object, feather slightly, done. Three minutes of work in Premiere or CapCut.\n\nThis matters because it converts limitations into style. Two takes that do not match? Hide the seam behind a foreground pass. Need to teleport locations without a whip pan? Let a passing object wipe the world.\n\nShoot with this in mind: whenever something can pass close to the lens — doorframes, crowds, traffic, your own hand — let it fully occlude the frame for a few frames. Editors call these gifts. A shoot that produces five natural wipes gives the edit five free invisible seams."
            },
            {
              h: "The Blacklist",
              body: "Some transitions signal amateur instantly, and knowing them is as useful as knowing techniques. Preset 3D cube spins, star wipes, page peels, and default cross-dissolves sprinkled between every clip all say the same thing: the editor decorated instead of decided. The cross-dissolve deserves nuance — it is a legitimate 'time passes' tool used once or twice, and an amateur tell when it connects every shot in a montage.\n\nAlso blacklist: transition *packs* applied at pack density. A downloaded effect is fine; twelve of them in 40 seconds is a showreel for the pack, not your content.\n\nThe positive version of this rule: pick one signature transition per video, execute it perfectly at the structural moment, and cut everything else. Restraint reads as confidence, and confidence reads as authority — the audience cannot name why one account feels premium, but this is a large part of the why."
            }
          ],
          takeaways: [
            "Every transition must communicate time, place, energy, or concept — otherwise use a cut.",
            "Whip and zoom transitions live on motion vector continuity: matching direction, speed, and blur.",
            "Foreground occlusions are free invisible seams — shoot them deliberately, mask them in post.",
            "One signature transition per video at the structural hinge; restraint is the premium signal."
          ],
          actions: [
            "Audit your last video: list every transition and what it communicated. Replace the mute ones with cuts.",
            "Shoot five foreground-occlusion moments today and build one masked wipe in your editor.",
            "Practice one whip-pan transition with matched direction and a timed whoosh until it feels seamless."
          ],
          quiz: [
            {
              q: "A whip-pan transition fails and the seam is visible. The most likely craft error is:",
              options: ["The whoosh SFX was too loud", "The incoming shot pans in a different direction or speed than the outgoing shot", "The clips were different resolutions", "The pan lasted too long"],
              answer: 1,
              why: "Whips depend on motion vector continuity — mismatched direction or speed breaks the shared momentum that hides the cut."
            },
            {
              q: "When is a cross-dissolve professional rather than amateur?",
              options: ["Between every clip in a montage", "Never — it is always amateur", "Used sparingly to communicate time passing", "Only on text layers"],
              answer: 2,
              why: "The dissolve is a legitimate time-passage tool; density, not the effect itself, is the amateur tell."
            },
            {
              q: "What makes a foreground pass the most invisible transition?",
              options: ["It renders at higher quality", "The cut hides behind a real object fully occluding the frame", "It requires no editing software", "Platforms favor natural motion"],
              answer: 1,
              why: "When a moving object covers the lens, the world can change behind it — the seam is physically concealed."
            }
          ],
          drill: "Build one masked foreground-wipe transition from footage you already have — a person, car, or object crossing frame — with a whoosh timed to the pass."
        },
        {
          id: "editing-2-3",
          title: "Sound Design: The Invisible 50 Percent",
          minutes: 10,
          xp: 60,
          skill: "editing",
          intro: "Viewers forgive soft focus and mediocre color, but bad audio triggers the swipe in seconds. Sound is half the experience and almost all of the perceived production value.",
          sections: [
            {
              h: "The Four Layers and Their Hierarchy",
              body: "Every professional mix is four layers with a strict pecking order:\n\n1. **Dialogue/VO** — the king. Everything else ducks to serve it. Peaks around -6 dB, always intelligible.\n2. **Music** — the emotional bed. Under speech it sits roughly -15 to -20 dB; in gaps it can rise. If you ever strain to hear a word, music is too hot — no exceptions.\n3. **SFX** — punctuation. Whooshes, ticks, and hits accent moments at around -10 to -12 dB, loud enough to register, never startling.\n4. **Ambience** — the glue. Room tone, street noise, cafe murmur at low level, filling silence so the world feels continuous.\n\nBuild the mix in that order and check it on phone speakers, because that is where it will live. A mix that works on studio headphones and dies on a phone speaker is a failed mix — the phone is the master reference."
            },
            {
              h: "SFX as Punctuation",
              body: "Sound effects are the grammar marks of an edit. A **whoosh** is a comma on every whip or fast move. A soft **tick or pop** lands on each text appearance, syncing eye and ear. A **riser** builds 1-2 seconds of tension into a reveal, and a **hit** or muffled **boom** is the period on the payoff. The **sub-drop** — a falling bass note — makes any reveal feel cinematic for free.\n\nTwo craft rules. First, sync to the frame: an SFX 3 frames late reads as sloppy even though no viewer can name the problem. Second, pitch and volume variety — the same whoosh at the same level six times becomes wallpaper. Nudge pitch a few percent between uses.\n\nBuild a personal SFX kit of 20-30 sounds you know intimately — whooshes, ticks, risers, hits, ambiences — and reuse it everywhere. Consistency of sound is brand identity for ears."
            },
            {
              h: "Ambience, Room Tone, and the J-Cut Trick",
              body: "Absolute digital silence feels broken — the audience senses something wrong without knowing what. Whenever dialogue pauses or b-roll runs without music, a bed of ambience keeps the world alive: room tone under indoor talking heads, street atmosphere under urban b-roll, a low wind under drone shots.\n\nRecord 20 seconds of room tone at every shoot (just stand silent and roll); it is free and irreplaceable when you need to patch a gap between takes.\n\nThe pro move is the audio J-cut into new scenes: let the next location's ambience fade in 10-15 frames before its picture arrives. The viewer hears the gym before seeing the gym, and the location change feels anticipated instead of abrupt. This single habit — sound leading picture at every scene change — is among the fastest ways to make an edit feel professionally finished."
            },
            {
              h: "Ducking: Automatic and Manual",
              body: "Ducking — lowering music whenever speech occurs — is what separates a mix from a pile of tracks. Premiere automates it: tag clips in the Essential Sound panel as Dialogue and Music, enable ducking on the music, and it keyframes the dips for you; set the duck amount around -12 dB with a fast-ish fade so the music breathes back up in gaps. CapCut offers a simpler auto-duck toggle, and manual keyframing works everywhere: dip before the first word, recover after the last.\n\nTune the timing, not just the depth. Ducks that start late clip the first word; ducks that recover instantly feel mechanical. Aim for the music anticipating speech by a few frames and easing back over half a second.\n\nThen do a final phone-speaker pass of the whole mix and fix the three spots where a word fights the track. Every mix has three. Find them."
            }
          ],
          takeaways: [
            "Mix in hierarchy: VO around -6 dB, music -15 to -20 under speech, SFX as accents, ambience as glue.",
            "SFX are punctuation — whooshes, ticks, risers, hits, sub-drops — synced to the exact frame.",
            "Never allow true silence; record room tone every shoot and J-cut ambience into scene changes.",
            "Duck music under every word, with anticipation before speech and an eased recovery after."
          ],
          actions: [
            "Assemble your personal 20-sound SFX kit into one folder today.",
            "Remix your last video with proper four-layer hierarchy and auto-ducking, then A/B the two versions on phone speakers.",
            "Add ambience J-cuts to every scene change in your current edit."
          ],
          quiz: [
            {
              q: "Music is sitting at the same level as the voice and words are hard to catch. The correct fix is:",
              options: ["Raise the VO until it wins", "Duck music to roughly -15 to -20 dB under speech", "Mute the music entirely", "Add compression to everything"],
              answer: 1,
              why: "The hierarchy puts dialogue on top — music under speech belongs well below, rising only in gaps."
            },
            {
              q: "Why does an audio J-cut improve scene changes?",
              options: ["It reduces file size", "Hearing the next location before seeing it makes the change feel anticipated rather than abrupt", "It fixes sync drift", "It masks compression artifacts"],
              answer: 1,
              why: "Sound leading picture bridges the transition — one sense carries continuity while the other changes."
            },
            {
              q: "What is the master reference for checking a social mix?",
              options: ["Studio monitors", "Closed-back headphones", "A phone speaker", "The editor's laptop speakers at full volume"],
              answer: 2,
              why: "The audience consumes on phones — a mix must survive the smallest, worst speaker it will actually play on."
            }
          ],
          drill: "Sound-design 10 seconds of silent b-roll using only your SFX kit and ambience — no music — until it feels alive."
        },
        {
          id: "editing-2-4",
          title: "Beat Mapping: Cutting to Music",
          minutes: 8,
          xp: 60,
          skill: "editing",
          intro: "Music is a free editing grid — a metronome the audience already feels in their body. Editors who cut to it inherit rhythm; editors who ignore it fight it.",
          sections: [
            {
              h: "Choose the Track Like an Editor",
              body: "Pick music for structure, not just vibe. Three things to audition:\n\n- **Tempo.** Roughly 85-110 BPM suits luxury, lifestyle, and storytelling pace; 120-140 BPM drives energy, montage, and hype. Halve or double mentally — a 140 BPM track cut on every other beat behaves like 70.\n- **Arc.** A track with a build, a drop, and a breakdown hands you a free three-act structure. Place your reveal on the drop and half the edit designs itself.\n- **Space.** Dense tracks with constant vocals fight your VO; for talking content choose instrumental or minimal-vocal music with room in the mid frequencies where voices live.\n\nAudition tracks against your footage before cutting — play the timeline and let candidates run underneath. The right track makes rough footage feel intentional within seconds; you will know it when the b-roll suddenly looks choreographed."
            },
            {
              h: "The Marker Workflow",
              body: "Do not eyeball rhythm — map it. Play the track and tap the marker key on every major beat (M in Premiere and Resolve; CapCut can auto-generate beat markers on a music clip). Thirty seconds of tapping gives you a ruled grid down the timeline.\n\nNow cut b-roll so edits land on markers. Not every cut — chain every cut to the grid and the edit turns robotic — but the significant ones: shot changes on downbeats, your best shot on the drop, text pops on accents.\n\nThe frame-level secret: place the cut 1-2 frames *before* the beat, so the new shot's arrival lands exactly on it. Sound perception leads; the image should be present when the beat hits, not arriving as it hits. This tiny offset is the difference between an edit that feels on-beat and one that feels almost-on-beat, and almost is worse than ignoring the grid entirely."
            },
            {
              h: "Edit the Music Itself",
              body: "Amateurs treat the track as fixed and bend the video around it. Editors cut the music like any other clip. Trim the 15-second intro so the energy starts at second one. If your reveal wants the drop at 0:22 but the track drops at 0:45, splice the track — cut at a phrase boundary (musical sentences run in 4- and 8-bar blocks), pull the drop earlier, and add a two-frame crossfade at the splice. Done at a phrase boundary, nobody hears it, including musicians.\n\nEnd on a button, not a fade: find a hit or phrase-end in the track and cut the music dead on your final frame. A hard musical ending tells the viewer the video is complete — which protects completion rate — while a fade-out signals 'this is petering out,' inviting the early swipe.\n\nThe track serves the edit. Never the reverse."
            }
          ],
          takeaways: [
            "Choose tracks for tempo, arc, and frequency space — a build-drop structure is a free three-act outline.",
            "Tap beat markers and land significant cuts on the grid, best shot on the drop.",
            "Cut 1-2 frames before the beat so the new image is present when the beat hits.",
            "Splice music at phrase boundaries and end on a button, never a fade."
          ],
          actions: [
            "Beat-map one track with markers and recut an old montage onto the grid.",
            "Practice one music splice: pull a drop 10 seconds earlier with a crossfade at a phrase boundary.",
            "Replace one fade-out ending on an old edit with a hard button ending."
          ],
          quiz: [
            {
              q: "Why place a cut 1-2 frames before the beat rather than on it?",
              options: ["Software timing is inaccurate", "So the incoming shot is present when the beat lands, matching how perception syncs sound and image", "It compensates for export frame loss", "Beats are quieter than downbeats"],
              answer: 1,
              why: "The image should already be there as the beat hits — cutting exactly on the beat perceptually lands the shot late."
            },
            {
              q: "Your reveal happens at 0:20 but the track's drop is at 0:45. The professional move is:",
              options: ["Move the reveal to 0:45", "Speed the track up", "Splice the music at a phrase boundary to pull the drop to 0:20", "Use a different reveal"],
              answer: 2,
              why: "The music serves the edit — spliced at a 4- or 8-bar boundary with a short crossfade, the surgery is inaudible."
            },
            {
              q: "A hard musical button at the final frame protects which metric?",
              options: ["Click-through rate", "Completion rate, by signaling the video is definitively over", "Follower conversion", "Share rate"],
              answer: 1,
              why: "A decisive ending keeps viewers to the last frame; a fade invites the swipe before the video technically ends."
            }
          ],
          drill: "Take eight b-roll clips and one track with a clear drop. Beat-map it, cut all eight to the grid with the hero shot on the drop, and end on a button."
        },
        {
          id: "editing-2-5",
          title: "Speed Ramps That Feel Expensive",
          minutes: 9,
          xp: 60,
          skill: "editing",
          intro: "The speed ramp is the single most recognizable 'premium' edit move on social — and the most commonly butchered. The difference is shot choice, curve shape, and frame rate math.",
          sections: [
            {
              h: "Shoot for the Ramp",
              body: "Ramps are won at the shoot. Three requirements:\n\n1. **High frame rate.** Shoot 60fps minimum, 120fps for silk. A clip slowed to 40 percent needs extra frames to stay smooth — 60fps slowed to 40 percent still yields real frames; 30fps slowed the same amount stutters or forces the software to hallucinate frames.\n2. **Motion with a peak.** Ramps need an action with a climax to slow down on: the car sweeping past, water pouring, fabric flaring, a turn toward camera. Flat, even motion gives the ramp nothing to emphasize.\n3. **Camera movement.** A moving camera plus a slowed subject is the money look — the motion parallax survives the speed change and the world feels dilated.\n\nOn set, let actions run longer than feels necessary: a ramp eats footage fast on the sped-up ends, and short clips leave no room for the curve to breathe."
            },
            {
              h: "The Curve Is the Craft",
              body: "A speed ramp is a velocity curve: fast, then slow, then fast — with eased transitions between states. In CapCut, open curve speed and start from a preset like Montage, then drag the nodes to put the slow valley exactly on your action's peak. In Premiere, use time remapping: add speed keyframes, then drag the keyframe halves apart to create ramped transitions instead of instant jumps, and ease them.\n\nCraft rules: the slow section carries the meaning, so place it precisely on the peak moment — a valley that lands 10 frames early emphasizes nothing. Keep the fast sections genuinely fast (250-400 percent) so the contrast registers. And ease every transition; an instant jump from 300 to 40 percent reads as a glitch, while a 5-10 frame eased ramp reads as intention.\n\nPair the curve with sound: a riser into the slowdown, a whoosh or sub-drop as it releases. The audio sells the physics."
            },
            {
              h: "Where Ramps Belong — and Fail",
              body: "Ramps are emphasis, and emphasis is a budget. Spend it on: **reveals** (ramp into the slow as the product, car, or property appears), **transitions** (speed up the end of scene one, whip into scene two), and **texture moments** (slowing water, smoke, fabric, or hair into tactile luxury). One to three ramps per video. Beyond that, the emphasis budget is spent and every ramp devalues the others.\n\nFailure modes to avoid: ramping 30fps footage into stutter (if you must, enable optical flow interpolation — Premiere's Optical Flow, Resolve's Speed Warp — and inspect for warping artifacts around complex motion like spokes, fences, and overlapping limbs); ramping motion with no peak, which reads as random speed changes; and the drifting valley that slows down slightly *after* the moment mattered.\n\nWhen in doubt, cut the ramp. A clean cut is always better than an almost-ramp."
            }
          ],
          takeaways: [
            "Shoot 60-120fps with peak-motion actions and a moving camera — ramps are won on set.",
            "Place the slow valley exactly on the action's peak; keep fast sections at 250-400 percent for contrast.",
            "Ease every speed transition and sell it with a riser in and a whoosh or sub-drop out.",
            "One to three ramps per video; use optical flow only as a rescue and inspect for warp artifacts."
          ],
          actions: [
            "Shoot three ramp-ready clips today at 60fps or higher: one reveal, one texture, one pass-by.",
            "Build one ramp with a custom curve and paired SFX, placing the valley frame-precisely on the peak.",
            "Test optical flow on a 30fps clip and find the artifacts — know what failure looks like before you need the tool."
          ],
          quiz: [
            {
              q: "Why does 60fps footage ramp more smoothly than 30fps footage?",
              options: ["Higher resolution", "Slowing down needs surplus real frames, which 60fps provides and 30fps lacks", "It exports at a higher bitrate", "Platforms decode it faster"],
              answer: 1,
              why: "Slow motion is frame redistribution — without surplus frames, the software must stutter or invent them."
            },
            {
              q: "The slow valley of a ramp should be placed:",
              options: ["At the start of the clip", "Exactly on the action's peak moment", "Wherever the music is quietest", "On the first frame after a cut"],
              answer: 1,
              why: "The slow section is the emphasis — off-peak placement emphasizes nothing and reads as a random speed change."
            },
            {
              q: "Optical flow interpolation is best described as:",
              options: ["A color tool for matching shots", "A rescue that invents in-between frames, prone to warping on complex motion", "A stabilization feature", "An export codec"],
              answer: 1,
              why: "Optical flow synthesizes frames that were never captured — powerful, but it warps spokes, fences, and overlapping motion."
            }
          ],
          drill: "Create one speed-ramp reveal: 120fps if your camera allows, custom curve with the valley on the peak, riser in, sub-drop out."
        },
        {
          id: "editing-2-6",
          title: "B-Roll Layering and the A/B Dance",
          minutes: 9,
          xp: 60,
          skill: "editing",
          intro: "A-roll is what you say; b-roll is the proof. The rhythm between the two — when to show the face, when to show the evidence — is the core choreography of modern talking content.",
          sections: [
            {
              h: "Cover Every Claim",
              body: "The operating rule: whenever the voice makes a claim the eye could verify, show it within two seconds. Say 'this kitchen is the selling point' — the kitchen appears. Say 'we tripled output' — the screen recording, the calendar, the stacked boxes appear. Words assert; pictures prove; the pairing is what persuades.\n\nThis converts scripting into a b-roll shopping list. Read your script and underline every noun and verb that could be shown — each underline is a shot to capture. A 45-second talking video typically wants 8-15 b-roll moments, most only 1-2 seconds long.\n\nEnter b-roll on an L-cut — voice continues, picture switches — and let the audio thread hold retention through the visual change. The failure mode is decorative b-roll: generic city timelapses and stock-feeling clips that relate to nothing being said. Unrelated b-roll is not coverage; it is wallpaper, and viewers feel the disconnect."
            },
            {
              h: "The 70/30 Rhythm and the Emotion Rule",
              body: "For authority-building talking content, a workable baseline is 30-40 percent face, 60-70 percent b-roll and visuals — enough face to build parasocial trust, enough proof to hold attention. Pure face for 60 seconds demands exceptional delivery; pure b-roll with voiceover sacrifices connection. The blend beats both.\n\nBut distribute by emotional weight, not evenly. **The rule: information can play over b-roll; emotion needs eyes.** Deliver setup, context, and lists over coverage — and return to the face for the punchline, the confession, the strong opinion, the ask. The cut back to the face is itself an emphasis signal; the audience learns that face-time means 'this matters.'\n\nWatch for the tell of amateur pacing: b-roll that switches on a fixed clock regardless of what is being said. The switches should track the script's beats, not a timer."
            },
            {
              h: "Build a B-Roll System, Not a Scramble",
              body: "The editors who layer b-roll effortlessly are not faster — they are organized earlier. Three habits:\n\n1. **Shoot 3x more than the script needs.** B-roll is cheap at the shoot and impossible at the desk. Every location: wide, medium, insert, texture, and one movement shot, 10 seconds each.\n2. **Build a selects bin the same day.** While memory is fresh, pull the usable takes into a SELECTS bin and star the best. Future-you edits from selects, never from raw cards.\n3. **Maintain a reusable library.** Evergreen shots — your workspace, tools, product, city, hands typing — get filed by keyword. A talking video that needs 'working late' pulls from the library in seconds.\n\nOne caution: audiences notice recycled b-roll faster than you expect. Rotate the library, retire overused shots monthly, and never reuse a distinctive hero shot twice in the same week."
            }
          ],
          takeaways: [
            "Cover every verifiable claim with b-roll within two seconds — words assert, pictures prove.",
            "Play information over b-roll, but return to the face for emotion, punchlines, and asks.",
            "Enter b-roll on L-cuts so the audio thread carries retention through visual changes.",
            "Shoot 3x coverage, build same-day selects bins, and keep a keyword-filed evergreen library."
          ],
          actions: [
            "Underline every showable claim in your next script and shoot that exact b-roll list.",
            "Recut one talking video to the 70/30 blend, returning to the face only for the emotional beats.",
            "Start your evergreen b-roll library today with ten keyword-tagged clips."
          ],
          quiz: [
            {
              q: "The script says 'this is where the deal fell apart' with visible emotion. Where should the picture be?",
              options: ["B-roll of the location", "A text card", "On the speaker's face", "A slow-motion insert"],
              answer: 2,
              why: "Emotion needs eyes — information plays over b-roll, but emotional beats belong on the face."
            },
            {
              q: "Why edit from a selects bin rather than raw footage?",
              options: ["Raw footage cannot be color graded", "Pre-filtered best takes make every future edit start from quality, not from scrubbing", "Selects bins export faster", "Raw clips lose audio sync"],
              answer: 1,
              why: "Selects are a one-time filtering investment that removes the scrubbing tax from every subsequent edit."
            },
            {
              q: "What defines decorative (bad) b-roll?",
              options: ["Clips shorter than one second", "Footage unrelated to what the voice is saying at that moment", "Shots without camera movement", "Vertical footage in a horizontal edit"],
              answer: 1,
              why: "B-roll's job is proof of the current claim — generic unrelated coverage is wallpaper the audience feels disconnected from."
            }
          ],
          drill: "Script 30 seconds of talking content, underline every showable claim, shoot the b-roll list, and cut the full A/B dance with L-cut entries."
        }
      ]
    },
    // __MORE__
  ]
});
