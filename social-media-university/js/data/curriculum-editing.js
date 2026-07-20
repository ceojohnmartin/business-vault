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
              options: ["Find the exact cut at 0:14 and study what happened there", "Shorten the whole video by 20 percent", "Add background music", "Change the thumbnail"],
              answer: 0,
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
              options: ["The export bitrate", "A color filter", "Background music", "The 9:16 aspect ratio"],
              answer: 3,
              why: "Editing in the wrong ratio means recomposing every shot later — format comes before content."
            },
            {
              q: "Why detach audio from a clip?",
              options: ["It reduces export time", "It improves microphone quality", "It lets you cut sound and picture independently, enabling J-cuts and L-cuts", "CapCut requires it for captions"],
              answer: 2,
              why: "Separated audio and video can be trimmed on different frames, which is the mechanical basis of J- and L-cuts."
            },
            {
              q: "In the four-pass workflow, what is the only job of the first pass?",
              options: ["Split-deleting mistakes, retakes, and dead air", "Adding captions and hook text", "Color grading", "Choosing music"],
              answer: 0,
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
              options: ["The next shot's audio starts before its picture", "The picture freezes while audio continues", "Both audio and picture cut on the same frame", "The previous shot's audio continues under the new picture"],
              answer: 3,
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
              options: ["Shots held too long", "Music that is too quiet", "Too many J-cuts", "Cutting too fast for the format — mood pieces need 2-4 seconds per shot to breathe"],
              answer: 3,
              why: "Cinematic content depends on composition having time to register; machine-gun pacing signals low value."
            },
            {
              q: "What does the long-short-short pattern accomplish?",
              options: ["The held shot after quick cuts becomes an emphasis beat the audience feels", "It reduces render time", "It matches the platform's preferred bitrate", "It hides continuity errors"],
              answer: 0,
              why: "Changing rhythmic gear is what creates emphasis — the contrast marks the moment as important."
            },
            {
              q: "Why should cuts feel slightly too tight inside the editing app?",
              options: ["Editors always play footage slower", "Export always adds frames", "Feed viewing adds impatience the editing suite lacks, so editor-comfortable pacing plays slow on phones", "It compensates for caption reading time"],
              answer: 2,
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
              options: ["Platform UI and the description overlay bury that zone", "Viewers read top to bottom", "It renders slower there", "Fonts blur near frame edges"],
              answer: 0,
              why: "The feed interface covers the lower frame — text placed there is unreadable in the wild even though it looks fine in the editor."
            },
            {
              q: "The main reason to write hook text before editing is:",
              options: ["It speeds up captioning", "Fonts load faster", "The overlay is a promise the edit must be structured to keep", "Platforms index text in the first frame"],
              answer: 2,
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
              options: ["It skips platform re-encoding", "It improves audio sync", "It increases resolution", "A cleaner master gives the platform encoder better input, so the final result degrades less"],
              answer: 3,
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
              options: ["Completion rate, since viewers swipe before the video technically ends", "Export file size", "Caption timing", "Audio loudness"],
              answer: 0,
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
              options: ["They export faster at lower quality", "They reduce audio file size", "They convert footage to vertical", "You scrub lightweight copies while export still uses full-resolution originals"],
              answer: 3,
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
              options: ["The whoosh SFX was too loud", "The pan lasted too long", "The clips were different resolutions", "The incoming shot pans in a different direction or speed than the outgoing shot"],
              answer: 3,
              why: "Whips depend on motion vector continuity — mismatched direction or speed breaks the shared momentum that hides the cut."
            },
            {
              q: "When is a cross-dissolve professional rather than amateur?",
              options: ["Used sparingly to communicate time passing", "Never — it is always amateur", "Between every clip in a montage", "Only on text layers"],
              answer: 0,
              why: "The dissolve is a legitimate time-passage tool; density, not the effect itself, is the amateur tell."
            },
            {
              q: "What makes a foreground pass the most invisible transition?",
              options: ["It renders at higher quality", "It requires no editing software", "The cut hides behind a real object fully occluding the frame", "Platforms favor natural motion"],
              answer: 2,
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
              options: ["Duck music to roughly -15 to -20 dB under speech", "Raise the VO until it wins", "Mute the music entirely", "Add compression to everything"],
              answer: 0,
              why: "The hierarchy puts dialogue on top — music under speech belongs well below, rising only in gaps."
            },
            {
              q: "Why does an audio J-cut improve scene changes?",
              options: ["It reduces file size", "It fixes sync drift", "Hearing the next location before seeing it makes the change feel anticipated rather than abrupt", "It masks compression artifacts"],
              answer: 2,
              why: "Sound leading picture bridges the transition — one sense carries continuity while the other changes."
            },
            {
              q: "What is the master reference for checking a social mix?",
              options: ["Studio monitors", "A phone speaker", "Closed-back headphones", "The editor's laptop speakers at full volume"],
              answer: 1,
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
              options: ["Software timing is inaccurate", "Beats are quieter than downbeats", "It compensates for export frame loss", "So the incoming shot is present when the beat lands, matching how perception syncs sound and image"],
              answer: 3,
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
              options: ["Completion rate, by signaling the video is definitively over", "Click-through rate", "Follower conversion", "Share rate"],
              answer: 0,
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
              options: ["Higher resolution", "Platforms decode it faster", "It exports at a higher bitrate", "Slowing down needs surplus real frames, which 60fps provides and 30fps lacks"],
              answer: 3,
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
              options: ["B-roll of the location", "A text card", "A slow-motion insert", "On the speaker's face"],
              answer: 3,
              why: "Emotion needs eyes — information plays over b-roll, but emotional beats belong on the face."
            },
            {
              q: "Why edit from a selects bin rather than raw footage?",
              options: ["Pre-filtered best takes make every future edit start from quality, not from scrubbing", "Raw footage cannot be color graded", "Selects bins export faster", "Raw clips lose audio sync"],
              answer: 0,
              why: "Selects are a one-time filtering investment that removes the scrubbing tax from every subsequent edit."
            },
            {
              q: "What defines decorative (bad) b-roll?",
              options: ["Clips shorter than one second", "Shots without camera movement", "Footage unrelated to what the voice is saying at that moment", "Vertical footage in a horizontal edit"],
              answer: 2,
              why: "B-roll's job is proof of the current claim — generic unrelated coverage is wallpaper the audience feels disconnected from."
            }
          ],
          drill: "Script 30 seconds of talking content, underline every showable claim, shoot the b-roll list, and cut the full A/B dance with L-cut entries."
        }
      ]
    },
    {
      id: "editing-3",
      level: "Advanced",
      title: "Color: Correct, Grade, Signature Look",
      description: "The discipline that makes footage feel expensive: correction with scopes instead of eyes, the DaVinci Resolve node workflow, building a signature look, protecting skin, and grading for the small screen.",
      lessons: [
        {
          id: "editing-3-1",
          title: "Correction vs Grade: Two Different Jobs",
          minutes: 10,
          xp: 75,
          skill: "editing",
          intro: "Most 'bad color' online is not a bad grade — it is a missing correction underneath a grade. Separating the two jobs is the single decision that makes color work professional.",
          sections: [
            {
              h: "Correction Makes It True, Grading Makes It Yours",
              body: "**Color correction** is a technical job with a right answer: neutral whites, accurate skin, correct exposure, consistent contrast. Its goal is footage that looks like reality looked. **Color grading** is a creative job with no right answer: pushing that neutral image toward a mood — warm nostalgia, teal-shadowed luxury, clean commercial brightness.\n\nThe order is law: correct first, grade second, always. A grade applied to uncorrected footage bakes the errors in — push a warm look onto a clip that was already too warm and skin goes orange; add contrast to an underexposed shot and shadows turn to mud. Then every fix requires dismantling the look.\n\nWork in two mental modes with a hard boundary between them. Mode one asks 'is this accurate?' Mode two asks 'is this us?' Editors who blend the modes produce grades that fall apart the moment footage from a different camera or lighting setup enters the timeline."
            },
            {
              h: "Scopes: Because Your Eyes Lie",
              body: "Your eyes adapt within seconds — stare at a warm image and it starts reading neutral; grade at night and everything skews. Monitors lie too. Scopes do not.\n\nTwo instruments cover most work. The **waveform** graphs brightness: bottom is black (0), top is white (100 IRE). Read exposure from it — diffuse white around 90, shadows retaining detail above 0, and skin luminance typically sitting near 50-70 IRE depending on complexion and lighting. If the waveform hugs the middle, the image is flat; stretch it. The **vectorscope** graphs color: distance from center is saturation, direction is hue. Its famous feature is the skin-tone line — an angle on which human skin of every complexion falls when hue is accurate. Skin plotting off that line means white balance needs work, whatever your adapted eyes claim.\n\nHabit: glance at scopes before every correction decision, the way a pilot checks instruments over instinct."
            },
            {
              h: "The Order of Operations",
              body: "Professional color runs the same sequence on every project:\n\n1. **Balance each clip.** Neutralize white balance and tint — use a gray or white reference in frame if one exists, or align skin to the vectorscope line.\n2. **Set exposure and contrast.** Blacks near but not at 0, whites bright without clipping, midtones placed for the subject.\n3. **Match shots.** Every clip in a scene should cut together invisibly — compare adjacent shots directly and align their waveforms and palettes. Mismatched shots break immersion harder than a globally imperfect grade.\n4. **Grade the look.** Now, and only now, the creative layer goes on top — ideally as one adjustment over the whole timeline so it stays uniform and removable.\n\nThe sequence matters because each step assumes the previous one. Matching ungraded shots is easy; matching two differently-graded shots is a nightmare of fighting adjustments. Discipline in this order is most of what 'being good at color' means."
            }
          ],
          takeaways: [
            "Correction is a technical job with a right answer; grading is a creative job on top — never blend the modes.",
            "Read exposure on the waveform and hue on the vectorscope; the skin-tone line beats your adapted eyes.",
            "Run the sequence: balance, exposure, shot match, then look — every step assumes the last.",
            "Apply the creative look as one global layer so it stays uniform and removable."
          ],
          actions: [
            "Open the waveform and vectorscope in your editor today and correct three clips using scopes only.",
            "Take one badly-graded old video, strip the look, correct properly, then re-grade on top.",
            "Practice shot matching: correct two adjacent clips from different angles until they cut invisibly."
          ],
          quiz: [
            {
              q: "Skin in your shot plots off the vectorscope's skin-tone line. This most likely indicates:",
              options: ["White balance or tint is off and hue needs correcting", "The subject needs makeup", "Saturation is too low", "The footage is overexposed"],
              answer: 0,
              why: "Skin of all complexions falls along that hue line when color is accurate — deviation means a balance error."
            },
            {
              q: "Why must correction precede grading?",
              options: ["Grading software requires it", "Correction renders faster", "A look applied over errors bakes them in, and every fix then fights the grade", "Grades cannot adjust exposure"],
              answer: 2,
              why: "Grading assumes a neutral foundation — errors underneath compound with the look instead of being fixable."
            },
            {
              q: "Which mismatch damages a viewer's immersion most?",
              options: ["A slightly imperfect global look", "Adjacent shots in one scene that visibly differ in color and brightness", "Undersaturated b-roll", "A missing vignette"],
              answer: 1,
              why: "Shot-to-shot inconsistency breaks the illusion of continuous reality at every cut — worse than any uniform imperfection."
            }
          ],
          drill: "Correct five clips from one shoot using scopes, then play them as a sequence and fix every visible jump at the cuts."
        },
        {
          id: "editing-3-2",
          title: "The Resolve Color Page: Node Thinking",
          minutes: 12,
          xp: 75,
          skill: "editing",
          intro: "DaVinci Resolve's free version contains the same color toolset used on feature films. The price of entry is one mental shift: thinking in nodes instead of layers.",
          sections: [
            {
              h: "Nodes Are Layers With Plumbing",
              body: "On the Resolve color page, each clip gets a node graph: boxes connected left to right, image flowing through them. Each node is one adjustment stage, and order matters — a node sees the image only as delivered by everything upstream. That upstream/downstream logic is the whole trick: a saturation boost placed after a blue-push saturates the blue; placed before, it feeds the blue-push a more saturated source.\n\nWhy this beats sliders-on-a-clip: isolation and discipline. One job per node, labeled, means any adjustment can be toggled, weakened, or deleted without unpicking the rest. When a client wants 'the look but less,' you drop one node's opacity instead of re-balancing five sliders.\n\nStart every grade by adding serial nodes (Alt+S) and labeling them before touching a wheel. An unlabeled graph becomes unreadable in a week — including to you."
            },
            {
              h: "A Five-Node Starter Tree",
              body: "Use the same skeleton on every clip until it is reflex:\n\n1. **Balance** — neutralize white balance and tint against the scopes.\n2. **Exposure/contrast** — set the tonal range: blacks placed, whites bright, midtones serving the subject.\n3. **Skin** — a secondary isolating skin (next lesson) so faces are protected from everything downstream.\n4. **Look** — the creative push: palette bias, split-toning, creative LUT at reduced strength.\n5. **Finish** — vignette, subtle sharpening or softening, final saturation trim.\n\nThe fixed order encodes the correct workflow physically — correction upstream, creativity downstream, finish last. And because the skeleton is identical on every clip, copying grades between shots actually works: the structure matches, so a pasted grade needs only small per-shot balance tweaks rather than a rebuild."
            },
            {
              h: "Primaries: Wheels, Log, and the Pivot",
              body: "The primary wheels — **lift** (shadows), **gamma** (midtones), **gain** (highlights), plus **offset** (everything) — are your core instruments. Their ranges overlap smoothly and broadly, which makes them forgiving for correction: pull lift down to seat blacks, ride gamma for subject brightness, push gain for sparkle.\n\nThe **log wheels** are the same idea with narrower, steeper ranges — surgical pushes into just the deep shadows or just the top highlights without dragging the midtones along. Correction favors primaries; look-building often favors log for its precision.\n\nFor contrast, use the **contrast + pivot** pair instead of bending curves early: contrast stretches the image around a fulcrum, and pivot places that fulcrum. Raise pivot and the stretch darkens the image overall; lower it and contrast brightens. One knob and one fulcrum produce cleaner results than five separate moves — and cleaner is faster to match across a timeline."
            },
            {
              h: "Stills, Wipes, and Matching at Speed",
              body: "Resolve's gallery is the shot-matching engine. Grab a still of your hero shot (the graded reference), then wipe it over any other clip — a split-screen comparison of reference versus current shot, live. Match the waveforms first (exposure), then the palettes (balance), and slide the wipe line across to check the seam. Matching by memory is guessing; matching against a wiped still is measuring.\n\nCopying grades: click the target clip, then middle-click the source clip to paste its full grade across. With the five-node skeleton, most pasted grades need only a balance tweak on node one.\n\nBuild a habit of saving stills of every finished look into labeled albums — 'client X look,' 'moody teal,' 'clean commercial.' That gallery becomes your personal look library: every past grade is a starting point you can reapply, which is how colorists get faster every single project."
            }
          ],
          takeaways: [
            "Nodes are ordered adjustment stages — each sees only what upstream delivers, so structure is meaning.",
            "Run a fixed five-node skeleton: balance, exposure, skin, look, finish — labeled, every clip.",
            "Primaries for broad correction, log wheels for surgical pushes, contrast+pivot for clean tonal stretch.",
            "Match shots against wiped stills and middle-click to copy grades — measure, never memorize."
          ],
          actions: [
            "Install DaVinci Resolve (free) and grade five clips through the five-node skeleton today.",
            "Practice the still-and-wipe match on two shots from different lighting until the seam disappears.",
            "Start your look library: save a labeled still of every grade you finish this week."
          ],
          quiz: [
            {
              q: "A saturation node placed after a heavy blue-push node will:",
              options: ["Ignore the blue entirely", "Only affect highlights", "Cancel the blue-push", "Saturate the already-blue image it receives from upstream"],
              answer: 3,
              why: "Nodes process the image as delivered by everything upstream — order changes the outcome."
            },
            {
              q: "What advantage does a consistent five-node skeleton give when copying grades between shots?",
              options: ["Faster rendering", "It removes the need for scopes", "Pasted grades land on a matching structure, needing only small balance tweaks", "It locks white balance automatically"],
              answer: 2,
              why: "Identical structure means a copied grade maps cleanly — only the per-shot correction node needs adjusting."
            },
            {
              q: "Raising the pivot while adding contrast will:",
              options: ["Darken the image, since the stretch happens around a higher fulcrum", "Brighten the image overall", "Only affect saturation", "Clip the highlights"],
              answer: 0,
              why: "Pivot sets the fulcrum of the contrast stretch — a higher pivot pushes more of the image downward."
            }
          ],
          drill: "Grade one clip through the five-node skeleton, save a still, then match a second clip from different light against the wiped still."
        },
        {
          id: "editing-3-3",
          title: "Building a Signature Look",
          minutes: 11,
          xp: 75,
          skill: "editing",
          intro: "A signature look is why some feeds feel like a brand and others feel like a camera roll. It is not a filter you found — it is a small set of decisions you repeat on purpose.",
          sections: [
            {
              h: "A Look Is a Set of Repeated Decisions",
              body: "Deconstruct any recognizable feed aesthetic and you find the same four dials set consistently:\n\n- **Contrast curve** — crushed cinematic blacks, or lifted faded shadows, or clean commercial linearity.\n- **Palette bias** — where neutrals lean: teal shadows and warm skin, golden everything, cool clinical.\n- **Saturation discipline** — muted with one hero color, or rich throughout, or near-monochrome.\n- **Texture** — clinical sharpness, or soft halation and grain.\n\nDefine your four settings in a sentence before touching a wheel: 'lifted blacks, warm bias, muted palette with saturated brand-blue, soft highlights.' That sentence is your look; the grade merely implements it. Steal the sentence from three references — screenshot frames from films or feeds you admire, extract what their four dials are doing, and write your own recipe. Consistency across every post is what converts a nice grade into brand recognition."
            },
            {
              h: "Split-Toning and Color Contrast",
              body: "The engine inside most premium looks is **split-toning**: pushing shadows toward one hue and highlights toward its rough complement. Teal shadows with warm highlights is the famous pairing because skin lives in the warm range — the cool surroundings make faces pop through complementary contrast. Luxury looks often run subtler versions: slate-blue shadows under golden highlights for automotive, deep green shadows under cream highlights for heritage-brand mood.\n\nExecution in the look node: nudge the lift wheel toward the shadow hue, gain wheel toward the highlight hue — and keep both pushes subtle. On a 0-100 mental scale, most premium looks live at 5-15 percent strength; at 30 the image reads 'filtered' and trust drops.\n\nGuard rail: after split-toning, re-check skin on the vectorscope. If faces drifted off the skin line, protect them with the skin node — the world can be teal, but people must stay human."
            },
            {
              h: "LUTs Done Right",
              body: "Two species of LUT get confused constantly. A **technical LUT** converts one color space to another — log footage to Rec.709 — and belongs early in the chain as math, not taste. A **creative LUT** is someone's saved look, and belongs late, after your correction, as a starting point rather than a destination.\n\nThree rules keep creative LUTs professional. First, correct before the LUT: a LUT built on balanced footage will do something ugly and unpredictable to unbalanced footage — it is a fixed transform, not an intelligent filter. Second, apply at reduced intensity: drop the LUT node's opacity to 40-70 percent and most 'too much' problems vanish. Third, adjust after: trim skin, saturation, and contrast downstream to make the borrowed look yours.\n\nThe honest framing: a LUT is a look *seed*. Buying a famous colorist's pack does not produce their images — their correction discipline underneath it does."
            },
            {
              h: "Film Emulation Cues — With Restraint",
              body: "Why does 'shot on film' read as premium? Because film's imperfections are organic: **halation** (a warm glow bleeding around bright highlights), **grain** (structured, luminance-weighted texture, heavier in shadows), and a **soft highlight rolloff** (whites that shoulder gently into brightness instead of clipping hard).\n\nEach cue is reproducible. Halation: isolate the brightest highlights, blur that isolation, tint it warm-orange, blend at low opacity. Rolloff: bend the top of the curve into a shoulder rather than a hard ceiling. Grain: apply a film-grain overlay or Resolve's grain tool — coarse and subtle, at 35mm-like scale — never the fine dense noise that platform compression smears into mush.\n\nThe restraint rule governs all three: emulation should be *felt*, not seen. If a viewer says 'nice film look,' it is likely too strong; the target is 'this feels expensive and I cannot say why.' Test at feed size — effects visible at full screen often vanish or turn to noise at phone scale."
            }
          ],
          takeaways: [
            "A look is four repeated decisions: contrast curve, palette bias, saturation discipline, texture — write the sentence first.",
            "Split-tone shadows and highlights toward complements at 5-15 percent strength; skin stays protected.",
            "Correct before any creative LUT, apply it at 40-70 percent opacity, and adjust downstream.",
            "Film emulation — halation, coarse grain, soft rolloff — should be felt, never seen, and tested at feed size."
          ],
          actions: [
            "Write your look sentence from three reference frames and implement it as a saved node or preset.",
            "Build one split-toned grade and A/B it at 10 percent versus 30 percent strength on your phone.",
            "Take any creative LUT you own and re-apply it correctly: correction first, 50 percent opacity, downstream trims."
          ],
          quiz: [
            {
              q: "A creative LUT makes footage look broken — green shadows, blown skin. The most likely cause is:",
              options: ["The LUT file is corrupted", "LUTs require log footage", "The footage is 60fps", "It was applied to uncorrected footage it was never built for"],
              answer: 3,
              why: "A LUT is a fixed transform expecting balanced input — feed it uncorrected footage and it amplifies every error."
            },
            {
              q: "Why does teal-and-warm split-toning make faces pop?",
              options: ["Teal increases sharpness", "Skin sits in the warm range, so cool surroundings create complementary contrast around it", "It raises skin brightness", "Platforms boost teal content"],
              answer: 1,
              why: "Complementary color contrast — warm subject against cool field — is the mechanism, since skin is inherently warm."
            },
            {
              q: "The right target strength for a signature look is:",
              options: ["Strong enough that viewers name the effect", "Felt but not seen — noticeable as quality, not as a filter", "Maximum, to differentiate the brand", "Different on every post for variety"],
              answer: 1,
              why: "Premium reads as unexplainable quality; once the audience sees 'a filter,' trust and polish both drop."
            }
          ],
          drill: "Grade the same clip in three looks — clean commercial, teal-warm luxury, faded film — and screenshot each. Pick the one your brand will repeat forever."
        },
        {
          id: "editing-3-4",
          title: "Skin First: Qualifiers and Selective Color",
          minutes: 10,
          xp: 75,
          skill: "editing",
          intro: "Audiences forgive a purple wall; they never forgive a gray face. Skin is the anchor of every grade, and secondaries are how you protect it while the rest of the image goes wherever the look demands.",
          sections: [
            {
              h: "Skin Is the Anchor",
              body: "Human vision is ruthlessly calibrated to faces. A viewer cannot tell you the walls are 200 kelvin too warm, but skin that is slightly green, gray, or radioactive-orange registers instantly as *wrong* — and wrong transfers to the brand. This is why professional grading is skin-first: establish accurate, flattering skin, then build the look around it, never through it.\n\nThe measurement tool is the vectorscope's skin-tone line: skin of every complexion falls along that hue angle when color is accurate — complexions differ in saturation and brightness along the line, not in hue across it. Saturation for healthy-looking skin typically sits moderate; drained skin reads ill, oversaturated skin reads sunburned.\n\nPractical sequence: balance the shot until skin sits on the line, *then* apply the look, then check the line again. If the look dragged skin off-hue, you do not weaken the look — you isolate skin and restore it. That isolation is the qualifier's job."
            },
            {
              h: "The Qualifier Workflow",
              body: "A **qualifier** selects pixels by color instead of by shape. In Resolve: on your skin node, take the qualifier eyedropper and drag across a midtone patch of skin — cheek or forehead, avoiding shadows and hotspots. Toggle the matte view and refine: widen the hue and saturation ranges until all skin is selected, tighten luminance to exclude similar-colored surfaces, then always soften — denoise the matte and blur its edge so the selection never flickers or outlines.\n\nPremiere's equivalent is the Lumetri HSL Secondary panel: same eyedropper, same refine-and-soften logic.\n\nWith skin isolated, adjustments touch only faces: nudge hue toward the skin line, ride saturation to healthy, lift midtone brightness slightly — a half-stop of extra luminance on faces is an old cinematography trick that draws the eye to people. The test of a good qualifier is invisibility in motion: play the clip and watch edges; a chattering matte is worse than no secondary at all."
            },
            {
              h: "Selective Color for Brand Palettes",
              body: "The same qualifier logic runs in reverse for everything that is not skin. Luxury and commercial grades often mute the world and let one hero color carry the frame: qualify the car's paint, the product, the brand color — boost its saturation a touch — then suppress competing colors globally. The result reads instantly as 'commercial': controlled, intentional, art-directed.\n\nTwo disciplines keep it believable. First, **stay inside plausibility** — a boosted red car still looks like paint; a neon red car looks like a render. Push saturation and luminance in small moves and stop before the material stops being material. Second, **mute, don't murder** — pulling background saturation down 15-30 percent quiets distractions; pulling it to zero creates the dated selective-color gimmick of one red rose in a gray world.\n\nCombine the two secondaries — skin protected, hero color lifted, world quieted — and you have the skeleton of essentially every high-end commercial grade on your feed."
            }
          ],
          takeaways: [
            "Grade skin-first: viewers detect face errors instantly and forgive everything else.",
            "All complexions share the vectorscope skin line in hue — differing along it, not across it.",
            "Qualify skin, soften the matte, and restore faces after the look — never weaken the look instead.",
            "Selective color means hero color lifted plausibly and the world muted 15-30 percent, never zeroed."
          ],
          actions: [
            "Qualify skin on one clip today, view the matte, and refine until it holds clean in motion.",
            "Apply a strong creative look, then restore skin through the qualifier — compare against the unprotected version.",
            "Build one hero-color grade: your brand color qualified and lifted, background saturation muted 20 percent."
          ],
          quiz: [
            {
              q: "A strong teal look has dragged faces off the skin-tone line. The professional fix is:",
              options: ["Reduce the whole look's strength", "Add warmth to the entire image", "Raise global saturation", "Qualify skin and restore its hue downstream of the look"],
              answer: 3,
              why: "The look stays at full strength for the world — skin is isolated and corrected separately, which is the qualifier's purpose."
            },
            {
              q: "What is the test of a well-refined qualifier matte?",
              options: ["It stays invisible in motion — no flicker or edge chatter during playback", "It selects the entire frame", "It renders in real time", "It includes shadows and hotspots"],
              answer: 0,
              why: "A matte judged on a still can chatter in motion — playback stability is the real acceptance test."
            },
            {
              q: "Why mute background saturation 15-30 percent instead of fully desaturating it?",
              options: ["Full desaturation increases file size", "Platforms reject grayscale footage", "Partial muting quiets distractions while avoiding the dated one-color-in-gray gimmick", "It preserves the waveform"],
              answer: 2,
              why: "The goal is a quieter world that still reads as reality — zeroed backgrounds turn a grade into a gimmick."
            }
          ],
          drill: "On one automotive or product clip: qualify and protect skin, lift the hero color, mute the world 20 percent, and play it back watching only the matte edges."
        },
        {
          id: "editing-3-5",
          title: "Grading for Small Screens",
          minutes: 9,
          xp: 75,
          skill: "editing",
          intro: "Your grade will be judged on a six-inch OLED at full brightness in a distracted feed — not on your calibrated monitor. Grading for that reality is its own discipline.",
          sections: [
            {
              h: "The Phone Changes the Math",
              body: "Three things happen between your editing suite and the viewer's hand. Phone OLEDs run vivid: saturation displays hotter than your monitor shows, so a grade that looks rich on the desktop can read radioactive in the feed — grade a touch under where instinct says. Shadows crush: subtle dark detail that reads on a desktop display disappears on a phone in a bright room, so keep essential detail out of the deepest 10 percent of the range and grade your mids slightly brighter than cinema taste suggests. And compression bites: platform re-encoding posterizes smooth gradients — skies, vignettes, out-of-focus backgrounds — into visible banding, which heavy grading pushes further.\n\nThe non-negotiable habit: check every grade on an actual phone, in the actual app if possible, before calling it done. Send yourself the export, watch it in a bright room and a dark one. The phone is not a preview of the deliverable — it *is* the deliverable."
            },
            {
              h: "Contrast Reads as Quality at Feed Size",
              body: "At thumbnail and feed scale, fine detail is gone — what survives is tonal structure. Images with confident contrast (deep, placed blacks; bright, clean highlights; clear subject-background separation) look premium at any size, while flat, low-contrast grades that seem sophisticated at full screen just look muddy and gray at three inches.\n\nThis is why the 'crushed but not clipped' convention dominates high-end social: blacks seated firmly near the floor with a hint of detail, a healthy midtone stretch, and highlights with room to sparkle. On the waveform: signal using the full height without slamming either boundary.\n\nA second small-screen lever is **micro-contrast** — local contrast in the midtones (clarity-type adjustments, or a gentle midtone-detail push in Resolve). It gives texture presence at small sizes. Apply with restraint: over-pushed clarity produces the crunchy HDR-look halo that reads cheap instantly. Squint-test the frame; if the subject still separates, the tonal structure works."
            },
            {
              h: "Consistency Across a Series",
              body: "One well-graded video is a video; thirty consistently-graded videos are a brand. Engineering that consistency:\n\n- **Save the look as an asset** — a PowerGrade in Resolve, a Lumetri preset in Premiere, a preset in CapCut — and apply the identical asset to every project. Never rebuild by eye.\n- **Keep reference stills** of your three best graded frames; open them beside every new grading session and match toward them.\n- **Control your environment** — grade in the same room lighting at the same monitor brightness. A grade made at midnight in a dark room will not match one made at noon by a window.\n- **Beware iPhone HDR** — footage shot in HDR formats looks blown-out and washed in an SDR pipeline. Either shoot SDR for social, or let Resolve tone-map the conversion properly, and never mix the two unmanaged in one timeline.\n\nConsistency is unglamorous, and it is the difference between a grade and an identity."
            }
          ],
          takeaways: [
            "Grade slightly under-saturated and brighter in the mids — phone OLEDs run vivid and crush shadows.",
            "Confident contrast survives feed size; flat 'sophisticated' grades read as mud at three inches.",
            "Micro-contrast adds small-screen presence, but over-pushed clarity reads instantly cheap.",
            "Save the look as a preset, grade beside reference stills, and manage HDR footage deliberately."
          ],
          actions: [
            "Send your current graded edit to your phone and view it in bright and dark rooms — log what changed.",
            "Save your finished look as a PowerGrade or preset today and delete the temptation to rebuild by eye.",
            "Check your camera settings: if you shoot HDR for social, decide now — switch to SDR or build the tone-map step into your pipeline."
          ],
          quiz: [
            {
              q: "A grade looks perfect on a desktop monitor but garish and oversaturated in the feed. The likely reason is:",
              options: ["Phone OLED displays run more vivid than the editing monitor", "Platform compression adds saturation", "The export bitrate was too high", "Captions altered the colors"],
              answer: 0,
              why: "Vivid phone displays amplify saturation — grades must be calibrated to the consumption screen, slightly under desktop instinct."
            },
            {
              q: "Why does confident contrast matter more at feed size than fine detail?",
              options: ["Detail increases file size", "Platforms sharpen automatically", "At small scale only tonal structure survives — separation and placed blacks read as quality", "Contrast prevents banding"],
              answer: 2,
              why: "Small screens erase fine detail; what remains legible is the tonal architecture of the frame."
            },
            {
              q: "iPhone HDR footage dropped into an unmanaged SDR timeline typically looks:",
              options: ["Too dark and crushed", "Blown-out and washed", "Oversharpened", "Identical to SDR footage"],
              answer: 1,
              why: "HDR values displayed without tone mapping exceed the SDR range — highlights wash out and the image reads flat and bright."
            }
          ],
          drill: "Grade one clip to look perfect on your desktop, send it to your phone, then re-grade until it looks perfect there instead. Compare the two grades' settings."
        }
      ]
    },
    {
      id: "editing-4",
      level: "Expert",
      title: "Motion Graphics and VFX for Editors",
      description: "The layer above the cut: animation principles that make graphics feel expensive, kinetic type systems, invisible cuts and clones, motion tracking, and compositing fundamentals — all inside an editor's toolkit.",
      lessons: [
        {
          id: "editing-4-1",
          title: "Motion Principles: Easing Is Everything",
          minutes: 11,
          xp: 90,
          skill: "editing",
          intro: "The gap between amateur and agency graphics is rarely the design — it is the movement. Two identical text layers, two sets of keyframes, and one feels like a template while the other feels like money.",
          sections: [
            {
              h: "Linear Keyframes Look Cheap",
              body: "Nothing in the physical world moves at constant speed. Objects accelerate, coast, decelerate — mass and momentum are visible in every real motion. Linear keyframes ignore physics, moving at robotic constant velocity, and the eye reads them instantly as 'computer.'\n\nThe fix is **easing**: shaping the speed curve between keyframes. Ease-out (fast start, gentle landing) suits elements arriving; ease-in (gentle start, accelerating exit) suits elements leaving; ease-both suits repositioning. In Premiere and After Effects: select keyframes, apply Easy Ease, then open the graph editor and steepen the curve's middle so the move spends most of its time near its endpoints. CapCut exposes curve handles on keyframes for the same shape.\n\nBorrow two principles from classical animation: **anticipation** — a tiny move opposite before the main move (text dips 2 pixels before rising) — and **overshoot** — passing the endpoint slightly and settling back. Both add the illusion of mass, and mass is what expensive feels like."
            },
            {
              h: "Timing: The Numbers That Feel Right",
              body: "Motion timing has working conventions worth memorizing as starting points:\n\n- **Text and UI entrances:** 10-15 frames at 30fps (roughly a third to half a second). Faster feels jumpy; slower feels sluggish.\n- **Exits:** quicker than entrances — 6-10 frames. Attention has already moved on; the exit should not demand it back.\n- **Stagger:** when several elements animate, offset their starts by 2-4 frames each. Simultaneous arrival reads mechanical; a cascade reads designed.\n- **Holds:** on-screen text needs reading time — roughly a half-second per word or so at feed pace — before its exit begins.\n\nAnd the emphasis frame trick: a scale pop to about 110 percent that settles to 100 over 4-6 frames turns a static word into a beat. None of these numbers is law; all of them are the difference between guessing and starting from craft. Adjust by feel, at full speed, on a phone-sized preview — motion judged in slow scrubbing always lies."
            },
            {
              h: "Every Move Directs the Eye",
              body: "Expert motion design earns a stricter rule: no decoration. Every animation exists to steer attention — toward the next word, the price, the product, the CTA. Before adding any keyframe, name what the move is pointing at. If the answer is 'it just looks dynamic,' delete it; unmotivated motion competes with your content for the same attention it should be serving.\n\nThis converts animation into information design. A slide-in from the left implies sequence: this follows that. Scale-up implies importance. A wipe implies replacement. Motion toward the product carries the eye to the product — and motion away leaks attention off-frame with it.\n\nPractical audit: play your graphic-heavy edit muted at full speed and track your own eyes. Wherever they land is where the motion sent them. If they missed the key information, the choreography — not the viewer — failed. Recut the moves until the eye-path lands on your message in order."
            }
          ],
          takeaways: [
            "Ease everything — linear keyframes read as 'computer' because nothing real moves at constant speed.",
            "Starting numbers: 10-15 frame entrances, 6-10 frame exits, 2-4 frame staggers, half-second-per-word holds.",
            "Anticipation and overshoot add the illusion of mass, and mass is what expensive feels like.",
            "Every move must direct the eye at something nameable — unmotivated motion is deleted, not kept."
          ],
          actions: [
            "Re-animate one text entrance three ways — linear, eased, eased with overshoot — and compare at full speed.",
            "Take your most graphic-heavy video and delete every animation that does not point at anything.",
            "Build one staggered three-element entrance with 3-frame offsets and save it as a preset."
          ],
          quiz: [
            {
              q: "Why do linear keyframes read as amateur?",
              options: ["They render at lower quality", "They only work at 60fps", "They cannot be staggered", "Constant velocity ignores the acceleration and mass visible in all real motion"],
              answer: 3,
              why: "The eye expects physics — easing restores the acceleration profile real objects have, and its absence flags 'computer.'"
            },
            {
              q: "Three callout labels animate in simultaneously and the result feels mechanical. The standard fix is:",
              options: ["Slow all three down equally", "Use linear interpolation", "Stagger their starts by 2-4 frames each", "Make them larger"],
              answer: 2,
              why: "A short cascade reads as designed choreography; simultaneous arrival reads as one mechanical event."
            },
            {
              q: "The expert test for whether an animation belongs in the edit is:",
              options: ["Whether you can name what it directs the eye toward", "Whether it loops cleanly", "Whether it uses overshoot", "Whether it is under 15 frames"],
              answer: 0,
              why: "Motion is information design — a move that points at nothing competes with the content instead of serving it."
            }
          ],
          drill: "Animate the word 'SOLD' landing on screen with anticipation, overshoot, and a settle — tune it until it feels like it has weight."
        },
        {
          id: "editing-4-2",
          title: "Kinetic Type Systems for Hooks",
          minutes: 10,
          xp: 90,
          skill: "editing",
          intro: "Top accounts do not animate text video by video — they run a type system: a small set of moves, styles, and rules that make every video recognizable and every edit fast.",
          sections: [
            {
              h: "Hook Text Architecture",
              body: "Kinetic type for social follows a spoken-word logic: the screen shows what the voice says, chunked for reading at feed speed. The architecture rules:\n\n- **One idea per screen.** A text beat carries 3-5 words; the next thought gets its own beat. Cramming a sentence into one card forces re-reading and kills pace.\n- **Time to the VO cadence.** Each chunk appears as its words are spoken — the sync between ear and eye is itself a retention mechanic, giving the brain two matched inputs to fuse.\n- **Position with intent.** Keep the text block anchored in one zone (upper-middle for hooks, center for emphasis cards) rather than bouncing around the frame; the viewer's eye should never hunt.\n- **Contrast always wins.** Stroke or shadow, checked against the brightest and darkest frames the text sits over.\n\nStoryboard the first ten seconds as text beats before animating anything — the chunking decisions matter more than the moves."
            },
            {
              h: "Build the System: Three Moves, Two Emphases, One Pair",
              body: "An agency type system is deliberately small. Define, then reuse forever:\n\n- **Three entrance animations.** For instance: a quick eased pop for standard beats, a directional slide for sequenced ideas, a blur-in for dramatic reveals. Every text element in every video uses one of the three.\n- **Two emphasis styles.** A scale-pop with color for the operative word; a full-screen card for the structural moment. Nothing else.\n- **One font pair.** A workhorse for captions and a display face for hooks — locked weights, locked sizes, locked accent color.\n\nThen make the system mechanical: save it as CapCut text presets, Premiere .mogrt templates, or Final Cut title presets, so applying your entire brand typography is a drag, not a rebuild.\n\nThe constraint is the point. Infinite options make every edit a design project; a closed system makes every edit an assembly — faster, and cumulatively recognizable in a way novelty never is."
            },
            {
              h: "Word-Level Emphasis Synced to Speech",
              body: "The highest-grade version of kinetic type works at the word level: as the voice hits the operative word — 'this apartment was **underpriced**' — that word pops 105-115 percent, flips to the accent color, and a soft SFX tick lands on the same frame. Ear, eye, and meaning converge on one syllable.\n\nExecution: find the word's exact frame on the audio waveform (transient peaks make spoken emphasis easy to spot), place the pop there, and keep the scale settle short — 3-5 frames — so the motion punctuates rather than distracts. One to three emphasized words per sentence, maximum; emphasis inflation is real, and a paragraph of popping words is a paragraph with no emphasis at all.\n\nChoose operative words like a copywriter: the number, the contrast word, the emotional peak — not random nouns. The pop tells the viewer 'this is the word the sentence exists for.' Choose wrong and you actively teach the audience to misread you; choose right and even muted viewers feel your inflection."
            }
          ],
          takeaways: [
            "Chunk hooks at 3-5 words per screen, timed to VO cadence, anchored in one screen zone.",
            "Lock a closed system: three entrances, two emphasis styles, one font pair — saved as presets.",
            "Word-level pops (105-115 percent, accent color, SFX tick) land on the exact spoken frame.",
            "Emphasize one to three operative words per sentence — emphasis inflation erases emphasis."
          ],
          actions: [
            "Define your type system on paper today: three moves, two emphases, one font pair, one accent color.",
            "Build the system as presets or .mogrt templates in your editor of choice.",
            "Recut the first 10 seconds of an old video with word-level emphasis on the true operative words."
          ],
          quiz: [
            {
              q: "Why chunk hook text at 3-5 words per screen?",
              options: ["Fonts render faster with fewer characters", "It saves timeline tracks", "Platforms truncate longer overlays", "Feed-speed reading needs one idea per beat — full sentences force re-reading and kill pace"],
              answer: 3,
              why: "Text beats mirror spoken cadence — small chunks are read in a glance, keeping eye and ear in sync."
            },
            {
              q: "The strategic value of limiting yourself to three entrance animations is:",
              options: ["Lower export sizes", "Edits become fast assembly and the repetition compounds into brand recognition", "It avoids software bugs", "Viewers prefer slides to pops"],
              answer: 1,
              why: "A closed system converts design decisions into reusable mechanics — speed now, recognizability over time."
            },
            {
              q: "In word-level emphasis, the pop should land:",
              options: ["One second before the word is spoken", "On the exact frame the word's audio transient hits", "At the end of the sentence", "On every noun in the sentence"],
              answer: 1,
              why: "The power is convergence — ear, eye, and meaning hitting one frame; early or late placement breaks the fusion."
            }
          ],
          drill: "Take one spoken sentence with a number in it and build the full treatment: chunked text beats, one word-level pop on the number, SFX tick on the frame."
        },
        {
          id: "editing-4-3",
          title: "Masks, Clones, and Invisible Cuts",
          minutes: 11,
          xp: 90,
          skill: "editing",
          intro: "Masking is the gateway from editing into VFX — and the highest-leverage version is invisible: seams the audience never sees, clones they cannot explain, and cuts that read as one continuous shot.",
          sections: [
            {
              h: "Masking Fundamentals",
              body: "A mask defines which pixels of a layer are visible. Every serious editor's toolkit has them: pen and shape masks in Premiere's opacity controls, the Power Windows on Resolve's color page, mask tools on CapCut's overlay layers. Three fundamentals govern all of them.\n\n**Feather everything.** A hard mask edge screams composite; 5-20 pixels of feather melts the boundary into the image. **Track or keyframe.** The camera and subject move, so a static mask slides off its target within frames — keyframe the mask by hand on short moves, or use built-in tracking (Resolve's window tracker is excellent) for longer ones. **Check edges in motion.** Like qualifier mattes, masks are judged during playback, not on stills — a crawling edge betrays the effect instantly.\n\nStart applying masks for mundane wins: darken a distracting corner, vignette attention toward the subject, blur a license plate. The craft you build on boring masks is exactly what invisible cuts will spend."
            },
            {
              h: "The Invisible Cut",
              body: "An invisible cut joins two shots so they play as one continuous take — the one-take feel without the one-take risk. The editor's toolkit holds four reliable seams:\n\n1. **The whip.** Both shots whip-pan the same direction; cut at maximum blur.\n2. **The occlusion pass.** A wall, pillar, person, or your own hand fully crosses the lens; the cut hides during total coverage.\n3. **The push into darkness or texture.** The camera pushes into a shadow, a jacket, a doorframe until the frame fills; the next shot pulls out of a matching fill.\n4. **The masked wipe.** No natural coverage? Draw one — mask the incoming shot to a moving vertical edge in the frame and let it wipe the outgoing shot away.\n\nAll four are planned on set: matching camera direction, matching speed, deliberate coverage moments. The edit merely collects what the shoot designed. One planning habit — begin and end every shot with a potential seam — turns ordinary coverage into one-take material."
            },
            {
              h: "Clone Yourself",
              body: "The clone effect — two of you in one frame, arguing, interviewing yourself, handing an object across the cut — is the highest-retention trick you can build with a mask and a tripod.\n\nThe method: lock the camera absolutely (tripod, manual exposure, manual focus, manual white balance — any auto setting will shift between takes and break the illusion). Perform take one on the left of frame, take two on the right. Stack the takes; mask down the middle with a generous feather through empty background, never through a body. Match your own eyelines to where your other self stands, and leave response gaps in each take so the dialogue interleaves.\n\nThe seam's enemies: lighting shifts between takes (shoot both within minutes), shadows crossing the mask line, and auto-exposure drift. The retention logic is the pattern interrupt of the impossible — a self-conversation format routinely holds attention simply because the brain keeps checking how it works."
            },
            {
              h: "Foreground Wipes as Rescue and Style",
              body: "The masked foreground wipe deserves its own drilling because it doubles as a rescue tool. Two takes with a continuity error between them? Wipe the seam behind a passer-by. Need to compress a 20-minute process into two shots that feel continuous? Let a foreground object carry the time jump. The audience reads occlusion as continuity — whatever emerges after the pass is accepted as the same world.\n\nBuilding one from footage without natural coverage: find any strong vertical edge moving through frame — a person, a pole during a pan, a door — mask the incoming clip to that edge, and keyframe the mask across with it. Feather the edge a few pixels, add a subtle whoosh, and grade both sides to match (a brightness jump at the seam is what usually betrays it).\n\nStyle emerges from repetition: an account that hides every location change behind a wipe develops a seamless, dreamlike signature — a brand feel built entirely from one mask technique."
            }
          ],
          takeaways: [
            "Feather every mask, track or keyframe it, and judge edges in motion — never on stills.",
            "Four invisible seams: matched whips, occlusion passes, pushes into darkness, and masked wipes.",
            "Clones need a locked camera, all-manual settings, a feathered seam through empty background, and matched eyelines.",
            "Begin and end every shot with a potential seam — coverage becomes one-take material by planning."
          ],
          actions: [
            "Build one masked foreground wipe today from existing footage with any moving vertical edge.",
            "Shoot a clone conversation: locked tripod, manual everything, two takes, center mask.",
            "On your next shoot, deliberately capture three occlusion passes as edit gifts."
          ],
          quiz: [
            {
              q: "A clone effect keeps breaking at the seam. The most common cause is:",
              options: ["The mask is too feathered", "The tripod was too low", "The takes are different lengths", "Auto exposure or white balance shifted between takes"],
              answer: 3,
              why: "Any auto setting drifts between takes — the background mismatch reveals the seam no matter how good the mask is."
            },
            {
              q: "Where should the clone mask's seam run?",
              options: ["Through empty background between the two performances", "Directly down the speaker's body", "Along the top of frame", "Wherever the mask tool defaults"],
              answer: 0,
              why: "A feathered seam through featureless background is undetectable; a seam through a moving body is impossible to hide."
            },
            {
              q: "Why does an occlusion pass create an accepted time jump?",
              options: ["It resets the platform's attention timer", "It increases motion blur", "Viewers read full-frame coverage as continuity and accept whatever emerges as the same world", "It forces a higher frame rate"],
              answer: 2,
              why: "Occlusion exploits perceptual continuity — the brain bridges the covered moment rather than questioning it."
            }
          ],
          drill: "Film yourself twice at a locked table — asking a question, then answering from the other seat — and composite the clone conversation with a center mask."
        },
        {
          id: "editing-4-4",
          title: "Tracking and Screen Magic",
          minutes: 10,
          xp: 90,
          skill: "editing",
          intro: "Motion tracking pins graphics to the moving world — labels that ride on cars, callouts locked to products, replaced phone screens. It is the effect that makes viewers ask 'how,' built with tools already in your editor.",
          sections: [
            {
              h: "Point, Planar, and When Tracks Slip",
              body: "Two tracker species cover editor-level work. A **point tracker** follows one small pattern of pixels — ideal for pinning a label to a car's badge or a callout to a person walking. A **planar tracker** follows an entire flat surface through perspective changes — the tool for screens, signs, and walls (Mocha in After Effects is the reference; Resolve's tracker handles most social-grade cases).\n\nTracks slip for predictable reasons: the feature loses contrast, exits frame, gets occluded, or motion-blurs into mush. The countermeasures are equally predictable — choose a high-contrast corner or intersection as your feature (never a smooth area), track through the shortest usable section instead of the whole clip, and when a track drifts, stop at the last good frame, re-anchor, and track the next section fresh. Stitching three short clean tracks beats fighting one long dirty one.\n\nAnd when tracking truly fails — extreme blur, wild motion — keyframe by hand every 2-4 frames. Twenty manual keyframes take five minutes and never slip."
            },
            {
              h: "Screen Replacements That Sell",
              body: "Replacing a phone or laptop screen with your clean UI recording is a four-corner problem: **corner pin** the insert to the screen's four corners, tracked through the shot (planar tracking shines here). But the pin is the easy half — believability comes from matching the insert to the scene:\n\n- **Brightness and color.** A pasted screenshot at full brightness over a dim room glows like a lightbox. Grade the insert down toward the scene's exposure and temperature.\n- **Screen glow.** Real screens spill light; add a faint soft glow from the insert onto surrounding fingers or face in dark scenes.\n- **Reflection and texture.** A whisper of the original screen's reflection layered at low opacity over the insert — or a subtle gradient — kills the 'sticker' look instantly.\n- **Motion blur.** If the device moves fast, the insert must blur with it; a sharp screen on a blurred phone is the giveaway.\n\nThe test: nobody comments on the screen at all. Comments mean it failed."
            },
            {
              h: "Callout Systems for Authority Content",
              body: "Tracked callouts — arrows, boxes, underlines, spec labels pinned to moving subjects — are the signature of high-authority niches: horsepower figures riding on a car through a corner, square-footage labels on a property walkthrough, form-check arrows on a lift. They convert passive footage into annotated expertise, and annotation reads as authority.\n\nSystem rules: design callouts inside your type system (same fonts, same accent color, same entrance animation) so they read as brand, not clip-art; animate them in with a 6-10 frame eased entrance and out before they overstay; and attach each to a track so it moves *with* the world — a static label over a moving shot reads as a mistake, while a tracked label reads as production value.\n\nRestraint rule, as always: one callout on screen at a time, each earning its place by carrying a fact the voice is not saying. Track-and-label is seasoning. Season; do not bury."
            }
          ],
          takeaways: [
            "Point trackers pin small features; planar trackers own flat surfaces through perspective shifts.",
            "Stitch short clean tracks and re-anchor at drift — or hand-keyframe every 2-4 frames when tracking fails.",
            "Screen replacements sell through matching: brightness, glow, reflection, and motion blur — not the corner pin.",
            "Tracked callouts read as authority when they share your type system and carry facts the voice omits."
          ],
          actions: [
            "Track one callout label onto a moving object in your editor today and study where it drifts.",
            "Perform one full screen replacement including the glow-and-reflection pass.",
            "Design a callout template inside your existing type system and save it as a preset."
          ],
          quiz: [
            {
              q: "A point track keeps drifting halfway through a shot. The professional response is:",
              options: ["Stop at the last good frame, re-anchor the tracker, and stitch short clean sections", "Abandon the effect", "Blur the graphic to hide the drift", "Track the full clip repeatedly until it works"],
              answer: 0,
              why: "Tracks are stitched, not endured — sectioned tracking with re-anchoring beats one long degrading pass."
            },
            {
              q: "A replaced phone screen looks pasted-on despite a perfect corner pin. What is most likely missing?",
              options: ["Higher insert resolution", "A drop shadow", "Scene-matching: graded brightness, screen glow, a trace of reflection, and matched motion blur", "A tighter crop"],
              answer: 2,
              why: "Believability lives in light interaction — a full-brightness sticker over a dim scene fails no matter how accurate the pin."
            },
            {
              q: "Why do tracked callouts outperform static labels over moving footage?",
              options: ["They render at higher quality", "Moving with the world reads as production value, while static overlays on motion read as mistakes", "Platforms detect tracking and boost reach", "They are faster to build"],
              answer: 1,
              why: "Attachment to the scene integrates the graphic into the world; a floating static label visibly belongs to a different layer."
            }
          ],
          drill: "Shoot a slow pan across any object with specs (car, gadget, room) and pin two tracked spec callouts to it using your brand type system."
        },
        {
          id: "editing-4-5",
          title: "Compositing Basics: Keys, Blends, Glow",
          minutes: 11,
          xp: 90,
          skill: "editing",
          intro: "Compositing is convincing multiple layers to become one image. Green screens, blend modes, and a finishing polish stack cover 90 percent of what social content ever needs from VFX.",
          sections: [
            {
              h: "Green Screen Without the Cheap Look",
              body: "Bad keying is 90 percent a lighting problem. The screen must be lit **evenly** (wrinkles and hotspots become keying noise) and the subject must stand **6-10 feet in front of it** — distance kills the green spill that contaminates hair and shoulders, and lets you light subject and screen independently.\n\nThe post workflow, in order: draw a **garbage matte** first, cropping away everything that is not subject-plus-screen (light stands, floor edges, C-stands) so the keyer solves a smaller problem. Then key — Premiere's Ultra Key, Resolve's 3D keyer or Delta Keyer — sampling the screen near the subject. Then refine: **spill suppression** to neutralize green bounce on skin and hair, a pixel or two of **edge choke**, and light edge feather.\n\nThe step everyone skips is the one that sells it: **relight to the destination**. Match the subject's grade — exposure, temperature, contrast — to the background plate, and add a faint edge glow on the side the background's light comes from. A perfect key with mismatched light still reads fake."
            },
            {
              h: "Blend Modes Are Free VFX",
              body: "Blend modes combine layers mathematically, and three of them do most of the work in social compositing.\n\n- **Screen** drops black and keeps bright: any light element on a black background — lens flares, light leaks, dust particles, rain, sparks — composites instantly with no keying at all. This is why VFX overlay packs ship on black.\n- **Multiply** drops white and keeps dark: watermark a logo, deepen a sky, lay a texture's shadows into a wall.\n- **Overlay** (and Soft Light, its gentler sibling) pushes contrast while blending: film grain, paper texture, and grime layers integrate at low opacity.\n\nThe universal craft move is restraint via opacity — a light leak at 100 percent is an effect; at 30-40 percent it is an atmosphere. Stack a screened dust layer, a soft-light grain, and a graded background and you are compositing — no green screen, no plugins, just multiplication and addition dressed up with taste."
            },
            {
              h: "The Polish Stack",
              body: "The last stage of any composite — and honestly, of any high-end edit — is a finishing stack that unifies every layer into one photographic image. The order matters:\n\n1. **Unifying grade.** One adjustment over everything — a gentle contrast shape and palette bias applied to all layers at once, so foreground and background stop being separately-colored objects.\n2. **Selective glow.** Isolate the brightest highlights and bloom them slightly; light that blooms across layer boundaries stitches those layers together.\n3. **Vignette.** Subtle, feathered, barely conscious — it directs the eye inward and adds finish.\n4. **Grain last.** A fine unified grain over the entire frame is compositing glue: every layer inherits identical noise, and identical noise reads as one camera. Grain applied per-layer or before the grade does nothing.\n\nThe stack takes five minutes and is the difference between 'layers on a timeline' and 'a shot.' Composites feel real when everything degrades together."
            }
          ],
          takeaways: [
            "Keying is lighting: even screen, subject 6-10 feet forward, then garbage matte, key, spill suppression, choke.",
            "Relight the keyed subject to the background plate — mismatched light betrays a perfect key.",
            "Screen, Multiply, and Overlay blend modes are free VFX; opacity restraint turns effects into atmosphere.",
            "Finish with the polish stack in order: unifying grade, selective glow, vignette, grain last."
          ],
          actions: [
            "Composite one screened overlay (light leak, dust, or rain on black) into a real shot at 30-40 percent opacity.",
            "Run the four-step polish stack on your most recent layered edit and A/B the before and after.",
            "If you own a green screen, shoot a test with the subject 8 feet forward and key it with the full refine chain."
          ],
          quiz: [
            {
              q: "Why should a keyed subject stand 6-10 feet in front of the green screen?",
              options: ["The camera focuses more easily", "Keying software requires depth data", "It increases the screen's saturation", "Distance kills green spill and allows independent lighting of subject and screen"],
              answer: 3,
              why: "Proximity causes green bounce onto hair and shoulders and couples the lighting — distance solves both."
            },
            {
              q: "A lens-flare overlay ships on a black background because:",
              options: ["Black compresses better", "It hides watermarks", "The Screen blend mode drops black, compositing bright elements with no keying", "Black backgrounds preserve color accuracy"],
              answer: 2,
              why: "Screen mode mathematically removes darkness — anything bright on black integrates instantly."
            },
            {
              q: "Why must grain come last in the polish stack?",
              options: ["A single grain pass over all layers gives them identical noise, which reads as one camera", "Grain renders slowest", "Earlier grain increases banding", "Grain interferes with tracking"],
              answer: 0,
              why: "Unified noise is compositing glue — layers that degrade identically are perceived as photographed together."
            }
          ],
          drill: "Build one composite from three layers — footage, a screened light element, an overlay texture — then run the full polish stack and export a phone test."
        }
      ]
    },
    {
      id: "editing-5",
      level: "Master",
      title: "The Pro Pipeline",
      description: "Creative-director-level operations: Final Cut mastery, choosing the right app per job, bulletproof project architecture, the selects-and-stringout method, a template machine that multiplies output, and QC systems that scale beyond one editor.",
      lessons: [
        {
          id: "editing-5-1",
          title: "Final Cut Pro and the Magnetic Mindset",
          minutes: 11,
          xp: 110,
          skill: "editing",
          intro: "Final Cut Pro is the fastest NLE on the planet for a solo editor who accepts its philosophy. Fight the magnetic timeline and it fights back; think in its terms and edits fall together at speeds Premiere users disbelieve.",
          sections: [
            {
              h: "The Magnetic Timeline Is a Philosophy",
              body: "Final Cut has no tracks. It has a **primary storyline** — the spine of your edit — and **connected clips** that attach to spine clips and travel with them. Delete ten seconds from the spine and everything downstream closes the gap automatically, with every connected b-roll shot, title, and sound effect riding along, still attached to its moment. The entire category of sync errors that track-based editors manage by hand — the gap, the orphaned SFX, the drifted caption — simply does not exist.\n\nThe mindset shift: stop protecting position, start protecting *relationships*. A whoosh belongs to a cut, so connect it to that clip; hook text belongs to the opening, so connect it there. Structure the radio edit as the spine, hang everything else off it, and restructure fearlessly — the magnetism maintains the relationships.\n\nAdd **roles** (dialogue, music, effects as color-coded lanes) and you get track-style visual organization without track-style bookkeeping."
            },
            {
              h: "Keyword Ranges and Smart Collections",
              body: "Final Cut's library is its second superpower: organization happens at the *range* level, not the clip level. Skim a 10-minute interview, select the 40 seconds that matter, and tag just that range with keywords — 'hook candidate,' 'b-roll gold,' 'kitchen.' One clip can carry a dozen keyword ranges, and each Keyword Collection gathers its ranges from everywhere in the library.\n\nAdd ratings — favorite the great ranges, reject the garbage (rejected footage vanishes from view) — and **Smart Collections** that gather live queries: all favorited 120fps clips keyworded 'exterior,' say.\n\nThe compounding effect: log footage once, on ingest day, and every future edit begins with a search instead of a scrub. Editors who log in Final Cut open a project and have their selects waiting; editors who skip logging pay the scrubbing tax on every single video, forever. Master-level speed is mostly this — decisions made once, retrieved instantly."
            },
            {
              h: "The FCP Social Workflow",
              body: "The pipeline that makes Final Cut sing for short-form:\n\n1. **Ingest and log** — import to the library, skim everything once at speed (L key doubles playback), keyword ranges and favorite the gold.\n2. **Spine the radio edit** — pull favorited talking ranges into the primary storyline and cut the audio story tight.\n3. **Hang the layers** — connect b-roll over claims, titles from your saved presets, SFX to their cuts. Use **auditions** to stack alternate b-roll takes in one placeholder and cycle through them in context — instant A/B testing inside the timeline.\n4. **Version with compounds and snapshots** — collapse the finished edit into a compound clip for the 9:16 master, then snapshot-duplicate before every client revision so each version is frozen and recoverable.\n\nBackground rendering and phone-fast exports close the loop. The whole system rewards preparation and punishes improvisation — precisely backwards from how amateurs edit, precisely why it is fast."
            }
          ],
          takeaways: [
            "The magnetic timeline protects relationships, not positions — connect clips to the moments they serve.",
            "Keyword ranges plus ratings mean you log once and search forever; scrubbing is a tax you stop paying.",
            "Auditions let you cycle alternate shots inside the timeline — A/B testing in context.",
            "Compound clips and snapshot duplicates make versioning instant and every revision recoverable."
          ],
          actions: [
            "If you have Final Cut, log one shoot completely with keyword ranges and favorites before editing a frame.",
            "Rebuild your last edit spine-first: radio edit in the primary storyline, everything else connected.",
            "Create one audition from three alternate b-roll shots and cycle it in context to pick the winner."
          ],
          quiz: [
            {
              q: "In Final Cut, deleting ten seconds from the primary storyline causes connected clips downstream to:",
              options: ["Become orphaned and require re-syncing", "Stay at their original timecode positions", "Convert into compound clips", "Ride along with their spine clips, keeping every relationship intact"],
              answer: 3,
              why: "Connections attach clips to spine moments — the magnetism closes gaps while preserving every relationship automatically."
            },
            {
              q: "The main economic argument for keyword-range logging on ingest day is:",
              options: ["Smaller library files", "One-time logging converts every future edit's scrubbing time into instant search", "It improves export quality", "It is required for auditions"],
              answer: 1,
              why: "Logging is a single investment that removes the recurring scrubbing tax from all subsequent edits of that footage."
            },
            {
              q: "What does an FCP audition enable that a normal timeline does not?",
              options: ["Higher frame rates", "Cycling stacked alternate shots inside one placeholder, in full context", "Automatic color matching", "Multi-user editing"],
              answer: 1,
              why: "Auditions hold alternates in a single timeline position so you compare candidates in the actual edit, not in the browser."
            }
          ],
          drill: "Log a 10-minute batch of footage in Final Cut with keyword ranges, favorites, and one Smart Collection — then time how fast you can assemble a 30-second cut from search alone."
        },
        {
          id: "editing-5-2",
          title: "Choosing Your Weapon: App per Job",
          minutes: 10,
          xp: 110,
          skill: "editing",
          intro: "Editors argue apps like religions. Directors choose apps like tools — per deliverable, per team, per deadline. Here is the honest matrix and the pipeline logic behind it.",
          sections: [
            {
              h: "The Honest Matrix",
              body: "Each major NLE has a genuine center of gravity:\n\n- **CapCut** — speed to native-feeling social. Auto-captions, trending templates and effects, phone-to-post in minutes. Weaknesses: shallow color tools, project fragility, and template aesthetics that read as CapCut.\n- **Premiere Pro** — the ecosystem professional. Deep graphics via After Effects and .mogrts, team projects, plugin universe, handles every format. Costs: subscription and a heavier, occasionally temperamental machine.\n- **DaVinci Resolve** — finishing power. The industry's color suite plus Fairlight audio, and the free version covers almost everything a creator needs. Cost: a steeper interface and a real GPU appetite.\n- **Final Cut Pro** — solo velocity on a Mac. Magnetic speed, one-time price, exceptional performance on Apple silicon. Cost: Mac-only, and its timeline philosophy resists team handoffs to track-based apps.\n\nNo winner exists. There are only fits — and the matrix is how you find yours per job."
            },
            {
              h: "Pipelines: One App or Two, Never Four",
              body: "Feature films cut in one app and finish color in another, roundtripping through interchange formats — XML, AAF, EDL. That pipeline exists for social too: cut in Premiere or Final Cut, export an XML, conform in Resolve for the grade. And for most social work, it is the wrong call — interchange is where relink errors, dropped effects, and lost hours live, and a 45-second vertical rarely justifies the friction.\n\nThe master-level decision rule: **minimize handoffs.** For daily short-form, one app end-to-end wins — Resolve's edit page has matured precisely so the grade-critical work never leaves the building. Reserve the two-app pipeline for jobs where finishing quality is the product: the brand film, the commercial, the flagship YouTube piece. And if you do roundtrip, roundtrip clean — bake nothing into the edit that will not survive the XML, keep effects minimal until after conform, and lock picture before the handoff. A picture that keeps changing after conform is the most expensive mistake in post."
            },
            {
              h: "Master One, Be Conversant in Two",
              body: "The career math: mastery of one NLE — reflex-level shortcuts, template libraries, a thousand solved problems — is worth more than shallow competence in four. Every app switch resets your speed by months, and speed is what funds volume, and volume is what compounds an account.\n\nSo choose deliberately, once: your platform (Mac or not), your team (whose projects must you open?), your deliverables (daily shorts, or graded brand films?), your budget. Then commit for a year minimum. Be *conversant* in a second app where your primary is weak — a Premiere-native editor who can run a Resolve grade session, a CapCut-native creator who can rebuild a project properly in Resolve when a client needs finishing.\n\nThe identity shift this lesson exists for: stop being 'a Premiere editor' or 'a CapCut person.' Be an editor. The craft — cuts, rhythm, sound, color, story — transfers completely. The buttons are the least interesting part of the job."
            }
          ],
          takeaways: [
            "CapCut for native-fast social, Premiere for graphics and teams, Resolve for finishing, Final Cut for solo Mac velocity.",
            "Minimize handoffs: one app end-to-end for daily content; reserve roundtrips for flagship finishing work.",
            "If you roundtrip, lock picture first and keep effects out of the interchange.",
            "Master one NLE, stay conversant in a second — the craft transfers, the buttons do not matter."
          ],
          actions: [
            "Write your fit profile — platform, team, deliverables, budget — and name your primary NLE for the next year.",
            "List the three tasks your primary app handles worst, and identify which second app covers them.",
            "If you have never opened Resolve, install the free version and grade one clip this week."
          ],
          quiz: [
            {
              q: "A solo creator ships two graded shorts daily. The pipeline recommendation is:",
              options: ["Cut in Premiere, roundtrip every video to Resolve via XML", "Alternate apps to stay sharp", "Edit in CapCut, finish in After Effects", "One app end-to-end — daily volume does not justify interchange friction"],
              answer: 3,
              why: "Roundtrips cost relink errors and hours — for daily short-form, minimizing handoffs beats theoretical finishing gains."
            },
            {
              q: "What must happen before a clean edit-to-color roundtrip?",
              options: ["Picture lock — the cut stops changing before the conform", "All effects finalized in the edit app", "The grade must be pre-built", "Proxies must be deleted"],
              answer: 0,
              why: "A conform is a snapshot of the cut; changes after it force expensive re-conforms and version chaos."
            },
            {
              q: "Why does mastering one NLE beat shallow competence in four?",
              options: ["Software licenses are cheaper", "Employers only check one app", "Reflex-level speed funds volume, and each app switch resets that speed for months", "Multi-app editing corrupts projects"],
              answer: 2,
              why: "Editing income and growth compound on throughput — deep fluency in one tool is what produces it."
            }
          ],
          drill: "Take one 30-second edit you made in your primary app and rebuild it in a second NLE. Note which skills transferred instantly and which were just buttons."
        },
        {
          id: "editing-5-3",
          title: "Project Architecture and Media Management",
          minutes: 12,
          xp: 110,
          skill: "editing",
          intro: "Nobody hires an editor because their folders are clean — but every editor who scales has clean folders. Architecture is invisible until the drive fails, the client calls, or the team doubles. Then it is everything.",
          sections: [
            {
              h: "The Folder Template and Naming Law",
              body: "Every project gets the identical skeleton, cloned from a template folder in seconds:\n\n- **01_FOOTAGE** (subfoldered by camera/date), **02_AUDIO** (VO, music, SFX), **03_GFX** (logos, titles, overlays), **04_PROJECTS** (the NLE files), **05_EXPORTS** (masters and deliverables), **06_DOCS** (scripts, briefs, notes).\n\nNaming is law, not preference: `YYMMDD_client_project_v01` on every project file and export. The date sorts chronologically forever, the client and project make any file findable out of context, and the version number ends the 'final_final_FINAL2' catastrophe permanently — there is no 'final,' only the highest version number.\n\nThe payoff compounds: any project opens six months later and explains itself; any collaborator finds any asset without asking; relinking after a drive move takes minutes because media lives where the structure says it lives. Architecture is a one-time decision that deletes a thousand future decisions."
            },
            {
              h: "The Ingest Ritual",
              body: "Professional media management happens on shoot day, as ritual:\n\n1. **Offload with verification.** Copy cards using checksummed transfer (Hedge, ShotPut Pro, or Resolve's Clone tool) — a checksum proves every byte arrived, where a drag-and-drop copy can silently corrupt. Cards do not get formatted until two verified copies exist.\n2. **Apply the 3-2-1 rule.** Three copies of everything, on two different media, one off-site or in cloud storage. Footage that exists in one place does not exist.\n3. **Rename and file** into the template — camera and date subfolders, audio split from video.\n4. **Build the selects the same day.** Skim everything while the shoot is fresh, star the gold, reject the trash, keyword what your NLE supports.\n\nThe same-day discipline matters because context evaporates: tonight you know which take was the good one. In two weeks, that knowledge is gone and only the logging remains."
            },
            {
              h: "Versions, Archives, and the 20-Minute Head Start",
              body: "**Version discipline:** duplicate the project file at every milestone — v01 assembly, v02 rough, v03 fine, v04 picture lock — and export a dated master at each client-facing step. Old versions are never deleted during the project; they are the undo history of your judgment, and the escape hatch when a client says 'actually, the version from Tuesday.'\n\n**Archive discipline:** when a project ships, archive by policy, not mood — keep masters, project files, selects, and graphics; purge raw footage on a defined schedule unless the client pays for retention (put that in writing). A documented archive spec turns 'do we still have that?' from panic into a lookup.\n\n**The template project:** beyond template folders, maintain a template *project* — sequence presets, caption styles, your SFX bin, export presets, color assets pre-loaded. Every new edit clones it and starts 20 minutes ahead. Master editors are not faster at editing so much as they have pre-decided everything that is not editing."
            }
          ],
          takeaways: [
            "One cloned folder skeleton and the YYMMDD_client_project_v01 naming law — no exceptions, no 'final.'",
            "Ingest is ritual: checksummed offload, 3-2-1 backup, rename, and same-day selects while context is fresh.",
            "Version at every milestone and keep the chain — old versions are the escape hatch clients will ask for.",
            "Maintain a template project with presets pre-loaded; every edit should start 20 minutes ahead."
          ],
          actions: [
            "Build your template folder skeleton and template project file today.",
            "Adopt checksummed offloading on your very next shoot — download a verification tool now.",
            "Write your one-paragraph archive spec: what you keep, what you purge, and when."
          ],
          quiz: [
            {
              q: "Why offload cards with checksum verification instead of drag-and-drop?",
              options: ["A checksum proves every byte copied intact — drag-and-drop can corrupt silently", "It transfers faster", "It compresses footage", "It auto-organizes folders"],
              answer: 0,
              why: "Verification is the only proof of a complete copy; silent corruption discovered at edit time is unfixable."
            },
            {
              q: "The 3-2-1 rule specifies:",
              options: ["Three edits, two reviews, one export", "Three folders, two drives, one project file", "Three copies, two different media, one off-site", "Three backups made over one week"],
              answer: 2,
              why: "Redundancy across copies, media types, and locations is what makes footage survivable rather than lucky."
            },
            {
              q: "Why build selects on shoot day rather than at edit time?",
              options: ["Selects bins export faster", "Context evaporates — tonight you know the good take; in two weeks only the logging remains", "NLEs require same-day import", "It reduces storage needs"],
              answer: 1,
              why: "Logging captures fresh knowledge that cannot be recovered later at any price."
            }
          ],
          drill: "Take your messiest past project and rebuild it into the template skeleton with law-compliant names — time the job, then never need to do it again."
        },
        {
          id: "editing-5-4",
          title: "Selects, Stringouts, and the Radio Edit",
          minutes: 11,
          xp: 110,
          skill: "editing",
          intro: "Master editors never edit from raw footage. They edit from a refined pyramid — raw, selects, stringout, cut — and the pyramid is why their first assembly looks like everyone else's third revision.",
          sections: [
            {
              h: "The Selects Pyramid",
              body: "The method, top of funnel to bottom:\n\n1. **The selects pass.** Skim every clip at 1.5-2x. Rate as you go — star or color-label the usable, reject the unusable. Judgment only, no cutting. A 60-minute card typically yields 10-15 minutes of selects.\n2. **The stringout.** Lay all selects into one sequence, grouped by topic or story beat. This stringout — not the raw bin — is now your editing source. Duplicate it before touching anything.\n3. **The pull.** Build the actual cut by pulling from the stringout into your edit sequence.\n\nEach stage shrinks the decision space, which is the entire point: choosing the best of twelve good takes is fast; scrubbing ninety minutes hunting for a maybe is slow — and worse, it interleaves *judging* with *building*, two modes that poison each other. The pyramid separates them. You judge once, cleanly, and then you build from pre-judged material at full creative speed."
            },
            {
              h: "The Radio Edit, Mastered",
              body: "The radio edit deserves elevation from technique to doctrine: **perfect the story with your eyes closed before you touch a single visual.** Build the spoken spine from stringout selects, then literally look away from the monitor — or minimize it — and listen top to bottom. Does the argument build? Does the hook promise something the middle delivers and the end pays? Would this hold you as a podcast clip?\n\nCut at the level of ideas, not sentences: reorder whole beats, delete redundant points, move the strongest claim to the front. Speech edits hide inside natural pause points and breaths — cut there and reordering becomes inaudible.\n\nThe discipline pays because audio is the retention spine of talking content: viewers tolerate a visually rough cut with a gripping story and abandon a gorgeous cut with a flabby one. Every hour spent on the radio edit saves two downstream — nothing gets b-roll, graphics, or grading spent on it that later dies in a story revision."
            },
            {
              h: "Milestone Sequences: Never Edit Without a Net",
              body: "Sequence bloat — one timeline endlessly reworked for days — is how good versions get destroyed by later ideas with no path back. The countermeasure is milestone duplication: before each new phase, duplicate the sequence and rename by state — `assembly`, `rough_v01`, `fine_v02`, `picture_lock`. The old sequence freezes forever; work continues on the copy.\n\nNow the edit has an undo history at the *decision* level, not the keystroke level. When Thursday's restructure turns out worse than Tuesday's instinct, Tuesday still exists, intact, one click away. When a client resurrects a killed section, it is sitting in `rough_v01` rather than in the trash.\n\nCombined with the pyramid, this is the full master workflow: selects once, stringout once, radio edit until the story is inevitable, then milestone forward through visuals and polish — every stage recoverable, every decision reversible, nothing precious ever lost to enthusiasm."
            }
          ],
          takeaways: [
            "Never edit from raw: selects pass, then stringout, then pull — shrink the decision space at every stage.",
            "Judging and building are different modes; the pyramid separates them so each runs at full speed.",
            "Perfect the radio edit with eyes off the monitor — audio is the retention spine of talking content.",
            "Duplicate sequences at every milestone; the edit needs an undo history at the decision level."
          ],
          actions: [
            "Run a full selects pass and stringout on your next shoot before opening an edit sequence.",
            "Radio-edit your next talking video and play it eyes-closed top to bottom before adding any visual.",
            "Adopt milestone naming today: duplicate your current sequence as assembly and work on the copy."
          ],
          quiz: [
            {
              q: "Why does editing from a stringout beat editing from raw bins?",
              options: ["Stringouts render faster", "Stringouts auto-sync audio", "Raw bins cannot be color-labeled", "The decision space is pre-shrunk to judged material, and judging stays separated from building"],
              answer: 3,
              why: "Choosing among pre-judged selects is fast; hunting raw footage interleaves two mental modes that poison each other."
            },
            {
              q: "The radio edit is validated by:",
              options: ["Watching with captions on", "Checking the waveform for gaps", "Listening top to bottom with eyes off the monitor — it must hold as pure audio", "A/B testing thumbnails"],
              answer: 2,
              why: "If the spoken story grips without visuals, the spine is sound; visuals then amplify rather than rescue."
            },
            {
              q: "A client asks for a section you deleted four days ago. With milestone sequences, that section is:",
              options: ["Intact in the frozen earlier sequence it was cut from", "Gone unless auto-save caught it", "Recoverable only from the raw footage", "In the system trash"],
              answer: 0,
              why: "Milestone duplicates freeze each decision state — killed material survives in the sequence where it last lived."
            }
          ],
          drill: "Take 20 minutes of raw footage through the full pyramid — selects at 2x, topic-grouped stringout, radio edit — and clock each stage."
        },
        {
          id: "editing-5-5",
          title: "The Template Machine: Editing at 10x",
          minutes: 10,
          xp: 110,
          skill: "editing",
          intro: "The volume of a top account is not produced by heroic effort — it is produced by systems that make each video cheaper than the last. The master editor is a machine that builds machines.",
          sections: [
            {
              h: "Preset Everything You Do Twice",
              body: "The rule is absolute: any styling or configuration performed twice becomes an asset. Caption styles, hook-text templates, your three entrance animations, transition presets with the whoosh already attached, the five-node grade as a PowerGrade, ducking settings, export recipes — every one saved, named, and filed.\n\nThe math is why. A caption style rebuilt by hand costs five minutes and small inconsistencies every video; across 200 videos that is seventeen hours and a visibly wobbly brand. The preset costs five minutes once. Multiply across a dozen recurring tasks and presets return whole working weeks per year — funding either more output or more craft per output.\n\nThere is a second-order effect: presets *are* your brand consistency. Identical treatments across every video is precisely what makes a feed feel like a channel rather than a pile of clips — the system enforces what discipline alone cannot."
            },
            {
              h: "The Kit Project",
              body: "One level above presets sits the **kit project**: a pre-built, cloneable edit that contains the skeleton of your format before any footage exists. Inside: your sequence preset; placeholder hook text parked at frame one in brand styling; caption track configured; the music bed lane with your standard fade preset; an SFX bin stocked with your twenty sounds; the end-card with CTA already animated; export preset attached.\n\nStarting a video means cloning the kit and dropping footage into a structure that already knows what your videos are. The blank-timeline problem — twenty minutes of setup and a hundred micro-decisions before the first cut — simply disappears.\n\nMaintain one kit per recurring format: the talking-head kit, the montage kit, the tutorial kit. And version them upward: whenever an edit improves the format, fold the improvement back into the kit. The kit compounds — every video you make makes every future video better."
            },
            {
              h: "Batching: Pay the Context Tax Once",
              body: "Context switching is the invisible tax on solo creators: cutting, then designing, then mixing, then grading, each switch dumping one mental mode and loading another. Masters batch by *mode* across videos instead of finishing videos one at a time:\n\n- Monday: radio edits for all four videos of the week.\n- Tuesday: visual pass on all four — b-roll, punch-ins, text.\n- Wednesday: sound and grade on all four, then QC and export as a set.\n\nEach mode loads once and runs at full depth across the batch. Editors who adopt this consistently report the same edit taking meaningfully less time — with the quality *rising*, because the fourth radio edit of the day is sharper than the first, and the improvement lands inside the same week's work.\n\nBatching also stabilizes output: a sick day breaks a daily pipeline but barely dents a weekly batch. Volume without batching is willpower; volume with batching is infrastructure."
            }
          ],
          takeaways: [
            "Anything done twice becomes a preset — the returns are measured in working weeks per year.",
            "Presets enforce brand consistency that discipline alone cannot sustain across hundreds of videos.",
            "Build kit projects per format and fold every improvement back in — the kit compounds.",
            "Batch by mode across videos: all radio edits, then all visuals, then all sound and grade."
          ],
          actions: [
            "List every task you performed twice this month and convert the top five into presets today.",
            "Build your first kit project for your most common format, end-card and SFX bin included.",
            "Batch next week's videos by mode and compare total hours against your normal one-at-a-time pace."
          ],
          quiz: [
            {
              q: "Beyond speed, what is the second-order benefit of presetting all recurring treatments?",
              options: ["Smaller project files", "Automatic captions", "Faster renders", "Enforced visual consistency that makes a feed read as a channel, not a pile of clips"],
              answer: 3,
              why: "Identical treatments across every video are the mechanical basis of brand recognition — the system guarantees it."
            },
            {
              q: "A kit project primarily eliminates:",
              options: ["The need for b-roll", "Blank-timeline setup and the hundred micro-decisions before the first cut", "Client revisions", "Color grading"],
              answer: 1,
              why: "The kit pre-answers every structural question, so editing starts at the first creative decision instead of at setup."
            },
            {
              q: "Why does batching by mode raise quality as well as speed?",
              options: ["Software caches effects between projects", "Each mental mode loads once and deepens across the batch — the fourth radio edit of the day is sharper than the first", "Batched videos share one export", "It prevents auto-save conflicts"],
              answer: 1,
              why: "Skill within a mode warms up with repetition, and batching keeps that warmed-up depth inside a single session."
            }
          ],
          drill: "Build your talking-head kit project, then produce two videos from it back to back. Note every missing piece and fold it into the kit."
        },
        {
          id: "editing-5-6",
          title: "Review Cycles, QC, and Shipping at Scale",
          minutes: 12,
          xp: 110,
          skill: "editing",
          intro: "The last mile decides the reputation: how work gets checked, how feedback gets managed, and how quality survives when you are no longer the one pushing every button.",
          sections: [
            {
              h: "The QC Pass Is a Checklist, Not a Vibe",
              body: "Every deliverable runs the same gate before it ships, in writing:\n\n1. **Full-screen watch at 1x** — no scrubbing; scrubbing hides flash frames, audio pops, and gaps that playback exposes.\n2. **Phone watch, muted** — captions carry the video? Hook text readable at arm's length?\n3. **Phone watch, sound on** — mix survives the small speaker? No word fights the music?\n4. **Frame checks** — first frame strong, last frame intentional, no black gaps, no orphaned frames at cuts.\n5. **Detail sweep** — caption spelling (names especially), safe zones clear of UI, aspect ratio and export settings against the delivery spec.\n\nThe checklist exists because tired eyes miss what fresh process catches — every item on it is a real shipped mistake somebody made. Professionals do not trust their attention; they trust their gate. Five minutes per video, and the reputation for 'their stuff is always clean' compounds into the most valuable asset an editor owns."
            },
            {
              h: "Feedback Protocol: Manage the Notes or the Notes Manage You",
              body: "Unmanaged review cycles destroy margins and sanity. The protocol that prevents it:\n\n- **Timecoded notes only.** Feedback arrives pinned to timestamps — through a review tool (Frame.io and its kin) or a simple shared doc with timecodes. 'Make it pop' is not a note; '0:14 — hold the wide two beats longer' is.\n- **Consolidated rounds.** All stakeholders merge their notes into one list per round; contradictions get resolved on their side before reaching the timeline. Included rounds are defined in the agreement — two is standard — with extra rounds billable.\n- **Versioned delivery.** Every revision ships as a new numbered export against the milestone sequences from your pipeline; nothing is ever overwritten.\n\nClients give bad notes because nobody taught them the protocol — teaching it is a service, and the good ones are grateful. Scope creep is rarely malice; it is almost always the absence of structure, and structure is the editor's job to provide."
            },
            {
              h: "Scaling Beyond Your Own Hands",
              body: "Volume eventually exceeds one editor. Scaling quality means transferring taste, and taste transfers through documents, not vibes:\n\n1. **Write the style guide.** Fonts and sizes, caption rules, pacing law ('no shot over 4 seconds without motion'), SFX kit and when each fires, grade assets attached, three annotated reference edits that define 'us.' If it is not written, it does not exist at scale.\n2. **Delegate stages before whole videos.** Hand off the mechanical layers first — selects, captions, assembly — while you keep the radio edit and final polish, the two stages where taste lives. Expand their scope as calibration proves out.\n3. **Review on a schedule, not forever.** Start reviewing 100 percent of output against the checklist and the guide; as an editor calibrates, drop to sampling.\n\nOwn the final 5 percent — the last pass that makes it *yours* — longer than feels efficient. The system produces the volume; that owned edge is the standard."
            }
          ],
          takeaways: [
            "QC is a written five-point gate — full-screen 1x watch, muted and loud phone passes, frame checks, detail sweep.",
            "Demand timecoded, consolidated feedback with defined rounds; teaching clients the protocol is a service.",
            "Taste transfers through a written style guide and annotated references, never through vibes.",
            "Delegate mechanical stages first, review 100 percent then sample — and keep owning the final 5 percent."
          ],
          actions: [
            "Write your five-point QC checklist and tape it where you export.",
            "Draft one page of your style guide today: fonts, caption rules, pacing law, SFX kit.",
            "Set up a timecoded review flow — a review tool or a timecode doc template — before your next client round."
          ],
          quiz: [
            {
              q: "Why must the QC pass include a full watch at 1x rather than a scrub-through?",
              options: ["Scrubbing corrupts the export", "Scrubbing skips the audio track", "1x playback checks the bitrate", "Flash frames, pops, and gaps reveal themselves in playback and hide during scrubbing"],
              answer: 3,
              why: "Single-frame and audio errors live between the moments a scrub touches — only continuous playback exposes them."
            },
            {
              q: "The correct response to a client note that says 'make it pop more' is:",
              options: ["Translate it into the protocol: ask for timecoded, specific notes in one consolidated round", "Increase saturation and re-export", "Ignore it until round two", "Add more transitions"],
              answer: 0,
              why: "Vague notes produce revision loops — the editor's job includes teaching the structure that makes feedback actionable."
            },
            {
              q: "When scaling to a second editor, what should be delegated first?",
              options: ["The radio edit and final polish", "Client communication", "Mechanical stages like selects, captions, and assembly", "The entire video end to end"],
              answer: 2,
              why: "Taste lives in story and polish — hand off the calibratable mechanical layers first and expand scope as trust builds."
            }
          ],
          drill: "Run your full five-point QC gate on your next three exports and log every catch — the log is the proof the gate pays for itself."
        }
      ]
    }
  ]
});
