window.SMU_DATA = window.SMU_DATA || { schools: [] };
SMU_DATA.schools.push({
  id: "strategy",
  order: 1,
  name: "Social Media Strategy",
  tagline: "Think like a strategist, grow like a machine",
  icon: "🧭",
  hue: 42,
  description: "The operating system underneath every big account: how ranking systems actually distribute content, how to position a brand people remember, and how to build growth loops that compound instead of posting and praying. For anyone who wants their content to be a system, not a slot machine.",
  courses: [
    {
      id: "strategy-1",
      level: "Beginner",
      title: "Foundations of Attention",
      description: "How platforms actually decide who sees your content, and the pillar, cadence, and analytics foundations every serious account is built on.",
      lessons: [
        {
          id: "strategy-1-1",
          title: "How the Algorithm Actually Ranks You",
          minutes: 9,
          xp: 50,
          skill: "strategy",
          intro: "Every feed is an auction you enter blind. This lesson shows you what the platforms are actually bidding on — so you stop guessing and start engineering.",
          sections: [
            {
              h: "There Is No Single Algorithm",
              body: "Retire the idea of one mysterious algorithm deciding your fate. Every major platform runs a recommendation system: a prediction engine that estimates, for each individual viewer, the probability they will watch, rewatch, like, comment, share, save, or follow if shown your post. Your content is scored per person, per scroll session, in real time.\n\nThat has one enormous consequence: nobody is suppressing you. There is no punishment list for using a certain word or posting at 9:07 instead of 9:00. There are only predictions, and predictions are built from behavior — how people responded to your last posts, and how viewers like them responded to posts like yours.\n\nStop asking 'why is the algorithm hiding me?' Ask the real question: 'what behavioral evidence have I given the system that people want more of this?' Everything else in this school flows from that reframe."
            },
            {
              h: "Retrieval, Then Ranking: The Two-Step",
              body: "Distribution happens in two stages, and each demands something different from you.\n\n**Stage one: retrieval.** From millions of posts, the system pulls a few hundred candidates for a given viewer based on topic match, watch history, relationships, and recency. To survive this stage you must be classifiable — the machine has to know what your post is about and who it is for.\n\n**Stage two: ranking.** Those candidates get scored on predicted engagement, and only the top handful win a slot in the session. Here you are not competing with the entire internet — you are competing with the eight to twelve other posts retrieved for that same viewer, right now.\n\nYour job splits the same way. Get retrieved: clear keywords in your caption, on-screen text, and spoken audio (platforms transcribe you). Win the rank: content that out-earns its rivals on watch time and interaction."
            },
            {
              h: "The Signal Hierarchy",
              body: "Signals are not equal. For short-form video, the rough weight order looks like this:\n\n- **Completion and rewatch** — the heaviest signals. A loop counts double.\n- **Shares and saves** — private endorsements; someone spent social capital or bookmarked you for later.\n- **Comments** — especially long ones and reply chains, which signal conversation, not just reaction.\n- **Follows from this post** — proof your content converts strangers into audience.\n- **Likes** — the lightest positive signal; cheap to give, so worth little.\n\nNegative signals cost you: the sub-one-second swipe, 'not interested' taps, hides, and reports. A three-second skip on a thirty-second video reads as 10% retention — that single behavior tells the system more than a hundred likes."
            },
            {
              h: "Engineer for the Scoreboard",
              body: "Translate the hierarchy into craft decisions. Each post should be engineered to earn one primary signal on purpose:\n\n- **Retention:** open with a pattern interrupt in the first three seconds, then structure the piece so the payoff lands late.\n- **Shares:** make something a viewer can send with the message 'this is so you' — identity content travels.\n- **Saves:** pack reference density — steps, numbers, checklists people will need again.\n- **Comments:** leave one deliberate open loop or a take people will complete or correct.\n- **Follows:** end on a serialized promise that only makes sense if they stick around.\n\nOne more thing: the system re-tests. Old posts resurface when a topic spikes or search demand grows. Nothing you publish is ever fully dead — which is exactly why quality compounds and spam decays."
            }
          ],
          takeaways: [
            "Feeds rank per-viewer predicted behavior — there is no reward list, only behavioral evidence.",
            "Distribution is retrieval (be classifiable) then ranking (win predicted engagement).",
            "Completion, shares, and saves outweigh likes; fast swipes actively cost you.",
            "Design every post to earn one primary signal on purpose, not all of them by accident."
          ],
          actions: [
            "Rewatch your last 5 posts and name, for each, the single signal it was engineered to earn. If you can't name one, you found the problem.",
            "On your next post, put your core topic in all three channels the system reads: spoken audio, on-screen text, and caption.",
            "Write one open loop into your next caption that a viewer would want to answer in the comments."
          ],
          quiz: [
            {
              q: "What does the ranking system actually score when deciding whether to show your post to a specific viewer?",
              options: ["Your follower count and account age", "The predicted probability that this viewer will engage — watch, share, comment, follow", "How many hashtags you used", "Whether you posted at a peak hour"],
              answer: 1,
              why: "Modern feeds rank per-viewer predicted engagement, not account-level status."
            },
            {
              q: "Which pair of signals generally carries the most ranking weight for short-form video?",
              options: ["Likes and hashtag reach", "Completion/rewatch and shares", "Posting time and caption length", "Filters and effects used"],
              answer: 1,
              why: "Watch-through and shares are expensive behaviors, so the system trusts them most."
            },
            {
              q: "A viewer swipes away in under one second. To the system, that is:",
              options: ["Neutral — only positive actions count", "A strong negative signal that lowers predicted engagement for similar viewers", "A cue to show the post to more people", "Impossible to measure"],
              answer: 1,
              why: "Fast skips are recorded and drag down the prediction for every similar viewer that follows."
            }
          ],
          drill: "Pick one post from a creator you admire and reverse-engineer it: write one sentence each on how it earns retention, shares, and comments. Steal the mechanism, not the topic."
        },
        {
          id: "strategy-1-2",
          title: "Interest Graphs: Why Followers No Longer Decide Reach",
          minutes: 8,
          xp: 50,
          skill: "strategy",
          intro: "TikTok proved a nobody can outperform a celebrity on any given day. Understanding exactly why is the difference between renting reach and earning it.",
          sections: [
            {
              h: "Social Graph vs. Interest Graph",
              body: "The old feed was a social graph: you saw content from accounts you followed, so reach was capped by audience size. Growth meant slowly accumulating permission.\n\nThe modern feed is an interest graph: content is matched to what each viewer has demonstrated they care about, regardless of who they follow. The unit of distribution moved from the account to the individual post. Every post you publish cold-auditions in front of people who have never heard of you.\n\nThis explains the two things that confuse beginners most. A 400-follower account can hit a million views, because the post earned its way up the interest graph. And a 500k-follower account can flop repeatedly, because followers are no longer the delivery mechanism — they are a byproduct of posts that performed. Follower count became a lagging indicator, not a lever."
            },
            {
              h: "How the System Learns What You're About",
              body: "For the interest graph to route your content, it must first classify it. The system builds a topic fingerprint of your account from every scrap of machine-readable data: transcribed speech, on-screen text pulled by OCR, caption keywords, the sound you used, objects it recognizes in frame, who engages with you, and what else those people watch.\n\nPost about cars Monday, crypto Wednesday, and your breakfast Friday, and that fingerprint turns to mush. Retrieval suffers — the machine cannot confidently put you in front of anyone, so it tests you on random audiences who bounce, which poisons the next prediction.\n\nNiche consistency is not an aesthetic preference. It is machine legibility. Feed the classifier clean data: say your topic out loud, write it on screen, repeat your core vocabulary across posts. You are training a model whether you mean to or not."
            },
            {
              h: "Followers Still Matter — as a Velocity Seed",
              body: "None of this makes followers worthless. It changes their job. Your followers are the warm slice of every test pool: when a post goes live, a portion of its first impressions go to people who already opted in. If they watch and engage hard, early velocity looks strong and the system promotes the post into wider interest-matched pools.\n\nThis is why follower quality beats follower quantity. Ten thousand followers acquired from an off-topic viral fluke will ignore your core content, drag your seed-test scores down, and make every future post start from a deficit. A thousand followers who watch everything are a launchpad.\n\nTreat followers as an outcome of great distribution and a multiplier on it — never as the mechanism itself. Chase watchers, and the follower count takes care of itself."
            },
            {
              h: "Playing the Interest Graph on Purpose",
              body: "Three deliberate moves put the interest graph to work for you:\n\n1. **Commit to a topic cluster for 60-90 days.** Fingerprints sharpen with repetition. Pick your lane before you get clever about swerving out of it.\n2. **Use searchable, spoken keywords.** Phrase your hooks the way your audience actually types and talks — 'how to negotiate a car deal' beats 'let's talk savings.' This is the heart of platform SEO.\n3. **Audit who you attract.** Check which posts drive follows and whether those people engage with the rest of your library. Reach from a bad-fit audience is worse than no reach — it teaches the system to route you to people who will keep bouncing.\n\nPrune content that grows the wrong crowd, even when the numbers flatter you."
            }
          ],
          takeaways: [
            "Distribution moved from the account to the post — every upload cold-auditions to strangers.",
            "The system classifies you from speech, on-screen text, captions, and audience behavior; consistency is machine legibility.",
            "Followers are a velocity seed and a multiplier, not the delivery mechanism.",
            "Reach from the wrong audience poisons future predictions — prune it."
          ],
          actions: [
            "Write your topic cluster as one sentence and check your last 10 posts against it. Count the strays.",
            "Rewrite your next hook using the exact phrase your audience would type into search.",
            "Identify your single best-fit post — high follows, high repeat engagement — and plan two more in the same territory this week."
          ],
          quiz: [
            {
              q: "In an interest-graph feed, what is the primary unit of distribution?",
              options: ["The account", "The individual post", "The hashtag", "The posting schedule"],
              answer: 1,
              why: "Each post is evaluated and routed on its own merits, independent of account size."
            },
            {
              q: "Why does posting across unrelated topics hurt your reach?",
              options: ["Platforms fine accounts for topic changes", "It blurs your topic fingerprint, so retrieval can't confidently match you to any audience", "Followers report inconsistent accounts", "It resets your follower count"],
              answer: 1,
              why: "A mushy classification means the system tests you on random audiences who bounce, degrading every future prediction."
            },
            {
              q: "What is the main modern job of your existing followers?",
              options: ["They guarantee a minimum view count", "They act as the warm seed audience whose early engagement drives velocity into wider pools", "They determine which hashtags work", "They have no effect at all"],
              answer: 1,
              why: "Strong early engagement from followers signals the system to promote the post to interest-matched non-followers."
            }
          ],
          drill: "Open your platform's search bar and type your niche's core problem. Write down 5 autocomplete phrases — those are pre-validated hooks for your next posts."
        },
        {
          id: "strategy-1-3",
          title: "Content Pillars: Three Lanes, One Destination",
          minutes: 8,
          xp: 50,
          skill: "strategy",
          intro: "Accounts that grow are boringly repetitive from the inside and unmistakably clear from the outside. Pillars are how you engineer that clarity without running out of ideas.",
          sections: [
            {
              h: "What a Pillar Actually Is",
              body: "A content pillar is not a topic list. It is a repeatable content territory — the intersection of a problem your audience has, proof you can speak to it, and a promise you are willing to make over and over.\n\nA pillar makes two promises simultaneously. To your audience: 'follow me and you will reliably get this.' To the classifier: 'this account is about this — route accordingly.' Both promises reward repetition and punish drift.\n\nThe test of a real pillar is volume: can you produce fifty distinct pieces inside it without straining? 'Luxury cars' passes. 'My trip to Monaco' does not — that is a post, not a pillar. Beginners fail here by defining pillars either so wide they mean nothing ('lifestyle') or so narrow they exhaust in a month. Aim for a territory you could talk about for a year and still have a backlog."
            },
            {
              h: "The Three-Pillar Model",
              body: "Three pillars, three jobs:\n\n- **The growth pillar** — broad-appeal, high-demand content built to travel: shareable, hook-forward, understandable by a stranger in three seconds. This is how new people find you.\n- **The authority pillar** — depth, process, and proof. Breakdowns, results, how-you-actually-do-it content. This is why people trust you, and later, why they buy.\n- **The connection pillar** — personality, story, opinion, behind-the-scenes. This is why people stay and why parasocial loyalty forms.\n\nRun them at roughly a 60/30/10 ratio: 60% growth, 30% authority, 10% connection. Beginners invert this — all personality, no demand — and wonder why strangers scroll past. Growth content earns the audience; authority content earns the trust; connection content earns the loyalty. You need all three, in that proportion."
            },
            {
              h: "Choosing Yours",
              body: "Run every candidate pillar through three filters:\n\n1. **The 50-piece test.** Can you list twenty ideas in ten minutes? If yes, fifty exist.\n2. **The demand test.** Is anyone searching for this? Are other creators growing with it? Zero competition usually means zero demand, not open territory.\n3. **The difference test.** Can you say something about it that the top five accounts in the niche are not already saying — a contrarian angle, rarer proof, a sharper audience?\n\nExamples of the model in the wild: a real-estate agent runs 'what your money buys here' (growth), 'anatomy of a deal' (authority), 'life as an agent' (connection). A fitness coach runs 'training myths' (growth), 'client transformations explained' (authority), 'my own program diary' (connection). Same skeleton, any niche."
            },
            {
              h: "Pillars in Practice",
              body: "Pillars only matter if they run your calendar. Assign every planned post to exactly one pillar before you make it — if it fits none, it does not get made. That single rule kills most content drift.\n\nThen build recurring segments inside each pillar: a named, repeatable format like 'Deal of the Week' or '60-Second Teardown.' Segments compress decision fatigue, train the audience to expect and return, and give the classifier a clean repeating pattern.\n\nHold the structure for 90 days before judging it. Then review: which pillar drives follows? Which drives saves and shares? Rebalance the ratio toward what the data rewards — but change the ratio, not the pillars themselves, unless a pillar has clearly failed all three filters. Strategy is choosing lanes and staying in them long enough for compounding to notice."
            }
          ],
          takeaways: [
            "A pillar is a repeatable territory: audience problem × your proof × a promise you'll keep making.",
            "Run growth, authority, and connection pillars at roughly 60/30/10.",
            "Test pillars for volume, demand, and difference before committing.",
            "Assign every post to one pillar; if it fits none, don't make it."
          ],
          actions: [
            "Write your three pillars as one-line promises to your audience.",
            "List 20 ideas per pillar in one sitting; any pillar that stalls before 20 gets replaced.",
            "Design one named recurring segment for your growth pillar and schedule its first episode."
          ],
          quiz: [
            {
              q: "What is the recommended starting ratio across growth, authority, and connection pillars?",
              options: ["10/30/60", "33/33/33", "60/30/10", "90/5/5"],
              answer: 2,
              why: "Growth content earns strangers first; authority builds trust; connection retains — 60/30/10 reflects those jobs."
            },
            {
              q: "A candidate pillar has zero other creators covering it and no search interest. The most likely conclusion is:",
              options: ["You found an untapped goldmine", "There is probably no demand for it", "The platform is hiding that topic", "It will work if you post daily"],
              answer: 1,
              why: "Empty territory usually signals absent demand, not absent competition."
            },
            {
              q: "What is the main strategic job of the authority pillar?",
              options: ["Reaching the widest possible audience", "Building trust through depth, process, and proof", "Showing your personality", "Filling the calendar on slow weeks"],
              answer: 1,
              why: "Authority content is why people trust you — and later, why they buy."
            }
          ],
          drill: "Take your niche and write the three-pillar skeleton for two other niches (e.g. fitness and real estate). Seeing the pattern outside your own lane makes your own pillars obvious."
        },
        {
          id: "strategy-1-4",
          title: "Cadence: The Minimum Effective Dose",
          minutes: 8,
          xp: 50,
          skill: "strategy",
          intro: "Most accounts don't die from bad content. They die from three great weeks followed by silence. Cadence is the strategy decision that makes every other one possible.",
          sections: [
            {
              h: "Consistency Beats Intensity",
              body: "Consistency wins for two separate reasons, and you need both.\n\nThe machine reason: recommendation systems need data to classify and route you. A steady stream of posts gives the classifier fresh evidence, keeps your seed audience warm, and produces enough samples for you to learn from. Ten posts in one week then nothing for three gives it noise.\n\nThe human reason: audiences form habits around reliable sources. Show up every Monday, Wednesday, and Friday for two months and viewers begin to expect you — expectation is the raw material of return viewership, and return viewership is what turns a viewer into a fan.\n\nThe standard commitment in this school is 90 days. Not because day 91 is magic, but because that is roughly how long it takes to gather real data, build early habits, and get through the phase where nothing seems to work."
            },
            {
              h: "The Volume Myth",
              body: "You have heard the advice: post three times a day, volume is everything. Half true, and the wrong half will burn you down.\n\nWhat actually works is quality-adjusted volume. More reps help only when each rep clears your quality floor and you review the results. Ten mediocre posts teach the system your content is skippable — and negative evidence compounds exactly like positive evidence does. One hundred posts made without ever reading the analytics is not practice; it is repetition of untested habits.\n\nVolume is a multiplier on a working process, not a substitute for one. The honest sequence is: find a cadence you can sustain, hold quality at that cadence, review weekly, and only then add volume. Scale what works. Never scale a guess."
            },
            {
              h: "Pick a Cadence You Can Keep on Your Worst Week",
              body: "The right cadence is not the one you can hit during an inspired week. It is the one you can hit during a sick, busy, discouraged week — because you will have plenty of those in 90 days.\n\nFor short-form, the reliable baseline is 3-5 posts per week. Below three, feedback arrives too slowly to learn from. Above five, most solo creators quietly trade quality for quota.\n\nUse a slot system: fixed publishing days — say Monday, Wednesday, Friday — treated like broadcast television. Slots convert the fuzzy goal 'post more' into a binary one: the slot was filled or it wasn't. Track your hit rate. After four consecutive weeks at 100%, you have earned the right to add a slot. Miss two weeks, drop one. The system self-corrects; your motivation doesn't have to."
            },
            {
              h: "Batching: The Cadence Cheat Code",
              body: "Creators who film, edit, and post the same day are gambling their cadence on their daily mood. Batching removes the gamble by separating the modes of work:\n\n1. **Ideate and script** in one sitting — pull from your idea bank, write hooks first.\n2. **Shoot in batches** — one two-hour session in the same setup can produce a full week of posts; changing a shirt between takes buys visual variety for free.\n3. **Edit in a block**, while decisions from the shoot are still warm.\n4. **Schedule everything**, captions included.\n\nThe goal is a standing buffer of five ready-to-publish posts. The buffer is what separates a system from a streak: streaks break the first bad week, systems absorb it. Protect the buffer like a professional obligation — because that is exactly what it is."
            }
          ],
          takeaways: [
            "Consistency feeds the classifier and builds audience habit — commit to 90 days.",
            "Volume only works quality-adjusted; never scale an unreviewed process.",
            "Choose the cadence you can sustain on your worst week, then run it as fixed slots.",
            "Batch production and keep a five-post buffer — systems absorb bad weeks, streaks don't."
          ],
          actions: [
            "Pick your slots now — specific days, specific count — and write them where you plan your week.",
            "Block one two-hour batch shoot this week and script every post before the camera turns on.",
            "Count your current buffer. If it's under five posts, building it is this week's priority."
          ],
          quiz: [
            {
              q: "What is the strongest argument for consistent posting cadence?",
              options: ["Platforms pay bonuses for streaks", "It feeds the classifier steady data and builds audience viewing habits", "It guarantees each post more views than the last", "It lets you skip analytics"],
              answer: 1,
              why: "Cadence compounds on both sides: machine classification and human habit."
            },
            {
              q: "When does raw posting volume actually help growth?",
              options: ["Always — more is more", "Only when each post clears your quality floor and results are reviewed", "Only on weekends", "Only after 100k followers"],
              answer: 1,
              why: "Volume multiplies a working process; unreviewed mediocre volume just compounds negative evidence."
            },
            {
              q: "You hit all your slots for four straight weeks. What does the slot system say to do?",
              options: ["Take a month off as a reward", "Delete underperforming posts", "You've earned the right to add one slot", "Double your posting immediately"],
              answer: 2,
              why: "Cadence scales one earned slot at a time, keeping quality and sustainability intact."
            }
          ],
          drill: "Design your worst-week protocol: write down the absolute minimum viable post you could make in 30 minutes (format, setup, topic source), so a bad week bends your system instead of breaking it."
        },
        {
          id: "strategy-1-5",
          title: "Your First Analytics: Five Numbers That Matter",
          minutes: 8,
          xp: 50,
          skill: "analytics",
          intro: "Views feel good and teach you nothing. Five less glamorous numbers explain almost everything about why an account grows or stalls — and they take twenty minutes a week to read.",
          sections: [
            {
              h: "Ignore the Scoreboard, Watch the Inputs",
              body: "Views, likes, and follower count are scoreboard numbers: outcomes you cannot directly control, arriving too late to act on. Staring at them produces mood swings, not decisions.\n\nInput metrics are different — they describe behaviors you can influence with your next post. Did strangers see it? Did they keep watching? Did anyone bookmark it, send it, or decide to follow? Each of those maps to a specific craft lever: hook, structure, usefulness, positioning.\n\nThe discipline of early-stage analytics is refusing the scoreboard's emotional pull and reading the inputs instead. A post with 900 views and 12 follows is a better post than one with 40,000 views and 9 follows — it converted attention into audience at forty times the rate. If you only watch views, you will chase exactly the wrong content."
            },
            {
              h: "The Five",
              body: "Log these per post:\n\n- **Non-follower reach %** — what share of viewers were strangers. This measures whether the interest graph is distributing you beyond your bubble.\n- **Average watch percentage** — how much of the video a typical viewer consumed. This is your hook and structure grade.\n- **Saves + shares per 1,000 reached** — the value-density score. People save reference and share identity.\n- **Follows per 1,000 reached** — the conversion score. Reach means nothing if nobody stays.\n- **Profile visits** — the curiosity score; the bridge between a good post and a follow.\n\nNormalize everything per 1,000 reached. Raw counts just re-measure reach; rates measure quality. A post reaching 2,000 people at 8 follows per thousand beats a post reaching 50,000 at 0.5 — and tells you what to make next."
            },
            {
              h: "The Weekly Reading Ritual",
              body: "Twenty minutes, same time every week — Friday afternoon works. The ritual:\n\n1. Open each post from the week and log the five numbers in a simple sheet, one row per post.\n2. Compare each number to your rolling median across the last 30 days — not to your best-ever post. Best-ever comparisons make everything look like failure; medians show real movement.\n3. Write one sentence per post: what probably explains this result?\n4. Write one sentence for the week: what will I do differently next week because of this?\n\nThat final sentence is the entire point. Analytics that don't change next week's content are entertainment. Keep the ritual small enough that you never skip it — a sparse log kept for a year beats a beautiful dashboard abandoned in March."
            },
            {
              h: "Baselines Before Goals",
              body: "You cannot set intelligent targets without knowing your starting point, so your first 30 days of logging have one job: establish baselines. No judging, no pivoting, no despair — just data collection across at least 12-15 posts.\n\nThen set improvement targets as percentages over your own baseline: 'raise average watch percentage from 34% to 40% this month' is a real goal with a real lever (tighter hooks, shorter setups). 'Get 10k followers' is a wish with no lever attached.\n\nBaselines also protect you from borrowed expectations. Comparing your week-six retention to a creator three years in is like comparing your first deadlift to a competition lift — irrelevant and demoralizing. The only account you are competing with this quarter is your own account last month. Beat that one repeatedly and the rest follows."
            }
          ],
          takeaways: [
            "Read input metrics you can act on, not scoreboard numbers you can't.",
            "The five: non-follower reach %, average watch %, saves+shares/1k, follows/1k, profile visits.",
            "Normalize per 1,000 reached — rates measure quality, raw counts just re-measure reach.",
            "Spend 30 days building baselines, then set percentage targets against your own median."
          ],
          actions: [
            "Create a log sheet today with columns for the five numbers plus date, format, and pillar.",
            "Backfill your last 10 posts and compute your current medians — that's your baseline.",
            "Book a recurring 20-minute weekly analytics slot in your calendar."
          ],
          quiz: [
            {
              q: "Why normalize saves, shares, and follows per 1,000 reached?",
              options: ["Platforms require it", "Rates measure content quality independent of reach; raw counts just re-measure reach", "It makes numbers bigger", "It hides bad posts"],
              answer: 1,
              why: "Per-1,000 rates let you compare a 2k-reach post and a 50k-reach post on equal footing."
            },
            {
              q: "Post A: 40,000 views, 9 follows. Post B: 900 views, 12 follows. Which is the better strategic signal?",
              options: ["Post A — more reach always wins", "Post B — it converted attention to audience at a far higher rate", "Neither, both flopped", "Impossible to compare"],
              answer: 1,
              why: "Follows per reach measures whether content builds an audience, which is the actual goal."
            },
            {
              q: "What should your first 30 days of analytics logging produce?",
              options: ["A viral post", "Baselines from your own data to set percentage targets against", "A decision to switch niches", "A follower goal"],
              answer: 1,
              why: "Baselines turn analytics from mood-reading into measurable improvement targets."
            }
          ],
          drill: "Find your best and worst post from the last month by follows per 1,000 reached — not by views — and write three sentences on what the winner did that the loser didn't."
        },
        {
          id: "strategy-1-6",
          title: "The First 1,000: Audience Building by Hand",
          minutes: 9,
          xp: 50,
          skill: "strategy",
          intro: "Nobody wants to hear it, but the first thousand followers are mostly built by hand, not by virality. Here is the unglamorous, unreasonably effective playbook.",
          sections: [
            {
              h: "The Cold-Start Truth",
              body: "Startup founders know the phrase 'do things that don't scale.' It applies perfectly to your first thousand followers. At zero, you have no seed audience to give posts early velocity, no social proof to convert profile visitors, and no data to learn from. Waiting for the algorithm to save you is not a strategy — it is a lottery ticket.\n\nThe cold-start phase is won with manual, unscalable actions: showing up in other people's comment sections, treating every early follower like a VIP, and converting individual conversations into loyalty. This feels slow. It is actually fast — because these thousand hand-built followers become the warm test pool that powers every post afterward.\n\nA thousand followers who know you beats ten thousand who scrolled past once. You are not collecting numbers. You are recruiting the founding members of an audience."
            },
            {
              h: "The Daily 30-Minute Circuit",
              body: "Run this circuit daily during the cold start:\n\n1. **Minutes 0-10: comment on adjacent accounts.** Pick five accounts your future audience already follows — larger than you, same niche. Leave genuinely additive comments: a sharper example, a respectful counterpoint, a useful addition. You are performing expertise in front of borrowed audiences. Early, specific comments on fresh posts get seen most.\n2. **Minutes 10-20: reply to every comment on your own posts** — and end each reply with a question. Reply chains multiply comment counts and teach the system your posts start conversations.\n3. **Minutes 20-30: welcome new followers by DM.** One genuine line — what brought them, what they're working on. No pitch, no link. This is where followers become fans.\n\nThirty minutes. Every day. It compounds faster than any hack you will find."
            },
            {
              h: "Your Profile Is a Landing Page",
              body: "Every strong post generates profile visits — curiosity about the person behind it. The profile's only job is converting that curiosity into a follow, and most profiles fail in the first two seconds.\n\nThe bio formula: **who you help + the outcome + one line of proof.** 'Helping first-time founders get their first 100 customers — bootstrapped 2 companies to 7 figures' converts. 'Dreamer | Coffee lover | DM for collabs' does not. Write it for a stranger deciding in two seconds, not for people who already know you.\n\nPin your conversion trilogy: your best growth post (proves you're worth following), your best authority post (proves you know your subject), your best story post (proves you're a human worth rooting for). Then check visual coherence — covers and recent posts should look like one show, not a garage sale."
            },
            {
              h: "Borrow Audiences",
              body: "The fastest way to reach people at zero is standing in front of audiences that already exist:\n\n- **Collaborations** with creators at your level — collab posts, joint lives, guest spots. Same size means aligned incentives; both sides win.\n- **Stitches, duets, and reply formats** — respond to a bigger creator's take with a genuine addition or counterpoint. Platforms route these to the original audience, which is exactly who you want auditioning you.\n- **Become your niche's best commenter.** Consistently excellent comments under big accounts get profile taps in surprising numbers — it is the lowest-cost borrowed reach that exists.\n\nOne rule governs all of it: add value in proportion to the audience you're borrowing. A lazy 'great post!' earns nothing. A comment that improves the post earns clicks. Borrowed audiences are auditions — treat every appearance like one."
            }
          ],
          takeaways: [
            "The first 1,000 followers are built with unscalable manual work, not virality.",
            "Run the daily circuit: additive comments on adjacent accounts, reply-with-a-question, welcome DMs.",
            "Your bio must convert a stranger in two seconds: who you help + outcome + proof.",
            "Borrowed audiences — collabs, stitches, elite commenting — are auditions; add real value."
          ],
          actions: [
            "Rewrite your bio with the formula: who you help + outcome + one line of proof.",
            "List the 5 adjacent accounts you'll comment on daily and follow them now.",
            "Pin your conversion trilogy: best growth post, best authority post, best story post.",
            "Send a genuine no-pitch welcome DM to your last 5 new followers."
          ],
          quiz: [
            {
              q: "Why are hand-built early followers strategically valuable beyond their count?",
              options: ["They can be sold ad space", "They form the warm seed pool whose early engagement powers every future post's velocity", "They unlock verification", "They aren't — only totals matter"],
              answer: 1,
              why: "Engaged early followers give each new post strong first-hour signals, which drives wider distribution."
            },
            {
              q: "What makes a comment on a bigger account actually generate profile visits?",
              options: ["Posting it first with an emoji", "Genuinely adding value — a sharper example, useful addition, or respectful counterpoint", "Tagging your own account", "Asking people to follow you"],
              answer: 1,
              why: "Borrowed audiences audition you through the quality of the comment itself."
            },
            {
              q: "Which bio converts a two-second stranger best?",
              options: ["'Dreamer | Coffee lover | Living my best life'", "'Helping first-time founders get their first 100 customers — bootstrapped 2 companies to 7 figures'", "'DM for collabs'", "'Just here for fun'"],
              answer: 1,
              why: "Who you help + outcome + proof answers the only question a visitor has: what's in it for me?"
            }
          ],
          drill: "Run the full 30-minute circuit today and log the result: comments left, replies sent, DMs written. Repeat for 7 days before judging it."
        }
      ]
    },
    {
      id: "strategy-2",
      level: "Intermediate",
      title: "Positioning and the Content Engine",
      description: "Sharpen your positioning until you're memorable, then industrialize output: pillar matrices, weekly systems, platform-native repurposing, and the follower journey.",
      lessons: [
        {
          id: "strategy-2-1",
          title: "Positioning: Own One Sentence in Their Head",
          minutes: 9,
          xp: 60,
          skill: "branding",
          intro: "Your audience will remember exactly one sentence about you — if you're lucky. Positioning is the discipline of choosing that sentence yourself instead of leaving it to chance.",
          sections: [
            {
              h: "Positioning Is a Fight for Memory",
              body: "Al Ries and Jack Trout defined positioning as the battle for a place in the prospect's mind, and the feed has made that battle brutal. Your viewer sees hundreds of creators a day and will retain, at most, a single compressed sentence about each one worth remembering: 'the calm money guy,' 'the agent who shows what a million buys,' 'the editor who breaks down movie trailers.'\n\nIf people cannot finish the sentence 'oh, that's the one who ___' about you, the feed forgets you between sessions — no matter how good the individual posts were. Reach without position evaporates.\n\nSo positioning is not a logo exercise or a vibe. It is a memory strategy: deciding the one sentence you want lodged in a stranger's head, then engineering every post, hook, and bio line to install it through repetition."
            },
            {
              h: "Write Your Onliness Statement",
              body: "Compress your position into an onliness statement: **'The only [category] who [meaningful difference] for [specific audience].'** The only ex-dealership finance manager teaching car buyers the other side of the desk. The only strength coach programming exclusively for over-forty desk workers.\n\nBefore writing yours, run a sameness audit. Pull the bios and pinned posts of your five closest competitors. Cross out every claim that appears more than once — 'value,' 'authentic,' 'helping you grow.' What survives is the actual differentiation space in your niche; most of the page will be crossed out, which is the point.\n\nThen pressure-test your statement: is the difference something the audience actually values, or just something true? 'The only realtor who plays jazz piano' is true and useless. Difference must intersect demand, or it is trivia."
            },
            {
              h: "Proof Beats Claims",
              body: "Positions are installed by evidence, not adjectives. Nobody believes 'top agent.' Everybody believes a camera walking through the actual deal — the listing, the negotiation texts (redacted), the closing table.\n\nThe hierarchy of proof, strongest first:\n\n1. **Shown results** — receipts, numbers, before-and-afters, documented process in motion.\n2. **Specificity** — '$4.2M closed in Q3' outranks 'multi-million producer.' Precise numbers read as true; round claims read as marketing.\n3. **Third-party voice** — clients, collaborators, or duets saying it about you.\n4. **Claims** — the weakest tier, and where most bios live.\n\nAudit your content: what percentage merely claims your position versus demonstrates it? The most positioned creators barely claim anything. They show their work relentlessly and let the audience write the sentence themselves — which is precisely why it sticks."
            },
            {
              h: "Repetition Is the Strategy",
              body: "Here is the part that separates operators from amateurs: once the position is set, you repeat it far past the point of personal boredom. Same core phrases, same named frameworks, same visual codes, across a hundred posts.\n\nYou will tire of your own message years before the market has heard it. A viewer catches maybe one post in five, half-distracted; what feels like exhausting repetition from inside the account reads as barely-established consistency from outside it. Marketers call the moment it finally lands the frequency illusion — suddenly you are 'everywhere,' precisely because you refused to be varied.\n\nChanging positioning every six weeks resets the meter to zero each time. Pick the sentence, commit for twelve months, and let repetition do the work no clever one-off post can. Boredom is the tax; memory is the return."
            }
          ],
          takeaways: [
            "Positioning is a memory strategy: choose the one sentence strangers will finish about you.",
            "Write an onliness statement and verify it survives a sameness audit of competitors.",
            "Install the position with proof — shown results and specific numbers — not adjectives.",
            "Repeat past your own boredom; the market hears you years after you tire of yourself."
          ],
          actions: [
            "Run the sameness audit on 5 competitors today and list what claims survive crossing out.",
            "Draft your onliness statement and test it against demand: does the difference matter to buyers?",
            "Find your three most recent 'claim' posts and plan a 'proof' version of each."
          ],
          quiz: [
            {
              q: "What is the practical goal of positioning for a creator?",
              options: ["A prettier grid", "Installing one memorable sentence about you in a stranger's mind", "Ranking for hashtags", "Winning arguments with competitors"],
              answer: 1,
              why: "Audiences compress you to one sentence; positioning is choosing and installing that sentence deliberately."
            },
            {
              q: "In the hierarchy of proof, which is strongest?",
              options: ["Confident claims in your bio", "Shown results and documented process", "A professional logo", "Frequent posting"],
              answer: 1,
              why: "Evidence installs positions; adjectives just decorate them."
            },
            {
              q: "You're bored of repeating your core message after six weeks. Strategically, you should:",
              options: ["Rebrand with a fresh angle", "Keep repeating — audiences catch a fraction of posts and need far more exposures than feels natural", "Go silent until inspired", "Ask followers to vote on a new direction"],
              answer: 1,
              why: "Internal boredom arrives years before market awareness; changing course resets the memory meter to zero."
            }
          ],
          drill: "Write your onliness statement in 15 words or fewer, then read your last 10 captions and count how many actively reinforce it. Below 7 means your content and position are drifting apart."
        },
        {
          id: "strategy-2-2",
          title: "The Pillar Matrix: Topics × Formats",
          minutes: 9,
          xp: 60,
          skill: "strategy",
          intro: "The blank page is not a creativity problem — it's a structure problem. A pillar matrix turns 'what should I post?' into a grid where the answers already exist.",
          sections: [
            {
              h: "From Pillars to a Matrix",
              body: "Pillars tell you what to talk about. They do not tell you how to package it, which is why creators with clear pillars still stall at the blank page. The fix is a matrix: pillars down one axis, format families across the other.\n\nThree pillars × four formats = twelve distinct content slots. 'Training myths' as a talking-head rant is a different post from 'training myths' as a text-on-screen demo, which is different again as a carousel breaking down the research. Same territory, three separate pieces — each hitting a different viewer preference and a different consumption context.\n\nThe matrix does two jobs at once. Creatively, it multiplies every idea by four before you need a new one. Analytically, it gives you a clean grid for diagnosis: when something flops, you can ask whether the topic failed or the format did — a question flat topic-lists can never answer."
            },
            {
              h: "The Four Format Families",
              body: "Every short-form execution descends from four families:\n\n- **Talking-head** — you, to camera. Highest trust-building and personality transfer; entirely dependent on hook delivery and energy. The authority workhorse.\n- **Voiceover b-roll** — narration over footage. Cinematic, rewatchable, and forgiving: you can rewrite the voiceover until it's perfect. Ideal for luxury, travel, cars, process.\n- **Text-on-screen** — visuals carrying written narrative, often music-driven. Cheapest to produce, strongest for silent autoplay contexts, and the natural home of relatable or aspirational identity content.\n- **Carousel/thread** — swipeable or threaded depth. The save-magnet family: steps, frameworks, lists. Slowest reach, highest save rates.\n\nMost creators default to one family out of habit. Run all four for a month and let retention and saves data — not comfort — decide your weighting."
            },
            {
              h: "Map the Funnel Onto the Matrix",
              body: "Now layer intent onto the grid. Borrow the classic funnel stages:\n\n- **Top of funnel** — strangers. Broad hooks, universal entry points, zero assumed context. Your growth pillar lives here.\n- **Middle of funnel** — aware viewers deciding whether to trust you. Depth, process, proof. Authority pillar territory.\n- **Bottom of funnel** — warm audience ready to act: join, DM, buy. Offers, invitations, direct CTAs.\n\nThe 60/30/10 ratio from Beginner maps straight on: heavy top, meaningful middle, light bottom. The most common intermediate mistake is over-posting bottom-funnel asks to an audience that barely knows you — selling to strangers reads as spam and trains the wrong behavior. The second most common is the inverse: years of pure top-funnel reach with no path anywhere. Every slot in your matrix should know which stage it serves."
            },
            {
              h: "Run an Idea Bank",
              body: "The matrix needs fuel. An idea bank is a single capture point — one note, one board, wherever you'll actually use it — where every idea lands the moment it occurs: shower thoughts, comment questions, competitor outliers, search autocompletes.\n\nCapture is step one; scoring is what makes it an instrument. Grade each idea 1-5 on three axes: **demand** (is there evidence people want this?), **proof** (can you speak to it credibly?), and **difference** (do you have an angle the niche hasn't heard?). A 12+ idea jumps the queue. A string of 6s waits or dies.\n\nKeep a minimum of thirty scored ideas at all times. When the buffer runs low, mine deliberately — comments, search bars, your own top posts' unanswered questions. Planning day should be assembly, never invention. Invention under deadline is how weak posts get made."
            }
          ],
          takeaways: [
            "Pillars × format families = a matrix that multiplies every idea by four.",
            "The four families — talking-head, voiceover b-roll, text-on-screen, carousel — serve different jobs; let data set your weighting.",
            "Map funnel stages onto the matrix so every post knows if it serves strangers, deciders, or fans.",
            "Keep 30+ scored ideas banked; planning day is assembly, not invention."
          ],
          actions: [
            "Draw your 3×4 matrix and write one concrete idea in every cell.",
            "Set up your idea bank today with demand/proof/difference scoring columns.",
            "Identify which format family you've been avoiding and schedule two posts in it this week."
          ],
          quiz: [
            {
              q: "What diagnostic power does a matrix give you that a topic list doesn't?",
              options: ["It guarantees virality", "It lets you separate whether the topic failed or the format failed", "It removes the need for analytics", "It doubles your reach automatically"],
              answer: 1,
              why: "With topic and format as separate axes, a flop can be attributed to the right variable."
            },
            {
              q: "Which format family typically earns the highest save rates?",
              options: ["Talking-head", "Voiceover b-roll", "Carousel/thread depth content", "Any format with trending audio"],
              answer: 2,
              why: "Steps, frameworks, and lists in swipeable form are reference material — the core save behavior."
            },
            {
              q: "What's the most common funnel mistake at intermediate level?",
              options: ["Too much top-of-funnel content", "Pushing bottom-funnel asks at an audience that doesn't know you yet", "Posting too many carousels", "Using all four format families"],
              answer: 1,
              why: "Selling to strangers reads as spam and burns trust before it's built."
            }
          ],
          drill: "Take your single best-performing topic ever and execute it in a format family you've never used for it. Compare its five numbers against the original."
        },
        {
          id: "strategy-2-3",
          title: "The Weekly Content System",
          minutes: 9,
          xp: 60,
          skill: "strategy",
          intro: "Inspiration is a terrible employee — brilliant, unreliable, allergic to Mondays. This lesson replaces it with a pipeline that ships whether or not you feel like a genius.",
          sections: [
            {
              h: "Systems Beat Motivation",
              body: "Every sustainable creator operation runs on the same insight: decide once, execute weekly. The alternative — re-deciding what to make, when to film, and whether you feel like it, every single day — burns willpower on logistics and leaves nothing for craft.\n\nA content system is a fixed weekly pipeline where each day has one mode of work. Modes matter because ideating, performing, and editing use different mental muscles; switching between them mid-task is where hours vanish. Batching by mode is the single highest-leverage productivity move in content.\n\nThe psychological shift is subtle but real: 'I need to make a video today' becomes 'today is scripting day.' The first invites negotiation with yourself. The second is just a calendar entry, and calendar entries don't care about your mood. Professionals are people who removed the daily negotiation."
            },
            {
              h: "The Five-Stage Pipeline",
              body: "A proven weekly shape for a 3-5 post cadence:\n\n1. **Monday — ideate and script.** Pull top-scored ideas from the bank. Write hooks first — if the hook isn't strong on paper, the post dies here, cheaply.\n2. **Tuesday — batch shoot.** One session, one setup, every script. Wardrobe changes between takes create visual variety for free.\n3. **Wednesday — edit block.** All posts in one sitting while shoot decisions are warm.\n4. **Thursday — package and schedule.** Captions, covers, on-screen text checks, keywords, publish times.\n5. **Friday — analytics ritual.** The five numbers, the weekly sentence, iteration notes feeding next Monday.\n\nCompress it to two evenings if that's your reality — the shape matters more than the days. What must survive any compression: hooks written before filming, and analytics feeding the next cycle."
            },
            {
              h: "Minimum Viable Production",
              body: "Perfectionism is procrastination wearing a work ethic. The fix is knowing exactly which quality dimensions matter and ignoring the rest.\n\n**Non-negotiable:** clean audio (viewers forgive grainy video, never muddy sound), a deliberate hook in the first three seconds, a face or subject in focus, and enough light to read expressions. These move retention.\n\n**Negotiable:** elaborate transitions, color grading, motion graphics, new gear. These move nothing until the non-negotiables are mastered — a speed ramp on a weak hook is lipstick on a corpse.\n\nAdopt the 80% rule: when a post reaches 80% of your imagined ideal, it ships. The final 20% costs more time than the first 80% and the audience can't see most of it. Shipping at 80% five times a week beats shipping at 95% once — because reps with feedback are how the ideal itself improves."
            },
            {
              h: "The Calendar Is a Hypothesis Document",
              body: "Here is the upgrade that turns a content calendar from a chore list into a learning machine: treat every scheduled post as an experiment with a written prediction.\n\nBefore publishing, add one line to the slot: 'Predict: above-median retention, strong saves — listicle format on a proven topic.' After the Friday ritual, one more line: what actually happened, and why the gap.\n\nThis does two things. It forces you to articulate why you believe a post will work before the data arrives — beliefs you never state are beliefs you never test. And over weeks, the prediction-versus-actual gap becomes a measurable read on your own judgment. Watch the gap shrink; that shrinking is your strategic instinct being built, post by post. Creators who skip this still gather data — they just never gather judgment."
            }
          ],
          takeaways: [
            "Decide once, execute weekly — batching by mode of work is the highest-leverage productivity move.",
            "Run the five-stage pipeline: ideate/script, shoot, edit, package, analyze.",
            "Protect the non-negotiables (audio, hook, focus, light); ship at 80%.",
            "Write a prediction on every scheduled post — the prediction gap trains your judgment."
          ],
          actions: [
            "Map the five pipeline stages onto your actual week and block the time now.",
            "Write hooks for next week's posts before anything gets filmed.",
            "Add a 'prediction' line to every post currently in your queue."
          ],
          quiz: [
            {
              q: "Why does batching by mode of work outperform making one full post per day?",
              options: ["Platforms reward batched uploads", "Ideating, performing, and editing use different mental muscles; switching between them burns time and energy", "It requires better equipment", "It doesn't — daily is always better"],
              answer: 1,
              why: "Context-switching is the hidden cost; single-mode days eliminate it."
            },
            {
              q: "Which quality dimension is non-negotiable even at minimum viable production?",
              options: ["Color grading", "Motion graphics", "Clean audio and a deliberate first-3-seconds hook", "4K resolution"],
              answer: 2,
              why: "Audio and hooks move retention; polish on top of a weak hook moves nothing."
            },
            {
              q: "What does writing a prediction before each post publish accomplish?",
              options: ["It improves the algorithm's opinion of you", "It makes your beliefs testable, so the prediction-vs-actual gap trains your strategic judgment", "It replaces analytics", "It guarantees the post performs"],
              answer: 1,
              why: "Unstated beliefs are untested beliefs; the gap between prediction and result is where judgment gets built."
            }
          ],
          drill: "Run one full pipeline week exactly as designed, then write three sentences: where the system strained, what you'd resequence, and what surprised you."
        },
        {
          id: "strategy-2-4",
          title: "One Idea, Five Executions: Platform-Native Repurposing",
          minutes: 9,
          xp: 60,
          skill: "strategy",
          intro: "Cross-posting the same file everywhere is how you become background noise on five platforms at once. Translation — not duplication — is how one idea earns five audiences.",
          sections: [
            {
              h: "Repurposing Is Translation, Not Copy-Paste",
              body: "Every platform has a grammar: the pacing, tone, framing, and opening conventions its audience expects and its ranking system rewards. Content that ignores the local grammar reads as foreign — and gets treated accordingly.\n\nThe laziest version of cross-posting, downloading a watermarked TikTok and re-uploading it to Reels, fails twice: recommendation systems demote competitor watermarks, and the audience registers the post as secondhand before the first second ends. You've announced that this platform is your afterthought.\n\nReal repurposing works like translation. The idea — the insight, the story, the claim — survives intact. The execution is rebuilt in the local language: re-hooked, re-paced, re-formatted, uploaded natively. One strong idea deserves five native executions. One file dumped in five feeds deserves what it gets."
            },
            {
              h: "The Platform Grammar Cheat Sheet",
              body: "The working dialects, compressed:\n\n- **TikTok** — raw, fast, personality-forward. Spoken hooks, native text styles, comment-section culture is half the content. Overproduction reads as advertising.\n- **Instagram Reels** — more polished, aesthetic-tolerant. Cover images matter for grid coherence; loops and shares to Stories carry weight.\n- **YouTube Shorts** — feeds a channel, so hooks can promise depth; strong loops perform; Shorts viewers convert to long-form subscribers when the packaging connects them.\n- **LinkedIn** — text leads, professional stakes required. The same story reframed around a career or business lesson; earnest outperforms clever.\n- **X** — the idea compressed to its sharpest sentence. Threads for structure; screenshots and clips as amplifiers, not the main act.\n\nSame insight, five dialects. Fluency here is a compounding, rare, and absurdly undervalued skill."
            },
            {
              h: "The Master-Idea Workflow",
              body: "Start every content week from master ideas, not platform tasks. A master idea is a single claim written in one sentence: 'Most people negotiate car deals backwards — the monthly payment is the trap.'\n\nFrom that sentence, cascade outward:\n\n1. Write the claim and its three strongest supporting beats.\n2. Choose the anchor execution — the platform and format where this idea is strongest, made first and best.\n3. Translate to the other platforms in effort order: what earns a full native rebuild, what earns a light adaptation, what gets skipped this time.\n\nThe long-form-first model deserves special mention: one solid YouTube video or podcast episode routinely yields five or more short clips, a thread, and a LinkedIn post — each moment re-hooked for cold viewers who lack the original context. Never clip lazily; a clip without a rebuilt hook is a scene without a movie."
            },
            {
              h: "Sequencing and Reading the Returns",
              body: "Practical mechanics that separate professionals from spammers:\n\nUpload natively everywhere — every platform's system prefers first-party files, full stop. Stagger publishing across the day or week rather than detonating everything at once; staggering also gives you an early read (a hook that dies on TikTok can be repaired before it ships to Reels).\n\nThen let per-platform data reallocate your effort. Track your five numbers separately by platform: the same idea will over-perform in one dialect and under-perform in another, and that pattern — not your comfort — should decide where each pillar gets its deepest investment. Many creators discover their 'main' platform is actually their third-best per hour invested.\n\nRepurposing is a portfolio: one idea, several positions, sized by observed return. Rebalance quarterly like you mean it."
            }
          ],
          takeaways: [
            "Repurposing is translation into each platform's grammar, not redistribution of one file.",
            "Watermarked re-uploads fail with both the ranking system and the audience.",
            "Work from master ideas: anchor execution first, then native translations in effort order.",
            "Track per-platform returns and reallocate effort to where each hour earns most."
          ],
          actions: [
            "Write tomorrow's post as a one-sentence master idea, then sketch its execution in three platform grammars.",
            "Delete any watermarked cross-posts from your primary account this week and re-upload the best ones natively.",
            "Compare your five numbers across platforms and name your true best-per-hour platform honestly."
          ],
          quiz: [
            {
              q: "Why do watermarked cross-posts underperform?",
              options: ["Watermarks slow load times", "Ranking systems demote competitor watermarks and audiences read the post as secondhand", "They use too much bandwidth", "They don't — watermarks are neutral"],
              answer: 1,
              why: "The post fails with the machine and the human at the same time."
            },
            {
              q: "What defines a 'master idea' in this workflow?",
              options: ["Your most viral post ever", "A single claim written in one sentence, executed natively per platform", "A trending sound", "A monthly theme"],
              answer: 1,
              why: "The idea survives across platforms; only the execution changes dialect."
            },
            {
              q: "The same idea performs 4x better on one platform than another. The strategic response is:",
              options: ["Post identical content everywhere anyway", "Reallocate effort toward the platform with better return per hour for that pillar", "Quit the weaker platform entirely that day", "Ignore it — platforms are random"],
              answer: 1,
              why: "Repurposing is a portfolio; observed returns, not habit, should size your positions."
            }
          ],
          drill: "Take one past post that worked and rewrite only its hook for three different platforms — spoken for TikTok, text-overlay for Reels, first-line for LinkedIn. Notice how the same idea demands three different doors."
        },
        {
          id: "strategy-2-5",
          title: "The Follower Journey: Stranger to Superfan",
          minutes: 9,
          xp: 60,
          skill: "marketing",
          intro: "Nobody wakes up as your superfan. They travel a path with five distinct doorways — and most accounts unknowingly board up at least two of them.",
          sections: [
            {
              h: "Map the Journey",
              body: "Every fan you will ever have walks the same road: **stranger → viewer → profile visitor → follower → fan.** Each arrow is a conversion moment with its own asset and its own failure mode.\n\nStranger to viewer is won by the hook — covered relentlessly elsewhere in this university. Viewer to profile visitor is won by intrigue: a post so strong the viewer wants to know who made it. Profile visitor to follower is won by your profile page in about two seconds. Follower to fan is won slowly, through consistency, replies, and depth.\n\nThe diagnostic power of the map comes from measuring the arrows separately. Massive reach with few profile visits? Content entertains but doesn't intrigue. Heavy profile traffic with weak follows? The profile page is leaking. Follows but no engagement afterward? The nurture layer is missing. Different leaks, completely different repairs — which is why 'just post better content' is useless advice."
            },
            {
              h: "The Profile-Visit Moment",
              body: "A profile visit is a micro-interview lasting about two seconds, and the visitor's only question is: 'will following this account reliably give me more of what just impressed me?'\n\nThree assets answer it:\n\n- **The bio** — who you help, what outcome, one line of proof. Clarity beats cleverness at this speed.\n- **The pinned trilogy** — best growth post (the promise, repeated), best authority post (the depth behind it), best story post (the human behind that). Visitors who tap a pin convert at multiples of those who don't.\n- **Grid coherence** — recent covers should read as one show. Consistent framing, type, and subject signal 'this account is a decision, not an accident.'\n\nAudit ruthlessly: open your own profile as a stranger who just watched your best post. Does the page pay off the curiosity that post created — or change the subject?"
            },
            {
              h: "Nurture: Trust Is Built in the Boring Middle",
              body: "Between the follow and the fandom sits the least glamorous stretch of the journey — weeks of unremarkable-looking consistency where trust actually forms.\n\nThree mechanisms do the work. **Kept promises:** every post that delivers what its hook offered is a micro-deposit; clickbait that under-delivers is a withdrawal at triple the rate. **Presence:** replying to comments — especially with questions — converts broadcast into relationship, and observers notice who answers. **Depth on schedule:** recurring series give followers an appointment, and appointments become habits.\n\nThe compounding here is parasocial: viewers who watch you regularly begin to feel they know you, and that felt relationship — managed honestly — is the strongest retention force on any platform. It cannot be hacked or rushed. It can only be earned at the unfashionable rate of one kept promise at a time."
            },
            {
              h: "Superfan Mechanics",
              body: "In most audiences, roughly the top 1% of members generate an outsized share of comments, shares, and defense of your name in rooms you're not in. Superfans are not an accident — accounts cultivate them:\n\n- **Inside language.** Coin terms, running jokes, recurring bits. Shared vocabulary marks membership, and people protect what they belong to.\n- **A named community.** Addressing your audience by a collective name turns spectators into citizens.\n- **Recognition.** Feature comments in posts, answer questions on camera by name, spotlight member wins. Recognition costs nothing and mints loyalty at a rate paid media cannot touch.\n- **Early access and inside information.** Let the core hear it first; being first is a status good.\n\nMeasure this layer by recognition: how many usernames in your comments could you greet by name? At beginner scale that number can realistically be dozens — and those dozens are the engine of everything."
            }
          ],
          takeaways: [
            "The journey is stranger → viewer → profile visitor → follower → fan; each arrow fails and gets fixed differently.",
            "The profile is a two-second interview: bio formula, pinned trilogy, coherent grid.",
            "Trust forms in the boring middle — kept promises, replies, series on schedule.",
            "Cultivate the top 1% deliberately with inside language, recognition, and early access."
          ],
          actions: [
            "Measure your funnel this week: reach → profile visits → follows. Name your leakiest arrow.",
            "Fix the profile in one sitting: bio formula, pinned trilogy, cover coherence.",
            "Reply to every comment for seven days, ending each reply with a question.",
            "Write down your 10 most frequent commenters — that's your superfan seed list."
          ],
          quiz: [
            {
              q: "High reach, plenty of profile visits, weak follow conversion. Where's the leak?",
              options: ["The hook", "The posting schedule", "The profile page itself — bio, pins, and grid aren't converting the visit", "The niche"],
              answer: 2,
              why: "Visitors arrived curious; the profile failed its two-second interview."
            },
            {
              q: "What is the primary trust mechanism in the 'boring middle' of the journey?",
              options: ["Viral outliers", "Every post delivering exactly what its hook promised, repeatedly", "Follower giveaways", "Posting more often than competitors"],
              answer: 1,
              why: "Kept promises are micro-deposits; under-delivering hooks withdraw trust at triple rate."
            },
            {
              q: "Why do inside language and community names build superfans?",
              options: ["They boost keyword SEO", "Shared vocabulary creates belonging, and people defend what they belong to", "Platforms promote named communities", "They don't — merch does"],
              answer: 1,
              why: "Membership psychology converts spectators into citizens who show up and advocate."
            }
          ],
          drill: "Watch your best-performing post, then visit your own profile as that stranger would. Write down the first three things you notice and whether they pay off the post's promise."
        },
        {
          id: "strategy-2-6",
          title: "Benchmarks: Know What Good Looks Like",
          minutes: 8,
          xp: 60,
          skill: "analytics",
          intro: "Without benchmarks, every post is a Rorschach test — you see whatever your mood projects. This lesson gives you the reference lines that turn feelings into readings.",
          sections: [
            {
              h: "Compare Against Yourself First",
              body: "The only benchmark that matters at this stage is your own rolling 30-day median, per metric. Median, not mean — one outlier post will drag an average into fantasyland, while the median keeps telling the truth about your typical output.\n\nTwo comparisons will actively poison your judgment. Comparing to your best-ever post makes everything since look like decline; best-evers are outliers by definition, and mourning them is comparing weekdays to your wedding day. Comparing to bigger creators imports someone else's context — team, tenure, and audience — into your assessment of a solo operation in month three.\n\nThe rolling median moves with you, which is exactly the point: as your craft improves, the bar rises automatically, and 'good' stays honest. Beating your own last month, repeatedly, is the entire game at this level."
            },
            {
              h: "Benchmark by Format, Not Account",
              body: "One account-wide median hides more than it reveals, because formats have different physics. Talking-head videos naturally retain differently than fast-cut b-roll montages; carousels accumulate saves for weeks while a Reel's reach is decided in days. Judging a carousel by Reel velocity is measuring a marathoner on sprint splits.\n\nSo maintain medians per format family: talking-head, voiceover b-roll, text-on-screen, carousel — for each of your five numbers. Twenty extra minutes a month, and suddenly your data can answer real questions: this talking-head underperformed the talking-head median (a content problem), or all talking-heads trail all b-roll on follows-per-1,000 (a portfolio weighting insight).\n\nWhen a post disappoints, always check it against its own family's line first. Half of all 'flops' are just formats being measured against the wrong ruler."
            },
            {
              h: "The Outlier Rule",
              body: "Benchmarks exist to make deviations legible, and deviations are where strategy lives.\n\n- **2x your median** on any core metric: a signal. Study it before celebrating it — which variable most plausibly explains the lift? Topic, hook construction, format, length?\n- **5x median:** drop the celebration entirely and mine it. Make two or three follow-ups in the same territory within a week while distribution is warm. Outliers reveal demand pockets, and demand pockets close.\n- **Below 0.5x median three times in a row** for one format or topic: the market has voted. The format goes on notice — change its biggest variable or cut it.\n\nThe emotional discipline is treating both directions as information. An outlier is not proof of genius, and a flop is not proof of failure. Both are the audience telling you where the demand actually is."
            },
            {
              h: "Build the Benchmark Sheet",
              body: "One spreadsheet, one row per post. Columns: date, platform, format family, pillar, hook type, plus the five numbers — non-follower reach %, average watch %, saves+shares per 1,000, follows per 1,000, profile visits.\n\nAdd a medians row per format family, refreshed on a 30-day rolling window. Conditionally format anything above 2x in green and below 0.5x in red if your tool allows — the goal is a sheet you can read in ninety seconds.\n\nAfter thirty logged posts, this sheet becomes genuinely predictive: you'll spot that number-led hooks beat question-led hooks for your audience, or that your Tuesday slot consistently trails. These are the small, compounding edges that never announce themselves in the moment and are unmissable in aggregate. Ten minutes of weekly logging buys you a strategist's view of your own account. Nothing else at this stage is cheaper per unit of insight."
            }
          ],
          takeaways: [
            "Benchmark against your rolling 30-day median — never your best-ever or bigger creators.",
            "Keep medians per format family; formats have different physics.",
            "2x median = study it, 5x = mine it fast with follow-ups, 0.5x three times = format on notice.",
            "Thirty logged posts make the sheet predictive; the edges only show in aggregate."
          ],
          actions: [
            "Build the benchmark sheet today and backfill your last 30 posts.",
            "Compute format-family medians and flag every 2x+ outlier for study.",
            "Pick your most recent outlier and schedule two same-territory follow-ups this week."
          ],
          quiz: [
            {
              q: "Why use the median instead of the mean for your baselines?",
              options: ["Medians are easier to compute", "One viral outlier drags the mean into fantasy; the median keeps describing your typical post", "Platforms report medians natively", "Means are for large accounts only"],
              answer: 1,
              why: "Content performance is outlier-heavy; the median resists distortion."
            },
            {
              q: "A post hits 5x your median on follows per 1,000. The correct move is:",
              options: ["Celebrate and return to the regular calendar", "Mine it — ship two or three same-territory follow-ups within the week", "Delete weaker posts to match it", "Raise all your targets to 5x"],
              answer: 1,
              why: "Outliers expose demand pockets, and demand pockets close — speed matters."
            },
            {
              q: "Why benchmark per format family rather than account-wide?",
              options: ["It looks more professional", "Formats have different natural physics; one ruler misjudges half your posts", "Platforms penalize account-wide metrics", "It reduces the amount of data needed"],
              answer: 1,
              why: "A carousel judged by Reel velocity is a marathoner graded on sprint splits."
            }
          ],
          drill: "Sort your logged posts by follows per 1,000 and find the post closest to your median. Study it for five minutes — this, not your best post, is what your account typically produces. Write one sentence on the gap between it and your winners."
        }
      ]
    },
/*__CONTINUE__*/
