window.SMU_DATA = window.SMU_DATA || { schools: [] };
SMU_DATA.schools.push({
  id: "cinema",
  order: 8,
  name: "Cinematography",
  tagline: "Move the camera like it means something",
  icon: "🎥",
  hue: 258,
  description: "The physical craft that makes footage feel expensive before a single edit: camera movement, shot selection, lighting, and framing that tells a story on its own. Built for creators shooting on anything from a phone to a cinema body who want their work to read like a commercial, not a clip.",
  courses: [
    {
      id: "cinema-1",
      level: "Beginner",
      title: "The Moving Frame",
      description: "The grammar of the shot: what shot sizes actually say, how to compose frames that breathe, why frame rate and shutter decide whether footage looks cheap, and how vertical changes every rule.",
      lessons: [
        {
          id: "cinema-1-1",
          title: "Shot Sizes Are Sentences",
          minutes: 8,
          xp: 50,
          skill: "video",
          intro: "Before you touch movement or light, you need the alphabet. Every shot size carries a built-in meaning — and most beginner footage is flat because it accidentally says the same thing over and over.",
          sections: [
            {
              h: "The Ladder: Seven Sizes, Seven Meanings",
              body: "Cinematography has a shot-size ladder, and each rung means something before any content appears in it.\n\n- **Extreme wide (EWS):** the world swallows the subject — scale, loneliness, arrival.\n- **Wide (WS):** full body in environment — context, geography, 'here is the situation.'\n- **Medium (MS):** waist up — conversation distance, neutral, informational.\n- **Medium close-up (MCU):** chest up — attention, the standard talking-head frame.\n- **Close-up (CU):** the face fills the frame — emotion, decision, confession.\n- **Extreme close-up (ECU):** eyes, lips, a trembling hand — intensity, obsession.\n- **Insert:** an object detail — the watch clasp, the send button — information the story needs.\n\nMemorize the ladder not as jargon but as a set of sentences. A wide says 'look where we are.' A close-up says 'look what they feel.' Choosing a size is choosing what the audience is allowed to care about."
            },
            {
              h: "Wide Shots Establish, Close-Ups Confess",
              body: "The ladder works because it maps onto physical intimacy. A wide shot is the distance of a stranger across a lobby. A medium is a colleague at a desk. A close-up is a friend leaning in; an extreme close-up is closer than almost anyone gets in real life, which is why it feels electric — or invasive.\n\nThis gives you a simple directing rule: **match the size to the emotional temperature of the moment.** Deliver facts in mediums. Deliver feelings in close-ups. Deliver scale, status, and 'the reveal' in wides.\n\nWatch any luxury car commercial and count: it opens wide (the world, the road), tightens through mediums (the driver, the door), and pays off in extreme close-ups (stitching, the badge, an eye in the mirror). That tightening pattern is the oldest escalation trick in the craft, and it works identically in a 30-second vertical."
            },
            {
              h: "The Insert: The Most Underused Shot on Social",
              body: "Ask a beginner for coverage and you get three mediums from three angles. Ask a professional and you get inserts — tight, deliberate shots of objects and hands.\n\nInserts do three jobs. First, **information**: the audience must see the label, the message, the price tag for the story to land. Second, **rhythm**: an insert is a pattern interrupt inside your own footage, resetting attention every few seconds without a single effect. Third, **rescue**: in the edit, an insert hides a jump cut, bridges two takes, and covers the moment your main angle went soft.\n\nA working ratio: for every minute of primary footage, capture at least four inserts — hands doing the thing, the object of desire, an environmental detail, a texture. They take thirty seconds each to shoot and they are the difference between a clip that feels filmed and one that feels made."
            },
            {
              h: "Choosing a Size on Purpose",
              body: "Here is the discipline that separates shooters immediately: before you roll, name the beat, then name the size.\n\n1. Write your video as beats — 'arrive at the cafe,' 'first sip,' 'the verdict.'\n2. Assign each beat a shot size based on what it is emotionally: context beats go wide, action beats go medium, feeling beats go close.\n3. Never let two adjacent beats share the same size. If two mediums sit next to each other, push one to a close-up or pull one to a wide.\n\nThat third rule alone fixes most flat footage. Variation in size is what editors call 'cuttability' — frames that are clearly different sizes cut together cleanly, while near-identical sizes produce the amateur jump-cut shimmer. You are not just shooting shots; you are manufacturing contrast for the edit."
            }
          ],
          takeaways: [
            "Every shot size carries a built-in meaning: wides establish context, mediums inform, close-ups deliver emotion.",
            "Match shot size to the emotional temperature of the beat, not to convenience.",
            "Inserts are information, rhythm, and edit-rescue in one — shoot at least four per minute of primary footage.",
            "Never let two adjacent beats share the same shot size; size contrast is what makes footage cuttable."
          ],
          actions: [
            "Rewatch any high-end commercial and log every shot on the size ladder — notice the wide-to-close escalation pattern.",
            "Write your next video as 6-8 beats and assign a shot size to each before you pick up the camera.",
            "On your next shoot, force yourself to capture four inserts you did not plan — hands, object, texture, environment."
          ],
          quiz: [
            {
              q: "Your video's emotional payoff is a person reacting to good news. Which size delivers that beat hardest?",
              options: ["Extreme wide", "Medium shot", "Close-up", "Insert of their phone"],
              answer: 2,
              why: "Close-ups are the intimacy rung of the ladder — faces carry emotion, and the CU forces the audience to read the face."
            },
            {
              q: "What is the practical editing benefit of shooting inserts?",
              options: ["They increase resolution", "They hide jump cuts and bridge takes", "They replace the need for a wide shot", "They make color grading easier"],
              answer: 1,
              why: "Cutting to a detail lets the editor jump time or swap takes invisibly — inserts are rescue coverage."
            },
            {
              q: "Why does coverage made of three similar medium shots cut together badly?",
              options: ["Mediums are out of fashion", "The audio will not match", "Near-identical sizes create a jump-cut shimmer when cut together", "Medium shots require more light"],
              answer: 2,
              why: "Cuts read cleanly when frame size changes noticeably; similar sizes make the image appear to jitter rather than cut."
            }
          ],
          drill: "Shoot one 30-second everyday action — making coffee, tying shoes — using exactly five sizes from the ladder, one shot each, and cut them in order."
        },
        {
          id: "cinema-1-2",
          title: "Composing Frames That Breathe",
          minutes: 9,
          xp: 50,
          skill: "photo",
          intro: "Composition for motion is not photography with extra steps — it is designing where the eye travels while things move. These four principles cover ninety percent of what makes a frame feel intentional.",
          sections: [
            {
              h: "Thirds, and When to Break Them",
              body: "The rule of thirds — placing subjects on the intersections of a 3x3 grid — works because it creates asymmetry, and asymmetry creates visual tension the eye enjoys resolving. Turn the grid overlay on in your camera app and leave it on for a month; it retrains your default framing faster than any tutorial.\n\nBut know the exception, because the exception is a weapon: **dead-center symmetry reads as authority, formality, and control.** It is the Wes Anderson frame, the luxury-watch frame, the CEO-statement frame. Centering says 'this subject commands the space.'\n\nSo the working rule: thirds for life, center for power. A vlog walking shot sits on a third. A product hero shot sits dead center with ruthless symmetry. Choosing between them is your first real compositional decision, and making it consciously — instead of letting the camera default decide — is what 'intentional' actually means."
            },
            {
              h: "Headroom and Lead Room",
              body: "Two invisible measurements control whether a human frame feels professional.\n\n**Headroom** is the gap between the top of the head and the top of frame. Too much and your subject sinks, drowning in ceiling; too little and the frame feels cramped. The tell: in a medium close-up, eyes sit roughly on the top third line — set the eyes, and headroom takes care of itself.\n\n**Lead room** (also called nose room) is space in the direction a subject faces or moves. A person looking left needs empty frame on the left; a car driving right needs road ahead of it on the right. Starve the lead room and the frame feels blocked, like the subject is about to hit a wall.\n\nWhen a subject turns or changes direction mid-shot, recompose smoothly to hand them new lead room. That tiny adjustment is invisible when done and glaring when skipped."
            },
            {
              h: "Negative Space Is a Statement",
              body: "Negative space — the deliberately empty part of a frame — is not wasted real estate. It is emphasis. A watch on a vast dark table reads as more precious than a watch filling the frame, because the emptiness says 'this object earned all this room.'\n\nNegative space does three jobs on social. It creates **elegance**: luxury brands use emptiness the way they use silence, as proof of confidence. It creates **text space**: composing with clean negative space means your hook text and captions land on quiet frame instead of fighting visual noise. And it creates **contrast between shots**: a dense, busy frame followed by a sparse one is a pattern interrupt that resets attention with zero editing effort.\n\nThe discipline is subtraction. Before you roll, ask what you can remove from frame — one background object gone does more for a composition than any filter applied after."
            },
            {
              h: "Depth: The Three-Layer Frame",
              body: "Flat frames have one plane of interest. Cinematic frames have three: **foreground, midground, background.** Your subject usually lives in the midground; the craft is building the other two layers on purpose.\n\nForeground is the cheapest production value on earth. Shoot past a door frame, through leaves, over a shoulder, past an out-of-focus coffee cup — and the frame instantly gains depth and a sense that the camera exists inside the scene rather than observing it from outside. When the camera moves, foreground objects slide faster than the background — that parallax is what makes movement feel dimensional.\n\nBackground is a decision, not an accident. Check its brightness (should generally sit darker than your subject's face), check for poles sprouting from heads, and check for motion that steals attention.\n\nOne habit: before rolling, name your three layers out loud. If you can only name one, move the camera until you can name three."
            }
          ],
          takeaways: [
            "Thirds create pleasing tension for everyday frames; dead-center symmetry signals power and formality — choose deliberately.",
            "Set the eyes on the top third line and headroom resolves itself; always give subjects lead room in their facing direction.",
            "Negative space is emphasis and elegance — and clean real estate for hook text.",
            "Build three layers — foreground, midground, background — and use foreground parallax to make movement feel dimensional."
          ],
          actions: [
            "Turn on the 3x3 grid overlay in your camera app and leave it on permanently.",
            "Reshoot one recent clip through a foreground element — a door frame, plant, or object — and compare the depth side by side.",
            "Audit your last three videos for headroom and lead room errors; note every frame where the subject looks 'blocked.'"
          ],
          quiz: [
            {
              q: "When does dead-center composition beat the rule of thirds?",
              options: ["Never — thirds always win", "When you want to signal authority, formality, or luxury command of the frame", "Only in vertical video", "When the subject is moving quickly"],
              answer: 1,
              why: "Symmetrical centering reads as power and control, which is why luxury and formal content uses it deliberately."
            },
            {
              q: "A subject faces screen-left. Where should the empty space in the frame be?",
              options: ["Behind them, screen-right", "Above their head", "In front of them, screen-left", "Evenly on both sides"],
              answer: 2,
              why: "Lead room goes in the direction of gaze or travel; starving it makes the subject feel walled in."
            },
            {
              q: "What is the fastest way to add depth to a static frame?",
              options: ["Increase saturation", "Add a foreground element to shoot past", "Zoom in digitally", "Raise the camera overhead"],
              answer: 1,
              why: "A foreground layer creates instant dimensionality and parallax when the camera moves — the cheapest production value available."
            }
          ],
          drill: "Take one location and produce five different compositions of the same subject: thirds, dead center, heavy negative space, through-foreground, and low angle — then rank them by which feels most intentional."
        },
        {
          id: "cinema-1-3",
          title: "Frame Rates, Shutter, and the Cheap-Footage Problem",
          minutes: 9,
          xp: 50,
          skill: "video",
          intro: "Two settings decide whether footage looks like cinema or like a phone recording of real life: frame rate and shutter speed. Get these right and everything downstream looks more expensive.",
          sections: [
            {
              h: "What Frame Rate Actually Says",
              body: "Frame rate is a tone-of-voice setting.\n\n- **24fps** is the frame rate of a century of cinema. Its slightly imperfect motion — the gentle strobing filmmakers call 'judder' — is what your brain has learned to read as 'movie.'\n- **30fps** is the broadcast look: news, daytime TV, vlogs. Smoother, more literal, more 'this is really happening.'\n- **60fps and up** is hyper-real. Sports, gaming, and — critically — the raw material for slow motion.\n\nThere is no universally correct choice, but there is a correct question: what should this footage feel like? A cinematic brand film wants 24. A tutorial where clarity beats mood can take 30. And any shot you might slow down must be captured at 60 or 120, because slow motion is a shooting decision, not an editing one — stretching 24fps footage in post produces stutter, not silk."
            },
            {
              h: "The 180-Degree Shutter Rule",
              body: "Here is the single setting that silently separates cinematic footage from camcorder footage: **shutter speed at roughly double your frame rate.** At 24fps, shoot 1/48 or 1/50. At 30fps, 1/60. At 60fps, 1/120. Filmmakers call this the 180-degree shutter rule, named for the rotating shutters of film cameras.\n\nWhy it matters: this ratio produces natural motion blur — moving hands and passing cars smear just slightly between frames, exactly the way cinema has always looked. Set the shutter too fast (phones do this automatically in daylight) and every frame becomes a crisp freeze-frame; motion turns staccato and 'video-y.' Too slow, and everything smears drunk.\n\nOn a phone, the stock camera app usually won't let you set shutter — third-party apps like Blackmagic Camera give you manual control for free. This one setting is the highest-leverage 'why does my footage look cheap' fix that exists."
            },
            {
              h: "Slow Motion Is a Spice, Not a Sauce",
              body: "Once creators discover 60 and 120fps, everything becomes slow motion — and everything becomes boring, because slow motion with no contrast is just slowness. Slow motion works as **emphasis**: it tells the audience 'this moment matters more than the others.' If every moment is slowed, no moment matters.\n\nUse it surgically. The product landing on the table: 120fps. The pour, the door closing, hair caught in wind, the handshake: candidates. The walk to the car: real time. A good ratio for a 30-second piece is one or two slow moments, each under three seconds, surrounded by real-time footage that gives them meaning.\n\nAnd shoot slow-motion shots with slow motion in mind: more light (high frame rates eat light), tighter framing (slowness magnifies detail), and action that actually contains motion — fabric, liquid, particles. Slowing down stillness gives you nothing but longer stillness."
            },
            {
              h: "ND Filters: Sunglasses for Your Lens",
              body: "The 180-degree rule creates a daylight problem. A shutter locked at 1/50 lets in a lot of light; outdoors at noon your image blows out white. The camcorder fix is cranking shutter speed to 1/2000 — which destroys your motion blur and the whole cinematic look with it.\n\nThe filmmaker's fix is the **neutral density (ND) filter**: darkened glass in front of the lens that cuts light without changing color, letting you keep the shutter at 1/50 and the aperture where you want it. Variable NDs twist like a dimmer and are the practical choice for run-and-gun work; phones can use clip-on NDs or case systems.\n\nThe tell that someone shoots seriously is not the camera body — it is the ND on the lens in daylight. If you learn one piece of gear vocabulary from this course, this is it: exposure has three doors, and ND lets you keep two of them exactly where the look demands."
            }
          ],
          takeaways: [
            "Frame rate is tone: 24fps reads as cinema, 30fps as broadcast reality, 60/120fps as slow-motion raw material.",
            "Set shutter speed to double the frame rate — the 180-degree rule — for natural, cinematic motion blur.",
            "Slow motion is emphasis; if everything is slowed, nothing matters. One or two slow beats per 30 seconds.",
            "ND filters let you hold cinematic shutter settings in daylight — they are the exposure tool that protects the look."
          ],
          actions: [
            "Install a manual camera app (e.g. Blackmagic Camera) and lock in 24fps at 1/50 shutter for your next outdoor clip.",
            "Shoot the same 5-second action at 1/50 and at 1/1000 shutter, then compare motion side by side — you will never unsee it.",
            "List which two moments of your next video deserve slow motion, and shoot only those at 120fps."
          ],
          quiz: [
            {
              q: "You are shooting at 24fps. What shutter speed does the 180-degree rule call for?",
              options: ["1/24", "1/50", "1/120", "1/2000"],
              answer: 1,
              why: "The rule is shutter at roughly double the frame rate, so 24fps pairs with 1/48-1/50 for natural motion blur."
            },
            {
              q: "Why can't you create silky slow motion from 24fps footage in the edit?",
              options: ["Editing software forbids it", "24fps files are too compressed", "There aren't enough frames captured, so stretching produces stutter", "Slow motion requires vertical video"],
              answer: 2,
              why: "Slow motion needs surplus frames captured at 60 or 120fps; you cannot invent frames that were never recorded."
            },
            {
              q: "What problem does an ND filter solve?",
              options: ["Shaky footage in low light", "Keeping cinematic shutter settings without overexposing in bright light", "Color casts from fluorescent lights", "Autofocus hunting"],
              answer: 1,
              why: "ND cuts incoming light so you can hold the 180-degree shutter and your chosen aperture even at noon."
            }
          ],
          drill: "Shoot one 15-second sequence at 24fps/1/50 with a single 2-second slow-motion insert captured at 120fps — feel how the speed contrast creates emphasis."
        },
        {
          id: "cinema-1-4",
          title: "The Five Moves That Matter",
          minutes: 10,
          xp: 50,
          skill: "video",
          intro: "You do not need twenty camera moves. You need five, executed cleanly, each chosen for a reason. This lesson is the movement vocabulary the rest of the school builds on.",
          sections: [
            {
              h: "Static Is a Move",
              body: "The most underrated camera move is no move at all. A locked, deliberately composed static shot signals confidence — the frame says 'what is happening here is enough.' Interviews, product heroes, comedic deadpan, and luxury frames all gain authority from stillness.\n\nBeginners fear static shots because their compositions cannot carry them; the fix is better frames, not more wobble. A static only fails when the composition is lazy or the shot overstays — as a rule of thumb, a static frame on social earns three to five seconds before something inside the frame must change: a subject enters, an expression turns, an object drops.\n\nThis reframes the entire lesson: movement is not the default you add stillness to. **Stillness is the default you add movement to** — and every move you add should be able to answer one question: what does this move do that the static frame could not?"
            },
            {
              h: "Pan and Tilt: Rotate with Discipline",
              body: "A **pan** rotates the camera horizontally from a fixed position; a **tilt** rotates vertically. They are the moves of revelation — following a subject, connecting two points in space, unveiling something outside the initial frame.\n\nThe craft is in the endpoints. A professional pan starts on a composed frame, holds it for a beat, travels at constant speed, and lands on a second composed frame — then holds again. Those holds, called **handles**, are two seconds of stillness at each end that give the editor clean in and out points. A pan that starts moving before recording thoughts are gathered, wanders, and stops nowhere is the signature of amateur footage.\n\nSpeed discipline: slower than feels natural. On a vertical phone screen, a fast pan turns to smeared mush. Rehearse the move twice before rolling, and shoot it three times — movement takes are the ones that need retakes."
            },
            {
              h: "The Push-In and the Pull-Out",
              body: "Moving the camera toward a subject — the **push-in** — is the most emotionally loaded move in the vocabulary. It mimics attention narrowing: we push in when something becomes important, when a decision lands, when the audience should lean in. Even a slow six-inch push during a talking point adds gravity that a static cannot.\n\nThe **pull-out** reverses the psychology: it reveals context, releases tension, or abandons a subject to their environment. Pull out from the finished dish to reveal the full table; pull out from a face to reveal where they are standing.\n\nExecution without a gimbal: hold the phone with both hands, elbows pressed to ribs, and shift your weight forward through one slow step — the body is the dolly. Keep pushes under walking pace. And pair the move to the beat: push in on the key sentence, not at a random moment. Movement that lands with meaning is what 'motivated' means, and the whole next course is built on it."
            },
            {
              h: "Orbit and Reveal: Movement as Theater",
              body: "The **orbit** circles the subject on a constant radius, keeping it centered while the background sweeps past. Orbits worship their subject — cars, products, and people all gain monumentality when the world rotates around them. Half-orbits (90-180 degrees) are usually enough; full circles overstay. Keep radius and height locked; wobbling radius is the giveaway.\n\nThe **reveal** hides, then shows: the camera moves past a foreground obstruction — a wall, a door frame, a shoulder — and the subject appears. Reveals manufacture anticipation mechanically; the two-tenths of a second where the frame is blocked is a micro curiosity gap, and the payoff lands harder for it. Walking past a doorway into a room is the simplest reveal in existence and instantly upgrades any real-estate or location video.\n\nBoth moves reward rehearsal. Walk the path once without the camera, note foot placement, then shoot three takes. Choreographed movement reads as production value; improvised movement reads as luck."
            },
            {
              h: "Handheld That Doesn't Hurt",
              body: "Handheld is a legitimate aesthetic — urgency, intimacy, documentary truth — but there is a line between energy and nausea, and technique holds the line.\n\n1. **Build a tripod from your body.** Both hands on the camera, elbows locked against your ribs, camera close to your chest rather than at arm's length.\n2. **Walk heel-to-toe with bent knees** — the 'ninja walk' — letting your legs absorb each step instead of transmitting it to the frame.\n3. **Exhale slowly while rolling.** Breath sway is real; shoot on the exhale for static handheld frames.\n4. **Lean on the world.** A wall, a table, a door frame — pressing any part of your body against something solid removes half your motion.\n\nAnd use wide lenses for handheld work — shake is magnified by focal length, so the same tremor that is invisible at 0.5x is seasick at 3x. Stabilization in post helps, but it crops and warps; stability is best manufactured at capture."
            }
          ],
          takeaways: [
            "Stillness is the default; every move must do something a static frame cannot.",
            "Pans and tilts need composed endpoints with two-second handles — start still, travel constant, land still.",
            "Push-ins intensify, pull-outs reveal context; pair the move to the beat that deserves it.",
            "Orbits monumentalize their subject; reveals manufacture anticipation through a blocked frame.",
            "Handheld stability comes from elbows-in posture, the heel-to-toe ninja walk, exhaling while rolling, and wide lenses."
          ],
          actions: [
            "Shoot all five moves — static, pan, push-in, orbit, reveal — on one subject today, three takes each.",
            "Practice the ninja walk down a hallway while recording; review where the footsteps still show and adjust.",
            "Review your last video and label every camera move; count how many could answer 'what does this move add?'"
          ],
          quiz: [
            {
              q: "What are 'handles' in a camera move?",
              options: ["The grips on a gimbal", "Two seconds of held, composed frame at the start and end of a move", "The straps on a camera cage", "Speed ramps applied in editing"],
              answer: 1,
              why: "Handles give the editor clean static in and out points, which is what makes movement footage cuttable."
            },
            {
              q: "Which move most strongly signals 'this subject is important — worship it'?",
              options: ["A fast pan", "A tilt down", "An orbit around the subject", "A pull-out"],
              answer: 2,
              why: "Circling a centered subject while the world sweeps past monumentalizes it — the signature move of car and product films."
            },
            {
              q: "Why do wide lenses suit handheld shooting?",
              options: ["They gather more light", "Camera shake is magnified by focal length, so wide angles hide tremor", "They autofocus faster", "They compress the background"],
              answer: 1,
              why: "The same physical shake that is invisible on a wide lens becomes seasickness at telephoto magnification."
            }
          ],
          drill: "Film a 20-second 'arrival' sequence — approaching a building, room, or object — using exactly three moves: a reveal, a push-in, and one static. No cuts longer than five seconds."
        },
        {
          id: "cinema-1-5",
          title: "Vertical Is a Different Country",
          minutes: 9,
          xp: 50,
          skill: "video",
          intro: "9:16 is not 16:9 turned sideways — it is a different visual language with its own grammar. Most 'cinematic' advice was written for horizontal frames, and applying it unmodified is why vertical footage often feels off.",
          sections: [
            {
              h: "The Stacked Frame",
              body: "Horizontal frames spread information left to right; vertical frames **stack** it top to bottom. That single geometric fact rewrites composition.\n\nA 16:9 wide shot shows a person and their environment side by side. In 9:16, the same framing shrinks the person to a sliver with dead sky above and dead floor below. Vertical wides only work when the environment is vertical too — a staircase, a skyscraper, a waterfall, a full-body outfit. Everything else wants to be closer.\n\nThink in floors, like a building: what occupies the top third, the middle third, the bottom third? A talking head in the middle floor, hook text on the top floor, captions on the ground floor — that is a composed vertical frame. Sky-subject-foreground, product-hands-surface, face-torso-desk: strong verticals almost always read as deliberate stacks. When you frame 9:16, stop asking 'what is beside my subject' and start asking 'what is above and below it.'"
            },
            {
              h: "Safe Zones: The Interface Owns Part of Your Frame",
              body: "On every vertical platform, your frame shares space with the interface. The right edge carries the like/comment/share rail. The bottom fifth carries the caption, username, and audio tag. The top edge holds search bars and camera icons. None of it is yours.\n\nPractical safe-zone discipline:\n\n- Keep faces, products, and any text you shoot in-frame inside the **center 80 percent horizontally** and away from the **bottom 20 and top 10 percent vertically**.\n- Never place a key detail in the lower-right quadrant — it lives under the engagement buttons on both TikTok and Reels.\n- Compose assuming captions will cover the bottom floor of your stack.\n\nMost editing apps offer platform safe-zone overlays; turn them on. Nothing marks footage as unconsidered faster than a punchline covered by a share button, and nothing is easier to prevent at the moment of framing."
            },
            {
              h: "Shot Sizes Shift One Step Tighter",
              body: "The shot-size ladder from lesson one still applies in vertical — shifted. Because the frame is narrow, every size feels roughly one step wider than it would horizontally: a vertical medium shot carries the informational weight a horizontal wide used to carry, and the vertical close-up becomes your workhorse conversational frame rather than a special-occasion intimacy shot.\n\nTwo consequences. First, **default tighter**: when in doubt, take one step forward from where horizontal instinct places you. Faces should be large on a phone screen viewed at arm's length — a 'properly' framed horizontal medium reads as distant and low-energy in a feed.\n\nSecond, **wides become events**: because vertical punishes wide framing, a true wide shot lands as a pattern interrupt. Save it for reveals and scale moments — the mansion exterior, the full outfit, the crowd — and it will hit with force precisely because the rest of your footage lives close."
            },
            {
              h: "Blocking for the Vertical Axis",
              body: "Horizontal filmmaking moves subjects left and right across frame. Vertical frames have almost no left-and-right to work with — but they have two axes horizontal shooting underuses.\n\n**The depth axis (Z-axis):** movement toward and away from camera is vertical video's native choreography. A subject walking at the lens grows dramatically within the frame; walking away shrinks into environment. Approach and retreat replace lateral crosses. Combine with a foreground element and you get parallax depth in a frame shape that tends toward flatness.\n\n**The vertical axis itself:** tilts, rise-ups, and top-down angles exploit the tall frame. Tilting up a building, a pour shot from above, a low-angle hero shot that uses all that vertical height to make a subject tower — these moves feel designed for 9:16 because they are aligned with it.\n\nWhen you storyboard vertical content, choreograph in depth and height. Save lateral movement for the rare wide, and your blocking will finally match your frame."
            }
          ],
          takeaways: [
            "Vertical frames stack information in floors — compose top, middle, and bottom thirds deliberately.",
            "The interface owns the right rail, bottom fifth, and top edge; keep critical content inside safe zones.",
            "Frame one step tighter than horizontal instinct suggests; save true wides as pattern-interrupt events.",
            "Choreograph on the depth axis and vertical axis — approach, retreat, tilts, and top-downs are 9:16's native moves."
          ],
          actions: [
            "Enable safe-zone overlays in your editing app and re-check your last three posts for covered content.",
            "Reshoot one horizontal-instinct shot one full step tighter and compare which reads better on a phone.",
            "Storyboard your next vertical video using only depth-axis movement — no lateral crosses allowed."
          ],
          quiz: [
            {
              q: "Why do most wide shots fail in 9:16?",
              options: ["Vertical video has lower resolution", "The narrow frame shrinks subjects to slivers surrounded by dead space above and below", "Algorithms penalize wide shots", "Wide lenses don't work vertically"],
              answer: 1,
              why: "Vertical geometry stacks rather than spreads, so horizontal-style wides waste most of the frame on empty sky and floor."
            },
            {
              q: "Where should you avoid placing a key visual detail in a vertical frame?",
              options: ["The center", "The upper-middle third", "The lower-right quadrant", "Slightly left of center"],
              answer: 2,
              why: "The lower-right is covered by the engagement button rail on both TikTok and Reels."
            },
            {
              q: "What is vertical video's native movement axis?",
              options: ["Lateral left-to-right crosses", "The depth axis — subjects approaching and retreating from camera", "Diagonal pans", "Zooming during recording"],
              answer: 1,
              why: "With little horizontal room, movement toward and away from the lens creates the strongest size and depth changes in a tall frame."
            }
          ],
          drill: "Shoot the same 10-second scene twice — once framed by horizontal instinct, once composed as a deliberate three-floor vertical stack with safe zones respected — and view both on your phone in a feed mockup."
        }
      ]
    },
    {
      id: "cinema-2",
      level: "Intermediate",
      title: "Movement with Meaning",
      description: "Motivated camera movement, coverage that edits itself, gimbal and body mechanics, the psychology of focal lengths, and your first serious lighting setup.",
      lessons: [
        {
          id: "cinema-2-1",
          title: "Motivated Movement: The Why Behind Every Move",
          minutes: 9,
          xp: 60,
          skill: "video",
          intro: "Anyone can move a camera. Cinematographers move it for a reason the audience feels but never notices. This lesson installs the motivation test that turns movement from decoration into storytelling.",
          sections: [
            {
              h: "Every Move Has a Meaning Attached",
              body: "The audience reads camera movement the way it reads tone of voice — unconsciously, and instantly. The vocabulary:\n\n- **Push-in** = intensify. Attention narrows; this moment matters more now.\n- **Pull-out** = reveal or release. Context arrives; tension exhales; sometimes, abandonment.\n- **Lateral track** = journey. We travel with the subject; time is passing.\n- **Orbit** = significance. The subject is the axis of the world.\n- **Handheld** = urgency, intimacy, truth. Something human and unpolished is happening.\n- **Static** = authority and control. The frame is certain of itself.\n- **Rise** = aspiration or overview; **descend** = grounding, arrival, sometimes doom.\n\nNone of this is mystical — it maps to how bodies behave. We lean in when interested, step back to take things in, circle what fascinates us. The camera borrows the audience's body. Use the vocabulary consciously and your moves start saying what your content means."
            },
            {
              h: "The Motivation Test",
              body: "Before any move, ask: **what motivates this — character, emotion, or information?**\n\n**Character motivation:** someone moves, the camera moves with them. The most invisible motivation; audiences never question a camera that follows action.\n\n**Emotional motivation:** the feeling of the beat shifts, and the camera embodies the shift — the slow push as the founder describes the moment everything nearly collapsed. Used sparingly, this is your most powerful tool.\n\n**Informational motivation:** the audience needs to see something new — the pan from the empty desk to the packed calendar, the tilt from mud-caked boots up to the summit.\n\nIf a move has none of the three, it is decoration — and decoration is not neutral. Unmotivated movement actively spends attention without buying anything, and on a platform where attention is the entire economy, that is a real cost. The discipline is not 'never move.' It is 'never move for free.'"
            },
            {
              h: "Speed Is Status",
              body: "Movement speed carries class signals, and most creators move too fast.\n\nSlow, controlled movement reads as expensive. Watch commercials for watches, hotels, and German cars: pushes so gradual you barely register them, orbits that take the full shot to travel thirty degrees. The patience says: we are confident you will keep watching. Fast movement reads as energy — sneaker ads, sports edits, street content — and as anxiety when unintentional.\n\nTwo practical rules. First, **halve your instinct**: whatever speed feels right while shooting, that is roughly double what reads as controlled on screen — nerves accelerate hands. Second, **keep speed constant within a move**: acceleration mid-move reads as error. If you want speed changes, shoot at 60fps and ramp deliberately in the edit, where a speed ramp is a choice rather than a wobble.\n\nMatch speed to brand: luxury and authority content moves slow; youth and hype content is allowed to sprint. Pick the lane on purpose."
            },
            {
              h: "Land the Move on the Beat",
              body: "Here is the intermediate skill that separates shooters who move the camera from shooters who direct with it: **synchronize the move's arrival with the content's payoff.**\n\nA push-in that starts at a random moment and ends at a random moment is texture. A push-in that begins as the speaker approaches the key sentence and lands at its tightest exactly as the sentence lands is emphasis — the visual equivalent of italics. The same applies to reveals timed to the answer of a question, and orbits that complete as a product's name appears.\n\nThe workflow: know your beats before you roll. If your subject will speak, know which line is the money line and choreograph the move around it, counting the seconds. If you are shooting b-roll to a planned voiceover or sound, shoot moves in lengths matching those beats — a three-second beat needs a move that resolves in three seconds plus handles.\n\nThis is why scripted shooters out-produce improvisers: the camera can only land on beats it knows are coming."
            }
          ],
          takeaways: [
            "Camera moves carry fixed emotional meanings — push-ins intensify, pull-outs reveal, orbits signify, statics assert authority.",
            "Every move must be motivated by character, emotion, or information; unmotivated movement spends attention without buying anything.",
            "Slow constant movement reads as expensive; halve your instinctive speed and keep it uniform within the move.",
            "Choreograph moves to land their arrival exactly on the content's payoff beat."
          ],
          actions: [
            "Take your next script or outline and mark the money beat — then design one move that resolves precisely on it.",
            "Reshoot a recent push-in at half your instinctive speed and compare which take feels more premium.",
            "Watch one luxury commercial and one sneaker commercial; log each camera move's motivation and speed."
          ],
          quiz: [
            {
              q: "A camera slowly pushes in while a founder describes their lowest moment. What motivates the move?",
              options: ["Character movement", "Emotional intensification", "New visual information", "Nothing — it is decoration"],
              answer: 1,
              why: "The move embodies the rising emotional weight of the beat — the camera leans in as the audience would."
            },
            {
              q: "What does deliberately slow camera movement communicate?",
              options: ["Low energy and boredom", "Technical limitation", "Confidence and premium positioning", "That the footage will be sped up later"],
              answer: 2,
              why: "Patient movement signals confidence that the audience will stay — the visual language of luxury brands."
            },
            {
              q: "You want a move that changes speed dramatically mid-shot. What is the professional approach?",
              options: ["Accelerate your hands during the take", "Shoot at 60fps and speed-ramp deliberately in the edit", "Cut the move into two shots", "Use digital zoom instead"],
              answer: 1,
              why: "In-take acceleration reads as error; capturing at high frame rate lets the edit place a controlled speed ramp exactly on the beat."
            }
          ],
          drill: "Film one 15-second shot where a slow push-in lands at its tightest frame exactly as a spoken or on-screen payoff hits. Retake until the sync is frame-accurate."
        },
        {
          id: "cinema-2-2",
          title: "Coverage: Shooting for the Edit",
          minutes: 10,
          xp: 60,
          skill: "editing",
          intro: "The edit is won or lost on set. Coverage is the system professionals use to guarantee the editor — usually future you — has everything needed to build rhythm, hide mistakes, and control time.",
          sections: [
            {
              h: "The Five-Shot System",
              body: "For any action — a barista pulling espresso, a mechanic torquing a bolt, you unboxing a product — there is a coverage recipe that guarantees a cuttable sequence:\n\n1. **Wide:** the whole scene. Who, where, doing what.\n2. **Medium:** the subject at work, waist up. The narrative workhorse.\n3. **Close-up on the hands:** the action itself, tight.\n4. **Close-up on the face:** concentration, reaction, emotion.\n5. **Creative shot:** over-the-shoulder, through-foreground, low angle, top-down — one frame nobody expects.\n\nFive shots, each held eight to ten seconds, and you can edit a clean sequence of almost any length with natural rhythm. This is the oldest documentary recipe in existence because it maps to how comprehension works: context, subject, action, feeling, surprise.\n\nShoot it as a checklist until it becomes reflex. The five-shot system is why a professional can walk into any location and come out with a story while an amateur comes out with forty seconds of one medium shot."
            },
            {
              h: "Overlap Action and Cut on Action",
              body: "Editors hide cuts inside movement — a cut placed mid-gesture, as a hand reaches or a door swings, is invisible because the viewer's eye is tracking the motion, not the frame change. This is **cutting on action**, and it only works if you shot for it.\n\nThe technique is **overlapping action**: when you change angles, have the subject repeat the full action in both setups. Shooting the pour? Capture the entire pour in the wide AND the entire pour in the close-up — not half in each. Now the editor can cut from wide to close at any instant inside the movement, and the seam disappears.\n\nBeginners shoot fragments — a bit of action here, a different bit there — and force the editor to cut between still moments, where every cut is visible and slightly jarring. The rule costs nothing but repetition: **complete actions, every angle, every time.** Direct your subject accordingly: 'do the whole thing again, exactly the same.'"
            },
            {
              h: "The 30-Degree Rule and Changing Two Things",
              body: "When two consecutive shots of the same subject are too similar, the cut between them 'jumps' — the subject appears to twitch across the screen. The classical guard against this is the **30-degree rule**: move the camera at least 30 degrees around the subject between setups.\n\nThe modern, more reliable version: **change two things between any two shots that will cut together — angle AND size.** Wide from the front, then close from 45 degrees to the side. Medium from the left, then insert from directly overhead. When both angle and size shift, the cut reads as a new piece of information rather than a stutter.\n\nDeliberate jump cuts — the vlogger's rapid same-frame cuts — are a legitimate style, but they are a choice with a specific energy, not a fallback. Know the rule so that when you break it, the break reads as rhythm rather than error. In coverage terms: never shoot your safety angles from lazy, adjacent positions."
            },
            {
              h: "Clean Entrances, Clean Exits, and Room to Breathe",
              body: "Three habits of shooters that editors love working with:\n\n**Clean in, clean out.** Start each shot with the frame empty or the action unstarted; let the subject enter, complete the action, and exit or settle before you cut. Empty-frame moments are gold — they let the editor start scenes, end scenes, and control pacing.\n\n**Handles on everything.** Roll two seconds before calling action and two seconds after it ends. Transitions, J-cuts, and audio crossfades all need those margins — a J-cut, where the next shot's audio leads under the current shot's picture, is impossible without spare heads and tails.\n\n**Room tone and wild sound.** Thirty seconds of the location's silence, plus clean recordings of key sounds — the espresso machine, the door, the zipper. Sound design is half of cinematic feel, and it is built from these scraps.\n\nNone of this appears in the frame. All of it appears in the final piece."
            }
          ],
          takeaways: [
            "The five-shot system — wide, medium, hands, face, creative — guarantees a cuttable sequence from any action.",
            "Overlap complete actions in every setup so the editor can cut on action and hide the seams.",
            "Change both angle and size between shots that will cut together; jump cuts should be a chosen style, never an accident.",
            "Shoot clean entrances and exits, roll handles on every take, and capture room tone — the invisible material that makes edits feel designed."
          ],
          actions: [
            "Shoot the five-shot system on one everyday action today and cut it into a 20-second sequence tonight.",
            "On your next shoot, direct your subject to repeat every key action fully in every setup.",
            "Record 30 seconds of room tone at your next location and use it under your edit's cuts."
          ],
          quiz: [
            {
              q: "Why must the subject repeat the complete action in both the wide and the close-up?",
              options: ["To warm up their performance", "So the editor can cut mid-movement at any point and hide the cut", "To check focus in both setups", "Because platforms require multiple angles"],
              answer: 1,
              why: "Cutting on action only works when the full movement exists in both angles — fragments force cuts between still moments."
            },
            {
              q: "Two consecutive shots of the same subject look nearly identical and the cut 'twitches.' What was violated?",
              options: ["The 180-degree line", "The rule of thirds", "The 30-degree rule", "The safe-zone rule"],
              answer: 2,
              why: "Setups less than ~30 degrees apart (without a size change) produce jump cuts; change angle and size between cutting shots."
            },
            {
              q: "What does rolling two seconds of handles before and after each action enable?",
              options: ["Better autofocus", "Higher bitrate recording", "J-cuts, transitions, and audio crossfades in the edit", "Longer battery life"],
              answer: 2,
              why: "Edit techniques that overlap sound and picture need spare frames at the heads and tails of every clip."
            }
          ],
          drill: "Cover one 30-second real-world process with the five-shot system plus one insert, overlapping the full action in every setup — then edit it twice: once cutting on action, once cutting between still moments. Feel the difference."
        },
        {
          id: "cinema-2-3",
          title: "Gimbal, Body, and the Illusion of a Dolly",
          minutes: 10,
          xp: 60,
          skill: "video",
          intro: "You do not need a dolly, a jib, or a Steadicam operator. You need to understand what those tools do to an image — and how a gimbal, your body, and parallax can fake ninety percent of it.",
          sections: [
            {
              h: "What Stabilized Movement Is Actually For",
              body: "A gimbal does not exist to make walking footage smooth. It exists to produce **machine-quality movement** — the gliding dolly and crane vocabulary of cinema — without the machinery.\n\nThat distinction changes how you use one. Amateurs turn the gimbal on and wander; the footage is smooth and shapeless, a float with no grammar. Professionals use the gimbal to execute specific named moves: the push-in down an aisle, the lateral track past a facade, the low-mode glide behind heels, the rise from tabletop to eye level.\n\nKnow your modes. **Pan follow** (tilt locked) is the workhorse for tracks and orbits. **Lock mode** holds one orientation for push-ins with mechanical discipline. **Full follow / FPV** is expressive and dangerous — reserve it for deliberate energy. And calibrate before every session; a drifting horizon is the gimbal footage tell.\n\nOne rule keeps everything honest: decide the move, rehearse the move, then roll. The gimbal is an instrument, not an effect."
            },
            {
              h: "The Ninja Walk, Properly",
              body: "A gimbal stabilizes rotation, not position — it cannot remove the vertical bounce of your steps. That is your job, and the technique is the **ninja walk**:\n\n1. Knees bent, sinking your height an inch or two — your legs become the suspension.\n2. Heel-to-toe foot placement, rolling each step rather than planting it.\n3. Shorter steps than feel natural, at an even tempo.\n4. Arms slightly extended, letting elbows and shoulders absorb what the knees miss.\n5. Eyes on the frame, not the floor — walk a rehearsed path so you can trust your feet.\n\nPractice until you can carry a full cup of coffee at walking pace without a ripple; that is genuinely the skill. The ninja walk matters even more without a gimbal — combined with a phone's internal stabilization it produces convincingly smooth movement at wide focal lengths.\n\nBackward walking (for leading a subject) is the advanced exam: same mechanics, plus a spotter's hand on your shoulder when terrain is unknown. No shot is worth stepping backward off a curb."
            },
            {
              h: "Parallax: The Ingredient That Makes Movement Visible",
              body: "Here is why some gliding shots feel dimensional and expensive while others feel like a screensaver: **parallax** — near objects crossing the frame faster than far ones as the camera translates through space.\n\nA gimbal move across an empty room shows almost nothing changing; the movement is real but invisible. The same move past a chair in the near foreground becomes cinematic instantly, because the chair sweeps across frame while the background barely shifts, and the viewer's brain reads depth.\n\nSo the rule for every moving shot: **put something between you and the subject.** Track laterally past pillars, push in past a shoulder, orbit so foreground objects wipe across frame. Cinematographers deliberately stage 'dirty' frames — edges occluded by out-of-focus foreground — precisely to feed parallax.\n\nBonus: a foreground object that fully wipes the lens for a few frames is a free in-camera transition — cut to the next shot inside the wipe and the edit becomes seamless. Choreograph one wipe per location and your transitions solve themselves."
            },
            {
              h: "Faking the Expensive Toys",
              body: "The classic machinery, translated to a body and a gimbal:\n\n- **Slider:** a 12-to-18-inch lateral drift with locked height and tilt. Feet planted shoulder-width, shift weight from one leg to the other — the hips are the rail. Keep it short; sliders live on restraint.\n- **Jib/crane:** a rise or fall combined with a tilt that holds the subject in frame. Start in a squat, camera low; rise slowly through the legs while tilting down to keep composition. Reverse for a descend.\n- **Dolly-in:** the ninja-walk push, lock mode, target fixed at frame center.\n- **Cable cam:** a long, straight lateral at even tempo, subject deep in frame — shoot at 60fps and stabilize slightly in post for the machine feel.\n\nShoot all faked moves at 60fps when possible: a 20 percent slow-down in the edit polishes tempo irregularities the body could not avoid, and gives you speed-ramp latitude.\n\nThe honest secret of gear: audiences see the movement, never the machinery. Discipline reads as budget."
            }
          ],
          takeaways: [
            "A gimbal exists to execute named, rehearsed moves — not to smooth aimless wandering.",
            "The ninja walk (bent knees, heel-to-toe, short even steps) removes the vertical bounce gimbals cannot fix.",
            "Parallax through foreground elements is what makes camera movement visible and dimensional — stage something to move past.",
            "Slider, jib, and dolly moves can be faked with body mechanics; shooting at 60fps lets the edit polish the tempo."
          ],
          actions: [
            "Practice the ninja walk until you can carry a full coffee cup 20 steps without a ripple.",
            "Shoot the same lateral move twice — once across open space, once past a foreground object — and compare the sense of depth.",
            "Fake one slider, one jib, and one dolly-in move today at 60fps, then slow each 20 percent in the edit."
          ],
          quiz: [
            {
              q: "Why does a gimbal move across an empty room feel static despite real movement?",
              options: ["The gimbal motor cancels the motion", "Without foreground parallax, nothing in frame changes position relative to anything else", "Empty rooms absorb light", "Frame rate is too low"],
              answer: 1,
              why: "Movement reads through parallax — near objects crossing faster than far ones. No layers, no visible motion."
            },
            {
              q: "What problem does the ninja walk solve that the gimbal cannot?",
              options: ["Horizon drift", "Autofocus hunting", "Vertical bounce from footsteps", "Rolling shutter"],
              answer: 2,
              why: "Gimbals stabilize rotation, not position — the up-and-down of walking must be absorbed by bent knees and rolling steps."
            },
            {
              q: "Why shoot faked machinery moves at 60fps?",
              options: ["It increases sharpness", "Platforms prefer 60fps uploads", "A slight slow-down in post smooths tempo irregularities and enables ramps", "It reduces file size"],
              answer: 2,
              why: "Slowing 60fps footage ~20 percent irons out human tempo wobble and leaves latitude for deliberate speed ramps."
            }
          ],
          drill: "Choreograph one foreground wipe transition: end shot A by letting a pillar or object fully cross the lens, start shot B emerging from a similar wipe, and cut them inside the occlusion."
        },
        {
          id: "cinema-2-4",
          title: "Lens Language: Focal Length Is Psychology",
          minutes: 9,
          xp: 60,
          skill: "video",
          intro: "Focal length is not about how much fits in frame — it is about how the audience feels about what fits. Wide, normal, and telephoto are three different emotional relationships with the subject.",
          sections: [
            {
              h: "Wide: Context, Energy, and Honest Distortion",
              body: "Wide lenses — roughly 16-24mm full-frame, the 0.5x on your phone — exaggerate depth. Near things loom; far things recede fast; straight lines bow at the edges. That exaggeration is a personality.\n\nUse wides for **environment as character** (the workshop, the skyline, the kitchen in motion), for **energy** (the stretched perspective makes any movement feel faster and more immersive), and for **handheld work**, since shake shrinks with focal length.\n\nRespect the distortion rule: wides placed close to faces bulge noses and foreheads — comedic or grotesque, never flattering. Keep wides at least an arm's length from faces, or use the distortion deliberately for POV chaos.\n\nOne more wide superpower: because everything stays acceptably sharp, wides forgive focus errors during movement. When you must move fast and cannot pull focus, go wide, get close, and let depth of field cover you. Action and vlog shooters live at 18-24mm for exactly this reason."
            },
            {
              h: "Normal: The Human Frame",
              body: "Focal lengths around 35-50mm — near your phone's 1x — see space roughly the way human vision weighs it. No stretching, no compression: the honest lens.\n\nThat neutrality is the point. Normal lenses disappear; the audience registers the subject, not the photography. Documentary, conversational content, day-in-the-life storytelling, and any moment where trust matters more than drama belongs here. The 35mm walk-and-talk and the 50mm seated interview are defaults across a century of filmmaking because they read as 'a person, plainly seen.'\n\nNormal focal lengths also carry composition weight honestly: your three-layer depth staging, lead room, and thirds all behave predictably, without wide-angle exaggeration or telephoto flattening to lean on. Which makes the normal range the best practice range — if a frame looks great at 35mm, the composition is genuinely great, not a lens effect.\n\nWhen unsure what a scene needs, start at normal. Then choose distortion or compression only if the story asks for it."
            },
            {
              h: "Telephoto: Compression, Isolation, Luxury",
              body: "Telephoto lenses — 85mm and beyond, the 3x-5x on a phone — do two things that define the premium look.\n\n**Compression:** distant planes stack together. The mountains crowd behind the subject; a street's lights pile into a wall of bokeh; a car and the skyline occupy the same visual plane. Backgrounds become dense, painterly, and important.\n\n**Isolation:** narrow field of view plus shallow depth of field carves the subject out of the world. One face sharp against melted color reads instantly as intentional, expensive, considered.\n\nThis is why luxury commercials live on long glass: compression flatters faces (features flatten pleasingly — the opposite of wide distortion), backgrounds turn to velvet, and the physical distance between camera and subject produces an observed, reverent quality — the camera admires from afar rather than intruding.\n\nCosts: telephoto magnifies shake (tripod or serious stabilization territory), needs physical room to back up, and on phones, the small tele sensor wants abundant light. Pay those costs for your hero shots; the look is the payoff."
            },
            {
              h: "Aperture Discipline and the Phone Mapping",
              body: "Aperture sets depth of field, and shallow focus is the most abused tool in modern video. Shooting everything at f/1.8 costs you two things: **focus reliability** (a moving subject at f/1.8 slips out of the razor-thin sharp zone constantly) and **meaning** (if everything is isolated by blur, isolation stops signifying anything).\n\nWorking guidance: interviews and statics can afford f/1.8-f/2.8; moving subjects want f/4; environmental storytelling often wants f/5.6 or deeper so context reads. Depth of field, like slow motion, is emphasis — spend it where emphasis belongs.\n\nPhone mapping: 0.5x = wide (context, energy, handheld), 1x = normal (honest default), 3x-5x = telephoto (compression, hero shots — give it light and stability). Portrait/cinematic modes simulate shallow depth; use them for statics where edge artifacts stay hidden, not for critical moving shots.\n\nAnd never digital-zoom between optical steps — you are cropping pixels, not changing perspective. Move your feet to change framing; change lenses to change psychology."
            }
          ],
          takeaways: [
            "Wide lenses exaggerate depth: use for environment, energy, and handheld work — but keep them away from faces.",
            "Normal focal lengths (35-50mm, phone 1x) are the honest, trust-building default that lets composition stand on its own.",
            "Telephoto compression and isolation are the grammar of the premium look — pay the stability and light costs for hero shots.",
            "Depth of field is emphasis: reserve f/1.8 isolation for beats that deserve it, and never digital-zoom between optical lenses."
          ],
          actions: [
            "Shoot the same subject at 0.5x, 1x, and 3x from distances that keep framing constant — study how background and face rendering change.",
            "Identify the one hero shot of your next video and shoot it on your longest optical lens with proper support.",
            "Audit your recent footage for focus misses caused by shooting moving subjects wide open; note where f/4 would have saved the take."
          ],
          quiz: [
            {
              q: "Why do luxury commercials favor long lenses?",
              options: ["They are cheaper to rent", "Compression flatters subjects, densifies backgrounds, and the distant camera feels reverent", "They require less light", "They hide camera shake"],
              answer: 1,
              why: "Telephoto compression and isolation produce the observed, painterly, intentional quality that premium brands trade on."
            },
            {
              q: "You are filming a fast-moving subject handheld and cannot pull focus. Which focal range covers you best?",
              options: ["85mm telephoto", "50mm normal", "A wide lens up close", "Digital zoom at 10x"],
              answer: 2,
              why: "Wides carry deep depth of field and shrink handheld shake, forgiving both focus and stability errors during action."
            },
            {
              q: "What is the main cost of shooting everything at f/1.8?",
              options: ["Files become larger", "Focus reliability drops and blur stops carrying meaning", "Colors desaturate", "Battery drains faster"],
              answer: 1,
              why: "A razor-thin focus plane misses moving subjects, and universal isolation makes isolation meaningless as emphasis."
            }
          ],
          drill: "Recreate one frame from a luxury ad you admire using your phone's 3x lens, stabilized, with the subject isolated against a compressed background — then shoot the identical composition at 0.5x and study why it dies."
        },
        {
          id: "cinema-2-5",
          title: "Lighting for Video I: One Window, One Face",
          minutes: 10,
          xp: 60,
          skill: "video",
          intro: "You do not need a light kit to light well — you need to see light. This lesson builds the entire foundation of lighting for video around one window, one face, and one white surface.",
          sections: [
            {
              h: "Key, Fill, Back: A Vocabulary, Not a Law",
              body: "Classical lighting names three roles. The **key** is the main source that shapes the face — its position and quality define the look. The **fill** softens the shadows the key creates — not a second light so much as controlled bounce. The **back light** (or rim) skims the subject from behind, drawing a bright edge along hair and shoulders that separates them from the background.\n\nLearn this as vocabulary, not as a mandatory three-light recipe. Most great natural-light setups are a key plus intelligent bounce; the 'back light' is often just a brighter background zone doing separation work. What the vocabulary gives you is diagnosis: when a shot looks wrong, you can name the problem. Face flat and lifeless? Key too frontal. Eye sockets black? Key too high. Subject merging into the wall? No separation. Shadows harsh? Fill missing.\n\nEvery lighting decision for the rest of this school is a variation on these three roles. Name the roles in every setup you admire, and you will start seeing light instead of just standing in it."
            },
            {
              h: "The Window Is Your First Key Light",
              body: "A window with indirect daylight is a large, soft, free key light that professionals would pay hundreds to replicate. The craft is in the geometry:\n\n- **45/45 placement:** subject facing the window at roughly 45 degrees horizontal, light arriving slightly above eye level. This models the face — one side bright, the other gently shadowed — creating the dimensionality that flat frontal light kills.\n- **Avoid direct sun** through the window; you want the bright sky, not the solar disk. Direct beams are hard light — a different tool for a later lesson.\n- **Distance matters:** the closer the subject sits to the window, the softer and wrappier the light, and the faster the background falls into shadow behind them — free contrast.\n\nTurn the subject slowly through 180 degrees in front of a window once, watching the face: from silhouette (window behind) through dramatic side light to flat frontal. Ten minutes of that rotation teaches more about key placement than any diagram."
            },
            {
              h: "Bounce and the Poor Man's Fill",
              body: "Once the window keys one side of the face, the other side falls dark. Whether that darkness is 'moody' or 'muddy' is a ratio decision — and you control it with bounce.\n\nA white surface — foam board, a sheet of paper, a white wall, a car sunshade — placed on the shadow side reflects the key back into the shadows, lifting them. Move it closer: shadows lift, look turns brighter, safer, more corporate. Pull it away: shadows deepen, mood arrives. That is fill in its purest form, and it costs nothing.\n\nThe opposite tool matters just as much: **negative fill.** A dark surface on the shadow side absorbs bounce and deepens the shadow — the fastest way to add cinematic contrast in a bright white room that fills everything by itself. Foam board is white on one side, black on the other, for exactly this reason.\n\nOne subject, one window, one board — flipping it white or black — is a complete lighting education and a genuinely professional setup."
            },
            {
              h: "Motivated Light and the Mistakes That Mark Amateurs",
              body: "**Motivated lighting** means every light in your scene appears to come from a source the audience can see or infer — the window, the desk lamp, the neon sign, the laptop screen. Light that arrives from nowhere reads as artificial even when viewers cannot say why. Practical trick: put the visible source (a lamp, a candle, string lights) in frame, then do the real work with your key from the same direction. **Practicals** in frame add depth, warmth, and background interest for the price of a bulb.\n\nThe amateur tells, so you can kill them today:\n\n- **Overhead ceiling light as key:** black eye sockets, greasy forehead shine. Turn it off; it is the single most common video lighting error.\n- **Mixed color temperatures:** orange lamp on one cheek, blue window on the other. Choose one family per scene.\n- **Subject against a bright window:** auto-exposure crushes the face to silhouette. Face the window instead.\n- **Bare LED aimed straight on:** flat, harsh, shadowless. Bounce it off a wall or through diffusion — never naked at a face."
            }
          ],
          takeaways: [
            "Key, fill, and back are diagnostic vocabulary — name the role that is failing and the fix names itself.",
            "A window at 45/45 is a professional-grade soft key; distance to the window controls softness and background falloff.",
            "One white/black board is both fill and negative fill — the ratio between key and shadow side is the mood dial.",
            "Motivate every light from a visible or inferable source, and kill the amateur tells: overhead keys, mixed color temperatures, and backlit windows."
          ],
          actions: [
            "Do the window rotation exercise: turn a subject (or yourself on selfie camera) through 180 degrees in front of a window and screenshot the five distinct looks.",
            "Buy or make one white/black bounce board and shoot the same frame with white fill, black negative fill, and no board.",
            "Turn off every overhead light in your filming space today and relight the room from lamps and the window."
          ],
          quiz: [
            {
              q: "What is the role of a back light?",
              options: ["To brighten the background wall", "To fill facial shadows", "To draw an edge on the subject that separates them from the background", "To motivate the practicals"],
              answer: 2,
              why: "The rim of light along hair and shoulders carves the subject out of the background — separation, not illumination."
            },
            {
              q: "What does negative fill do?",
              options: ["Reduces exposure globally", "Absorbs bounce on the shadow side to deepen contrast", "Removes color casts", "Softens the key light"],
              answer: 1,
              why: "A dark surface near the shadow side soaks up ambient bounce, restoring cinematic contrast in over-bright rooms."
            },
            {
              q: "Why does overhead ceiling lighting ruin faces on camera?",
              options: ["It is usually too dim", "Top-down light drops eye sockets into shadow and shines the forehead", "It changes the frame rate", "It causes rolling shutter"],
              answer: 1,
              why: "Light from directly above models the face like a horror poster — dark eyes, hot forehead — the opposite of a 45/45 key."
            }
          ],
          drill: "Light one talking-head frame three ways using only a window and a two-sided board — bright and safe, balanced, and moody — and label which brand personality each version would serve."
        }
      ]
    },
    {
      id: "cinema-3",
      level: "Advanced",
      title: "Light, Story, and the Sequence",
      description: "Shaping light with contrast and ratios, blocking and screen direction, building complete visual stories without dialogue, advanced vertical composition, and shooting footage the colorist will thank you for.",
      lessons: [
        {
          id: "cinema-3-1",
          title: "Shaping Light: Contrast Is the Look",
          minutes: 11,
          xp: 75,
          skill: "video",
          intro: "Beginners chase brightness; cinematographers chase contrast. The gap between your key side and your shadow side is the single biggest variable in whether footage reads as flat content or shaped cinema.",
          sections: [
            {
              h: "Hard and Soft: It's About Size and Distance",
              body: "Light quality — hard or soft — is governed by one physical fact: **the apparent size of the source from the subject's position.** Big and close = soft, wrapping light with gentle shadow edges. Small or far = hard light with crisp, dark-edged shadows. The sun is enormous but so distant it acts tiny — hence brutal noon shadows; an overcast sky turns the entire atmosphere into the source — hence shadowless softness.\n\nEverything cinematographers do to light is size manipulation. **Diffusion** (a scrim, a shower curtain, a thin white sheet in front of a source) enlarges the effective source. **Bounce** (firing a light into a wall or board) turns the wall into the source. Moving a softbox closer softens it further — counterintuitive, but the geometry is the geometry.\n\nNeither quality is 'better.' Soft flatters faces and sells trust; hard sculpts drama, texture, and edge. What marks the amateur is not choosing — hard light by accident, soft light by default. Choose per shot, on purpose."
            },
            {
              h: "Ratios: The Mood Dial You Can Count",
              body: "The **contrast ratio** between the bright (key) side of the face and the shadow (fill) side is a measurable mood setting.\n\n- **2:1** — shadow side one stop darker. Bright, open, trustworthy: corporate interviews, beauty, tutorials.\n- **4:1** — two stops darker. Shaped and cinematic without menace: the premium default for brand films and serious talking heads.\n- **8:1 and beyond** — three-plus stops. Drama, noir, mystery: half the face falls toward black.\n\nYou can eyeball ratios with your exposure tools: meter or zebra the key cheek, then the shadow cheek, and count the stops between them. On a phone, tap-metering each cheek and reading the exposure shift gets you close enough.\n\nThe operating insight: ratio is controlled almost entirely by fill — how much bounce reaches the shadow side. Same key, white board close = 2:1; board removed = 4:1; black negative fill = 8:1. One board, three genres. Decide the ratio before you roll, the way you decide the frame."
            },
            {
              h: "Separation: Lighting the Subject Off the Background",
              body: "A shaped face against a wall of identical brightness still looks flat, because the silhouette dissolves. Separation — subject visually distinct from background — is a lighting job with three levers:\n\n1. **Brightness offset.** Aim for the background a stop or more darker than the subject's key side (or, for high-key looks, deliberately brighter). Physical distance from subject to wall is the free version: light falls off fast, so pulling your subject two meters off the wall drops the wall into darkness automatically.\n2. **Edge light.** The classic back/rim light traces a bright line along hair and shoulders. Even a cheap LED tube behind and above, out of frame, buys instant dimensionality.\n3. **Color offset.** A warm subject against a cool background (or the reverse) separates by hue what brightness alone might not — the orange-teal grammar of modern commercial work begins on set.\n\nCheck separation by squinting at your monitor: if the subject melts into the frame when blurred, no grade will save it."
            },
            {
              h: "Building a Look in Layers",
              body: "Professional setups are built in a strict order, and adopting the order will discipline everything you light:\n\n1. **Ambient first.** Kill or control the existing light — overheads off, windows flagged or embraced. You cannot add a look on top of chaos.\n2. **Key next.** Place and shape the main source; set your exposure to it. The key defines the shot.\n3. **Fill third.** Set the ratio with bounce or negative fill. This is the mood decision.\n4. **Separation fourth.** Edge light or background offset until the subject pops when you squint.\n5. **Practicals and accents last.** Lamps in frame, a slash of light on the back wall, a glint in the product — the jewelry of the frame.\n\nAt each layer, look at the monitor, not the room; the camera's dynamic range is the only reality that matters. And build with the fewest sources that achieve the look — every added light multiplies shadows to manage. One shaped key with intelligent fill beats four lights fighting."
            }
          ],
          takeaways: [
            "Softness is a function of source size and distance — diffusion and bounce exist to make sources bigger.",
            "Contrast ratios are countable moods: 2:1 open and corporate, 4:1 cinematic, 8:1 dramatic — and fill is the dial.",
            "Separation comes from brightness offset, edge light, or color offset; squint at the monitor to test it.",
            "Build looks in order — ambient, key, fill, separation, accents — with the fewest sources possible."
          ],
          actions: [
            "Shoot the same portrait at 2:1, 4:1, and 8:1 using one key and a two-sided board; label each with the genre it serves.",
            "Pull your subject two meters off the background wall and compare the free separation against your usual setup.",
            "Practice the five-layer build order on your next setup, checking the monitor after each layer."
          ],
          quiz: [
            {
              q: "What makes a light source render soft?",
              options: ["Low power output", "A warm color temperature", "Large apparent size relative to and close to the subject", "Being placed behind the camera"],
              answer: 2,
              why: "Softness is geometry: the bigger the source appears from the subject's position, the more the shadows wrap and blur."
            },
            {
              q: "Which contrast ratio is the premium default for cinematic talking heads?",
              options: ["1:1", "2:1", "4:1", "16:1"],
              answer: 2,
              why: "Two stops between key and fill side shapes the face noticeably without tipping into drama — the brand-film standard."
            },
            {
              q: "Your subject visually melts into the background. Which is NOT a fix?",
              options: ["Add an edge light behind the subject", "Move the subject farther from the wall", "Increase overall exposure of the whole frame", "Introduce a warm/cool color offset"],
              answer: 2,
              why: "Raising everything together preserves the sameness; separation requires a difference — in brightness, edge, or hue."
            }
          ],
          drill: "Recreate a frame from a film or commercial you admire, reverse-engineering it in layers: identify its key direction, ratio, and separation method before you attempt the match."
        },
        {
          id: "cinema-3-2",
          title: "Blocking, Eyelines, and the Line",
          minutes: 10,
          xp: 75,
          skill: "video",
          intro: "Where people stand, where they look, and which side of them the camera lives on — this invisible geometry is why professional scenes feel coherent and amateur scenes feel subtly wrong.",
          sections: [
            {
              h: "The 180-Degree Line",
              body: "Draw an imaginary line through your scene's axis of action — between two people talking, or along a subject's direction of travel. Keep the camera on one side of that line for the whole sequence and something valuable happens: **screen direction stays consistent.** Person A always looks right, person B always looks left; the car always travels left-to-right. The audience builds a mental map of the space and never has to think about it.\n\nCross the line between cuts and the map shatters — subjects appear to swap places, the car reverses direction mid-journey, conversations feel like the participants are ignoring each other. Viewers rarely diagnose the error; they just feel the scene wobble.\n\nYou can cross legally: **on a visible camera move** (the audience travels across the line with you), **through a neutral shot** (straight down the line, or a cutaway insert), or **when the subject themselves turns** and establishes a new axis. Know the line, honor it by default, and cross it as a decision."
            },
            {
              h: "Eyelines Carry the Story",
              body: "An **eyeline** is where a subject appears to look, and audiences track eyelines obsessively — it is hardwired attention-following. Two working rules:\n\n**Interview eyeline:** for conversational content, place the interviewer (or a taped mark) just beside the lens, so the subject looks a few degrees off-axis. This reads as candid and observed — the documentary standard. Looking dead into the lens is a different tool entirely: **direct address**, the language of authority, salesmanship, and intimacy with the viewer. Social thrives on direct address for hooks and CTAs; use off-axis for storytelling middles. Mixing the two inside one video is legitimate grammar — into-lens for 'you', off-axis for 'once, this happened.'\n\n**Matching eyelines across cuts:** if a subject looks down-left at an object, the following insert must be shot from an angle consistent with that gaze — the object seen roughly from where their eyes would find it. When look and reveal align, the audience feels the space; when they mismatch, the cut quietly lies."
            },
            {
              h: "Blocking: Choreograph Toward the Lens",
              body: "**Blocking** is the staged movement of subjects within the frame — and staged is the operative word. The strongest blocking axis on camera, especially in vertical, is depth: subjects approaching the lens grow in the frame with dramatic force no lateral cross can match, and retreating subjects surrender the frame with equal power.\n\nThree blocking patterns worth stealing:\n\n- **The walk-up:** subject enters deep in frame and approaches to a medium or close-up, arriving exactly as the key line lands. One shot, built-in escalation.\n- **The turn:** subject faces away or aside, then turns to camera on the beat — a reveal made of body language.\n- **The cross-and-settle:** subject moves through frame and settles into a new composition, letting one shot contain two distinct frames.\n\nBlock movement to arrive on beats, exactly like camera moves. And rehearse: walk the path, mark the end position (a piece of tape on the floor is the oldest tool in cinema), then roll. Blocking that lands on marks reads as cinema; wandering reads as vlogging."
            },
            {
              h: "Staging in Depth",
              body: "Advanced blocking stages multiple elements at different distances — **foreground, midground, background as narrative layers**, not just visual ones.\n\nThe barista pulls a shot in sharp midground while the customer waits soft in the background: one frame, two story elements, a relationship expressed spatially. The product stands crisp in foreground while its owner moves blurred behind it: hierarchy declared by focus. A **rack focus** — shifting focus from one layer to another mid-shot — is an edit inside a single take: attention transferred without a cut, one of the most elegant moves available on any camera with focus control (and now achievable in phone cinematic modes).\n\nDepth staging also solves the two-subject problem in vertical frames: with no width to place people side by side, stack them in depth — one near, one far — and let focus or blocking pass the frame between them.\n\nThe habit to build: stop staging scenes like a wall (everything at one distance) and start staging like a hallway. Depth is free; use all of it."
            }
          ],
          takeaways: [
            "Keep the camera on one side of the axis of action; cross the 180-degree line only via movement, neutral shots, or a subject's turn.",
            "Off-axis eyelines read as documentary; direct address reads as authority — assign them deliberately, and match eyelines across cuts.",
            "Block subject movement on the depth axis to arrive on beats and marks, not wander.",
            "Stage scenes like a hallway, not a wall — layers in depth plus rack focus let one shot do the work of an edit."
          ],
          actions: [
            "Storyboard a two-person or person-object scene, draw the axis of action, and mark legal camera positions before shooting.",
            "Shoot one walk-up: subject approaches from deep frame and lands a key line at a taped mark in medium close-up.",
            "Practice a rack focus (or phone cinematic-mode focus shift) between a foreground object and a background subject."
          ],
          quiz: [
            {
              q: "Cutting between two shots taken from opposite sides of a conversation makes the speakers appear to swap places. What rule was broken?",
              options: ["The 30-degree rule", "The 180-degree line", "The rule of thirds", "The 180-degree shutter rule"],
              answer: 1,
              why: "Crossing the axis of action between cuts flips screen direction and shatters the audience's spatial map."
            },
            {
              q: "When is looking directly into the lens the right choice?",
              options: ["Never — it breaks immersion", "During observational documentary moments", "For direct address: hooks, authority statements, and CTAs aimed at the viewer", "Only in horizontal video"],
              answer: 2,
              why: "Direct address speaks to the viewer as 'you' — the native grammar of social hooks and calls to action."
            },
            {
              q: "What does a rack focus accomplish?",
              options: ["It stabilizes the shot", "It transfers audience attention between depth layers without a cut", "It corrects exposure between takes", "It widens the field of view"],
              answer: 1,
              why: "Shifting focus between staged layers redirects attention inside a single take — an edit performed by the lens."
            }
          ],
          drill: "Shoot a 20-second two-element scene staged in depth — one subject near, one far — passing attention between them twice using only focus and blocking, no cuts."
        },
        {
          id: "cinema-3-3",
          title: "The Ten-Shot Story",
          minutes: 11,
          xp: 75,
          skill: "video",
          intro: "Visual storytelling means the pictures alone carry the narrative — mute the video and a stranger still understands beginning, middle, and end. This lesson gives you the sequence grammar to build that with ten shots.",
          sections: [
            {
              h: "Sequence Grammar: The Six Beats",
              body: "Almost every satisfying visual sequence — a scene in a film, a 45-second brand story, a day-in-the-life reel — walks through six beats:\n\n1. **Establish:** where are we? The wide, the detail that implies a world, the skyline at dawn.\n2. **Approach:** someone or something enters the situation. Movement toward.\n3. **Engage:** the central action begins. Hands start working, the meeting starts, the door opens.\n4. **Detail:** inserts that prove and texture the action — the craft beats.\n5. **Turn:** something changes. The taste test, the reaction, the reveal, the problem, the finish line.\n6. **Resolve:** the new state. The finished object, the satisfied face, the empty room, departure.\n\nNotice this is a story shape, not a shot list — each beat can be one shot or three. But when a sequence feels like 'random clips,' one of these beats is missing, usually the turn. Footage without a turn is footage without a story; it is the beat where something is different after than before."
            },
            {
              h: "The Kuleshov Pair: Cause and Effect in Two Shots",
              body: "The foundational discovery of editing — the Kuleshov effect — is that audiences manufacture meaning **between** shots. A face, then a bowl of soup: he is hungry. The same face, then a coffin: he is grieving. Neither shot alone says either.\n\nAs a shooter, this hands you the most efficient storytelling unit that exists: the **look plus the thing seen.** Shot A: subject looks at something off-frame. Shot B: what they see. The pair generates thought, desire, dread, or humor with no dialogue and no acting ability required — the audience does the acting internally.\n\nBuild pairs deliberately: the chef eyes the ticket rail → the flooded order screen. The buyer's glance → the price tag. Your face → the unopened package. Then chain pairs into runs: look → object → reaction is a three-shot arc with a built-in emotional turn.\n\nCoverage implication: whenever you shoot someone noticing anything, immediately shoot their POV of it. The pair is worthless as one half."
            },
            {
              h: "Shooting Silence: Story Without a Word",
              body: "The sternest test of cinematography is a sequence that works muted, and social platforms make it mandatory — a large share of viewers watch without sound, and even sound-on viewers read the images first.\n\nTechniques that carry story silently:\n\n- **Action verbs, not states.** Shoot people doing — pouring, signing, lifting, failing — never just being. Verbs are legible; moods are not.\n- **Progress markers.** Show visible change across the sequence: the empty pan then the plated dish, dawn light then dusk light, clean hands then worked hands. The audience reads time and effort from the deltas.\n- **Escalating shot sizes.** Wide to close across the sequence mirrors rising stakes — the composition itself narrates intensification.\n- **Objects as narrators.** A packed suitcase, keys left on a counter, one glass or two: props declare plot.\n\nThe working test: describe your sequence in six verbs before shooting. If you cannot, the story is not visual yet — it lives in your intended caption, which is a warning sign, not a plan."
            },
            {
              h: "The Ten-Shot Discipline",
              body: "Here is the exercise this lesson is named for, used in film schools and worth running monthly for the rest of your career: tell a complete story in **exactly ten shots** — no more, no fewer, no dialogue.\n\nWhy the constraint works: unlimited shots let you postpone decisions to the edit; ten force every shot to hold a job. You must budget — probably one establish, one approach, two engage, three details, one turn expressed visually, two resolve — and the budgeting is the education. Every shot must advance the story or die.\n\nRules of engagement: plan on paper first (ten lines, each starting with a verb); use at least four different shot sizes; include one Kuleshov pair; make the turn unmistakable in pictures alone. Then cut in strict order, straight cuts only, no music on the first pass — if it works dry, music will only lift it.\n\nMaster this and every reel, ad, and brand film becomes an arrangement problem instead of a mystery. Sequences are not found in the edit. They are shot."
            }
          ],
          takeaways: [
            "Sequences follow six beats — establish, approach, engage, detail, turn, resolve — and 'random clips' usually means the turn is missing.",
            "The Kuleshov pair (look + thing seen) is the most efficient story unit in film; always shoot both halves.",
            "Silent legibility is mandatory on social: shoot verbs, progress markers, escalating sizes, and narrating objects.",
            "The ten-shot exercise forces every frame to hold a job — run it monthly."
          ],
          actions: [
            "Write your next video as six beats before shooting, and confirm the turn is expressed visually, not in the caption.",
            "Shoot one deliberate Kuleshov pair today and cut it both ways with two different B-shots to feel the meaning shift.",
            "Run the ten-shot story exercise this week on any everyday narrative — plan ten verbs, shoot ten shots, cut in order."
          ],
          quiz: [
            {
              q: "A sequence of beautiful clips feels like 'random footage.' Which story beat is most likely missing?",
              options: ["The establish", "The detail", "The turn", "The approach"],
              answer: 2,
              why: "Without a visible change of state, there is no story — the turn is the beat that makes before differ from after."
            },
            {
              q: "What does the Kuleshov effect demonstrate?",
              options: ["Audiences prefer close-ups", "Meaning is manufactured by the juxtaposition between shots", "Longer takes increase retention", "Sound carries most of the story"],
              answer: 1,
              why: "The same face reads as hunger or grief depending on the adjacent shot — the audience builds meaning between images."
            },
            {
              q: "Why plan a silent sequence in verbs rather than moods?",
              options: ["Verbs are shorter to write", "Cameras cannot capture emotion", "Actions are visually legible; internal states are not", "Platforms penalize mood content"],
              answer: 2,
              why: "A viewer can see pouring, signing, or failing; they cannot see 'feeling inspired' unless an action expresses it."
            }
          ],
          drill: "Mute three of your recent videos and watch them cold. Score each: could a stranger state the beginning, the turn, and the resolution? Rewrite the weakest one as a ten-shot silent plan."
        },
        {
          id: "cinema-3-4",
          title: "Vertical Craft: Composing 9:16 for Retention",
          minutes: 10,
          xp: 75,
          skill: "video",
          intro: "In vertical video, composition and retention are the same discipline. Where the eye lands, how layers move, and when the frame surprises — this is retention engineered at the moment of capture, not rescued in the edit.",
          sections: [
            {
              h: "The Eye Path and the Hook Zone",
              body: "On a phone held at natural distance, the viewer's gaze rests in the **upper-center of the frame** — roughly where a face's eyes sit in a well-framed vertical close-up. That resting zone is your hook zone: whatever occupies it in the first second is what the brain evaluates during the swipe decision.\n\nCompose second zero accordingly. A face with readable eyes, a bold object, or high-contrast text belongs in the upper-center immediately — not after a title card, not following a drifting establishing shot. If your opening frame parks the subject low or small, the viewer's eye has to hunt, and hunting costs the fraction of a second that decides a swipe.\n\nThen design the **eye path**: verticals read loosely top-to-bottom, so stage information in that order — hook element up top, action in the middle band, supporting detail low. When a new shot cuts in, the eye resumes at upper-center; place each shot's most important element near where the previous shot left the gaze, and your cuts will feel smooth at any pace."
            },
            {
              h: "Foreground Occlusion as Pattern Interrupt",
              body: "Retention on social is partly a rhythm game: the frame must change meaningfully every few seconds or attention drifts. Editors solve this with cuts and effects; cinematographers solve it in-camera with **occlusion** — foreground elements that momentarily interrupt and refresh the frame.\n\nThe moves: track past a pillar that wipes the lens; let a passerby cross close through frame; push through a doorway; shoot through hanging fabric, steam, leaves, or a rack of clothes so the veil breaks and reforms. Each occlusion is a visual pattern interrupt — the image transforms and the brain re-engages — without a single edit.\n\nOcclusions also gift you seamless transitions (cut inside the wipe, as covered in the gimbal lesson) and depth (the occluding layer creates parallax in vertical's flat-prone frame).\n\nDiscipline: one or two per shot maximum, motivated by real movement through real space. Occlusion as garnish reads as craft; occlusion as strobe reads as noise."
            },
            {
              h: "Frame Real Estate: Budgeting for Text and UI",
              body: "A vertical frame on social is shared property — your image, the platform's UI, and your own text overlays all claim territory. Advanced shooters budget that real estate **before** rolling.\n\nThe working map: top 10 percent, platform UI. Bottom 20-25 percent, captions and audio tags. Right edge, engagement rail. That leaves a center-left band — call it the **content column** — as your fully owned canvas.\n\nBudget it per shot: if a hook line will overlay the top third, compose the subject slightly low and leave calm negative space up top (a clean wall, sky, a defocused zone) so the text lands legibly. If captions will run at the bottom, keep hands and products above that band. Busy texture behind text is the most common self-inflicted legibility wound on social — and it is a framing decision, not an editing one.\n\nShooters who compose for the overlays produce frames that look designed. Shooters who do not produce frames that look colonized."
            },
            {
              h: "One Shoot, Two Frames: Multi-Format Discipline",
              body: "Client work and cross-posting increasingly demand both 9:16 and 16:9 from a single shoot. The professional solution is **center-punch shooting**: frame every shot so a vertical slice through the center carries the full story, while the horizontal edges add context rather than essentials.\n\nMechanics: shoot horizontal in 4K or higher (a 9:16 crop from 4K still exceeds full HD); keep the subject and all critical action inside the central vertical third; use monitor markers or tape guides on your screen showing the 9:16 boundaries; and never let key motion, gestures, or props live only in the horizontal wings.\n\nWhen a composition genuinely cannot serve both — a panoramic landscape, a wide two-shot — shoot it twice, reblocked for each frame, rather than delivering a bad crop. Depth staging helps here again: subjects stacked near-to-far survive the center crop; subjects spread left-to-right do not.\n\nDecide format strategy per shot on the shot list, not in post. Cropping is salvage; composing is craft."
            }
          ],
          takeaways: [
            "The viewer's gaze rests upper-center — put the hook element there at second zero and stage each cut's key info near the previous gaze position.",
            "Foreground occlusions are in-camera pattern interrupts that refresh attention, add parallax, and gift seamless transitions.",
            "Budget frame real estate for UI and text before rolling; compose calm negative space where overlays will land.",
            "Center-punch in 4K with markers for dual-format delivery, and reblock rather than crop when a frame cannot serve both."
          ],
          actions: [
            "Check the opening frame of your last five videos: is the hook element in the upper-center at second zero? Reframe the next one accordingly.",
            "Shoot one clip with two motivated occlusions — a doorway push-through and a foreground wipe — and use one as a transition.",
            "Tape 9:16 boundary guides on your monitor or enable framing markers, and shoot one center-punched scene that delivers both formats."
          ],
          quiz: [
            {
              q: "Where does a phone viewer's gaze naturally rest, making it the hook zone?",
              options: ["Bottom-left", "Dead center-bottom", "Upper-center", "The top edge"],
              answer: 2,
              why: "Eyes settle upper-center at natural viewing distance — the first-second swipe decision is made on whatever sits there."
            },
            {
              q: "What is foreground occlusion doing for retention?",
              options: ["Increasing exposure", "Acting as an in-camera pattern interrupt that refreshes the frame without a cut", "Hiding poor focus", "Reducing file size"],
              answer: 1,
              why: "A wiping foreground element transforms the image mid-shot, re-engaging attention the way a cut would."
            },
            {
              q: "What is the core rule of center-punch shooting?",
              options: ["Always shoot vertical first", "Keep all critical action inside the central vertical third of a high-resolution horizontal frame", "Zoom during recording to cover both formats", "Use the widest available lens"],
              answer: 1,
              why: "If essentials live in the center slice, one 4K capture delivers a true 9:16 and a true 16:9 without salvage cropping."
            }
          ],
          drill: "Storyboard a 30-second vertical piece as a retention map: mark the hook-zone element for each shot, two occlusion moments, and the text-safe negative space — then shoot it to the map."
        },
        {
          id: "cinema-3-5",
          title: "Shooting for the Grade",
          minutes: 10,
          xp: 75,
          skill: "editing",
          intro: "Color grading cannot invent information the camera never captured. Shooting for the grade means making capture decisions — profile, exposure, white balance, and what's physically in frame — that hand the colorist maximum latitude.",
          sections: [
            {
              h: "Log Profiles: Why Flat Footage Grades Better",
              body: "Standard picture profiles bake contrast and saturation into the file at capture — pleasant immediately, but locked. **Log profiles** (S-Log, V-Log, C-Log, Apple Log, and flat modes in apps like Blackmagic Camera) record a deliberately washed-out image that preserves far more of the sensor's dynamic range, especially in highlights and shadows, for reshaping later.\n\nThe trade is explicit: log looks grey and lifeless on set and **requires** grading; in exchange, you can place contrast and color where the look demands instead of where the camera guessed.\n\nTwo qualifiers keep this honest. First, **bit depth matters**: log in 8-bit breaks apart (banding in skies, blotchy skin) when pushed — log earns its keep at 10-bit, which modern phones and mirrorless bodies now offer. Second, **log is a choice, not a status symbol**: for same-day social content with no grading time, a well-exposed standard profile beats badly graded log. Shoot log when the piece deserves a grade; shoot clean standard when it does not."
            },
            {
              h: "Exposure Discipline: Protect the Highlights",
              body: "Digital sensors fail asymmetrically: crushed shadows can often be lifted with acceptable noise, but **clipped highlights are gone forever** — a white sky or blown forehead contains no data to recover. So the cardinal rule: expose to protect the highlights that matter.\n\nUse the tools instead of your eye (screens lie in daylight): **zebras** overlay stripes on near-clipping areas — set around 95-100 percent and keep meaningful highlights just below striping; **false color** paints the frame by exposure level; a **histogram** shows you the pile-up at either wall. On phones, exposure-lock plus a slight downward nudge in bright scenes is the crude equivalent.\n\nEqually important: **consistency across a scene**. A grade unifies shots efficiently only when they arrive matched; if every clip is exposed differently, the colorist spends the session correcting instead of creating. Lock exposure between takes of the same setup — auto-exposure drifting mid-clip is the single most grading-hostile habit in casual shooting."
            },
            {
              h: "White Balance as a Creative Instrument",
              body: "Auto white balance is a liability twice over: it drifts mid-clip as the frame changes (a grading nightmare — correction that must be keyframed), and it neutralizes color casts you may have wanted. Take manual control.\n\nThe baseline discipline: **set white balance per scene and lock it.** Daylight near 5600K, tungsten interiors near 3200K, and matched across every shot that will cut together.\n\nThe creative layer: white balance is a mood instrument. Setting the camera warmer than neutral bathes a scene in gold — hospitality, nostalgia, luxury evenings. Cooler than neutral turns clinical, modern, melancholic. Mixed sources can be orchestrated rather than fixed: a warm practical lamp inside a cool ambient scene creates the inviting glow that reads instantly as 'expensive interior.'\n\nOne caution from the lighting lessons applies doubly here: mixed temperatures on a **face** still read as error. Bias whole scenes deliberately; keep skin lit within one color family."
            },
            {
              h: "Color Starts in Front of the Lens",
              body: "The strongest grades are mostly capture. A frame whose physical contents already agree on a palette needs only refinement; a frame of clashing colors needs surgery, and surgery shows.\n\nProduction-design levers you control on any budget:\n\n- **Limit the palette.** Two or three color families per scene — wardrobe, props, background all inside them. The teal-and-orange grammar of commercial work is often literally built: warm skin and props against cool-toned environments.\n- **Kill the intruders.** The red fire extinguisher, the neon-green bottle, a stray brand logo — one saturated intruder drags the eye and fights every grade. Move it before rolling; ten seconds on set saves an hour of masking.\n- **Choose backgrounds by tone.** Mid-tone, low-saturation backgrounds accept any grade; busy saturated ones dictate and limit it.\n\nFinally, treat LUTs honestly: a LUT is a starting transform, not a finished look. Footage shot with matched exposure, locked white balance, and a disciplined palette makes almost any LUT look premium — which tells you where the quality actually lives."
            }
          ],
          takeaways: [
            "Log profiles preserve dynamic range for grading but demand 10-bit depth and actual grading time — choose per project, not for status.",
            "Clipped highlights are unrecoverable: expose with zebras or false color, and lock exposure across each setup.",
            "Lock white balance per scene, then use deliberate warm or cool bias — and warm practicals in cool scenes — as mood instruments.",
            "Grades are mostly capture: limit the palette, remove saturated intruders, and pick backgrounds that accept color."
          ],
          actions: [
            "Test your camera's log or flat profile against standard on one high-contrast scene, grade both, and compare highlight retention.",
            "Enable zebras (or practice exposure-lock-and-nudge on your phone) and shoot one bright scene protecting every meaningful highlight.",
            "Before your next shoot, do a 60-second palette pass on the location: remove or reposition every saturated intruder in frame."
          ],
          quiz: [
            {
              q: "Why does log footage look washed out on set?",
              options: ["The lens is misconfigured", "It maps a wider dynamic range into the file for reshaping in the grade", "The sensor is underpowered", "White balance is disabled in log"],
              answer: 1,
              why: "Log trades immediate contrast for preserved highlight and shadow information that grading can redistribute."
            },
            {
              q: "Which exposure error is unrecoverable in post?",
              options: ["Slightly lifted shadows", "Mild underexposure", "Clipped highlights", "A half-stop of extra fill"],
              answer: 2,
              why: "Blown highlights contain no data; shadows can often be lifted, but white stays white forever."
            },
            {
              q: "What is the biggest practical danger of auto white balance for graded work?",
              options: ["It overexposes skin", "It drifts mid-clip, forcing keyframed correction and mismatched cuts", "It disables log recording", "It increases noise"],
              answer: 1,
              why: "A white balance that shifts during and between takes destroys scene consistency — the foundation any grade depends on."
            }
          ],
          drill: "Shoot one scene twice — once on full auto, once with locked manual exposure and white balance plus a palette-cleaned frame — grade both for ten minutes each, and note where the auto version fights you."
        }
      ]
    },
    // __APPEND__
  ]
});
