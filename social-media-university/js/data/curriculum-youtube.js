window.SMU_DATA = window.SMU_DATA || { schools: [] };
SMU_DATA.schools.push({
  id: "youtube",
  order: 5,
  name: "YouTube & Shorts",
  tagline: "Package the click, earn the minutes, own the session",
  icon: "▶️",
  hue: 4,
  description: "The full craft of the world's second-largest search engine: packaging that wins the click, structure that holds the minute, and channel architecture that turns single views into binge sessions. For creators who want a library that compounds for years, not clips that die in a day.",
  courses: [
    {
      id: "youtube-1",
      level: "Beginner",
      title: "The YouTube Operating System",
      description: "How YouTube actually decides what to recommend, why Shorts and long-form are two different engines, and the packaging-first mindset that separates channels that grow from channels that guess.",
      lessons: [
        {
          id: "youtube-1-1",
          title: "How YouTube Decides What to Recommend",
          minutes: 9,
          xp: 50,
          skill: "strategy",
          intro: "YouTube is not a feed you post into — it is a recommendation machine you negotiate with. This lesson gives you the machine's actual scoreboard.",
          sections: [
            {
              h: "Five Surfaces, Five Different Games",
              body: "Your video does not get 'views.' It gets placed on surfaces, and each surface plays by different rules. **Home (Browse)** shows your packaging to people who did not ask for it — a pure thumbnail-and-title audition. **Suggested** places you next to and after other videos, so adjacency matters. **Search** rewards intent match: the viewer typed words, and your title answers them. The **Shorts feed** is a swipe economy where the first second decides everything. **Notifications and subscriptions** reach your existing base.\n\nStop reading your analytics as one number. A video that dies on Browse can quietly compound in Search for three years. A Short can pull two million swipe-past views and build nothing. From today, when you ask 'how did this video do?', the real question is: on which surface, and against which rules?"
            },
            {
              h: "The Two Numbers That Move Everything",
              body: "The distribution loop runs on two multiplied numbers. **Impressions** are how many times YouTube showed your thumbnail. **Click-through rate (CTR)** is the percentage who clicked — most videos live between 2% and 10%. **Average view duration (AVD)** is how long the average viewer stayed once inside.\n\nCTR times AVD is your effective yield per impression, and yield is what YouTube feeds. High CTR with a two-minute AVD on a twenty-minute video tells the system your package writes checks the content cannot cash — impressions dry up. Modest CTR with strong AVD tells it that whoever clicks, stays — so it hunts for more people like them.\n\nThis is why 'the algorithm buried me' is almost never true. The system ran your audition on a small sample, measured yield, and priced you accordingly. Your job is to raise the yield, not appeal the verdict."
            },
            {
              h: "Satisfaction: The Hidden Third Metric",
              body: "Watch time alone can be gamed, and YouTube knows it — so the system also estimates **satisfaction**. It reads survey responses ('how was this video?'), likes and dislikes, 'not interested' taps, shares, and the heaviest one: whether viewers come back to your channel next week.\n\nThis is the quiet reason rage-bait and stretched-out padding decay. They can win one session and still poison the prediction for the next one. A viewer who felt tricked trains the machine to protect every similar viewer from you.\n\nThe practical move: optimize for the feeling at the end of the video, not just the minutes inside it. If a viewer finishes and thinks 'that was exactly what I came for,' you have banked returning-viewer probability — the closest thing YouTube has to trust. Trust is what turns one lucky video into a channel."
            },
            {
              h: "What This Means for Your Next Upload",
              body: "Three working rules fall out of the machine's design.\n\n1. **Every video re-auditions.** YouTube scores videos more than channels. A small channel with a high-yield video beats a big channel with a weak one — which is why breakout videos come from nowhere every single day.\n\n2. **Packaging and delivery are one system.** The thumbnail-title makes a promise; the video keeps it. Break the chain at either end and the numbers collapse.\n\n3. **Nothing is dead.** YouTube re-tests old videos when search demand or topic interest spikes. A library is an asset that appreciates — the opposite of a TikTok feed.\n\nSo the beginner's job is simple to say and hard to do: make promises people want to click, keep them well enough that people stay, and do it repeatedly so the system learns who your people are."
            }
          ],
          takeaways: [
            "YouTube distributes per surface — Browse, Suggested, Search, Shorts, and notifications each play by different rules.",
            "CTR times AVD is your yield per impression, and yield decides whether impressions grow or dry up.",
            "Satisfaction signals — surveys, likes, and returning viewers — quietly cap or compound your reach.",
            "Every upload re-auditions on its own merits; small channels win big auditions daily."
          ],
          actions: [
            "Open YouTube Studio, pick your last 3 videos, and write down each one's top traffic surface, CTR, and AVD side by side.",
            "Label each of those videos honestly: strong promise / weak delivery, weak promise / strong delivery, or aligned.",
            "Before your next upload, write the promise of the video in one sentence — then check the thumbnail, title, and first 30 seconds all make the same one."
          ],
          quiz: [
            {
              q: "A video has 9% CTR but viewers leave after 90 seconds of a 15-minute runtime. What does the system most likely conclude?",
              options: ["The video is a hit and gets pushed harder", "The packaging over-promises and impressions will shrink", "CTR is all that matters, so nothing changes", "The channel gets a strike"],
              answer: 1,
              why: "High click with low hold reads as a broken promise, so YouTube stops spending impressions on it."
            },
            {
              q: "Which surface rewards viewer intent — someone actively typing words — more than packaging flash?",
              options: ["Home / Browse", "The Shorts feed", "Search", "Notifications"],
              answer: 2,
              why: "Search matches your title and content to typed queries, which is why it compounds for years."
            },
            {
              q: "What is the strongest 'satisfaction' evidence a viewer can give your channel?",
              options: ["A like within the first hour", "Watching with the sound on", "Returning to watch another of your videos later", "Commenting an emoji"],
              answer: 2,
              why: "Returning viewership is the closest proxy YouTube has for trust, and it compounds recommendations."
            }
          ],
          drill: "Take one old video with decent AVD but low CTR and write three new title options for it — you are practicing the highest-leverage repair job on YouTube."
        },
        {
          id: "youtube-1-2",
          title: "Shorts and Long-Form: Two Engines, One Channel",
          minutes: 8,
          xp: 50,
          skill: "strategy",
          intro: "Treating Shorts as 'little YouTube videos' is the most common beginner mistake on the platform. They are a different engine with a different contract — and knowing the difference decides your whole content plan.",
          sections: [
            {
              h: "Two Different Contracts With the Viewer",
              body: "Long-form runs on a **click economy**: the viewer sees your package, decides to invest, and arrives with intent. You earned a decision. Shorts run on a **swipe economy**: the viewer decided nothing — the feed shoved your video into their eyes, and they will swipe within a second unless you interrupt the reflex.\n\nThat changes every craft decision. Long-form can breathe: a 20-second setup is fine because the viewer pre-committed. A Short that spends 3 seconds on setup is already gone. Long-form is measured in minutes held; Shorts are measured in percentage retained and loops — a 25-second Short watched 1.4 times on average is a monster.\n\nWrite it on your wall: long-form viewers chose you, Shorts viewers were assigned you. You court the first and ambush the second."
            },
            {
              h: "What Shorts Are Actually For",
              body: "Shorts do three jobs brilliantly and one job badly.\n\nThey are a **discovery engine** — the cheapest cold reach on YouTube, shown to people who have never heard of you. They are a **rep machine** — you can test ten hooks in the time one long-form takes to produce, and hook instincts transfer directly to your long-form intros. And they are a **presence layer** — keeping you in front of subscribers between big uploads.\n\nThe job they do badly: building deep loyalty on their own. A Shorts-only subscriber often barely remembers subscribing, watches nothing else, and drags down your channel's returning-viewer quality. Chase Shorts subscribers as a vanity number and you inflate a metric while weakening the signal underneath it. Use Shorts to be found; do not confuse being found with being followed."
            },
            {
              h: "What Long-Form Is Actually For",
              body: "Long-form is where the channel actually gets built. Twenty minutes with one person is a relationship; twenty seconds is an encounter. Long-form drives the metrics that matter most: **watch hours** (monetization), **session time** (YouTube's favorite currency), and **returning viewers** (trust).\n\nIt is also your moat. Anyone can clip; few can hold attention for fifteen minutes. The skill ceiling is higher, so the competition thins dramatically — there are millions of competent Shorts editors and comparatively few people who can structure a compelling twenty-minute video.\n\nAnd long-form compounds. A strong tutorial or deep-dive keeps collecting Search and Suggested traffic for years, while a Short's life is usually measured in days. When people say 'my old video suddenly took off,' they are almost always talking about long-form. Build the library; the library pays rent."
            },
            {
              h: "Choosing Your Split",
              body: "A workable beginner ratio: **three Shorts for every one long-form video**, adjusted to your production reality. The Shorts keep you visible and train your hook instincts; the long-form builds the asset.\n\nTwo integration models, pick one deliberately:\n\n1. **Trailer model** — each Short is a self-contained payoff that opens a bigger question your long-form answers. Works when your topics have depth.\n2. **Standalone model** — Shorts and long-form serve the same audience but never reference each other. Works when your Shorts concept differs from your long-form show.\n\nWhat you must not do is post random clips with no thought about who they attract. Every Short recruits a certain kind of viewer; if that viewer would never watch your long-form, you are growing someone else's audience inside your own channel."
            }
          ],
          takeaways: [
            "Long-form is a click economy (viewer chose you); Shorts are a swipe economy (viewer was assigned you).",
            "Shorts excel at discovery, hook reps, and presence — and are weak at building real loyalty alone.",
            "Long-form builds watch hours, session time, and returning viewers, and compounds for years.",
            "Pick a deliberate split (start near 3 Shorts : 1 long-form) and make every Short recruit your long-form viewer."
          ],
          actions: [
            "Write one sentence describing the exact viewer your channel wants, then check your last five Shorts: would that person watch them?",
            "Set your split for the next 30 days — for example 3 Shorts and 1 long-form per week — and put it in your calendar.",
            "Turn one long-form idea into a Short that answers a small question and opens a bigger one."
          ],
          quiz: [
            {
              q: "Why can a long-form video afford a slower opening than a Short?",
              options: ["Long-form viewers clicked deliberately and arrive with intent", "YouTube pauses ranking for the first minute", "Long-form retention is not measured", "Music covers slow openings"],
              answer: 0,
              why: "The click is a pre-commitment; Shorts viewers made no decision and swipe on reflex."
            },
            {
              q: "Which is a job Shorts do poorly on their own?",
              options: ["Reaching cold audiences cheaply", "Testing hooks quickly", "Building deep loyalty and returning viewers", "Keeping you visible between uploads"],
              answer: 2,
              why: "Shorts-only subscribers often remember nothing about you, which weakens your returning-viewer signal."
            },
            {
              q: "A 25-second Short averages 140% retention. What does that number mean?",
              options: ["An analytics error", "Viewers on average watched it 1.4 times — it loops", "It was watched at 1.4x speed", "40% of viewers skipped it"],
              answer: 1,
              why: "Retention above 100% means rewatches — the loop is one of the strongest Shorts signals."
            }
          ],
          drill: "Take your best-performing long-form moment and cut it into a Short two ways: once as a standalone payoff, once as a trailer that opens a question. Post both a few days apart and compare."
        },
        {
          id: "youtube-1-3",
          title: "Packaging First: Title and Thumbnail Before the Script",
          minutes: 8,
          xp: 50,
          skill: "strategy",
          intro: "Amateurs make a video, then ask 'what should the thumbnail be?' Professionals design the thumbnail and title first — and only make videos that deserve them. This one inversion changes everything downstream.",
          sections: [
            {
              h: "The Click Is the First Product",
              body: "Nobody watches your video. They watch a thumbnail and a title, decide in under a second, and only then does your actual video get a chance to exist. The package is not marketing for the product — on YouTube, the package is the first product, and the video is the second.\n\nThis is why 'great video, bad thumbnail' channels stall for years. The system can only measure what happens after impressions, and impressions convert through the package. A 3% CTR channel needs triple the impressions of a 9% CTR channel to get the same audience — and it will not be given them.\n\nThe professional inversion: before you script anything, write the title and describe the thumbnail. If you cannot make the package exciting, the audience cannot either — and you just saved yourself forty hours of production on a video nobody would have clicked."
            },
            {
              h: "Work Backwards From the Thumbnail",
              body: "The biggest channels on the platform develop ideas package-first: the idea is not approved until the thumbnail is compelling on its face. Not 'we can figure out a thumbnail' — the idea itself must contain a single image that generates curiosity.\n\nRun the test on your next concept. Say the idea, then ask: **what is the one frame?** 'I review a budget microphone' has no frame. 'I recorded a podcast on a $9 mic and a $900 mic — guess which is which' has a frame: two mics, one shocked face, a price tag. Same topic, one is packageable.\n\nIf you have to explain the thumbnail, it fails; thumbnails have no footnotes. The discipline feels restrictive for about two weeks. Then you notice every idea surviving the filter is stronger, and your CTR floor quietly rises."
            },
            {
              h: "The Three-Second Pitch Test",
              body: "Before committing to production, pitch the package like a stranger would meet it.\n\n1. Write **five title options**, not one. The first title is almost always the topic; titles three through five start finding the tension.\n2. **Sketch the thumbnail** — stick figures are fine. You are testing the concept, not your drawing.\n3. Show title plus sketch to someone for **three seconds**, then take it away and ask: 'what do you think happens in this video, and do you care?'\n\nIf they reconstruct the promise and lean in, greenlight it. If they squint, your package is doing what it will do at scale: nothing. Three seconds is generous — on a phone screen, you get less. This ritual costs ten minutes and routinely saves entire wasted productions."
            },
            {
              h: "Kill Ideas That Cannot Be Packaged",
              body: "Here is the uncomfortable half of packaging-first: some good ideas make bad videos, because they cannot be packaged for cold audiences. A nuanced take with no visual, no tension, and no clear promise might be your smartest thinking — and it will die on Browse.\n\nYou have three honest options for an unpackageable idea:\n\n- **Reframe it** until a promise emerges. 'My thoughts on productivity' becomes 'I tracked every minute for 30 days — here is what actually wasted my time.'\n- **Demote it** to a segment inside a packageable video, where it gets an audience it could never earn alone.\n- **Shelve it** until you have a loyal base that clicks on your name, not your promise.\n\nKilling weak packages is not creative compromise. It is respecting that distribution is part of the craft — a film nobody sees is a rehearsal."
            }
          ],
          takeaways: [
            "The package is the first product; the video only exists for people the package converts.",
            "Develop ideas thumbnail-first: no compelling single frame, no greenlight.",
            "Test packages with five titles, a sketch, and a three-second stranger pitch before producing.",
            "Reframe, demote, or shelve ideas that cannot be packaged — do not produce them on hope."
          ],
          actions: [
            "Take your next three video ideas and write five titles for each before scripting anything.",
            "Sketch a thumbnail for the strongest title of each — if no single frame exists, reframe the idea until one does.",
            "Run the three-second pitch test on one package with a friend today and write down what they thought the video was."
          ],
          quiz: [
            {
              q: "What does 'packaging first' mean in practice?",
              options: ["Designing the thumbnail after the edit is locked", "Writing the title and thumbnail concept before scripting, and only producing ideas with strong packages", "Spending more on thumbnail software", "Copying the top result's thumbnail"],
              answer: 1,
              why: "The package is designed first so production effort only goes to ideas that can win the click."
            },
            {
              q: "Why does a 3% CTR channel struggle against a 9% CTR channel of similar quality?",
              options: ["It needs roughly triple the impressions for the same audience, and the system will not grant them", "Lower CTR causes copyright issues", "CTR only matters for Shorts", "It does not — CTR is cosmetic"],
              answer: 0,
              why: "Impressions flow toward higher yield, so weak packaging compounds into weak distribution."
            },
            {
              q: "You have a smart, nuanced idea with no visual tension and no clear promise. The packaging-first move is:",
              options: ["Produce it anyway — quality wins eventually", "Reframe it, fold it into a packageable video, or shelve it for a loyal audience", "Buy ads for it", "Post it as a community poll"],
              answer: 1,
              why: "Unpackageable ideas die on cold surfaces; reframing or demoting them respects how distribution works."
            }
          ],
          drill: "Pick a video you love from a big channel and reverse-engineer its development: write the thumbnail description and title first, then outline how every scene exists to pay off that package."
        },
        {
          id: "youtube-1-4",
          title: "The First 100 Videos: Volume With Feedback",
          minutes: 9,
          xp: 50,
          skill: "video",
          intro: "Your first videos are not assets — they are reps. This lesson gives you the training system that turns raw uploads into compounding skill instead of a graveyard of guesses.",
          sections: [
            {
              h: "Reps, Not Masterpieces",
              body: "Every big channel has a buried first year of mediocre videos. Not because those creators were lazy — because skill on YouTube is built through published reps with real feedback, and nothing else substitutes. A video you agonize over for two months teaches you less than four videos shipped in the same window, because each upload returns data no amount of theorizing can.\n\nThe trap is perfectionism disguised as standards. Polishing video seven like it is your magnum opus is emotionally understandable and strategically wrong: almost nobody will see it, and the skills you lack cannot be polished in — they are earned across attempts.\n\nSet the frame now: videos 1 through 100 are tuition. Your only obligations are to ship on schedule, extract one lesson per upload, and make each video slightly better than the last on one specific axis. That last clause is where the system lives."
            },
            {
              h: "The One-Variable Rule",
              body: "Improving 'everything' each video improves nothing, because you can never tell what worked. Instead, change **one variable per video** and hold the rest steady — the same discipline a scientist or a media buyer uses.\n\nExamples of a single variable: a new hook structure in the first 30 seconds. A thumbnail with a face instead of an object. Cutting your intro from 40 seconds to 12. Adding chapter re-hooks every two minutes. Scripting word-for-word instead of bullet points.\n\nAfter publishing, you compare one number against your channel baseline: hook changes get judged on 30-second retention, thumbnail changes on CTR, structure changes on AVD. Twenty videos run this way produce twenty answered questions about your audience. Twenty videos of 'trying harder' produce a mood. The difference at video 100 is not subtle — it is the difference between a craft and a habit."
            },
            {
              h: "A Minimum Viable Production Standard",
              body: "Volume does not mean sloppy. It means defining a floor you never drop below and refusing to gold-plate above it while you learn.\n\nThe floor, in priority order:\n\n1. **Audio first.** Viewers forgive soft video and never forgive bad sound. Record close to the mic, in a room with soft surfaces. A $20 lavalier beats a camera mic across the room.\n2. **Light the face.** One window or one cheap light at 45 degrees. Exposure on the face, not the background.\n3. **Stability.** Lock the camera. Handheld wobble reads as amateur instantly.\n4. **A readable package.** Thumbnail legible at phone size, title under 60 characters.\n\nEverything else — color grading, motion graphics, b-roll density — is above the floor. Add one layer at a time, as its own variable, when the basics are automatic."
            },
            {
              h: "The 15-Minute Review Ritual",
              body: "The rep only counts if you harvest it. Forty-eight hours after each upload, run a 15-minute review and log it — a spreadsheet or notes file is fine.\n\nRecord five things: CTR, AVD, 30-second retention, the variable you tested, and one sentence of verdict. Then watch your own retention graph next to the video and mark the exact timestamp of the steepest drop. Ask one question only: what happened on screen in the ten seconds before people left?\n\nThat single habit — connecting a graph dip to a craft decision — is the whole feedback loop in miniature, and most creators never build it. They read numbers as grades instead of directions.\n\nAfter every ten videos, reread the log and write down your three most repeated mistakes. Those three items are your curriculum for the next ten. This is how 100 videos becomes mastery instead of mileage."
            }
          ],
          takeaways: [
            "Your first 100 videos are tuition — published reps with feedback build skill, polish does not.",
            "Change one variable per video and judge it against one matching metric.",
            "Hold a production floor (audio, face light, stability, readable package) and add layers one at a time.",
            "Run a 15-minute review 48 hours after each upload and log the verdict, or the rep is wasted."
          ],
          actions: [
            "Create your review log today with columns: video, variable tested, CTR, AVD, 30-second retention, verdict.",
            "Choose the single variable for your next video and write it at the top of the script.",
            "Audit your production floor: record 20 seconds of talking audio in your space and fix the biggest weakness you hear."
          ],
          quiz: [
            {
              q: "Why does the one-variable rule beat 'improve everything each video'?",
              options: ["It is faster to edit", "It lets you attribute results to causes, turning uploads into answered questions", "YouTube rewards consistency tags", "It reduces file sizes"],
              answer: 1,
              why: "Isolating one change per video is the only way to know what actually moved the numbers."
            },
            {
              q: "You changed your hook structure this video. Which metric judges the experiment?",
              options: ["Subscriber count", "CTR", "30-second retention", "Comment count"],
              answer: 2,
              why: "Hooks live in the first 30 seconds, so early retention is the matching scoreboard."
            },
            {
              q: "What is the highest-priority element of the minimum production floor?",
              options: ["Color grading", "Clean, close audio", "4K resolution", "Animated intro"],
              answer: 1,
              why: "Viewers tolerate imperfect visuals but abandon bad sound almost immediately."
            }
          ],
          drill: "Watch your most recent video with its retention graph open. Mark the steepest drop, write down what happened in the 10 seconds before it, and design one fix to test next upload."
        },
        {
          id: "youtube-1-5",
          title: "YouTube Studio Without Drowning",
          minutes: 9,
          xp: 50,
          skill: "analytics",
          intro: "Studio shows you fifty numbers so you will not notice only four matter. This lesson gives you the short list, real benchmarks, and a ten-minute reading routine.",
          sections: [
            {
              h: "The Only Four Numbers for Your First Year",
              body: "Ignore almost everything and track these four:\n\n1. **CTR (click-through rate)** — is the package winning its audition?\n2. **AVD (average view duration)** — how many minutes does the average viewer give you?\n3. **APV (average percentage viewed)** — AVD as a percentage of runtime, which lets you compare a 6-minute video against a 20-minute one fairly.\n4. **Returning viewers** — is anyone coming back, or is every video starting from zero?\n\nEach number answers one question and pairs with one craft area: CTR with packaging, AVD and APV with structure and pacing, returning viewers with your content promise. When a video disappoints, these four triage the failure in under a minute: nobody clicked (package), people clicked and left (delivery), or people watched and never returned (promise). Different failures, completely different fixes — which is exactly why one blended 'views' number teaches you nothing."
            },
            {
              h: "Benchmarks That Actually Mean Something",
              body: "Numbers without context breed either panic or delusion. Working ranges:\n\n- **CTR:** most videos land between 2% and 10%. Below 3% on Browse traffic usually means a packaging problem. Above 8% with weak retention means over-promising. Note: CTR naturally falls as impressions grow, because YouTube tests you on colder audiences — a dropping CTR on a spreading video can be a good sign.\n- **APV:** 45-55% is solid for an 8-12 minute video. 60%+ is excellent.\n- **Shorts retention:** 70-90% for sub-40-second Shorts; over 100% means looping, which is the real prize.\n- **30-second hold:** losing more than a third of viewers by 0:30 points at the intro, not the topic.\n\nThe deeper rule: your most important benchmark is your own trailing average. Beating your last ten videos matters infinitely more than beating an industry table."
            },
            {
              h: "The Ten-Minute Reading Routine",
              body: "Once per week, not once per hour. Compulsive analytics checking is procrastination wearing a lab coat.\n\n**Minutes 1-3 — Reach tab:** impressions, CTR, and the traffic-source mix for the week. Which surface fed you: Browse, Suggested, Search, or Shorts feed? One sentence of note.\n\n**Minutes 4-7 — Engagement tab:** open your newest video's retention graph. Mark the intro drop percentage and the single steepest mid-video dip. Timestamp both.\n\n**Minutes 8-10 — Audience tab:** returning versus new viewers, and 'when your viewers are on YouTube' for scheduling. Done.\n\nEverything else — demographics, devices, end-screen click rates — is occasionally useful and weekly noise. The routine exists to answer three questions: is the package working, where does the content leak, and is anyone coming back? If a number does not change a decision, it does not belong in your week."
            },
            {
              h: "Compare Against Yourself, Not MrBeast",
              body: "Studio's 'typical performance' band — that grey range on your video graphs — is the most honest chart on the platform: it compares each new upload against your own recent uploads at the same age. Live above the band, and something you changed is working; find it and repeat it. Live below, and check the four numbers to locate the leak.\n\nTwo timing rules keep you sane. First, judge nothing in the first 24 hours: early traffic skews toward subscribers, who click and watch differently from cold audiences. The honest read arrives at 48-72 hours for most videos, and Search-driven videos keep climbing for weeks.\n\nSecond, expect a hit-driven distribution. On healthy channels a minority of videos drive a majority of views — that is the platform working, not you failing. Your job is raising the floor and studying the outliers, never grieving the median."
            }
          ],
          takeaways: [
            "Track four numbers: CTR (package), AVD and APV (structure), returning viewers (promise).",
            "Use working benchmarks — 2-10% CTR, 45-55% APV on 8-12 minutes, 70-90% Shorts retention — but beat your own trailing average above all.",
            "Read analytics once a week in a ten-minute routine tied to decisions, not moods.",
            "Judge videos at 48-72 hours against your typical-performance band, and expect outliers to carry the channel."
          ],
          actions: [
            "Run the ten-minute routine today on your channel and write the three answers: package working? where leaking? anyone returning?",
            "Compute APV for your last five videos and circle the best one — that structure is your current template.",
            "Turn off view-count notifications and put the weekly review in your calendar instead."
          ],
          quiz: [
            {
              q: "Why is APV more useful than raw AVD when comparing videos of different lengths?",
              options: ["It updates faster", "It normalizes watch time as a percentage of runtime, making a 6-minute and 20-minute video comparable", "It includes Shorts", "It counts likes"],
              answer: 1,
              why: "Percentage viewed removes runtime as a confound so structure quality can be compared directly."
            },
            {
              q: "Your CTR is dropping while impressions grow rapidly. The most likely explanation is:",
              options: ["The thumbnail broke", "YouTube is testing you on colder, broader audiences — often a sign of spread", "You were shadowbanned", "CTR always equals subscriber ratio"],
              answer: 1,
              why: "Expanding distribution reaches less-targeted viewers, so CTR naturally dilutes as reach grows."
            },
            {
              q: "When is the earliest honest moment to judge a normal upload's performance?",
              options: ["First hour", "24 hours", "48-72 hours", "Six months"],
              answer: 2,
              why: "Early traffic over-represents subscribers; the cold-audience verdict arrives over the following days."
            }
          ],
          drill: "Pull CTR, APV, and 30-second retention for your last five videos into one table. Diagnose each in one word — package, delivery, or promise — and pick the single most common diagnosis as this month's focus."
        },
        {
          id: "youtube-1-6",
          title: "One Channel, One Promise: Niche and the Viewer Avatar",
          minutes: 8,
          xp: 50,
          skill: "branding",
          intro: "A channel is not a place you store videos — it is a promise people subscribe to. This lesson makes yours explicit, because a vague promise reads as no promise at all, to humans and machines alike.",
          sections: [
            {
              h: "What Do They Press Play For?",
              body: "Subscribers do not subscribe to you; they subscribe to a repeatable experience they want more of. MrBeast means escalating spectacle. MKBHD means calm, precise tech judgment. Before either name meant anything, the promise did the work.\n\nNow the hard question: finish this sentence for your channel — 'people press play on my videos because they know they will get ___.' If you cannot complete it in one specific phrase, your viewers cannot either, and a viewer who cannot predict what you offer has no reason to return. Unpredictable channels can still get views — any single video can win its audition — but they cannot compound, because every upload starts the relationship from zero.\n\nThis is not about boxing in your creativity. It is about choosing the thread that ties the work together so each video deposits into the same account instead of opening a new one."
            },
            {
              h: "Define the Viewer, Not Just the Topic",
              body: "A topic niche ('cars') is weaker than a viewer niche ('the person deciding whether a used luxury car is a smart buy'). Topics describe content; viewers describe demand.\n\nBuild a one-paragraph avatar and keep it visible: who are they, what are they trying to become or avoid, what do they type into search at 11pm, which channels do they already watch, and what do those channels leave unserved? That last question is your opening — you rarely win by being better, you win by being more precisely aimed.\n\nEvery future decision gets easier with an avatar. Title debates end with 'which one would she click?' Topic selection ends with 'does he need this?' Even your thumbnail style settles, because a 22-year-old gym beginner and a 45-year-old business owner do not respond to the same visual language. Vague audiences produce committee decisions; specific ones produce taste."
            },
            {
              h: "Write the Content Promise Statement",
              body: "Compress the channel into one sentence with this scaffold: **'I help [viewer] get [outcome] through [format].'**\n\nExamples of the level of specificity that works: 'I help first-time founders get customers through teardown videos of real startups.' 'I help car enthusiasts feel the drive through cinematic, no-talking road films.' 'I help busy dads get strong through 20-minute garage workout experiments.'\n\nWeak versions fail on the same three words — 'people' (which people?), 'value' (which outcome?), 'videos' (which format?). Sharpen each slot until a stranger reading the sentence could correctly guess your next five uploads.\n\nThen enforce it: the statement lives at the top of your ideas document, and every pitch must serve it or get cut. The promise also seeds your channel page — banner text, description, and the trailer should all say the same sentence in different clothes."
            },
            {
              h: "Coherence Is a Ranking Asset",
              body: "The machine benefits from your focus as much as the audience does. Recommendation systems learn who to show your videos by watching who watches them. A coherent channel builds a clean audience profile fast: the system learns 'people like this watch this channel' and retrieval sharpens with every upload.\n\nA scattered channel — a vlog, then a tech review, then a cooking video — never builds that profile. Each video recruits a different crowd, your returning-viewer rate stays low, and the system keeps auditioning you in front of strangers who mostly are not interested. That reads in your analytics as permanently 'inconsistent performance,' and it is not bad luck; it is an unclear signal.\n\nThis does not force sameness forever. It means variations should orbit one viewer. MKBHD covers phones, cars, and cameras — one avatar cares about all three. Expand by asking 'what else does my viewer want?' — never 'what else do I feel like making?'"
            }
          ],
          takeaways: [
            "Subscribers buy a repeatable experience — if you cannot state your promise in one phrase, neither can they.",
            "Define a viewer avatar, not just a topic: demand lives in people, not subjects.",
            "Use the scaffold 'I help [viewer] get [outcome] through [format]' and sharpen every slot.",
            "Coherent channels build clean audience profiles that improve retrieval; scattered ones re-audition to strangers forever."
          ],
          actions: [
            "Write your content promise statement today and pin it to the top of your ideas document.",
            "Draft the one-paragraph viewer avatar, including what adjacent channels leave unserved.",
            "Audit your last ten uploads against the promise — mark each keep, reframe, or would-cut."
          ],
          quiz: [
            {
              q: "Why does a scattered, multi-topic channel show 'inconsistent performance' in analytics?",
              options: ["YouTube penalizes variety in its policy", "Each video recruits a different audience, so no clean profile forms and retrieval stays unfocused", "Upload times vary", "Longer videos always beat variety"],
              answer: 1,
              why: "The system learns who to show you by who watches you; mixed signals keep that profile blurry."
            },
            {
              q: "Which is a viewer niche rather than a topic niche?",
              options: ["'Fitness'", "'Cooking videos'", "'Busy professionals who want strong bodies on 30 minutes a day'", "'Cars and tech'"],
              answer: 2,
              why: "A viewer niche names the person and their demand, which drives sharper choices than a subject label."
            },
            {
              q: "The right question for expanding your content range is:",
              options: ["'What is trending right now?'", "'What else does my established viewer want?'", "'What do I feel like making today?'", "'What has the least competition?'"],
              answer: 1,
              why: "Expansion that orbits the same avatar keeps the audience profile coherent while adding range."
            }
          ],
          drill: "Show a stranger your channel page for ten seconds, close it, and ask them to describe who it is for and what it promises. Rewrite your banner text and description based on what they got wrong."
        }
      ]
    },
    {
      id: "youtube-2",
      level: "Intermediate",
      title: "Retention Engineering",
      description: "The craft of holding attention minute by minute: reading retention curves like an editor, building intros and structures that refuse to leak, scripting for the ear, and engineering Shorts that loop.",
      lessons: [
        {
          id: "youtube-2-1",
          title: "Reading the Retention Curve Like an Editor",
          minutes: 10,
          xp: 60,
          skill: "analytics",
          intro: "The retention graph is the most honest film critic you will ever have — it reviews every second of your video and never lies to be polite. Learn its language and every future edit gets smarter.",
          sections: [
            {
              h: "The Four Shapes Every Graph Contains",
              body: "Open any retention graph and you will find four recurring shapes, each with a fixed meaning.\n\n1. **The intro cliff** — the steep fall in the first 30 seconds. Some cliff is universal; the size of yours is the diagnosis.\n2. **The slope** — the long, gradual decline through the body. Its steepness reflects pacing: a gentle slope means the structure is holding, a steep one means the video is leaking by attrition.\n3. **Spikes** — bumps above the surrounding line, meaning viewers rewound and rewatched, or new viewers arrived at a shared timestamp.\n4. **Dips and cliffs mid-video** — sudden drops at a specific moment: something on screen actively pushed people out.\n\nStop reading the graph as a grade. Read it as annotation — a frame-accurate log of where you earned attention and where you spent it."
            },
            {
              h: "Diagnosing the Intro Cliff",
              body: "Benchmark: if you keep roughly 70% of viewers at the 30-second mark, your opening is competitive; lose more than 40% by then and no mid-video brilliance can save the average.\n\nBut the cliff has two different causes with two different fixes, and confusing them wastes months. **Cause one: packaging mismatch.** The thumbnail promised a Lamborghini review; the video opens with your life story. Viewers are not impatient — they are correcting a purchase. Fix the alignment between promise and first frame, not the pacing. **Cause two: slow ignition.** The promise matches, but you take 45 seconds of throat-clearing to reach it. Fix by cutting everything before the first moment of value.\n\nTell them apart with one test: does the first shot visually confirm the thumbnail? If yes, your problem is speed. If no, your problem is honesty — and honesty repairs faster."
            },
            {
              h: "Spikes Are Gifts",
              body: "Most creators obsess over dips and skim past spikes. Reverse that. A spike is your audience rewinding — voluntarily replaying ten seconds of your video — and there is no stronger evidence of value on the entire graph.\n\nCatalog every spike across your last ten videos with a timestamp and a one-line description of what happened on screen: a specific demonstration, a surprising number, a joke, a chart, a reveal. Patterns emerge fast, and they are usually humbling — the moments audiences replay are rarely the moments you were proudest of.\n\nThen feed the pattern forward three ways: build future videos around more of that moment type, move a spike-type moment earlier into the intro as proof of what is coming, and clip spike moments into Shorts, since a rewatched segment has already passed the strongest audition a Short can face."
            },
            {
              h: "Absolute vs. Relative: Two Graphs, Two Jobs",
              body: "Studio gives you two retention views; use each for its job. **Absolute retention** shows the percentage of viewers remaining at each second of this video — use it for surgery: finding your cliff, your dips, your spikes, timestamp by timestamp.\n\n**Relative retention** compares your video against all YouTube videos of similar length at each moment — above average or below average. Use it for honest context: a 50% APV might feel mediocre until relative retention shows you outperforming comparable videos through the middle, which means your structure is fine and your packaging deserves the attention instead.\n\nOne discipline turns all this into skill: never fix a number, fix a timestamp. 'Retention is low' is a mood. 'We lose 8% at 2:40 where I read a definition off the screen for thirty seconds' is an editing note. The entire point of the graph is converting the first sentence into the second."
            }
          ],
          takeaways: [
            "Every graph contains four shapes — intro cliff, slope, spikes, dips — each with a fixed diagnosis.",
            "Keep ~70% of viewers at 0:30; separate packaging mismatch from slow ignition before fixing anything.",
            "Spikes are rewatches — catalog them, front-load them, and clip them into Shorts.",
            "Use absolute retention for surgery and relative retention for context, and always fix timestamps, not numbers."
          ],
          actions: [
            "Open your three most recent videos and record the 0:30 retention percentage for each.",
            "For each, run the first-shot test: does the opening frame visually confirm the thumbnail promise?",
            "Build your spike catalog: every spike across your last ten videos, timestamped, with a one-line cause."
          ],
          quiz: [
            {
              q: "A retention spike at 4:12 most likely means:",
              options: ["Viewers left at that moment", "An ad played there", "Viewers rewound and rewatched that segment — strong evidence of value", "The video buffered"],
              answer: 2,
              why: "Bumps above the surrounding line come from replays or arrivals at a shared moment — audiences voting with the rewind."
            },
            {
              q: "Your first shot visually matches your thumbnail but you still lose 45% of viewers by 0:30. The likely fix is:",
              options: ["Change the thumbnail", "Cut the throat-clearing and reach the first moment of value faster", "Add background music", "Upload at a different time"],
              answer: 1,
              why: "When the promise aligns, a large cliff points to slow ignition — pace, not honesty."
            },
            {
              q: "What is relative retention for?",
              options: ["Second-by-second surgery on your video", "Comparing your hold against similar-length videos to judge structure in context", "Tracking subscriber sources", "Measuring loop rate on Shorts"],
              answer: 1,
              why: "Relative retention benchmarks you against comparable videos so you know whether structure or packaging deserves the work."
            }
          ],
          drill: "Take your steepest mid-video dip from a recent upload, rewatch the 20 seconds before it, and write the exact editing note that would have prevented it — then apply that note to your next script."
        },
        {
          id: "youtube-2-2",
          title: "The First 30 Seconds: Hook, Proof, Roadmap",
          minutes: 9,
          xp: 60,
          skill: "viral",
          intro: "Your intro has one job, and it is not introducing anything. It is converting a click into a commitment — and there is a repeatable structure for doing it.",
          sections: [
            {
              h: "Confirm the Click in Five Seconds",
              body: "The viewer arrives mid-decision, not post-decision. They clicked, but the thumb hovers: was this the right call? Your first five seconds must answer yes — visually, before any words matter.\n\nThe mechanism is **congruence**: the opening frame should look like the thumbnail come to life. Thumbnail shows a rusted engine bay? Open on the rusted engine bay. Title promises 'I tested every $100 microphone'? Open on the wall of microphones. This is why cold opens dominate modern YouTube: they place the viewer inside the promise instantly, no on-ramp.\n\nEverything that delays confirmation is a tax — channel intros, logo stingers, 'hey guys, welcome back,' recaps of your week. None of it is evil; all of it is billed against the 30-second cliff. The professional standard is simple to state: the promise of the package, on screen, in the first breath of the video."
            },
            {
              h: "Four Hook Structures That Survive Contact",
              body: "After confirmation, the hook proper — one of four proven structures:\n\n1. **Result-first.** Show the ending now, withhold the how. 'This engine runs — three weeks ago it was underwater.' The gap between shown outcome and unknown process powers the whole video.\n2. **Stakes statement.** Tell them what is at risk. 'If I mess up this next weld, the whole chassis is scrap.' Stakes convert watching into caring.\n3. **In medias res.** Open in the middle of the most intense moment, then rewind. Borrowed from film cold opens, devastating for vlogs and documentaries.\n4. **The contrarian claim.** 'Everything you have heard about protein timing is backwards.' Instantly divides the audience into people who must see you prove it and people who must see you fail — both stay.\n\nRotate them deliberately. A channel that only uses one hook shape trains its audience to skip it."
            },
            {
              h: "Proof, Then Roadmap",
              body: "A hook makes a claim; the next beats make it credible and navigable.\n\n**Proof (seconds ~10-20):** one fast reason to believe this video will deliver. Flash the evidence — the finished result, the data on screen, the credential in passing ('after editing 400 videos for clients...'), the test rig. One line, not a resume. You are answering the silent question 'why you?' before it hardens into a swipe.\n\n**Roadmap (seconds ~20-30):** one sentence that shapes the ride ahead — 'three fixes, and the third one is the one nobody does.' A roadmap works because attention relaxes when it can predict structure; uncertainty about length and payoff is itself a retention leak.\n\nNotice what the roadmap smuggles in: an **open loop**. 'The third one nobody does' is a debt the video now owes, and viewers stay to collect. Plant one loop in every intro and pay it off late — around the 70% mark — on purpose."
            },
            {
              h: "The Intro Autopsy",
              body: "Turn theory into a checklist you run on every edit before export:\n\n- **0-5s:** Does the first frame visually confirm the thumbnail? Is there motion or change within two seconds — not a static locked-off face?\n- **5-10s:** Is the hook one of the four structures, stated in one sentence, with no hedging words ('basically', 'so today I thought maybe')?\n- **10-20s:** Is there exactly one proof beat? Cut the second one; two proofs read as insecurity.\n- **20-30s:** Does the roadmap open a loop with a specific, late payoff?\n- **Anywhere:** Did 'hey guys', the logo sting, or the subscribe ask sneak in? Cut, cut, and move it to mid-video where it costs nothing.\n\nThen the acid test: watch your intro muted. If a stranger could not guess the video's promise from picture and text alone, rebuild it — most viewers on Browse decide with their thumb on the volume."
            }
          ],
          takeaways: [
            "The first five seconds must visually confirm the thumbnail — congruence beats cleverness.",
            "Rotate four hook structures: result-first, stakes, in medias res, contrarian claim.",
            "Follow the hook with one proof beat and a roadmap that opens a loop paid off near the 70% mark.",
            "Run the intro autopsy on every edit, and test the intro muted before export."
          ],
          actions: [
            "Rewrite your next video's first 30 seconds using the hook-proof-roadmap skeleton before you shoot anything else.",
            "Cut everything before the first moment of value in your current edit — measure how many seconds you saved.",
            "Watch your last intro muted and note whether the promise reads from visuals and text alone."
          ],
          quiz: [
            {
              q: "What is the 'congruence' rule for video openings?",
              options: ["Music must match the genre", "The opening visuals must confirm the thumbnail's promise immediately", "Intros must be under 5 seconds total", "The title must appear on screen"],
              answer: 1,
              why: "Viewers arrive mid-decision; seeing the promised thing on screen confirms the click before doubt wins."
            },
            {
              q: "'This engine runs — three weeks ago it was underwater' is which hook structure?",
              options: ["Contrarian claim", "Stakes statement", "Result-first", "Roadmap"],
              answer: 2,
              why: "It shows the outcome up front and withholds the process, creating the gap the video resolves."
            },
            {
              q: "Where should the loop opened in your roadmap ideally pay off?",
              options: ["Within the first minute", "Around the 70% mark of the video", "In the next video only", "In the pinned comment"],
              answer: 1,
              why: "A late payoff pulls viewers through the mid-video slope where attrition is highest."
            }
          ],
          drill: "Script the same intro three times — once result-first, once with stakes, once in medias res — read each aloud, and shoot the one that sounds most like something you would repeat to a friend."
        },
        {
          id: "youtube-2-3",
          title: "Long-Form Architecture: Loops, Chapters, and Re-Hooks",
          minutes: 10,
          xp: 60,
          skill: "video",
          intro: "Nobody watches 15 minutes because each minute is good. They watch because the structure keeps re-selling the next minute. Structure is not organization — it is a retention device.",
          sections: [
            {
              h: "Structure Is a Retention Device",
              body: "The amateur model of a video is a container: pour in your points, arrange them logically, done. The professional model is a chain of commitments: at every moment, the video is either paying off a promise or making a new one, and any stretch doing neither is a leak.\n\nLogical order and retentive order are frequently different. Logic says background first, then the main event. Retention says main event first, background delivered in fragments only when the viewer needs it to enjoy what comes next. Documentary editors have known this forever — nobody opens with the childhood; they open with the crime.\n\nAudit your outlines with one question per section: what is the viewer waiting for during this part? If the answer is nothing, the section either moves, shrinks, or gains a promise. A video with strong material and weak sequencing loses to a video with average material and ruthless sequencing almost every time."
            },
            {
              h: "Open Loops and Payoff Scheduling",
              body: "An open loop is a question deliberately raised and deliberately left unresolved. The mind holds unfinished business in an active state — advertising and television built empires on this — and on YouTube, loops are your structure's load-bearing beams.\n\nSchedule them like a professional:\n\n- **The spine loop** opens in the intro ('the third fix is the one nobody does') and pays off around 70-80% of runtime — past the slope's steepest stretch.\n- **Segment loops** open at each section start and close within that section, giving continuous small payoffs so the video feels generous, not withholding.\n- **The forward loop** opens near the end and pays off in another video — your bridge to session time.\n\nTwo failure modes to avoid: stacking so many loops the video feels like a carnival barker, and paying everything off by minute six, leaving the back half of the video promise-free. One spine, one loop per segment. That is the whole recipe."
            },
            {
              h: "The Re-Hook Map",
              body: "Attention does not decay evenly — it decays at boundaries. When a segment ends, the viewer's brain asks 'am I done?', and your job is to answer 'absolutely not' before the thumb moves. That answer is a **re-hook**: a one-to-two sentence bridge that sells the next segment like a miniature intro.\n\nWeak transition: 'So that was the engine. Now, the interior.' Re-hook: 'The engine was the easy part — the interior is where this car tried to bankrupt me.' Same information, opposite effect: one closes a door, the other opens a bigger one.\n\nBuild a re-hook map in the script phase: mark every segment boundary — roughly every 60-120 seconds for most formats — and write the bridge sentence for each, deliberately escalating stakes, curiosity, or specificity. In the edit, reinforce each re-hook with a visual state change: new location, punch-in, b-roll burst, graphic. The graph will show you exactly which bridges held and which sagged."
            },
            {
              h: "Chapters and Endings That Feed the Session",
              body: "Two structural tools most creators mishandle: chapters and endings.\n\n**Chapters** feel like an invitation to skip, and for some viewers they are — but they function as a visible roadmap that reduces abandonment ('this is organized, my answer is here'), and a viewer who skips to the section they need and stays is worth more than one who leaves at minute two. Write chapter titles as micro-hooks, not labels: 'The $4,000 mistake' outperforms 'Part 2'.\n\n**Endings:** never announce them. The moment you say 'so, to wrap up' or the music resolves, viewers leave mid-sentence — the graph cliff at every outro proves it. Instead, land your final payoff, then pivot immediately, while energy is still high, into a spoken bridge to a specific next video: 'that fix works — but if your problem is X, the video on screen handles it.' The last impression of your video should be the start of the next one. That is where session time is won."
            }
          ],
          takeaways: [
            "Structure is a chain of commitments — every moment pays off a promise or makes one.",
            "Run one spine loop (paid at ~70-80%), one loop per segment, and a forward loop into the next video.",
            "Write a re-hook bridge at every segment boundary and reinforce it with a visual state change.",
            "Chapters are micro-hooks, and endings should pivot to the next video before the energy drops."
          ],
          actions: [
            "Outline your next video as a loop schedule: spine loop, segment loops, forward loop, with timestamps.",
            "Write the re-hook sentence for every segment boundary before you shoot.",
            "Rewrite your current chapter titles as micro-hooks and re-cut your ending to remove any announced wrap-up."
          ],
          quiz: [
            {
              q: "Where should your intro's spine loop ideally pay off?",
              options: ["Within the first minute", "At 70-80% of runtime, past the steepest slope", "In the pinned comment", "It should never pay off"],
              answer: 1,
              why: "A late spine payoff pulls viewers through the section where attrition is normally worst."
            },
            {
              q: "Which is a re-hook rather than a plain transition?",
              options: ["'So that was part one.'", "'Next up, the interior.'", "'The engine was the easy part — the interior is where this car tried to bankrupt me.'", "'Thanks for watching so far.'"],
              answer: 2,
              why: "A re-hook re-sells the next segment with stakes or curiosity instead of just labeling it."
            },
            {
              q: "Why should you never verbally announce your ending?",
              options: ["It violates YouTube policy", "Viewers leave the moment closure is signaled, killing the bridge to the next video", "Endings must be silent", "It confuses the chapters feature"],
              answer: 1,
              why: "Signaled closure triggers exit; pivoting to the next video while energy is high converts the ending into session time."
            }
          ],
          drill: "Print the outline of your next video and mark it like an editor: circle every moment a promise is opened, box every payoff. Any 90-second stretch with no open circle gets restructured."
        },
        {
          id: "youtube-2-4",
          title: "Scripting for AVD: Write to Be Watched, Not Read",
          minutes: 10,
          xp: 60,
          skill: "video",
          intro: "Most scripts fail because they are written for the eye and performed for the ear. Spoken-word writing is its own discipline — and it is the cheapest AVD upgrade available to you.",
          sections: [
            {
              h: "Write for the Ear",
              body: "The ear processes language differently from the eye. A reader can loop back over a dense sentence; a listener gets one pass, and any sentence that demands a second pass loses them — not dramatically, just a half-second of fog that accumulates into a swipe.\n\nSpoken-word rules:\n\n- **One idea per sentence.** Subordinate clauses are where listeners go to die.\n- **Verbs over abstractions.** 'This bracket snapped' beats 'a structural failure occurred.'\n- **Front-load the subject.** By the time a long wind-up resolves, the listener forgot the setup.\n- **Contractions and rhythm breaks.** Write 'it's', 'don't', 'here's the thing' — the way humans actually talk.\n\nThe non-negotiable test: read every script aloud before recording. Anywhere you stumble, trip, or take a breath mid-sentence, the listener would have too. Rewrite until it flows out of your mouth like conversation. Stumbles in the read are dips on the graph."
            },
            {
              h: "But / Therefore, Never And-Then",
              body: "The creators of South Park have a famous story rule worth stealing whole: if the beats of your story connect with 'and then', it is broken. Beats must connect with '**but**' or '**therefore**'.\n\n'I bought the car, and then I checked the engine, and then I ordered parts' — a list. Lists have no gravity; nothing depends on anything, so nothing pulls the viewer forward.\n\n'I bought the car, **but** the engine was seized, **therefore** I had one week to find a replacement block, **but** the only one in the country was in a junkyard six hours away' — now every beat is caused by the last and causes the next. Causality is tension, and tension is retention.\n\nRun the test on your outline before scripting: write your beats as one-line bullets and read the connectors between them. Every 'and then' is a flat spot on your future retention graph. Restructure until the chain is but-therefore all the way down."
            },
            {
              h: "Line-Level Curiosity",
              body: "Structure creates the big loops; the script creates hundreds of small ones. The technique is **tease-before-reveal** at the sentence level: state that something is coming, make the viewer want it, then deliver.\n\nFlat: 'The repair cost $3,200.' Tensioned: 'The quote came in — and it was almost double what I had budgeted. $3,200.' Same fact; the second version creates a half-second of leaning-in before the number lands.\n\nMore line-level tools: **question-shaped statements** ('so why would a dealership hide this?') that make the viewer's brain generate hypotheses; **numbered anticipation** ('three things went wrong — the third almost ended the project'); and **callbacks** to earlier moments, which reward continuous watching and quietly punish skipping.\n\nDosage matters. Every line tensioned is exhausting, like a movie that is all trailer. Tease the moments that deserve it — roughly one per 30-45 seconds — and let plain, confident sentences carry the rest."
            },
            {
              h: "Word Budgets and the 20% Cut",
              body: "Conversational delivery runs around 150 words per minute; energetic YouTube delivery 160-180. That gives you real math: a 10-minute video is roughly a 1,600-word script. Suddenly 'this video feels long' becomes measurable — you wrote 2,400 words for a 10-minute idea, and the extra 800 are sitting in your retention slope as drag.\n\nUse the budget in both directions. Before writing: decide the target runtime from the idea's actual depth, then set the word count. After writing: **cut 20% by rule.** Not because your writing is bad — because first drafts explain, and explanations are where scripts bloat. The cut list, in order: repeated points ('as I said before'), hedges ('basically', 'sort of', 'I think maybe'), warm-ups at the top of each section, and any sentence restating what the visuals already show.\n\nThe discipline compounds: scripts written to budget get edited faster, pace tighter, and score higher APV — the same content, minus the padding the viewer was never going to forgive."
            }
          ],
          takeaways: [
            "Write for one-pass listening: one idea per sentence, verbs first, and always read aloud before recording.",
            "Connect beats with but/therefore — every 'and then' is a future flat spot on the graph.",
            "Create line-level loops with tease-before-reveal, about one per 30-45 seconds.",
            "Budget ~160 words per minute and cut 20% of every draft by rule."
          ],
          actions: [
            "Take your next script and read it aloud, marking every stumble — rewrite each marked line today.",
            "Write your video's beats as bullets and check every connector: convert each 'and then' to but/therefore.",
            "Count your current draft's words, compute the implied runtime at 160 wpm, and cut 20%."
          ],
          quiz: [
            {
              q: "What does the but/therefore rule diagnose?",
              options: ["Grammar mistakes", "Whether story beats are causally linked or just a list", "Whether your title is clickable", "Audio quality issues"],
              answer: 1,
              why: "But/therefore forces causality between beats; causality creates the tension that holds viewers."
            },
            {
              q: "A 10-minute video at energetic YouTube pace implies a script of roughly:",
              options: ["600 words", "1,600 words", "3,500 words", "5,000 words"],
              answer: 1,
              why: "At 160 words per minute, ten minutes is about 1,600 words — a concrete budget for pacing."
            },
            {
              q: "'The quote came in — almost double my budget. $3,200.' demonstrates:",
              options: ["A roadmap", "Tease-before-reveal at the line level", "A chapter marker", "The and-then problem"],
              answer: 1,
              why: "The sentence delays the payoff a half-beat to create leaning-in before the number lands."
            }
          ],
          drill: "Take one paragraph from your last script and rewrite it three ways: shorter sentences, but/therefore connectors, one tease-before-reveal. Read all four versions aloud and feel the difference."
        },
        {
          id: "youtube-2-5",
          title: "Shorts Retention: Engineering the Loop",
          minutes: 9,
          xp: 60,
          skill: "viral",
          intro: "In the Shorts feed you are not competing for a click — you are competing against a reflex. This lesson covers the swipe test, duration strategy, and the seamless loop that multiplies your numbers.",
          sections: [
            {
              h: "The Swipe Test: Seconds 0-2",
              body: "A Short's fate is mostly decided before a viewer forms a conscious thought. The swipe is a reflex, and reflexes respond to stimuli, not arguments. Your first two seconds need three things simultaneously:\n\n1. **Motion.** A static frame reads as a pause, and a pause invites the swipe. Open on movement — a hand entering frame, a door swinging, a whip-pan landing.\n2. **A text hook.** One line, high contrast, safe from the UI overlays, readable in a single fixation: 'this mistake cost me $4,000.' The text hooks the silent scrollers and doubles your hook bandwidth for everyone else.\n3. **Zero dead frames.** No fade-in, no logo, no breath before the first word. First frame, first syllable, mid-action.\n\nBrutal but useful habit: watch your Short's first two seconds ten times in a row. If you feel the itch to swipe on repetition three, so will strangers on repetition one."
            },
            {
              h: "Duration Strategy: Two Valid Games",
              body: "Shorts retention is scored as a percentage, which makes duration itself a strategic choice — and there are two legitimate games.\n\n**The loop game (under ~35 seconds):** short enough that finishing is easy and rewatching is natural. Retention above 100% — viewers averaging more than one full watch — is the strongest signal this format produces. Best for reveals, transformations, single jokes, and satisfying processes.\n\n**The story game (60-120+ seconds):** harder to hold percentage-wise, but each retained viewer contributes far more watch time, and longer Shorts give you room for actual narrative — which builds more memory of *you*. Best for storytimes, mini-documentaries, and multi-step payoffs.\n\nThe dead zone is the middle: 45 seconds of content with 25 seconds of payoff. Cut it to a tight loop or earn the longer runtime with real structure. Choose the game before you shoot, because the two games are edited completely differently."
            },
            {
              h: "The Seamless Loop",
              body: "The loop is the Short-native technique with no long-form equivalent: constructing the video so its last frame flows invisibly into its first, and the viewer watches 1.5 times before realizing they have looped.\n\nMechanics that work:\n\n- **Action bridge.** End mid-action that the opening completes — the final frame shows a hand reaching for the door; the first frame is the door swinging open.\n- **Sentence bridge.** The last line is the setup for the first line. Ending on 'and that is exactly why...' cutting to the opening 'this mistake cost me $4,000' creates a sentence that eats its own tail.\n- **Audio continuity.** Let the music phrase resolve across the cut point so the ear glides through the seam.\n\nAvoid signaling the ending — no 'follow for more', no outro card, no energy drop. Closure triggers the swipe; the loop depends on the ending being invisible. Design the seam first, then build the middle."
            },
            {
              h: "Pacing: The 1.5-Second Rhythm",
              body: "Shorts pacing runs hotter than long-form. Working rhythm: a visual state change roughly every 1-2 seconds — a cut, a punch-in, a text pop, an angle change, a b-roll insert. Not because viewers are broken, but because the feed has calibrated their sense of pace, and content slower than the ambient rhythm reads as stalled.\n\nCraft notes that keep speed from becoming chaos:\n\n- **Cut on action**, not on pauses — motion across the cut hides the seam and keeps energy continuous.\n- **Escalate density.** Save the fastest cutting for the approach to the payoff, then hold the payoff shot longer. Contrast is what makes the payoff land.\n- **Caption in beats.** On-screen text should appear in 2-4 word chunks synced to the voice, not paragraphs.\n- **One breath.** A single deliberate half-second pause right before the reveal — the pattern interrupt inside the pattern — makes the payoff hit twice as hard.\n\nSpeed is the baseline. Contrast is the craft."
            }
          ],
          takeaways: [
            "Win seconds 0-2 with motion, a one-line text hook, and zero dead frames.",
            "Pick your game before shooting: sub-35-second loops or 60-second-plus stories — the middle is a dead zone.",
            "Build seamless loops with action bridges, sentence bridges, and audio continuity; never signal the ending.",
            "Run a 1-2 second visual change rhythm, cut on action, and use one deliberate pause before the payoff."
          ],
          actions: [
            "Re-cut your best recent Short to remove every dead frame before the first action — target first syllable within 0.5 seconds.",
            "Storyboard one loop Short today where the final frame feeds the first frame.",
            "Watch three Shorts from your feed frame-by-frame and count seconds between visual state changes — calibrate your edit to what you find."
          ],
          quiz: [
            {
              q: "Why is a Short's retention above 100% possible, and what does it indicate?",
              options: ["An analytics glitch", "Viewers are rewatching — the loop is working, one of the strongest Shorts signals", "It was watched on desktop", "The Short was over 3 minutes"],
              answer: 1,
              why: "Percentage retention counts rewatches, so a looping Short can average more than one full view per viewer."
            },
            {
              q: "What is the 'dead zone' in Shorts duration strategy?",
              options: ["Under 10 seconds", "A mid-length Short whose content does not justify its runtime — too long to loop, too thin to be a story", "Anything over 60 seconds", "Posting between midnight and 6am"],
              answer: 1,
              why: "The two winning games are tight loops and earned stories; padded middles lose both games at once."
            },
            {
              q: "Which technique makes a loop seam invisible?",
              options: ["A fade to black at the end", "An outro card saying 'follow for more'", "Ending mid-action that the opening frame completes", "Lowering the music at the end"],
              answer: 2,
              why: "An action bridge carries motion across the seam so the viewer glides into a rewatch without noticing."
            }
          ],
          drill: "Take one existing Short and re-edit only its final two seconds to create a sentence bridge or action bridge back to its opening. Repost and compare average percentage viewed against the original."
        },
        {
          id: "youtube-2-6",
          title: "Editing for Retention: The Cut List",
          minutes: 10,
          xp: 60,
          skill: "editing",
          intro: "The script earns attention; the edit defends it. This is the working checklist of cuts and interrupts that professional YouTube editors run on every timeline.",
          sections: [
            {
              h: "Invisible Cuts: On Action, and the J-Cut",
              body: "The best edits are the ones nobody notices, and two classical techniques do most of that work.\n\n**Cut on action:** make the cut during movement — a hand reaching, a head turning, a car passing — not during stillness. The viewer's eye tracks the motion across the cut, and the seam disappears. Cutting on stillness makes every edit a visible little jolt, and a hundred jolts add up to fatigue.\n\n**The J-cut:** let the audio of the next scene begin before its picture arrives. You hear the engine start while still looking at the workshop; then the picture catches up. The sound acts as a promise, the picture as the payoff — a half-second open loop, dozens of times per video. Its mirror, the L-cut, lets audio linger after the picture changes, smoothing exits.\n\nDialogue-heavy videos live and die on J-cuts. Straight cuts between talking segments feel like slideshow slides; J-cuts feel like one continuous thought."
            },
            {
              h: "Kill Dead Air — Then Add Silence Back On Purpose",
              body: "Pass one on any talking-head timeline is the dead-air pass: strip the gaps between sentences, the breaths before thoughts, the 'um' ramps, the false starts. Editors doing this aggressively will remove 10-20% of raw runtime without losing a single word of content, and the perceived energy of the speaker jumps a full level.\n\nBut do not confuse dead air with silence. Dead air is accidental emptiness; silence is a placed instrument. A three-quarter-second hold *before* the key number lands makes the number twice as loud. A beat of quiet after a genuinely surprising statement gives the audience room to react — remove it and the surprise never registers.\n\nThe working rule: cut every pause the speaker did not mean, then reinsert two or three pauses per video exactly where the script's biggest payoffs land. Silence you chose is emphasis. Silence you left is leakage."
            },
            {
              h: "Pattern Interrupts, Motivated",
              body: "Attention habituates: any sustained visual state — same framing, same voice, same energy — becomes wallpaper within 20-40 seconds. The **pattern interrupt** resets the clock: a punch-in, an angle swap, a b-roll insert, an on-screen graphic, a sound cue, a music change.\n\nThe amateur mistake is random interrupts — zooms sprinkled everywhere like seasoning, which fatigue the audience even faster. The professional rule is that interrupts must be **motivated**: the punch-in lands on the key phrase, the b-roll shows the thing just mentioned, the music drops out because what comes next deserves the sudden quiet. Motivation makes interrupts feel like emphasis; randomness makes them feel like noise.\n\nAudit rhythm, not just presence: scrub your timeline and check that no unbroken 30-40 second stretch of a single visual state survives — then check the opposite, that no stretch is so busy the payoff moments have no contrast left to spend."
            },
            {
              h: "The Energy Pass",
              body: "The last pass before export is not for errors — it is for energy. Watch the entire video at normal speed, phone in hand, as a viewer, and ask one question continuously: *where would I swipe?*\n\nMark every moment your own attention flickered — you know the material, so any dip you feel will be triple for a stranger. Common finds: a setup running two sentences too long, a mid-video lull where two segments both start slow back-to-back, an ending that decays instead of pivots.\n\nThen fix with the editor's escalation ladder, cheapest first: **tighten** (cut frames, remove a sentence), **energize** (add music shift, punch-in, sound cue), **restructure** (move a strong moment earlier), **delete** (the section nobody will miss). Most flickers die at 'tighten'.\n\nDo the pass the day after the edit if you can. Fresh eyes find the leaks that timeline-blindness hides — the graph will only confirm what this pass should have already caught."
            }
          ],
          takeaways: [
            "Cut on action and use J-cuts so edits vanish and audio leads picture like a promise.",
            "Strip all accidental dead air, then reinsert two or three chosen silences at the biggest payoffs.",
            "Pattern interrupts reset habituation but must be motivated by content, roughly every 20-40 seconds.",
            "Finish every edit with an energy pass: watch as a viewer, mark every flicker, fix with tighten → energize → restructure → delete."
          ],
          actions: [
            "Open your current edit and convert five straight cuts between talking segments into J-cuts.",
            "Run a dead-air pass on one timeline and note the percentage of runtime removed.",
            "Do the energy pass on your next video the day after editing, phone in hand, and log every flicker with a timestamp."
          ],
          quiz: [
            {
              q: "What is a J-cut?",
              options: ["A jump cut between two takes", "Audio from the next scene starting before its picture appears", "A cut timed to the music beat", "Deleting the first frame of a clip"],
              answer: 1,
              why: "Leading with the next scene's sound creates a micro open loop and smooths the transition."
            },
            {
              q: "Why must pattern interrupts be motivated rather than random?",
              options: ["Random interrupts violate copyright", "Motivated interrupts read as emphasis; random ones read as noise and fatigue viewers faster", "Motivation increases export quality", "Interrupts are only allowed in Shorts"],
              answer: 1,
              why: "An interrupt tied to content directs attention; an arbitrary one just spends the audience's tolerance."
            },
            {
              q: "In the energy pass, what is the cheapest first fix for a flat moment?",
              options: ["Delete the whole section", "Reshoot the scene", "Tighten — cut frames or remove a sentence", "Add a new music track"],
              answer: 2,
              why: "Most energy dips resolve with small trims; escalate to bigger interventions only when tightening fails."
            }
          ],
          drill: "Take 60 seconds of your rawest talking footage and edit it twice: once with straight cuts, once with cut-on-action, J-cuts, and a dead-air pass. Play both for someone and ask which speaker seems sharper."
        }
      ]
    },
    {
      id: "youtube-3",
      level: "Advanced",
      title: "Packaging Science",
      description: "Thumbnails, titles, and idea selection as one discipline: the psychology of the click, testing beyond gut feel, and designing for the surface each video will actually live on.",
      lessons: [
        // __APPEND__
      ]
    }
  ]
});
