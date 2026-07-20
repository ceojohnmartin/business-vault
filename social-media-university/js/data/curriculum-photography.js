window.SMU_DATA = window.SMU_DATA || { schools: [] };
SMU_DATA.schools.push({
  id: "photography",
  order: 7,
  name: "Photography",
  tagline: "Make the scroll stop on a single frame",
  icon: "📷",
  hue: 28,
  description: "Still images are the fastest test of taste on any feed — a viewer judges a photo in under half a second. This school takes you from the exposure triangle to agency-level campaign craft: composition, light you find and light you build, portraits, luxury product and automotive work, and the shoot systems that turn one day of photography into a month of content. Built for creators who want every frame to look deliberate and expensive, even off a phone.",
  courses: [
    {
      id: "photography-1",
      level: "Beginner",
      title: "See Like a Photographer",
      description: "Composition, exposure, and light — the fundamentals that make any camera, including the phone in your pocket, produce deliberate images instead of lucky ones.",
      lessons: [
        {
          id: "photography-1-1",
          title: "Composition: The Frame Is a Decision",
          minutes: 10,
          xp: 50,
          skill: "photo",
          intro: "Gear does not make images — arrangement does. Composition is the one upgrade that costs nothing, works on any camera, and compounds across every frame you will ever shoot.",
          sections: [
            {
              h: "Everything in the Rectangle Is a Choice",
              body: "Amateurs point at subjects. Photographers build frames. The difference is authorship: every element inside your rectangle — and everything you exclude — is a decision the viewer feels even if they can't name it.\n\nStart with the discipline of one. One subject, one idea per frame. If a stranger can't say what your photo is about in two seconds, it's about nothing. Before you press the shutter, run the edge patrol: drag your eye around all four edges and both top corners. Trash cans, exit signs, half a stranger's elbow — clutter at the edges is the most common tell of an unconsidered photo.\n\nThen move your feet. Two steps left removes the pole growing out of a head; crouching turns a messy street into clean sky. The zoom ring is not a composition tool — your legs are. Reframing physically changes perspective; zooming only crops it."
            },
            {
              h: "Rule of Thirds, Used Like a Pro",
              body: "Turn on your camera's gridlines — two vertical, two horizontal lines splitting the frame into nine boxes. The four intersections are power points: place your subject's eye, the product's logo, the car's headlight on one of them and the frame instantly reads as intentional.\n\nWhy it works: centered subjects resolve immediately, so the eye has nowhere to travel. Off-center placement creates a visual question — occupied space versus open space — and the tension holds attention a beat longer. On a feed, that beat is everything.\n\nTwo rules inside the rule:\n\n- **Horizons live on a third line, never the middle.** Sky is the story? Horizon on the lower third. Ground is? Upper third.\n- **Give motion and gazes room.** A subject looking or moving right sits on the left third, facing into the open space. Faces pressed against the frame edge feel trapped."
            },
            {
              h: "Leading Lines and Layers",
              body: "A photo is flat; your job is to fake depth. Leading lines are the first tool: roads, railings, shadows, a row of streetlights, the seam of a marble countertop — any line that starts near the frame edge and travels toward your subject becomes a runway for the viewer's eye. Diagonals are strongest; they inject energy that horizontals and verticals don't.\n\nThe second tool is layering. Build three planes: foreground, midground, background. Put the subject in the midground and let something soft occupy the foreground — shoot through a doorway, past leaves, over a shoulder. This 'framing within the frame' does double duty: it adds depth and it hides messy edges.\n\nA practical drill: at any location, ask 'what can I shoot through?' before asking 'what am I shooting?' The photographers whose work feels cinematic almost always answered that first question."
            },
            {
              h: "Negative Space and Breaking the Rules",
              body: "Look at any luxury campaign — a watch ad, a fragrance ad — and count the empty space. Often 70% of the frame is nothing. That's negative space, and it is a status signal: emptiness says the subject deserves the whole stage. Crowded frames whisper discount; empty frames whisper premium. When in doubt, simplify — step closer, or find a cleaner background, until the subject owns the frame.\n\nNow, permission to break everything above — on purpose. Dead-center symmetry projects power and formality; it's why architecture and villain shots use it. Filling the entire frame with a face or a texture creates intimacy the rule of thirds can't. A slight dutch tilt adds unease and motion.\n\nThe rule about rules: the default exists so your deviations read as decisions. Break composition rules loudly and deliberately, never accidentally and halfway."
            }
          ],
          takeaways: [
            "One subject, one idea per frame — and patrol the edges for clutter before you shoot.",
            "Place subjects on rule-of-thirds power points; keep horizons off the middle line.",
            "Fake depth with leading lines and three layers: foreground, midground, background.",
            "Negative space reads as premium; crowded frames read as cheap.",
            "Centered symmetry, filled frames, and tilts are legal — when they're loud and deliberate."
          ],
          actions: [
            "Turn on gridlines on your phone camera right now — Settings, Camera, Grid — and leave them on permanently.",
            "Shoot the same subject 5 ways in 5 minutes: thirds, centered, through a foreground object, filled frame, and 70% negative space. Compare on a big screen.",
            "Open your feed and find your 3 most recent photos. Run the edge patrol on each — count the clutter you would now exclude."
          ],
          quiz: [
            {
              q: "Where does the rule of thirds say a horizon line should sit?",
              options: ["Dead center for balance", "On the upper or lower third line, depending on the story", "As low as possible in every shot", "It doesn't matter if the subject is sharp"],
              answer: 1,
              why: "Horizons on a third line force a decision — sky story or ground story — and keep the frame from splitting in half."
            },
            {
              q: "What is the main job of a leading line?",
              options: ["To fill empty space", "To guide the viewer's eye toward the subject", "To make the photo symmetrical", "To replace the need for a subject"],
              answer: 1,
              why: "Leading lines are runways for the eye — they carry the viewer from the frame edge to the point of interest."
            },
            {
              q: "In visual language, generous negative space around a subject signals what?",
              options: ["The photographer ran out of ideas", "A mistake in framing", "Premium status — the subject deserves the whole stage", "That the image needs a caption"],
              answer: 2,
              why: "Luxury visual culture uses emptiness as a status cue; crowding reads as discount, space reads as expensive."
            }
          ],
          drill: "Pick one everyday object — a coffee cup, your keys — and make 10 distinct compositions of it without moving the object. Only your feet, height, and angle may change."
        },
        {
          id: "photography-1-2",
          title: "The Exposure Triangle Without the Headache",
          minutes: 11,
          xp: 50,
          skill: "photo",
          intro: "Aperture, shutter speed, ISO — three dials, one light budget. Understand how they trade against each other and manual mode stops being scary and starts being a creative instrument.",
          sections: [
            {
              h: "One Budget, Three Dials",
              body: "Every photo needs a specific amount of light to look right. You collect that light three ways: how wide the lens opens (aperture), how long the shutter stays open (shutter speed), and how much the sensor amplifies what it receives (ISO).\n\nPhotographers measure changes in 'stops.' One stop = double or half the light. Open the aperture one stop, and you can halve the shutter time and land on the identical exposure. That's the whole triangle: three faucets filling one bucket. Turn one up, turn another down, same brightness.\n\nSo why bother with manual control at all? Because each dial charges a different creative tax. Aperture changes how much of the scene is in focus. Shutter changes how motion renders. ISO changes how clean the file is. Exposure is the math; the side effects are the art. The rest of this lesson is learning which tax you want to pay."
            },
            {
              h: "Aperture: The Blur Dial",
              body: "Aperture is the iris inside your lens, measured in f-numbers — and the scale runs backwards, which trips everyone. **f/1.8 is a wide opening; f/16 is a pinhole.** Lower number, more light, and a shallower slice of the world in focus.\n\nThat slice is depth of field, and it's your subject-separation weapon. At f/1.8, a portrait subject pops off a melted, creamy background. At f/8, a storefront or a flat lay is sharp front to back. Landscape shooters live at f/8–f/11; portrait and product shooters open up for isolation.\n\nQuick anchors to memorize:\n\n- **f/1.8–f/2.8** — portraits, food, anything that needs background blur.\n- **f/5.6–f/8** — groups, products where the whole item must be sharp, general use.\n- **f/11–f/16** — landscapes and architecture, everything crisp.\n\nMost lenses are also sharpest two or three stops down from wide open — f/1.8 glass often peaks near f/4."
            },
            {
              h: "Shutter Speed: The Motion Dial",
              body: "Shutter speed is how long the sensor watches the scene, written in fractions: 1/1000 is a millisecond blink, 1/30 is a long stare. Fast shutters freeze; slow shutters smear.\n\nTwo kinds of blur can ruin — or make — your shot. **Camera shake** comes from your hands; the handheld rule says never go slower than 1 over your focal length (at 50mm, stay at 1/50 or faster; double it to be safe). **Motion blur** comes from the subject, and it's a creative choice: 1/1000 freezes a jumping athlete mid-air; 1/30 turns city traffic into rivers of light — on a tripod.\n\nPractical anchors: 1/1000+ for sports and splashes, 1/250 for walking subjects, 1/125 as a safe handheld floor for people, below 1/60 only with stabilization or support. When a photo comes back soft and you don't know why, shutter speed is the first suspect."
            },
            {
              h: "ISO and the Order of Operations",
              body: "ISO is amplification. ISO 100 is the sensor's clean baseline; every doubling brightens the file one stop and adds noise — that gritty, color-speckled texture in the shadows. Modern sensors and phones handle ISO 1600–3200 respectably, but noise also eats fine detail and makes files fall apart when edited hard.\n\nSo here's the working priority, the order pros actually set the dials:\n\n1. **Shutter first** — fast enough to kill shake and freeze the motion you need. A noisy sharp photo beats a clean blurry one every time.\n2. **Aperture second** — chosen for the depth of field the shot demands.\n3. **ISO last** — as low as the first two allow, not lower.\n\nA shortcut worth stealing: aperture priority mode (A/Av). You pick the f-stop, set Auto ISO with a minimum shutter speed, and the camera solves the equation while you compose. That's not cheating — that's how a huge share of working pros shoot."
            }
          ],
          takeaways: [
            "One stop = double or half the light; the three dials trade against each other to hit the same exposure.",
            "Low f-number = wide opening = shallow focus; f/1.8 isolates, f/8 keeps scenes sharp.",
            "Handheld rule: shutter no slower than 1/focal length — shake is the top cause of soft photos.",
            "Set shutter for motion first, aperture for depth second, ISO as low as those two allow.",
            "Aperture priority plus Auto ISO with a minimum shutter is a legitimate pro workflow."
          ],
          actions: [
            "Shoot the same subject at f/1.8 (or your widest), f/5.6, and f/11. Study what happens to the background at each stop.",
            "Photograph running water or passing cars at 1/1000, 1/125, and 1/15 (brace the camera). Label which look you'd use for what.",
            "Find your camera or phone pro mode's Auto ISO setting and cap the minimum shutter at 1/125 for people shots."
          ],
          quiz: [
            {
              q: "Which aperture lets in MORE light?",
              options: ["f/16", "f/8", "f/5.6", "f/1.8"],
              answer: 3,
              why: "The f-scale runs backwards — lower numbers mean a wider opening and more light."
            },
            {
              q: "Your handheld photos at 50mm keep coming out soft. Per the handheld rule, what's the likely fix?",
              options: ["Raise the f-number", "Keep shutter speed at 1/50 or faster", "Lower the ISO", "Switch to a wider lens and crop later"],
              answer: 1,
              why: "The handheld rule says shutter speed should be at least 1 over the focal length to defeat camera shake."
            },
            {
              q: "In the pro order of operations, which dial do you sacrifice last?",
              options: ["Shutter speed — motion comes first", "Aperture — depth of field comes first", "ISO — it should stay as low as the other two dials allow", "White balance"],
              answer: 2,
              why: "You set shutter for motion and aperture for depth, then raise ISO only as much as those choices force."
            }
          ],
          drill: "Spend 15 minutes in full manual mode photographing one scene, deliberately making it one stop too dark, correct, and one stop too bright using a different dial each time."
        },
        {
          id: "photography-1-3",
          title: "Reading Light: The Skill That Beats Gear",
          minutes: 10,
          xp: 50,
          skill: "photo",
          intro: "Two photographers, same phone, same location — one image looks like a campaign, the other like a snapshot. The difference is almost never the camera. It's that one of them can read light.",
          sections: [
            {
              h: "Hard vs. Soft: It's About Size",
              body: "All light quality comes down to one variable: the size of the source relative to the subject. Small source, hard light — crisp shadow edges, glaring highlights, every pore and texture amplified. Large source, soft light — shadow edges that melt gradually, flattering gradients, forgiving skin.\n\nHere's the counterintuitive part: the sun, physically enormous, acts as a tiny source because it's so far away — which is why noon sunlight is brutally hard. Slide a cloud in front of it and the entire sky becomes the source: instantly soft. Same logic indoors — a bare bulb is hard; that bulb bounced off a white wall becomes the wall, which is huge, which is soft.\n\nNeither is 'better.' Soft light flatters people and luxury product. Hard light sells drama, grit, athletic definition, and architectural edges. The skill is choosing on purpose — and knowing you can change quality by changing the effective size of the source."
            },
            {
              h: "Direction Is the Story",
              body: "Where light comes from decides what your photo says.\n\n- **Front light** (source behind you) is flat and safe: colors pop, texture disappears. Fine for product-on-white; boring for mood.\n- **Side light** rakes across the subject and carves texture — every ridge throws a shadow. This is the direction of drama, of muscle definition, of interesting faces, of fabric and food that look touchable.\n- **Backlight** (source behind subject) produces rim glow, halo hair, and silhouettes. It's the most emotional direction and the trickiest exposure: meter for your subject's face and let the background blow bright, or expose for the sky and embrace the silhouette.\n- **Top light** (noon sun, overhead cans) digs shadows into eye sockets — the least flattering direction for humans.\n\nWalk a slow circle around any subject and watch the story change every 45 degrees. Direction costs nothing and changes everything."
            },
            {
              h: "The Golden Hours and the Dead Hours",
              body: "The hour after sunrise and before sunset — golden hour — is free production value. The sun sits low, so light arrives at a flattering side angle; it travels through more atmosphere, so it's warmer and softer; shadows stretch long and cinematic. Portraits, cars, lifestyle, real estate exteriors: everything looks more expensive at golden hour. Blue hour, the 20–30 minutes after sunset, trades warmth for a moody cobalt sky — the classic window for car shots with city lights and lit interiors.\n\nMidday is the dead zone: hard top light, squinting subjects, raccoon-eye shadows. If you must shoot at noon, use **open shade** — the soft, even light on the shaded side of a building, under an awning, or in a doorway facing open sky. Position the subject just inside the shade line, facing out toward the brightness. It's a giant natural softbox, and it's everywhere once you start looking."
            },
            {
              h: "Train the Eye Daily",
              body: "Reading light is a rep-based skill, and the reps are free. Three habits build it fast:\n\n1. **The shadow check.** Before shooting anything, look at the shadows first — their edge (hard or soft?), their direction (where's the source?), their depth (how much darker than the lit side?). Shadows tell you everything about the light without looking at the light.\n\n2. **Hunt catchlights.** In every portrait you admire, find the tiny reflection in the eyes. Its shape and position reveal the entire lighting setup — a window to the left, a softbox above, a ring light dead-on. Reverse-engineering catchlights is how photographers steal setups from images alone.\n\n3. **The daily light audit.** Once a day, wherever you are, ask: where is the light coming from, how big is the source, what color is it? Thirty seconds. In a month you'll see light before you see subjects — which is the definition of the skill."
            }
          ],
          takeaways: [
            "Light quality = source size relative to subject: big and close is soft, small and far is hard.",
            "Side light carves texture and drama; backlight creates glow and emotion; top light punishes faces.",
            "Golden hour is free production value; at midday, open shade is your portable softbox.",
            "Shadows and catchlights tell you everything — read them to reverse-engineer any lighting setup.",
            "Reading light is a daily rep habit, not a talent."
          ],
          actions: [
            "Today, shoot one portrait (or self-portrait) in open shade facing out toward the light. Compare it with one taken in direct sun.",
            "Save 3 photos you admire and identify the light in each: source direction, hard or soft, and what the catchlights reveal.",
            "Set a golden-hour alarm for this week — one deliberate shoot in the last hour of sun."
          ],
          quiz: [
            {
              q: "What makes a light source render soft shadows?",
              options: ["Its brightness", "Its color temperature", "Its size relative to the subject", "Using a full-frame camera"],
              answer: 2,
              why: "Softness is a geometry problem — the larger the source appears from the subject's position, the softer the shadow edges."
            },
            {
              q: "You have to shoot a portrait at noon in harsh sun. Best move?",
              options: ["Shoot anyway and fix it in editing", "Move the subject into open shade facing out toward the bright sky", "Use maximum ISO", "Have the subject stare into the sun for even light"],
              answer: 1,
              why: "Open shade turns the bright sky into a giant soft source and eliminates the harsh top-light shadows of midday."
            },
            {
              q: "Which lighting direction is best for emphasizing texture and definition?",
              options: ["Front light", "Side light raking across the subject", "Top light from directly overhead", "No light"],
              answer: 1,
              why: "Side light travels across the surface, so every ridge and contour casts a shadow that reveals texture."
            }
          ],
          drill: "Photograph the same person or object in four light directions — front, side, back, top — using only window light or the sun. Caption each with the mood it creates."
        },
        {
          id: "photography-1-4",
          title: "Phone Photography: Pro Frames From Your Pocket",
          minutes: 9,
          xp: 50,
          skill: "photo",
          intro: "The camera you carry every day is capable of billboard-grade images — if you stop shooting on autopilot. This lesson covers the five habits that separate phone snapshots from phone photography.",
          sections: [
            {
              h: "Know What a Phone Is Good and Bad At",
              body: "A phone pairs a tiny sensor with enormous computational power. It captures multiple frames per press, merges them, lifts shadows, tames highlights, and sharpens — that's why phone shots look instantly 'finished.' Play to that: phones excel in good light, at wide scenes, and at anything static.\n\nThe weaknesses are physics. The tiny sensor struggles in dim light (watch for smeary, watercolor-looking detail), can't produce real optical background blur, and clips motion in low light. Portrait mode fakes blur with a depth map — usually convincing, but check the edges: hair, glasses, and glass objects are where the algorithm tears.\n\nAnd the most ignored fix in mobile photography: **wipe the lens.** It rides in a pocket collecting skin oil, and one smudge produces exactly the hazy, low-contrast bloom people blame on the camera. Shirt-hem wipe, every session, before the first frame."
            },
            {
              h: "Take Back Exposure Control",
              body: "Auto-exposure guesses. You can overrule it in two seconds, and it's the single biggest quality jump available on a phone.\n\nTap your subject — that sets focus AND exposure to that point. Then drag the little sun/slider that appears: pull **down** to darken, up to brighten. Here's the pro bias: when in doubt, expose slightly dark. Phone sensors, like all digital sensors, destroy blown highlights permanently — a white, detail-free sky is gone forever — while shadows lift in editing surprisingly well. Protect the highlights; rescue the shadows later.\n\nFor tricky scenes, press and hold to lock AE/AF. The exposure and focus freeze so you can recompose without the phone re-guessing every time a cloud moves. Sunset silhouettes, backlit portraits, food by a window — AE/AF lock plus a deliberate exposure drag handles all of them."
            },
            {
              h: "Lenses, Zoom, and the Cardinal Sin",
              body: "Your phone's lens buttons — 0.5x, 1x, 3x — switch between real, physical lenses. Use them exactly like a photographer chooses focal lengths: 0.5x ultra-wide for architecture and dramatic low angles (careful, it distorts faces badly up close), 1x main for most work and all low light (it has the biggest, best sensor), 3x tele for portraits and compressed, flattering perspective.\n\nThe cardinal sin is pinch-zooming between those stops. Anything that isn't a native lens stop is digital zoom — the phone just crops and enlarges, throwing away resolution. 2.4x is a cropped 1x, and it shows. Move your feet instead, or shoot at the native stop and crop deliberately in the edit, where you control the quality.\n\nIf your phone offers RAW (ProRAW, Expert RAW), turn it on for important shots: you'll trade instant polish for far more editing latitude in highlights, shadows, and color."
            },
            {
              h: "Shoot for the Platform",
              body: "Social is vertical, so compose vertical by default: 4:5 for feed posts, 9:16 for Stories and Reels covers. Shooting 4:5 and cropping later beats shooting 9:16 tight — you keep options. Leave breathing room at the top and bottom of Story frames; usernames, captions, and UI buttons will sit there.\n\nThree more habits that pay off daily:\n\n- **Burst for anything moving.** Hold the shutter (or swipe, on iPhone) for a burst and pick the peak frame — the jump's apex, the laugh, the hair flip. One press, one frame is how moments get missed.\n- **Use the volume button as a shutter** for stability, and elbows against your ribs — phone shake is real shake.\n- **Shoot 10x more than you post.** The pros' secret isn't a better hit rate; it's a bigger sample. Cull hard, post the top 5%."
            }
          ],
          takeaways: [
            "Wipe the lens before every session — smudge haze is the most common 'bad camera' complaint.",
            "Tap to set exposure, drag down to protect highlights; blown highlights are unrecoverable.",
            "Only shoot at native lens stops (0.5x/1x/3x) — pinch zoom is just quality-destroying cropping.",
            "Compose 4:5 vertical for feeds and leave UI headroom for Stories.",
            "Burst for motion, then cull ruthlessly — volume beats hit rate."
          ],
          actions: [
            "Practice the exposure drag on 5 shots today: tap the subject, pull exposure down until highlights hold detail.",
            "Test every native lens on your phone against the same scene — learn what each stop sees before you need it.",
            "Enable RAW capture (if available) and grid, and clean your lens right now."
          ],
          quiz: [
            {
              q: "Why should you avoid pinch-zooming to 2x on a phone with 1x and 3x lenses?",
              options: ["It drains the battery", "It's digital zoom — a crop that throws away resolution", "It changes the color profile", "It disables HDR"],
              answer: 1,
              why: "Between native lens stops the phone simply crops and enlarges, which permanently costs image quality."
            },
            {
              q: "When in doubt on a phone, which way should you bias exposure?",
              options: ["Brighter, to see the subject clearly", "Slightly darker, to protect highlights", "Exactly what auto suggests", "Maximum brightness with the flash on"],
              answer: 1,
              why: "Blown highlights are gone forever, while shadows lift well in editing — so protecting highlights preserves your options."
            },
            {
              q: "What does pressing and holding on the screen do in most phone camera apps?",
              options: ["Starts a video", "Applies a filter", "Locks focus and exposure so recomposing doesn't reset them", "Switches to the front camera"],
              answer: 2,
              why: "AE/AF lock freezes your exposure and focus decisions, which is essential for backlit and high-contrast scenes."
            }
          ],
          drill: "Shoot a 9-frame 'phone portfolio' of one location using only native lens stops, the exposure drag, and gridlines — no filters, no zoom. Pick your best 3 on a large screen."
        },
        {
          id: "photography-1-5",
          title: "Tack Sharp: Focus, Stability, and the Cull",
          minutes: 9,
          xp: 50,
          skill: "photo",
          intro: "Nothing outs an amateur faster than soft focus where it matters. Sharpness is not a camera spec — it's a set of habits, and this lesson installs all of them.",
          sections: [
            {
              h: "The Four Causes of Soft Photos",
              body: "Every unsharp photo has one of four causes, and diagnosing which is half the cure.\n\n1. **Camera shake** — you moved. The fix: shutter at 1/focal-length or faster, elbows tucked, exhale as you press, or brace against a wall. At slow speeds, use a tripod or set the camera down and use the timer.\n2. **Subject motion** — they moved. Fix: faster shutter (1/250+ for people in motion), or burst and take the peak frame.\n3. **Missed focus** — the camera nailed sharpness on the wrong thing. Fix: take control of the focus point (next section).\n4. **Dirty or cheap glass** — smudges and haze scatter light before it ever hits the sensor. Fix: clean the lens; it costs nothing.\n\nZoom to 100% on a soft photo and read the blur: uniform smear means shake, one sharp plane in the wrong place means missed focus, sharp background with a blurred subject means motion."
            },
            {
              h: "Focus Where the Story Is",
              body: "Autofocus systems guess based on contrast and proximity — and their guess is often the nearest shoulder, the fence in front, or the logo behind. Take the decision back.\n\nFor people, the law is absolute: **focus on the nearest eye.** Viewers lock onto eyes first; if the eye is soft and the ear is sharp, the photo reads as broken even to people who can't articulate why. Use single-point autofocus and place the point on the eye, or use eye-detection AF if your camera has it — it's the single most useful autofocus feature of the last decade. On phones, tap the face.\n\nAt wide apertures like f/1.8, depth of field can be a centimeter thin — a subject leaning back a hand-width drifts out of focus. For groups, stop down to f/5.6–f/8 and focus one-third into the group. For products, focus on the label or the detail a buyer would inspect first."
            },
            {
              h: "Aspect Ratios and the Feed Crop",
              body: "Sharpness also dies at delivery when you compose for the wrong shape. The feed is vertical: 4:5 is the tallest a standard feed photo displays, 9:16 fills Stories and Reels. A glorious horizontal landscape becomes a squinting letterboxed strip on a phone screen.\n\nWorking practice: **compose vertical first**, and when a scene demands horizontal, shoot it both ways — turning the camera costs three seconds. Frame slightly loose on important shots; a small margin means you can deliver 4:5, 1:1, and 9:16 crops from one capture without amputating the subject. Never place critical elements — eyes, logos, text — at the extreme top or bottom, where platform UI (usernames, captions, buttons) will cover them in Stories.\n\nAnd export smart: platforms recompress everything, and starting from an already-crunchy file compounds the damage. Export at the platform's native resolution (1080px wide minimum) from the highest-quality original."
            },
            {
              h: "The Cull Is Part of the Craft",
              body: "Professionals don't shoot better ratios than you — they show less. A working pro might shoot 800 frames for a campaign and deliver 30. The cull is where average shooters become good ones, because selection taste develops faster than shooting skill.\n\nA fast, ruthless system:\n\n1. **Pass one — kill the dead.** Full-screen, flag anything with obvious flaws: soft eyes, blinks, clipped highlights, clutter. Half a second per frame. No sentimentality about 'the moment.'\n2. **Pass two — pick the peaks.** From survivors, compare near-duplicates side by side and keep only the strongest expression, the cleanest gesture, the best light.\n3. **Pass three — the outsider test.** Ask of each finalist: would a stranger stop scrolling for this? If a frame needs its backstory explained, it doesn't post.\n\nAim to publish under 10% of what you shoot. Your feed is a highlight reel, not a hard drive."
            }
          ],
          takeaways: [
            "Diagnose softness: shake, subject motion, missed focus, or dirty glass — each has a different fix.",
            "For people, focus on the nearest eye, always; use single-point or eye-detect AF.",
            "Compose vertical-first and frame loose enough to crop 4:5, 1:1, and 9:16 from one shot.",
            "Keep critical elements out of Story UI zones at the frame's top and bottom.",
            "Cull to under 10% — selection is a skill, and your feed is a highlight reel."
          ],
          actions: [
            "Switch your camera to single-point AF (or practice tap-to-focus) and shoot 10 portraits focusing only on the nearest eye.",
            "Take one existing photo and crop it to 4:5, 1:1, and 9:16 — note what you'd frame differently next time.",
            "Cull your camera roll's last 100 photos to a top 10 using the three-pass system."
          ],
          quiz: [
            {
              q: "In a portrait, where must focus land?",
              options: ["The tip of the nose", "The nearest eye", "The background, for context", "The center of the frame regardless of the face"],
              answer: 1,
              why: "Viewers lock onto eyes first; a soft eye makes the whole image feel broken."
            },
            {
              q: "Your subject is blurred but the background is sharp. What happened?",
              options: ["Camera shake", "The subject moved during a too-slow shutter", "ISO was too high", "The lens was dirty"],
              answer: 1,
              why: "A sharp background with a smeared subject means the camera was steady but the shutter was too slow for the subject's motion."
            },
            {
              q: "What's the tallest standard aspect ratio for a main feed photo post?",
              options: ["16:9", "1:1", "4:5", "9:16"],
              answer: 2,
              why: "Feed posts display up to 4:5; 9:16 is for Stories and Reels."
            }
          ],
          drill: "Shoot 50 frames of a moving subject (a pet, traffic, a friend walking) and cull to the 3 sharpest, best-composed frames. Note which of the four softness causes killed the rejects."
        }
      ]
    },
    {
      id: "photography-2",
      level: "Intermediate",
      title: "Control the Frame",
      description: "Lenses, depth of field, color, and natural-light mastery — plus the editing workflow that turns good captures into a signature look.",
      lessons: [
        {
          id: "photography-2-1",
          title: "Focal Lengths: What Lenses Actually Do",
          minutes: 10,
          xp: 60,
          skill: "photo",
          intro: "A lens isn't a magnification tool — it's a perspective machine. Once you understand what 24mm does to a room and what 85mm does to a face, you'll stop asking which lens is 'best' and start choosing on purpose.",
          sections: [
            {
              h: "The Focal Length Personality Chart",
              body: "Each focal length has a personality, and pros pick lenses the way directors cast actors.\n\n- **16–24mm (ultra-wide):** exaggerates space and drama. Rooms look cavernous, cars look aggressive from low angles, foregrounds loom. Real estate, architecture, dynamic lifestyle.\n- **35mm:** the documentary eye — close to how a scene feels when you're standing in it. Environmental portraits, street, vlogs, storytelling.\n- **50mm:** the neutral classic — minimal distortion, natural proportions, usually cheap and fast (f/1.8). If you buy one prime, it's this or the 35mm.\n- **85mm+:** the portrait weapon — flattering compression, creamy backgrounds, intimate isolation.\n\nYour phone speaks the same language: 0.5x ≈ 13mm, 1x ≈ 24–26mm, 3x ≈ 77mm. You already own a focal length kit — most people have just never used it deliberately."
            },
            {
              h: "Compression: The Concept That Unlocks Everything",
              body: "Here's the idea that separates lens users from lens understanders. Long focal lengths appear to **compress** space — the background looms closer, larger, stacked against the subject. Wide lenses do the opposite: they stretch space, pushing the background away and making near things enormous.\n\nThe secret is that compression isn't really the lens — it's the distance the lens makes you stand at. At 85mm you're several meters back, so the subject and the mountain behind them are proportionally similar distances from you; they render close in size. At 24mm you're a meter away, so the subject is 10x closer than the background and dwarfs it.\n\nWhy you care: shoot a portrait at 85mm and the blurred city behind fills the frame like a movie backdrop. Shoot a car at 200mm from far away and it stacks against the skyline. Shoot a small room at 16mm and it sells as spacious. Distance plus focal length is a storytelling dial."
            },
            {
              h: "Distortion, Faces, and the Selfie Problem",
              body: "Wide lenses used close inflate whatever is nearest — and on a face, the nearest thing is the nose. This is why front-camera selfies (typically ~20–26mm equivalent at arm's length) make noses look bigger and faces narrower than mirrors do. It isn't your face; it's geometry.\n\nThe portrait fix is simple: back up and zoom in. At 50mm+, facial proportions relax toward what people see in the mirror; at 85mm they flatten into the flattering look of beauty campaigns. On a phone, step back and use the 2x or 3x lens for portraits — the single biggest phone-portrait upgrade available.\n\nUse distortion deliberately when it serves you: a 0.5x low-angle shot makes a sneaker or a supercar look monumental, and wide-lens hand-reaching-into-frame POV shots feel immersive precisely because of the exaggeration. Distortion is a spice — potent on objects and spaces, dangerous on faces."
            },
            {
              h: "Primes, Zooms, and What to Actually Buy",
              body: "A prime lens has one fixed focal length; a zoom covers a range. Primes are typically sharper, smaller, and much faster — f/1.8 or wider — which buys low-light ability and background blur that kit zooms (often f/3.5–5.6) can't touch. Zooms buy flexibility when you can't move, like events and travel.\n\nThe classic first purchase remains the **50mm f/1.8** — nearly every brand sells one cheap, and it teaches discipline: zooming with your feet forces compositional thinking. Content creators shooting themselves should look at a 24mm or 35mm instead, wide enough for arm's-length and tripod framing.\n\nOne honest warning: gear is the most seductive procrastination in photography. A $150 prime in the hands of someone who's done the last four lessons outperforms a $3,000 body on auto. Buy your second lens only when you can name the specific shot your current one cannot make."
            }
          ],
          takeaways: [
            "Focal lengths are personalities: wide stretches and dramatizes, 50mm is neutral, 85mm+ compresses and flatters.",
            "Compression comes from camera-to-subject distance — long lens from far stacks the background against the subject.",
            "Never shoot close-up faces with a wide lens; back up and use 2x/3x or 50mm+ for portraits.",
            "Your phone's 0.5x/1x/3x stops are a real focal-length kit — use them deliberately.",
            "Buy a fast prime for blur and low light only when you can name the shot your current lens can't make."
          ],
          actions: [
            "Shoot the same portrait at 0.5x, 1x, and 3x (or 24/50/85mm) from the distances each requires. Compare facial proportions side by side.",
            "Find a subject with a distant background and demonstrate compression: wide-and-close vs. long-and-far, same subject size in frame.",
            "Audit your last 20 photos: which focal length personality dominates, and is it serving your subjects?"
          ],
          quiz: [
            {
              q: "Why do telephoto portraits look more flattering than wide-angle ones?",
              options: ["Telephoto lenses have better color", "Shooting from farther away normalizes facial proportions instead of inflating the nose", "They automatically smooth skin", "They force better posing"],
              answer: 1,
              why: "Distortion is a distance effect — the distance a long lens forces you to stand at keeps facial features proportionally correct."
            },
            {
              q: "You want a car stacked dramatically against a distant city skyline. What's the play?",
              options: ["Ultra-wide lens, very close to the car", "Long lens from far away to compress the scene", "50mm from a medium distance", "Any lens — compression is added in editing"],
              answer: 1,
              why: "Long focal length plus distance makes background elements loom large and close behind the subject."
            },
            {
              q: "What's the main advantage of a 50mm f/1.8 prime over a typical kit zoom?",
              options: ["It zooms further", "It's weather sealed", "A much wider aperture for low light and background blur", "It requires no focusing"],
              answer: 2,
              why: "Fast primes open to f/1.8 or wider, gathering far more light and producing shallow depth of field kit zooms can't match."
            }
          ],
          drill: "Do a 'one focal length day': shoot everything for 24 hours at a single fixed focal length (50mm or your phone's 2x). Notice how it changes what you look for."
        },
        {
          id: "photography-2-2",
          title: "Depth of Field: Sculpting With Blur",
          minutes: 10,
          xp: 60,
          skill: "photo",
          intro: "Background blur is the look everyone wants and few control. Depth of field has four levers, not one — master all four and you can sculpt focus on any camera, including a phone.",
          sections: [
            {
              h: "The Four Levers of Blur",
              body: "Depth of field — the slice of the scene that's acceptably sharp — responds to four inputs, and they multiply:\n\n1. **Aperture.** Wider opening (lower f-number) = thinner slice. f/1.8 melts backgrounds; f/11 keeps them.\n2. **Focal length.** Longer lenses = shallower apparent depth. 85mm blurs harder than 35mm at the same f-stop.\n3. **Subject distance.** The closer you focus, the thinner the slice. Macro distances have millimeters of focus even at f/8.\n4. **Background distance.** The lever everyone forgets. Blur is about how far the background sits behind the focal plane — a subject one step from a wall gets no blur at any aperture; the same subject twenty steps from the wall melts it.\n\nThe cheapest blur upgrade in photography costs nothing: **walk your subject away from the background.** Do that before touching a single dial."
            },
            {
              h: "Separation Is the Point, Blur Is the Tool",
              body: "Why do we want blur at all? Separation. A busy background competes with your subject for attention; blur demotes it to atmosphere, and the viewer's eye snaps to the sharp thing. That's the entire psychology — sharp equals important.\n\nWhich means blur is a hierarchy tool, not a style checkbox. Ask: what must the viewer read, and what should dissolve? A watch on a wrist: wide open, the watch face sharp, everything else a wash of tone. A chef in their kitchen: f/4, enough blur to soften the kitchen but enough context to know it IS a kitchen. A team photo: f/8, because blurring half the faces is a failure, not a look.\n\nBeware the beginner overdose — shooting everything at f/1.4 until noses are soft and story context is obliterated. When both eyes of a slightly angled face must be sharp, f/2.8–f/4 is the honest choice. Wide open is a decision, not a default."
            },
            {
              h: "Bokeh Quality and Light Play",
              body: "Bokeh is the character of the out-of-focus areas — not how blurred, but how beautifully. Smooth, creamy gradients flatter; harsh, double-edged 'nervous' blur distracts. Lens design drives most of it, but you control the ingredients.\n\nThe famous trick: put small, bright light sources deep in the blurred zone — city lights, fairy lights, sun through leaves, reflections on wet pavement — and each becomes a glowing disc. This is how holiday portraits and night street shots get that expensive sparkle. Recipe: longest lens you have, widest aperture, subject far from the lights, focus locked on the subject.\n\nForeground bokeh is the more cinematic sibling: shoot through something out-of-focus and close to the lens — leaves, a glass edge, string lights draped near the camera — and a soft color wash frames the subject. It adds depth, mystery, and a produced feel for zero dollars."
            },
            {
              h: "Deep Focus and Phone Reality",
              body: "Shallow isn't always right. Landscapes, architecture, interiors, and flat lays usually want front-to-back sharpness. Stop down to f/8–f/11 and focus roughly one-third into the scene — depth of field extends farther behind the focus point than in front, so that placement maximizes the sharp zone (the principle behind hyperfocal focusing). Avoid f/16+ unless necessary; diffraction begins softening fine detail at the smallest openings.\n\nOn phones, real optical blur only appears very close to the subject — food, products, details. For portraits, portrait mode simulates depth with a depth map. Make it more convincing: separate subject from background (the algorithm needs distance to be believable), avoid wispy hair against busy backgrounds, and check edges at full screen before posting. If your phone lets you adjust the simulated f-number afterward, dial it toward f/2.8–f/4 — the default maximum blur usually looks fake."
            }
          ],
          takeaways: [
            "Blur has four levers: aperture, focal length, subject distance, and background distance.",
            "The free blur upgrade: move your subject farther from the background before touching settings.",
            "Blur exists for separation and hierarchy — sharp equals important; wide open is a decision, not a default.",
            "Bright points deep in the blur zone become bokeh discs; foreground bokeh adds cinematic depth.",
            "For deep focus, shoot f/8–f/11 and focus one-third into the scene; on phones, keep simulated blur subtle."
          ],
          actions: [
            "Shoot one portrait twice: subject one step from a wall, then eight steps from it. Same settings — observe the background difference.",
            "Create a bokeh-ball shot tonight: subject 3+ meters from any string of lights, longest lens, widest aperture.",
            "Retake one 'blurry-background' phone portrait with the depth slider set to f/2.8–f/4 instead of maximum. Compare edge realism."
          ],
          quiz: [
            {
              q: "Which change increases background blur WITHOUT touching aperture?",
              options: ["Moving the subject farther from the background", "Raising ISO", "Using a faster shutter", "Adding more light"],
              answer: 0,
              why: "Blur depends on how far the background sits behind the focal plane — distance behind the subject is a free blur lever."
            },
            {
              q: "You're shooting a two-person portrait and both faces must be sharp. Best aperture range?",
              options: ["f/1.2 for maximum art", "f/2.8–f/5.6 depending on their spacing", "f/22 to be safe", "Aperture doesn't affect this"],
              answer: 1,
              why: "You need enough depth of field to cover both faces — moderately stopped down, not wide open, not diffraction-soft."
            },
            {
              q: "For a landscape at f/11, where should you place focus to maximize sharpness?",
              options: ["On the farthest mountain", "On the nearest rock", "About one-third of the way into the scene", "It makes no difference at f/11"],
              answer: 2,
              why: "Depth of field extends roughly twice as far behind the focus point as in front, so a one-third placement covers the most scene."
            }
          ],
          drill: "Build a 'blur ladder': the same subject shot at five increasing subject-to-background distances. Post the two extremes side by side and note which levers you'd combine for a product shot."
        },
        {
          id: "photography-2-3",
          title: "Natural Light Mastery: Windows, Shade, and $5 Modifiers",
          minutes: 11,
          xp: 60,
          skill: "photo",
          intro: "Most of the imagery that sells products and builds personal brands is shot with light nobody paid for. This lesson turns windows, walls, and weather into a controllable studio.",
          sections: [
            {
              h: "The Window Is a Softbox",
              body: "A north-facing window (or any window without direct sun streaming through) is a large, diffused source — functionally a free softbox. The working setups:\n\n- **45/45 classic:** subject at 45 degrees to the window, face angled slightly toward it. Sculpted, dimensional, flattering — the default for portraits, food, and product.\n- **Window as side light:** subject parallel to the window for dramatic half-lit texture. Editorial mood, strong for masculine portraits and moody product.\n- **Window behind camera:** flat, even, catalog-clean. Boring but honest — use for e-commerce style shots.\n- **Window behind subject:** backlit glow for hair and rim; expose for the face and let the window blow out to white.\n\nCritical physics: light falls off fast with distance. A subject one meter from the window is lit dramatically brighter than the room three meters back — which is exactly how you get bright subject, moody dark background, from one window and zero equipment."
            },
            {
              h: "Direct Sun: Tame It or Use It",
              body: "Direct sun is a hard, unforgiving source — but it's also free, powerful, and everywhere, so learn both moves.\n\n**Tame it.** Open shade remains the go-to: shaded side of a building, subject facing out. A sheer white curtain over a sunny window turns harsh stripes into glow — the classic apartment-studio trick. A $20 collapsible 5-in-1 diffuser held between sun and subject does the same anywhere.\n\n**Use it.** Backlit at golden hour, direct sun becomes rim light and atmosphere — shoot toward the sun, hide the disc behind your subject's head or a tree to control flare, expose for skin. Midday hard sun can be a style: deep graphic shadows, high contrast, fashion-editorial attitude — works best with confident styling and architecture, not casual portraits.\n\nThe amateur move is fighting the sun with a squinting subject facing it. Front-lit direct sun is the one configuration with almost no redemption: harsh, flat, and squinty at once."
            },
            {
              h: "Bounce and Negative Fill",
              body: "You can reshape natural light with objects that cost less than lunch.\n\n**Bounce (fill):** a white surface opposite the light source kicks illumination back into the shadows, lowering contrast. White foam board from a dollar store is the industry's actual secret weapon — food and product photographers use it daily. Silver reflectors bounce harder and crisper; gold warms (use sparingly — it turns skin orange fast). A white wall, a white bedsheet, even a white T-shirt on an assistant all work.\n\n**Negative fill:** the opposite move nobody teaches beginners. Placing something black beside the subject *absorbs* bounce and deepens shadows, adding contrast and drama to flat light. The other side of your foam board painted black, or black cloth, is the tool.\n\nA complete portable studio: one 5-in-1 reflector and one black/white foam board. Under $40, fits behind a car seat, and it's genuinely what many working shooters bring to lifestyle jobs."
            },
            {
              h: "Weather Is a Modifier",
              body: "Stop waiting for sunny days — read the sky as equipment.\n\n- **Overcast** is a planet-sized softbox: even, shadowless, forgiving. Perfect for portraits, product, and anything with reflective surfaces. The trade: flat gray skies — crop them out and add contrast in the edit.\n- **Thin cloud / hazy sun** is arguably the best portrait light outdoors: directional but soft, shadows present but gentle.\n- **After rain**, the world becomes a reflector — wet streets double city lights, colors saturate, and puddles offer mirror compositions. Some of the best 'cinematic' street photography conditions available.\n- **Fog** eats backgrounds and isolates subjects with built-in atmosphere and depth staging.\n- **Harsh clear noon** — the weather you thought you wanted — is the hardest to work with.\n\nProfessionals schedule around light the way sailors schedule around wind. Check the forecast for light, not comfort, and keep a shot list matched to each condition."
            }
          ],
          takeaways: [
            "A window is a free softbox — the 45/45 setup is the default for faces, food, and product.",
            "Light falloff from a window creates bright-subject/dark-room drama with zero equipment.",
            "White foam board fills shadows; black board (negative fill) deepens them — a complete $40 studio.",
            "Never front-light a squinting subject in direct sun; go open shade, diffuse it, or backlight it.",
            "Read weather as equipment: overcast = softbox, wet streets = reflectors, fog = isolation."
          ],
          actions: [
            "Shoot the four window positions (45/45, side, front, back) with the same subject in the next 24 hours.",
            "Buy or improvise a white and a black board; reshoot one flat photo with fill, then with negative fill.",
            "Write a 3-item shot list for the next overcast day and the next wet evening in your city."
          ],
          quiz: [
            {
              q: "What is 'negative fill'?",
              options: ["Underexposing on purpose", "Using a black surface to absorb bounce and deepen shadows", "Deleting bad photos", "A flash set to minimum power"],
              answer: 1,
              why: "Negative fill subtracts light from one side of the subject, restoring contrast and drama to flat light."
            },
            {
              q: "Why does one window produce a bright subject and a dark, moody room behind them?",
              options: ["Windows polarize light", "Light falls off rapidly with distance, so the room far from the window receives much less", "Cameras expose windows differently", "It only happens with tungsten bulbs"],
              answer: 1,
              why: "Falloff means brightness drops steeply with distance from the source — subject close to the window, room far from it."
            },
            {
              q: "Which outdoor condition acts like a giant softbox?",
              options: ["Clear noon sun", "Full overcast", "Golden hour backlight", "Night"],
              answer: 1,
              why: "Cloud cover diffuses the sun across the whole sky, creating enormous, even, soft illumination."
            }
          ],
          drill: "Shoot one 'window studio' product photo of anything you own: 45/45 window light, white board fill on the shadow side, phone on a stack of books as a tripod. Edit and post-ready in 30 minutes."
        },
        {
          id: "photography-2-4",
          title: "White Balance and Color That Sells",
          minutes: 9,
          xp: 60,
          skill: "photo",
          intro: "Viewers forgive soft focus before they forgive orange skin. Color temperature is invisible until you learn it — then you see it everywhere, and your images stop fighting themselves.",
          sections: [
            {
              h: "The Kelvin Scale in Your Head",
              body: "Every light source has a color temperature, measured in Kelvin. Memorize five anchors and you can diagnose any scene:\n\n- **~1,900K** — candle flame: deep orange.\n- **~2,700–3,200K** — household bulbs and tungsten: warm amber.\n- **~5,500K** — midday sun and flash: neutral white.\n- **~6,500–7,500K** — overcast sky and open shade: cool blue.\n- **~10,000K** — deep blue sky in shadow: very blue.\n\nWhite balance is your camera compensating: tell it (or let it guess) what the light's temperature is, and it neutralizes the cast so whites render white. Auto white balance is decent in single-source light and gets fooled by dominant colors — a red wall, a green forest — and by anything it can't average. When color matters, shoot RAW: white balance in a RAW file is a free, lossless slider in the edit, not a baked-in commitment."
            },
            {
              h: "Mixed Light: The Silent Image Killer",
              body: "The ugliest color problems come from mixing temperatures: a subject lit half by a warm lamp, half by blue window light, renders orange on one cheek and cyan on the other — and no single white balance setting can fix both. Skin caught in mixed light looks vaguely ill, and viewers feel it without knowing why.\n\nThe professional instinct is brutal and simple: **kill one source.** Shooting by the window? Turn the room lights off. Working with lamps at night? Close the curtains. One temperature, one clean correction, done.\n\nWhen you can't kill a source, dominate instead — get your subject overwhelmingly into one light so the other becomes a background tint rather than a skin contaminant. Background color contamination can even be a feature: warm subject, cool blue ambient behind is the beloved teal-and-orange contrast of cinema. The rule protects skin; backgrounds can play."
            },
            {
              h: "Skin First, Vibes Second",
              body: "In any image containing a person, skin tone is the credibility anchor. Viewers have a lifetime of calibration on what healthy skin looks like; miss it and the whole image reads as 'filtered' — deadly for personal brands and product trust alike.\n\nWorkflow discipline: correct skin to neutral-accurate FIRST, then apply style. Editing apps push global casts (teal shadows, orange warmth) across everything including faces; the pro move is establishing true skin, then styling shadows, backgrounds, and highlights around it — most editors let you protect skin tones while shifting everything else via HSL or color grading controls.\n\nTwo practical aids: photograph a **gray card** (or any known-neutral object) in your first frame at a location — one click in the edit calibrates every photo from that light. And judge color on a decent screen at moderate brightness; a max-brightness phone at 2 a.m. lies to you."
            },
            {
              h: "Color as Brand Language",
              body: "Beyond accuracy sits strategy: temperature is emotional vocabulary, and consistent color is one of the strongest visual-brand signals on a feed.\n\nWarmth (golden tones) codes as inviting, nostalgic, human — food, lifestyle, family brands live here. Coolness (blue-gray) codes as premium, technical, calm — tech, finance, modern luxury, automotive. Desaturated, controlled palettes with one accent color code as expensive; oversaturated everything codes as cheap. This is why luxury feeds look muted and discount retailers look neon.\n\nPick a lane and hold it. A feed alternating between golden-warm and clinical-cool reads as two different brands. Decide your baseline temperature and saturation philosophy, encode it (a preset helps, applied then adjusted per shot — never blindly), and let dozens of consistent thumbnails compound into instant recognition. When someone can identify your photo without seeing your name, color did its job."
            }
          ],
          takeaways: [
            "Learn five Kelvin anchors — candle 1,900K, tungsten 3,200K, daylight 5,500K, shade 7,000K+ — and diagnose any scene.",
            "Mixed color temperatures poison skin; kill or dominate one source.",
            "Correct skin to accurate first, style everything else second.",
            "Shoot RAW so white balance stays a lossless editing decision.",
            "Consistent temperature and restrained saturation are brand signals — muted reads premium, neon reads cheap."
          ],
          actions: [
            "Tonight, take one portrait in deliberately mixed light (lamp + window), then again with one source killed. Compare skin.",
            "Photograph something white or gray in your main shooting location and set a custom white balance from it.",
            "Define your brand temperature in one sentence (e.g., 'warm, slightly desaturated, one amber accent') and test it on 3 old photos."
          ],
          quiz: [
            {
              q: "A subject lit by a warm lamp on one side and window light on the other looks 'off.' Why?",
              options: ["The ISO is too high", "Mixed color temperatures can't be corrected with one white balance setting", "The lens has chromatic aberration", "Windows always require flash"],
              answer: 1,
              why: "Two different Kelvin temperatures on skin means any single correction leaves one side tinted — kill or dominate one source."
            },
            {
              q: "Roughly what color temperature is midday daylight?",
              options: ["1,900K", "3,200K", "5,500K", "10,000K"],
              answer: 2,
              why: "Midday sun sits near 5,500K, the neutral reference point that flash is also designed to match."
            },
            {
              q: "In editing an image with a person, what should be corrected before applying any stylistic color grade?",
              options: ["The sky", "Skin tones to neutral-accurate", "The sharpest areas", "The histogram's left edge"],
              answer: 1,
              why: "Skin is the viewer's credibility anchor — establish accurate skin first, then style the rest of the frame around it."
            }
          ],
          drill: "Shoot the same white object under four different light sources (window, lamp, overcast, fluorescent) with white balance locked to Daylight. Study the casts, then correct each in editing."
        },
        {
          id: "photography-2-5",
          title: "The Edit: From RAW File to Signature Look",
          minutes: 11,
          xp: 60,
          skill: "editing",
          intro: "Editing is where a good capture becomes your photograph. This is the professional order of operations in Lightroom (or any serious editor) — and the restraint that separates a graded image from a filtered one.",
          sections: [
            {
              h: "Why RAW, and the Order of Operations",
              body: "A JPEG is a decision the camera already made — contrast, color, and sharpening baked in, extra data discarded. A RAW file keeps everything the sensor saw, which means highlight recovery, shadow lifts, and white balance changes that would shred a JPEG are routine.\n\nThen edit in a consistent order, because each step affects the next:\n\n1. **Crop and straighten** — decide the frame before judging anything else; crooked horizons are amateur signature number one.\n2. **White balance** — get color neutral before touching tone.\n3. **Exposure and contrast** — set overall brightness, then black point and white point.\n4. **Highlights and shadows** — recover the sky, open the dark areas.\n5. **Color (HSL and grading)** — the style layer.\n6. **Local adjustments and cleanup** — masks, healing distractions.\n7. **Sharpening and export.**\n\nRandom-order editing is why beginners loop endlessly — every slider fight is a symptom of skipping a step."
            },
            {
              h: "Read the Histogram, Not the Screen",
              body: "Your screen lies — brightness settings, ambient light, and OLED punch all distort judgment. The histogram doesn't. It's a bar chart of tones: shadows on the left, highlights on the right.\n\nTwo failure modes to police. A graph slammed against the right edge means **clipped highlights** — pure white, zero data, unrecoverable. Slammed left means **crushed blacks** — pure black mud. Most strong images use the full width without climbing either wall; exceptions are deliberate (a silhouette crushes blacks on purpose; a high-key product shot rides the right side).\n\nIn the edit, pull Highlights down to restore sky and window detail, lift Shadows to open faces — but stop before the image goes flat and HDR-fake; some shadow depth is what makes light look like light. Then set contrast with the Blacks and Whites sliders (or tone curve) so the image has a true black point and true white point. Flat files look unfinished; anchored ones look printed."
            },
            {
              h: "HSL: The Scalpel of Color",
              body: "The HSL panel — Hue, Saturation, Luminance, per color channel — is where signature looks actually live, because it edits colors individually instead of globally.\n\nThe moves working editors make constantly:\n\n- **Skin:** nudge orange hue slightly toward red or yellow to taste, drop orange saturation a touch, raise orange luminance for glow. Tiny moves — skin breaks fast.\n- **Skies:** shift blue hue toward teal, drop blue luminance for drama or raise it for airiness.\n- **Greens:** desaturate and darken foliage slightly — one of the fastest 'cinematic' upgrades, since real-world greens photograph loud.\n- **The muted-luxury recipe:** drop global saturation ~10, then re-boost only the one or two channels your subject owns.\n\nThe discipline: every HSL move should have a reason you can say out loud. 'Teal shadows because I saw it on a preset' isn't a reason; 'quieting the greens so the red car owns the frame' is."
            },
            {
              h: "Presets, Consistency, and Export",
              body: "Presets are starting points, not verdicts. Build (or buy) one that encodes your baseline — your contrast philosophy, your HSL biases, your grain and sharpening — then adjust exposure and white balance per shot, because no preset survives contact with different light. A one-click-and-post workflow is how feeds end up with gray skin in one photo and neon in the next.\n\nConsistency is the compounding asset. Edit in batches: sync your baseline across a shoot, then refine each frame. Before exporting a set, view all selects as thumbnails together — the grid view is your feed preview, and outliers jump out instantly.\n\nExport for the destination: 4:5 at 1080×1350 minimum for feeds, quality high, and modest export sharpening (screen-appropriate). Keep your RAW originals and your edit settings; next quarter's better taste will want to re-export old winners. And the ten-minute rule: if you've fiddled past ten minutes, walk away — fresh eyes edit better than tired ones."
            }
          ],
          takeaways: [
            "Shoot RAW and edit in order: crop, white balance, exposure, highlights/shadows, color, local, sharpen.",
            "Trust the histogram over your screen; avoid clipping either edge unless it's deliberate.",
            "HSL edits individual colors — the muted-luxury recipe is global desaturation plus one owned accent channel.",
            "Presets are baselines to adjust per shot, never one-click verdicts.",
            "Review sets in grid view before export — consistency across thumbnails is the brand asset."
          ],
          actions: [
            "Re-edit one old photo following the exact seven-step order. Time yourself — aim for under ten minutes.",
            "Open the HSL panel and perform the greens-desaturation move on one outdoor shot; note the instant mood shift.",
            "Build your baseline preset from your best-ever edit and apply it (with per-shot adjustments) to your next three posts."
          ],
          quiz: [
            {
              q: "What should you set FIRST in the professional editing order?",
              options: ["Sharpening", "HSL color", "Crop/straighten, then white balance", "Vignette"],
              answer: 2,
              why: "Decide the frame, then neutralize color — every later judgment depends on those two."
            },
            {
              q: "The histogram is slammed against the right wall. What does that mean?",
              options: ["The image is too sharp", "Clipped highlights — pure white with no recoverable data", "Perfect exposure", "The file is corrupted"],
              answer: 1,
              why: "A right-edge pile-up means highlight data is gone; on a RAW file you may recover some, on a JPEG it's lost."
            },
            {
              q: "What's the correct role of a preset in a professional workflow?",
              options: ["Final one-click edit for all photos", "A baseline look you adjust per shot for exposure and white balance", "A replacement for shooting RAW", "Something applied only to bad photos"],
              answer: 1,
              why: "Light changes shot to shot, so presets encode your style baseline and still require per-image correction."
            }
          ],
          drill: "Take one RAW (or high-quality) photo and produce three distinct grades: accurate-clean, warm-lifestyle, muted-luxury. Write one line on which fits your brand and why."
        }
      ]
    },
    {
      id: "photography-3",
      level: "Advanced",
      title: "Light on Demand",
      description: "Artificial lighting and the craft of the portrait — build any look at any hour with one light, then direct real people like a professional.",
      lessons: [
        {
          id: "photography-3-1",
          title: "One Light, Every Look",
          minutes: 12,
          xp: 75,
          skill: "photo",
          intro: "Ninety percent of commercial lighting problems are solved with one light and one modifier. Before you buy a second strobe, this lesson proves you haven't exhausted the first.",
          sections: [
            {
              h: "The Inverse Square Law, Practically",
              body: "One law governs everything you'll do with artificial light: intensity falls off with the square of distance. Double the light-to-subject distance and you get one quarter the light — a two-stop drop. Halve it and you get four times the light.\n\nThe practical consequences are where it gets useful. **Light close to the subject** means dramatic falloff — the far side of a face darkens fast, and the background a few meters back goes nearly black. That's how you shoot 'black background' portraits in a normal bright room: light in tight, power down, expose for the subject. **Light far from the subject** means even illumination — the falloff across a group flattens out, which is why group shots need the light pulled back.\n\nOne more effect: close also means softer, because the modifier is larger relative to the subject. So distance sets three things at once — power, evenness, and softness. Move the light before you touch the power dial."
            },
            {
              h: "Modifiers: What Shapes the Light",
              body: "A bare bulb or bare flash is a small, hard source. Modifiers change its size and behavior:\n\n- **Umbrella (shoot-through or bounce):** cheap, fast, broad soft light that sprays everywhere. Great first modifier; poor control.\n- **Softbox:** contained soft light with edges you can aim. The workhorse — a 60–90cm softbox handles portraits, product, and content-creator setups. Add the inner baffle for extra smoothness.\n- **Beauty dish:** semi-hard, sculpted glamour light — crisp cheekbones with soft edges. Fashion and fitness love it.\n- **Grid:** honeycomb that narrows the beam into a controlled pool. Grids create drama and protect backgrounds from spill.\n- **Bare with reflector dish:** hard, punchy, editorial.\n\nThe skill that outranks owning them all: **feathering** — aiming the modifier's edge, not its center, at the subject. The edge of a softbox is its softest, most gradient-rich zone, and feathering past the subject also keeps spill off the background."
            },
            {
              h: "The 45/45 Starting Position and Where to Go From It",
              body: "Default setup, burned into every studio shooter: key light 45 degrees to the side of the subject, 45 degrees above eye line, aimed down at the face. It models the most familiar flattering light humans know — sun and sky — producing dimensional shadows, defined cheekbones, and catchlights that sit high in the eyes, where they look alive.\n\nFrom there, every move is a vocabulary word. Raise the light and shadows lengthen downward — more drama, gaunter cheeks; too high and the eyes go dead (no catchlight, raccoon sockets). Lower it toward eye level and the face flattens, opens, younger. Swing it toward the camera axis for beauty-flat; swing it past 90 degrees for split-face noir. Pull it away for evenness; push it in for falloff and mood.\n\nDiscipline for learning: change ONE variable per frame and review. Photographers who move three things at once never learn which move did what."
            },
            {
              h: "Continuous vs. Flash, and a Starter Kit",
              body: "Two families of artificial light. **Continuous (LED)** shows you exactly what you'll get in real time, doubles for video, and is the right first light for content creators — the learning curve is basically zero. Its limits: less raw power than flash, and it can't freeze motion by itself.\n\n**Flash/strobe** delivers enormous power in a burst measured in fractions of a millisecond — it freezes motion, overpowers the sun, and enables apertures and ISO combinations continuous light can't reach. The cost is that you can't see the result until the frame (modeling lights and test shots close the gap).\n\nHonest starter kit for social-first shooters: one bi-color LED panel or COB light around 100W+, one 60–90cm softbox, one light stand, one white/black board. Add a $70–150 speedlight with a wireless trigger when you outgrow it. Everything in the next four lessons is achievable with that bag."
            }
          ],
          takeaways: [
            "Inverse square law: double the distance, quarter the light — distance sets power, evenness, AND softness.",
            "Light close = dramatic falloff and dark backgrounds; light far = even coverage for groups.",
            "Softbox is the workhorse; grids control spill; feather the modifier's edge for the softest gradient.",
            "Start at 45/45 and change one variable per frame — that's how lighting vocabulary is actually learned.",
            "LEDs are the right first light for creators; flash buys power and motion-freezing when you outgrow them."
          ],
          actions: [
            "Recreate the black-background trick tonight: any light in close, power low, expose for the subject in a normal room.",
            "Do a 45/45 session with any light source (even a desk lamp with baking paper as diffusion): 10 frames, one variable changed per frame.",
            "Watch the catchlights in your test shots — identify the exact frame where raising the key kills them."
          ],
          quiz: [
            {
              q: "You double the distance from light to subject. What happens to the light hitting them?",
              options: ["It halves", "It drops to one quarter — two stops", "It stays the same", "It drops by exactly one stop"],
              answer: 1,
              why: "The inverse square law: intensity falls with the square of distance, so 2x distance = 1/4 the light."
            },
            {
              q: "What does a grid on a light do?",
              options: ["Softens the light", "Warms the color", "Narrows the beam into a controlled pool and kills spill", "Doubles the power"],
              answer: 2,
              why: "A grid's honeycomb restricts the light's spread, creating pools of light and protecting backgrounds."
            },
            {
              q: "Why does moving a softbox closer to the subject make the light softer?",
              options: ["The bulb burns cooler", "The modifier becomes larger relative to the subject", "It adds diffusion automatically", "It doesn't — closer is harder"],
              answer: 1,
              why: "Softness is about apparent source size — the same softbox, closer, occupies a bigger angle from the subject's view."
            }
          ],
          drill: "Using one lamp and a white sheet or baking paper, produce three distinct portraits in one evening: soft and bright, moody falloff with a dark background, and hard-edged noir."
        },
        {
          id: "photography-3-2",
          title: "Portrait Lighting Patterns: The Classic Five",
          minutes: 11,
          xp: 75,
          skill: "photo",
          intro: "Every face you've admired in a campaign was lit with one of five named patterns. Learn them and you stop hoping portraits look good — you decide how they look before the first frame.",
          sections: [
            {
              h: "Rembrandt and Loop: The Workhorses",
              body: "**Rembrandt lighting** — named for the painter who used it obsessively — puts the key light roughly 45 degrees to the side and above, so the nose shadow connects with the cheek shadow, leaving a small triangle of light on the shadow-side cheek, just under the eye. That triangle is the signature: dramatic, dimensional, painterly. It suits strong features, serious brands, and moody editorial work.\n\n**Loop lighting** is Rembrandt's friendlier sibling: bring the light slightly more toward the camera and a touch lower, and the nose shadow becomes a small 'loop' angling down toward the corner of the mouth — but never connecting to the cheek shadow. Dimensional yet open, flattering on almost every face, and consequently the most-used portrait pattern in professional work. When in doubt, light for loop.\n\nBoth patterns live or die by millimeters of lamp position — watch the nose shadow like a hawk and direct the light, not the pose, to fix it."
            },
            {
              h: "Butterfly and Split: Glamour and Drama",
              body: "**Butterfly lighting** (also called Paramount, after the studio that made it iconic) places the key directly in front of the subject, above their eye line, aimed down. The tell is a small butterfly-shaped shadow directly under the nose. It emphasizes cheekbones, smooths the face, and reads as classic Hollywood glamour — the default for beauty campaigns. Add a reflector under the chin, bouncing light upward to fill neck shadows, and you have **clamshell lighting**: the standard of the beauty industry.\n\n**Split lighting** swings the key a full 90 degrees to the side: one half of the face lit, the other in shadow, split down the nose. It's the drama pattern — mystery, intensity, film-noir attitude, athletes and artists. It's unforgiving on skin texture and rarely a commercial default, but nothing else communicates edge as fast.\n\nA useful axis to remember: front-and-high flatters and smooths; side-and-level dramatizes and textures."
            },
            {
              h: "Broad vs. Short: The Slimming Switch",
              body: "Independent of pattern, there's a second decision when the face is angled: which side of the face gets the key?\n\n**Broad lighting** illuminates the side of the face turned toward the camera — the 'broad' side. It widens the face visually and fills in texture. Occasionally useful for very narrow faces; mostly it just makes faces look heavier.\n\n**Short lighting** illuminates the side turned away from camera, leaving the near side in shadow. Shadow visually recedes, so the face slims; the jawline sharpens; the whole portrait gains depth. Short lighting is the professional default for exactly this reason — clients essentially never complain about looking slimmer.\n\nThe mechanic is simple: pose the face angled slightly away from the key light and you get short; angled toward it and you get broad. Which means you can switch patterns without touching the light — just turn the chin. That's the kind of on-set speed that makes subjects trust you."
            },
            {
              h: "Reading Faces and Building the Second Light",
              body: "Patterns are a menu; the face chooses. Strong jaw and defined features carry Rembrandt and split beautifully. Softer or rounder faces flatter under loop and butterfly. Textured, characterful skin becomes a story in side light or a smoothed asset in clamshell. Glasses demand the key raised or feathered until the frame reflections clear. There is no 'best' pattern — only a best pattern for this face, this brand, this mood.\n\nWhen one light is mastered, the second one has three honest jobs: **fill** (opposite the key, well below its power, or just a white board — controls how dark shadows go, described as the key-to-fill ratio), **rim/hair light** (behind the subject, aimed at hair and shoulders, separating them from the background — the 'expensive' look in one move), or **background light** (a controlled pool or gradient behind them).\n\nAdd exactly one job at a time. Two lights doing defined jobs beat four lights doing vibes."
            }
          ],
          takeaways: [
            "Loop is the flattering everyday default; Rembrandt's cheek triangle is the drama upgrade.",
            "Butterfly/clamshell is glamour and beauty; split is maximum-drama editorial.",
            "Short lighting (key on the far side of an angled face) slims and adds depth — the pro default.",
            "You can switch patterns by turning the subject's chin, without moving the light.",
            "A second light gets ONE defined job: fill, rim, or background."
          ],
          actions: [
            "Shoot all five patterns (loop, Rembrandt, butterfly, split, clamshell-with-reflector) on one subject in one session using a single light.",
            "Practice the chin-turn: from one light position, produce both broad and short lighting by rotating the face.",
            "Screenshot 3 ads with faces and name the pattern and broad/short choice in each."
          ],
          quiz: [
            {
              q: "What identifies Rembrandt lighting?",
              options: ["A butterfly shadow under the nose", "A triangle of light on the shadow-side cheek", "The face split exactly in half", "No shadows anywhere"],
              answer: 1,
              why: "Rembrandt's signature is the small lit triangle under the shadow-side eye, formed when nose and cheek shadows connect."
            },
            {
              q: "Why is short lighting the professional default for angled faces?",
              options: ["It's the easiest to set up", "Shadow on the camera-side of the face visually slims and adds depth", "It requires no modifier", "It works without a subject"],
              answer: 1,
              why: "Lighting the far side leaves the near side in receding shadow, slimming the face — which nearly every subject prefers."
            },
            {
              q: "Clamshell lighting is butterfly lighting plus what?",
              options: ["A second key at 90 degrees", "A grid on the key", "Upward fill from a reflector under the chin", "A colored gel"],
              answer: 2,
              why: "The 'clamshell' is the key above and fill bouncing from below, sandwiching the face in soft beauty light."
            }
          ],
          drill: "Light a friend (or yourself with a timer) in loop, then move ONLY the light until you hit Rembrandt, then butterfly. Save the three frames with the light position noted on each."
        },
        {
          id: "photography-3-3",
          title: "Directing People Who Aren't Models",
          minutes: 10,
          xp: 75,
          skill: "photo",
          intro: "Your lighting can be perfect and the portrait still dies if the person looks like a hostage. Directing humans is a learnable craft — prompts, posture math, and the psychology of making people forget the lens.",
          sections: [
            {
              h: "The First Five Minutes Decide the Shoot",
              body: "Nobody relaxes on command. People relax when they trust that you know what you're doing and that they won't look stupid — so engineer both immediately.\n\nStart shooting fast, before they're 'ready.' Long fiddling with settings while a subject stands waiting is where self-consciousness metastasizes. Fire test frames within a minute, talking the whole time. Then use the game-changer: **show them a good frame early.** The moment a nervous subject sees one photo where they look great, their shoulders drop and the entire session changes. Engineer that frame — your most reliable pattern, their better angle, then walk over and show them.\n\nKeep a stream of low-grade talk going between frames; silence behind a camera reads as judgment. And never, ever say 'relax' or 'be natural' — both instructions produce the exact opposite. Give people something to DO, and natural happens as a side effect."
            },
            {
              h: "Posture Math: Small Moves, Big Fixes",
              body: "A handful of physical adjustments fix ninety percent of awkward portraits:\n\n- **Weight on the back foot,** front knee soft. Instantly breaks the rigid military stance.\n- **Angle the body 30–45 degrees** to camera, then turn the face back toward the lens. Square-on reads like a mugshot; angled reads like a portrait (and sets up short lighting).\n- **The chin move:** push the chin slightly out toward the camera, then tip it a touch down. Feels absurd, defines the jawline in every case. Say 'chin toward me... tiny bit down' — never 'fix your double chin.'\n- **Create space at the waist:** hands off the torso, arms slightly lifted — a hand in a pocket (thumb out), holding a jacket, touching a collar. Arms pinned to the body widen everything.\n- **Shoulders down and back,** one slightly dropped for asymmetry.\n\nDeliver these as one-at-a-time micro-adjustments with praise between each. Stacking five corrections at once creates a panicked mannequin."
            },
            {
              h: "Hands Need Jobs, Bodies Need Motion",
              body: "The two universal amateur tells: dead hands and frozen bodies.\n\nHands hanging limp broadcast discomfort. Give every hand a job: fix a cuff or a watch, hold a coffee, adjust sunglasses, run fingers through hair, touch the collar, pockets (thumbs out or in — a full buried fist looks tense). Soft hands, side of the hand toward camera when possible — palms flat toward the lens look enormous.\n\nBetter still, replace poses with **movement prompts**, because motion caught mid-flow always beats a held position:\n\n- 'Walk away, then look back at me on three.'\n- 'Walk toward me like you're late but happy about it.'\n- 'Fix your jacket and glance off to the left.'\n- 'Spin once and stop facing the window.'\n\nShoot in bursts during every prompt — the in-between frames, the half-laugh, the mid-turn, are usually the keepers. This is exactly why candid-feeling lifestyle imagery is shot: it's staged motion, harvested in burst mode."
            },
            {
              h: "Expression Is Directed, Not Requested",
              body: "'Smile' produces the tight, dead-eyed social smile everyone hates in their own photos. Real expression is provoked, not requested.\n\nThe absurdity trick: give deliberately ridiculous direction — 'look at me like I owe you money,' 'do your worst fake laugh.' The fake laugh collapses into a real one within seconds, and THAT's the frame. For softer looks: 'close your eyes... open on three and breathe out.' The just-opened eyes and dropped breath read as calm confidence, the exact expression luxury and personal-brand portraits want. For intensity: 'look at the ground, then bring just your eyes up to me.'\n\nMirror the energy you want back — subjects unconsciously match the photographer. Flat photographer, flat subject. And end every session on praise plus a preview of the best frames: the last ninety seconds decides whether they tell people the shoot was fun, and whether they trust you next time. Repeat subjects who trust you are worth ten new ones."
            }
          ],
          takeaways: [
            "Show a good frame in the first five minutes — trust transforms the whole session.",
            "Posture math: weight back, body angled, chin out-and-down, space at the waist, one adjustment at a time.",
            "Give every hand a job and replace poses with movement prompts, shot in bursts.",
            "Never say 'relax' or 'smile' — provoke real expression with absurd or breath-based prompts.",
            "The subject's energy mirrors yours; direct like the mood you want to capture."
          ],
          actions: [
            "Memorize three movement prompts and two expression prompts — write them in your phone notes before your next shoot.",
            "Practice the chin cue on yourself in a mirror until you can explain it in one friendly sentence.",
            "On your next portrait session, show the subject a great frame within five minutes and note the shift."
          ],
          quiz: [
            {
              q: "Why should you avoid telling a subject to 'relax and be natural'?",
              options: ["It's grammatically wrong", "Self-directed instructions increase self-consciousness; giving a task produces natural behavior", "Subjects should be tense for better jawlines", "It only works on professional models"],
              answer: 1,
              why: "People can't perform 'natural' on command — action prompts occupy the mind and naturalness follows."
            },
            {
              q: "What does the 'chin out, then slightly down' cue accomplish?",
              options: ["It widens the face", "It defines the jawline on virtually every subject", "It's only for profile shots", "It improves focus accuracy"],
              answer: 1,
              why: "Extending the chin stretches the area under the jaw, sharpening its line — the most reliable posing fix there is."
            },
            {
              q: "During a movement prompt like 'walk toward me,' how should you shoot?",
              options: ["One carefully timed frame", "In bursts, because the in-between moments are usually the keepers", "Only at the end of the walk", "With a slow shutter for artistic blur"],
              answer: 1,
              why: "Motion produces unrepeatable half-moments; bursts let you harvest the genuine frame between the posed ones."
            }
          ],
          drill: "Direct a 10-minute session with a friend using ONLY prompts from this lesson — no 'smile,' no 'relax.' Deliver their three best frames the same day."
        },
        {
          id: "photography-3-4",
          title: "Environmental Portraits: Person, Place, Purpose",
          minutes: 10,
          xp: 75,
          skill: "photo",
          intro: "A headshot says what someone looks like. An environmental portrait says who they are — and it's the format personal brands, founders, and creators actually need most.",
          sections: [
            {
              h: "The Person-Place-Purpose Triangle",
              body: "An environmental portrait earns its name when three elements interlock: a **person**, in a **place** that means something, arranged so the **purpose** — what they do, what they stand for — is legible without a caption. The chef mid-service in the steam of their kitchen. The founder at the whiteboard mid-thought. The detailer kneeling by a fender with towel in hand.\n\nThe test: strip the caption. Could a stranger deduce what this person does and cares about within two seconds? If not, the environment is just a backdrop, not a story.\n\nThis is why environmental portraits outperform studio headshots for personal brands on social — they deliver context, credibility, and narrative in a single scrollable frame. A headshot asks the viewer to trust a face; an environmental portrait shows the receipts. Build your shot around the triangle first, camera settings second."
            },
            {
              h: "Scout With Your Eyes, Then the Lens",
              body: "Arrive early and shop the location for three things, in order.\n\n**Light first.** Find the best available light — the big window, the doorway, the golden-hour angle through the shopfront — and be willing to move the 'iconic' activity into it. A great subject in bad light loses to a decent subject in great light, every time.\n\n**Depth second.** Hunt sight-lines with layers: shooting down the workbench instead of at the wall, through the kitchen pass, past a rack of tools. Depth turns a location into a world; flat walls turn it into a DMV photo.\n\n**Story props third.** Curate the set dressing — clear the water bottles, phone chargers, and clutter that would date or cheapen the frame, and deliberately include the two or three objects that carry meaning: the knives, the awards, the prototype. You're not decorating; you're editing reality down to the narrative. Ten minutes of set editing outperforms an hour of retouching."
            },
            {
              h: "Settings and Coverage for Story",
              body: "The environment must stay legible, so resist your wide-open habit: f/2.8–f/5.6 keeps the person unmistakably the subject while the place remains readable behind them. Composition placement: subject on a thirds line, environment flowing through the remaining space, with leading lines (counters, shelves, rails) pointed at them.\n\nThen shoot coverage like a filmmaker, because one frame is never the deliverable anymore:\n\n- **The wide:** full scene, subject in context — the establishing shot.\n- **The medium:** waist-up, engaged in the activity — usually the hero.\n- **The tight:** hands doing the work, tools, texture — the credibility detail.\n- **The portrait:** the person pausing, looking to lens — connection.\n\nThat four-shot system produces a carousel, not just a photo — wide, medium, tight, portrait is a complete visual story a brand can post as a set. Work each setup in both action and to-camera versions."
            },
            {
              h: "Balancing Subject and Ambient Light",
              body: "Locations rarely light your subject as well as they light themselves, so learn the modest interventions.\n\nThe simplest: position the person where the location's best light already falls — near the window, under the skylight, inside the doorway glow — and let the deeper room fall a stop darker behind them. That natural falloff does the separating for you.\n\nWhen the face still needs help, add a small LED at low power, through a small softbox or bounced off a white surface, matched to the room's color temperature — a warm cafe wants a warm fill, or your subject glows corpse-blue against amber ambience. The goal is invisible assistance: viewers should read 'great light in a real place,' never 'lit photo.' Half a stop to one stop above ambient on the face is usually plenty.\n\nWatch mixed sources (lesson 2-4 rules apply doubly here), and shoot a gray-card frame per setup — location color casts are brutal on skin in the edit."
            }
          ],
          takeaways: [
            "Person, place, purpose — a stranger should deduce the story without a caption.",
            "Scout in order: light, then depth, then story props; edit reality before you shoot it.",
            "Shoot f/2.8–f/5.6 so the environment stays legible, and cover wide/medium/tight/portrait.",
            "The four-shot system delivers a complete carousel from one setup.",
            "Support faces with subtle, temperature-matched fill — a stop above ambient, never 'lit-looking.'"
          ],
          actions: [
            "Write a person-place-purpose sentence for your own brand portrait, then list the three props that must appear.",
            "Shoot the four-shot system on someone doing what they do — wide, medium, tight, portrait — in 20 minutes.",
            "Audit a location you use often: mark the single best light position and time of day, and save it in your notes."
          ],
          quiz: [
            {
              q: "What's the caption-strip test for an environmental portrait?",
              options: ["The photo must work in black and white", "A stranger should deduce what the person does without any caption", "The caption must be under 20 words", "The subject must not look at camera"],
              answer: 1,
              why: "If the story isn't legible from the frame alone, the environment is decoration, not narrative."
            },
            {
              q: "Why shoot environmental portraits around f/2.8–f/5.6 rather than wide open?",
              options: ["Cheaper lenses only offer those apertures", "The environment must remain readable — it carries half the story", "Faces are sharper at f/16", "Blur is unprofessional"],
              answer: 1,
              why: "Melting the background into pure blur deletes the 'place' from person-place-purpose."
            },
            {
              q: "What is the four-shot coverage system?",
              options: ["Four identical frames for safety", "Wide, medium, tight, and portrait — a complete story set from one scene", "Four different subjects", "Four apertures of the same frame"],
              answer: 1,
              why: "Wide establishes, medium shows the action, tight proves the craft, portrait connects — a ready-made carousel."
            }
          ],
          drill: "Make an environmental self-portrait: your workspace, styled with intent, camera on a timer. Run the caption-strip test on the result — and fix what fails it."
        },
        {
          id: "photography-3-5",
          title: "Off-Camera Flash and Mixing Ambient",
          minutes: 12,
          xp: 75,
          skill: "photo",
          intro: "The moment your flash leaves the camera, you stop taking photos of light that exists and start building light that doesn't. This is the technique behind every 'how is that lit?' portrait on your feed.",
          sections: [
            {
              h: "Two Exposures in One Frame",
              body: "The mental model that unlocks flash: every flash photo contains **two independent exposures.** The ambient exposure — the room, the sky, the city behind — is controlled by shutter speed, ISO, and aperture, exactly as always. The flash exposure — whatever your strobe hits — is controlled by flash power, distance, and aperture. But NOT by shutter speed: the flash burst lasts a fraction of a millisecond, so as long as the shutter is open at all, the full burst lands.\n\nThat asymmetry is the superpower. **Shutter speed becomes your background dial** — slow it down and the ambient world brightens while your flashed subject stays identical. Speed it up (to your camera's sync limit, typically 1/200–1/250) and the background darkens, again without touching the subject.\n\nOnce you internalize 'shutter controls the world, power controls my subject,' flash stops being chaos and becomes two clean sliders."
            },
            {
              h: "The Recipe: Ambient First, Then Flash",
              body: "Working order, every time:\n\n1. **Flash off. Expose the background** to taste — this is a creative decision, not a correction. The signature editorial move: underexpose ambient by one to two stops, so the sky goes rich and dramatic instead of washy.\n2. **Turn on the flash** (through a modifier, 45/45, per lesson 3-1) and raise power until the subject sits correctly against that background. Start around 1/16 power and walk it up.\n3. **Refine one variable at a time.** Background too dark? Slower shutter. Subject too hot? Power down or pull the light back.\n\nThis is how those pictures work — the ones with a perfectly lit person against a moody, saturated dusk sky. It isn't editing; it's an underexposed ambient plus a flagged, modified strobe. 'Dragging the shutter' — deliberately slow shutter with flash — does the reverse for interiors: warm, alive backgrounds behind a crisply frozen subject at a dim venue."
            },
            {
              h: "Sync Speed, HSS, and Beating the Sun",
              body: "Your camera's **sync speed** (usually 1/200–1/250s) is the fastest shutter at which the sensor is fully exposed when the flash fires; go faster and a black shutter-curtain band creeps into frame. That ceiling matters outdoors: bright sun at 1/250 forces small apertures — say goodbye to f/2 blur.\n\n**High-speed sync (HSS)** breaks the ceiling by pulsing the flash through the exposure, letting you shoot 1/4000 at f/1.8 in full sun — the technique behind sunlit portraits with melted backgrounds AND controlled skies. The cost: HSS burns two-plus stops of flash power, so bring the light in close or bring more light.\n\nThe glamour application is 'overpowering the sun': underexpose the ambient sky until it saturates deep blue, then flash the subject to full exposure. Result — a day-for-dusk, big-production look from one strobe. Cars, athletes, and fashion feeds run on this one move."
            },
            {
              h: "Gels: Matching and Painting",
              body: "A naked flash fires at daylight color (~5,500K), which is exactly wrong inside a warm venue: your subject renders clinical white against amber surroundings, and no global edit can reconcile them. The fix costs a few dollars — a **CTO gel** (color temperature orange) taped over the flash warms its output to match tungsten ambience. Match your flash to the dominant ambient, then set white balance for that shared temperature. This is the difference between event photos that look 'flashed' and ones that look naturally lucky.\n\nThe same physics runs in reverse as style: at golden hour, half-CTO your key so it blends with the sunset instead of fighting it. And once matching is mastered, paint — a gelled rim light in teal or magenta behind the subject creates the two-tone color-contrast look that dominates high-end fitness, automotive, and music imagery. Rule of taste: one motivated color story per frame. Two gels with a reason beat five gels with a vibe."
            }
          ],
          takeaways: [
            "A flash frame is two exposures: shutter/ISO run the ambient, flash power runs the subject.",
            "Work ambient-first: set the background mood, then raise flash power to place the subject in it.",
            "Underexposing ambient 1–2 stops plus a modified flash = the dramatic editorial-sky look.",
            "HSS breaks the sync-speed ceiling for wide apertures in sun, at the cost of flash power.",
            "Gel the flash to match dominant ambient (CTO indoors, half-CTO at sunset) — or gel to paint, one color story per frame."
          ],
          actions: [
            "Find your camera's sync speed in its manual or menus and shoot a test past it to see the curtain band once — you'll never forget it.",
            "Run the recipe at dusk: expose sky 1 stop under, then flash a subject (even through a white pillowcase) to full exposure.",
            "Order a basic gel pack; tape a CTO on your flash at your next indoor evening shoot and compare skin against ungelled frames."
          ],
          quiz: [
            {
              q: "In a flash photo, what does slowing the shutter speed change?",
              options: ["The flash-lit subject's brightness", "The ambient/background brightness only", "Both equally", "Nothing — shutter is irrelevant with flash"],
              answer: 1,
              why: "The flash burst is near-instant, so shutter duration only accumulates ambient light — it's your background dial."
            },
            {
              q: "What does high-speed sync (HSS) let you do?",
              options: ["Fire the flash twice per frame", "Use shutter speeds beyond sync speed — e.g., f/1.8 in full sun at 1/4000", "Double the flash's power", "Trigger flashes from farther away"],
              answer: 1,
              why: "HSS pulses the flash through the exposure, breaking the sync ceiling at the cost of effective power."
            },
            {
              q: "Why tape a CTO gel on a flash inside a warm-lit venue?",
              options: ["To increase power", "To soften the light", "To match the flash's color to the ambient tungsten so skin and room share one temperature", "To protect the flash tube"],
              answer: 2,
              why: "Matching the flash to the dominant ambient temperature prevents the clinical white-subject-in-amber-room mismatch."
            }
          ],
          drill: "One dusk session, one flash: produce a natural-balance frame, a one-stop-under 'editorial sky' frame, and a two-stops-under 'day-for-dusk' frame of the same subject. Label the settings on each."
        }
      ]
    },
    {
      id: "photography-4",
      level: "Expert",
      title: "Sell With the Lens",
      description: "Luxury product, automotive, and brand-campaign photography — the commercial disciplines where a single frame has to justify a premium price tag.",
      lessons: [
        {
          id: "photography-4-1",
          title: "Luxury Product: Light the Surface, Not the Object",
          minutes: 12,
          xp: 90,
          skill: "photo",
          intro: "Product photography that commands luxury prices obeys one inversion: you are not lighting the object, you are lighting what its surfaces reflect. Master that idea and a bottle on your kitchen table can look like a $20k studio shot.",
          sections: [
            {
              h: "The Family of Angles",
              body: "Glossy surfaces — glass, polished metal, lacquer, piano-black plastic — behave as mirrors. They don't show light falling on them; they show reflections OF your light sources from specific positions. The set of positions a surface can 'see' and reflect back to your camera is called the **family of angles**, and it's the foundational concept of commercial product lighting.\n\nThe consequence: pointing a light AT a glossy product often does nothing visible, while a light placed off to the side — inside the family of angles — paints a bright stripe across it. You aren't aiming light at the object; you're placing things (bright panels, black cards, gradients) in the positions its surfaces reflect.\n\nDiagnostic habit: look at the product through the camera and ask of every surface, 'what is this reflecting right now?' The ceiling? Your white T-shirt? The window behind you? Every one of those reflections is either a design choice or a mistake."
            },
            {
              h: "The Gradient Highlight: Luxury's Signature",
              body: "Look closely at any high-end bottle, watch, or phone ad: the highlights are never flat white blobs. They're **gradients** — smooth transitions from bright to dark running along the surface, which is what communicates 'flawless, curved, expensive' to the eye.\n\nThe build: a large diffused source (softbox, or a strip light — a tall narrow softbox made for exactly this) placed edge-on within the family of angles, often feathered so the product reflects the modifier's falloff rather than its hot center. A sheet of diffusion between light and product, with the light raked across it, produces the same gradient for the price of baking paper.\n\nStrip highlights should follow the product's form — vertical along a bottle's shoulder, curved around a watch case. One elegant gradient per major surface; a product wearing five competing highlights reads as chaos. This single technique — gradient over blob — is the most visible difference between amateur and commercial product work."
            },
            {
              h: "Black Cards, White Cards, and Edge Definition",
              body: "If white panels create highlights in reflective surfaces, black cards create their opposite: **defined dark edges.** A clear glass bottle shot against white simply vanishes — its edges disappear into the background. Stand two black cards just outside the frame on either side, and the glass reflects them as crisp dark contour lines. The bottle suddenly has a drawn silhouette. This is the classic 'bright-field' glassware setup: white background, black-card edges.\n\nThe inverse — 'dark-field' — puts the product against black with thin white highlights defining the edges: moodier, and the default for premium spirits.\n\nBeyond glass, black cards subtract contamination everywhere: they block stray bounce, deepen shadow sides, and stop your white ceiling from flattening a carefully built gradient. A serious tabletop kit is mostly cardboard: white boards, black boards, a mirror shard for kicking a highlight into a logo, and tape. The strobes are interchangeable; the cards are the craft."
            },
            {
              h: "Styling, Sets, and the Discipline of Clean",
              body: "The light can be perfect and the shot still cheap if the set betrays you.\n\nStyling for luxury runs on subtraction: one hero product, at most two supporting textures — marble, dark wood, linen, slate, brushed steel — and aggressive negative space. Props must be story-relevant (citrus beside the gin, leather beneath the watch) and always subordinate: slightly out of focus, cropped, or tonally quieter than the hero. Cheap tells to hunt down: dust, fingerprints, fabric wrinkles, price stickers, and crooked labels — shoot with gloves, keep a blower and microfiber on the table, and align the label to camera before every frame, because 'we'll fix it in post' doubles your editing time.\n\nCamera craft: tripod always (product work is a game of millimeter-consistent frames), f/8–f/11 for edge-to-edge sharpness on the hero, base ISO, and tethered or big-screen review — a phone screen hides the fingerprint that a client's monitor will scream."
            }
          ],
          takeaways: [
            "Glossy products show reflections, not light — place sources within the family of angles.",
            "The gradient highlight from a feathered strip or diffused panel is the signature of expensive product work.",
            "Black cards draw edges on glass and protect gradients; the cardboard is the craft.",
            "Style by subtraction: one hero, two textures, ruthless negative space, zero dust.",
            "Tripod, f/8–f/11, base ISO, big-screen review — product work is a millimeter game."
          ],
          actions: [
            "Shoot any bottle you own against a window with baking-paper diffusion: build one clean vertical gradient highlight.",
            "Add two black cards (cereal box + black paper works) beside a glass and watch its edges appear.",
            "Build a five-item 'set kit': white board, black board, microfiber, blower or brush, tape. Keep it in one box."
          ],
          quiz: [
            {
              q: "Why does pointing a light directly at a glossy bottle often do nothing visible?",
              options: ["Glass absorbs light", "Glossy surfaces show reflections of sources positioned within the family of angles, not light aimed at them", "The flash is too fast", "Bottles need ultraviolet light"],
              answer: 1,
              why: "Mirror-like surfaces only display what sits in the positions they reflect toward camera — lighting them is about placement, not aim."
            },
            {
              q: "What distinguishes a luxury-grade highlight from an amateur one on a curved product?",
              options: ["It's brighter", "It's a smooth gradient that follows the form, not a flat white blob", "It covers the whole product", "It's always blue"],
              answer: 1,
              why: "Gradient highlights communicate flawless curvature and are built with large diffused or feathered strip sources."
            },
            {
              q: "How do you make a clear glass bottle's edges visible against a white background?",
              options: ["More flash power", "Black cards just outside frame, reflected as dark contour lines", "A longer lens", "Spraying the bottle with water"],
              answer: 1,
              why: "The bright-field setup uses black cards within the family of angles so the glass reflects defined dark edges."
            }
          ],
          drill: "Recreate one product ad you admire using window light, diffusion, and cards. Post your version beside the reference and list what the pros' extra 10% consists of."
        },
        {
          id: "photography-4-2",
          title: "Watches, Jewelry, and Reflective Nightmares",
          minutes: 12,
          xp: 90,
          skill: "photo",
          intro: "Small, polished, and precious is the hardest category in photography — a watch reflects the entire room including you. Here's the control system pros use to shoot the shiniest objects money buys.",
          sections: [
            {
              h: "Build the World the Product Reflects",
              body: "A polished watch case is a 360-degree mirror. Whatever surrounds it — your face, the camera, the ceiling fan — is IN the product. So professionals don't fight reflections; they replace the room with a designed one: a **tent of diffusion** around the product, made of scrims, white cards, or a light tent, with lights firing through the walls from outside. Now every surface reflects clean white panels and deliberate gradients instead of chaos.\n\nThe camera still has to see in, and its black eye will appear in the metal — so shoot through a small slit between panels, flag the camera with black board leaving just the lens poking through, and accept that the final 5% of reflection cleanup happens in retouch.\n\nThe polarizer caveat: a circular polarizer tames glare on dielectric surfaces (glass, plastic, water, lacquer) but does little against bare metal reflections — physics, not filter quality. For metal, geometry and tenting are the only real tools."
            },
            {
              h: "Focus Stacking: Macro's Depth Problem",
              body: "At macro distances, depth of field collapses to millimeters — even at f/11, a watch shot close-up can't hold the crown and the far lug in focus simultaneously. Stopping down to f/22 costs sharpness to diffraction. The professional answer is **focus stacking**: shoot a series of identical frames, stepping focus from the nearest point to the farthest — 8 to 30 frames depending on depth — then let software (Photoshop, Helicon Focus) merge the sharp slice of each into one impossibly deep, crisp image.\n\nRequirements are strict: tripod-locked camera, unchanged framing and lighting between frames, manual exposure so nothing drifts, and a focus step small enough that sharp zones overlap. Many modern cameras automate the bracketing.\n\nThis is why catalog jewelry looks hyper-real — front prong to back band, all sharp. It's not one lucky frame; it's engineering. For social, even a modest 5-frame stack puts your product shots in a different league."
            },
            {
              h: "Dust, Positioning, and the 10:10 Convention",
              body: "At macro magnification, invisible things become billboards. A dust mote is a boulder; a fingerprint is a crime scene. The regimen: cotton or nitrile gloves from the moment the product leaves its box, a blower (never canned air on jewelry — propellant spits), a microfiber for cases, and a final loupe-or-zoomed-live-view inspection before each setup. Every minute of cleaning saves five of retouching.\n\nPresentation conventions exist because they work. Watches are set to **10:10** — hands framing the logo symmetrically, 'smiling,' with date windows and subdials unobstructed; it has been the industry standard for a century of advertising. Museum wax or poster putty holds pieces at angles; fishing line suspends chains invisibly for later removal in post. Rings stand on their edge in putty, stone toward camera, shot at eye level to the stone.\n\nSweat the geometry too: a watch face angled a few degrees off perpendicular avoids reflecting the camera while keeping the dial readable."
            },
            {
              h: "Sparkle Is Engineered",
              body: "Diamonds and faceted stones don't 'catch' light — they redirect it, and they only sparkle when there are hard light sources positioned for facets to grab. Fully tented, ultra-soft light makes gems look like wet glass: smooth, dead, gray. The pro recipe is a hybrid: soft enveloping light for the metal (the tent), plus one or two **hard accents** — bare LEDs, a snooted flash, even a phone flashlight — aimed from angles the facets can bounce to camera. Tiny position changes produce entirely different fire; walk the accent light in small arcs while watching live view until the stone ignites.\n\nFor video (and social loves jewelry video), the same physics animates: rotate the piece slowly on a turntable under fixed accents and the facets strobe naturally — no effect filters required.\n\nFinal wisdom for the category: shoot tethered or review at 200%, because jewelry punishes optimism. The frame that looked perfect small almost always hides a hair, a mote, or a soft edge at full size."
            }
          ],
          takeaways: [
            "Replace the room: tent the product so every reflective surface shows designed panels, not chaos.",
            "Polarizers help glass and lacquer but barely touch bare metal — geometry is the metal tool.",
            "Focus stacking (locked tripod, stepped focus, software merge) solves macro's millimeter depth of field.",
            "Gloves, blower, 10:10 watch hands, putty and fishing line — the unglamorous half of the craft.",
            "Gems need hard accent lights to sparkle; all-soft tents make diamonds look like wet glass."
          ],
          actions: [
            "Tent any small shiny object with paper and shoot it; compare its surfaces against an untented frame.",
            "Try a 5-frame manual focus stack on a coin or watch, merging in any stacking-capable app.",
            "Set a watch to 10:10 and shoot it angled 5 degrees off-perpendicular — check the dial for your own reflection."
          ],
          quiz: [
            {
              q: "Why does a circular polarizer fail to remove reflections from polished metal?",
              options: ["Metal is too bright", "Polarizers only cut reflections from non-metallic surfaces like glass and lacquer", "The filter must be square", "Metal absorbs polarized light"],
              answer: 1,
              why: "Reflections off bare metal remain largely unpolarized, so the filter can't cancel them — tenting and geometry must."
            },
            {
              q: "What problem does focus stacking solve?",
              options: ["Camera shake", "Color casts", "Millimeter-thin depth of field at macro distances", "Underexposure"],
              answer: 2,
              why: "Stacking merges the sharp zones of many focus-stepped frames into one front-to-back sharp image."
            },
            {
              q: "Why are watches photographed at 10:10?",
              options: ["Factory hands ship that way", "The hands frame the logo symmetrically and keep complications readable — a century-old industry convention", "It's when light is best", "It hides scratches"],
              answer: 1,
              why: "10:10 'smiles,' showcases the brand at 12 o'clock, and leaves subdials and date windows unobstructed."
            }
          ],
          drill: "Shoot one piece of jewelry or a watch twice: fully tented soft, then tented plus one hard accent light walked into position for sparkle. Present the pair as a before/after."
        },
        {
          id: "photography-4-3",
          title: "Automotive: Angles, Paint, and Location",
          minutes: 12,
          xp: 90,
          skill: "photo",
          intro: "A car is a building-sized piece of jewelry: sculpted, reflective, and emotional. Automotive photography is the family-of-angles game at architectural scale — plus stance, location, and timing.",
          sections: [
            {
              h: "Stance and the Sacred Angles",
              body: "Cars have good sides the way faces do, and the industry has converged on a core vocabulary:\n\n- **The 3/4 front** — nose and one full side visible, shot from roughly 30–45 degrees off the nose — is the hero angle: it shows the face and the profile at once. Shoot it low, around headlight or grille height; dropping the camera makes the car loom, dominant and planted. Standing-height automotive shots are the giveaway amateur move — they make supercars look like listings.\n- **The 3/4 rear** flatters wide-hipped performance cars and is often the best angle on modern designs.\n- **Direct side profile** for silhouettes and speed lines; **dead-on front** low and central for aggression.\n- **Details** — badge, wheel, headlight, stitching — carry the craftsmanship story.\n\nStance rituals matter: wheels rolled so the spokes sit intentionally, front wheels turned TOWARD camera to show face rather than tire tread, windows fully up or fully down, license plate considered (or replaced in post)."
            },
            {
              h: "Paint Is a Mirror: Control What It Reflects",
              body: "Everything from lesson 4-1 scales up: car paint reflects its environment across every panel, which means **the location IS the lighting.** A car parked under trees wears camouflage blotches; under open sky, its bodywork carries one long clean gradient from horizon to roofline. That's why pros shoot in big open spaces — empty lots, deserts, rooftops, wide streets — and why the classic body-side look is simply open sky reflected along the shoulder line.\n\nHunt reflections in every frame: light poles growing from the roof, dumpsters in the doors, and you — the photographer appears in the bodywork constantly. Longer lenses help; standing inside a reflection blind spot helps more.\n\nA **circular polarizer** is the automotive filter: rotate it to strip glare off the windshield (revealing the interior), deepen the paint's color, and manage hood reflections. It can also erase the reflections making the car look glossy — rotate to taste per frame, not to maximum."
            },
            {
              h: "Golden Hour, Blue Hour, and the Location Portfolio",
              body: "Automotive light has two prime windows. **Golden hour** wraps warm, low, directional light along body lines and throws long shadows that anchor the car to the ground — the default for lifestyle and 'for sale' glamour. Position the car so the sun rakes across its side or backlights it into a rim-lit silhouette; nose-into-sun front lighting flattens the sculpture.\n\n**Blue hour** is the premium look: the sky's deep cobalt reflects across the paint while headlights, city lights, and signage glow warm — the two-temperature contrast luxury campaigns run on. You have roughly 20–25 minutes; arrive with the car positioned, angles pre-planned, tripod ready.\n\nBuild a location portfolio in your city before you need it: parking garage top floors (clean sky, leading lines, free), industrial districts (texture without clutter), underpasses (open shade with drama), clean modern architecture (reflection-friendly backdrops). Scout at the hour you'll shoot — a spot that works at noon can be a streetlight disaster at dusk."
            },
            {
              h: "Coverage for the Feed",
              body: "One hero frame is not a deliverable anymore — a car shoot feeds a carousel, a Reel, and Stories. Run a coverage checklist per car, per location:\n\n1. Hero 3/4 front, low.\n2. 3/4 rear and full side profile.\n3. Four to six details: wheel with brake caliper, badge, headlight signature, interior stitching, shifter or screen.\n4. Environment wide — car small in a big scene for scale and mood.\n5. Human element — owner walking to the door, hand on the wheel; people raise emotional response and relatability.\n6. Vertical everything — re-shoot the hero and two details in 4:5 and 9:16, don't just crop later.\n\nWork clean: bring a microfiber and detailing spray (dusty panels murder gradients), check tire shine, and pick up the ground trash inside frame. Fifteen disciplined minutes of coverage produces a week of content; that arithmetic is the actual business case for learning cars."
            }
          ],
          takeaways: [
            "Shoot the 3/4 front low, at grille height, wheels turned toward camera — the hero recipe.",
            "The location is the lighting: paint reflects everything, so open sky beats cluttered surroundings.",
            "A circular polarizer manages windshield glare and paint depth — rotate per frame, not to maximum.",
            "Blue hour's cobalt paint plus warm lights is the luxury automotive signature; plan for a 20-minute window.",
            "Run the six-point coverage checklist vertically and horizontally — one car, one location, a week of content."
          ],
          actions: [
            "Photograph any car (yours, a friend's) at the 3/4 front from standing height, then from grille height. The comparison sells itself.",
            "Scout and save three automotive locations in your city with notes on the best hour for each.",
            "Do one blue-hour session this week: arrive 30 minutes early, car positioned, checklist printed."
          ],
          quiz: [
            {
              q: "What's the classic automotive hero angle and height?",
              options: ["Directly overhead", "3/4 front, shot low around grille height", "Straight side at eye level", "Rear at standing height"],
              answer: 1,
              why: "The low 3/4 front shows face and profile together and makes the car loom with intent."
            },
            {
              q: "Why do pros shoot cars in wide-open locations?",
              options: ["More parking", "Paint reflects the environment — open sky produces clean gradients instead of clutter", "Better cell reception", "Cars need space to focus"],
              answer: 1,
              why: "Bodywork is a mirror; the surroundings literally paint the panels, so the location is the lighting."
            },
            {
              q: "What should front wheels do in a static hero shot?",
              options: ["Point straight ahead always", "Be turned toward the camera to show the wheel face", "Be removed", "Be turned away to show tread"],
              answer: 1,
              why: "Turning the wheels toward camera presents the wheel design instead of a black rubber strip."
            }
          ],
          drill: "Execute the full six-point coverage checklist on one car in 30 minutes, including verticals. Cull to a 6-slide carousel that tells the car's story from hero to detail."
        },
        {
          id: "photography-4-4",
          title: "Automotive in Motion and After Dark",
          minutes: 12,
          xp: 90,
          skill: "photo",
          intro: "Static car shots sell the design; motion and night shots sell the feeling. Panning, rolling shots, and light painting are how one photographer with modest gear produces imagery that looks like a manufacturer's campaign.",
          sections: [
            {
              h: "Panning: Speed From the Sidewalk",
              body: "A panning shot — car sharp, background streaked into horizontal motion — is the cheapest speed effect in the craft. The physics: a slow shutter while you rotate your body to track the car, keeping it stationary in the frame while the world smears.\n\nThe recipe: shutter around **1/60 for a gentle streak, 1/30 for drama** (start at 1/125 while learning); continuous autofocus; stance like a golfer — feet planted, rotating from the hips in one smooth motion that starts before the shutter and follows through after, exactly like a swing. Burst fire through the pass. Position where the car crosses your view perpendicular, and pre-focus on the lane it will occupy.\n\nExpect a brutal keeper rate — one or two sharp frames per ten passes is normal even for working pros, which is why they ask the driver for multiple passes. The keeper, though, looks like motorsport photography, from a public sidewalk, for free."
            },
            {
              h: "Rolling Shots: Car-to-Car Discipline",
              body: "The rolling shot — shot from a lead ('tracking') vehicle, subject car sharp with the road blurring past — is the signature of professional automotive media. The counterintuitive truth: it's shot SLOW. Both cars travel at 20–40 km/h in convoy while a slow shutter (1/15–1/50) does the work; because photographer and subject move together, the relative stillness keeps the car sharp while the road howls past. Low speed plus slow shutter looks fast; actual speed adds danger, not drama.\n\nNon-negotiables: closed roads or genuinely empty private ones, a driver for the camera car (never shoot and drive), the shooter harnessed and stable, radio or call agreement on speed and spacing, image stabilization on, and burst everything.\n\nNo second car? The **fake rolling shot** exists honorably in social content: shoot the parked car from another slowly-moving angle, or add motion blur to road and wheels in post. Half of what you assume are real rollers on your feed are composites."
            },
            {
              h: "Light Painting: The Night Studio",
              body: "Light painting turns a pitch-dark location into a studio with one moving light. Camera locked on a tripod, ISO 100, f/8, a long exposure of 15–30 seconds — then, while the shutter is open, walk the length of the car carrying a continuous light source (an LED tube is the classic; a large phone light or LED panel works), sweeping it a meter or so above and along the bodywork. Keep moving and you won't register in the frame; the light's path renders as one impossibly long softbox, wrapping the car in a continuous gradient no daylight could produce.\n\nRefinements that separate clean results from muddy ones: wear dark clothing, keep the source aimed at the car (never toward the lens), do separate passes for the sides, front, and roof, and shoot each pass as its own frame. Then blend the best passes as layers in post — that pass-stacking workflow is precisely how commercial night composites are built. Expect ten takes; deliver one image that looks like a render."
            },
            {
              h: "Night, City Lights, and Long-Exposure Drama",
              body: "Beyond painting, night offers free production design. **Light trails:** park the car street-side, tripod, 10–30 second exposure — every passing car draws red and white ribbons behind your stationary hero. Compose so trails lead toward the car. **Wet pavement** (after rain, or a poured bottle of water in a pinch — a real industry trick) doubles every light source into reflections and turns asphalt cinematic. **Neon and signage** make paint interesting: park close so the colors smear across panels, and let one dominant hue own the frame rather than a carnival of five.\n\nSettings discipline at night: base ISO and long exposures on tripod beat high-ISO handheld every time for statics; manual white balance, because auto WB panics under sodium and LED streetlights; and watch highlight clipping on light sources — better to let deep shadows stay black than to gray them into noise.\n\nNight rewards patience and scouting more than gear. The frame is built before the shutter opens."
            }
          ],
          takeaways: [
            "Panning: 1/60–1/30, rotate from the hips, follow through, burst — and accept a low keeper rate.",
            "Rolling shots are shot slow (20–40 km/h) with slow shutters; safety logistics are non-negotiable.",
            "Light painting: tripod, 15–30s exposure, walk a continuous light along the car; stack passes in post.",
            "Night gifts free production value — light trails, wet pavement reflections, one dominant neon hue.",
            "Long exposure at base ISO on a tripod beats high-ISO handheld for every static night shot."
          ],
          actions: [
            "Practice panning tonight on ordinary traffic: 20 minutes, 1/60, hips not hands. Count your keeper rate.",
            "Shoot one light-trail frame of any parked car on a trafficked street: tripod or beanbag, 15 seconds, ISO 100.",
            "Try a two-pass light paint with your phone's torch and a 20-second exposure. Blend the passes in any layer-capable editor."
          ],
          quiz: [
            {
              q: "Why are professional rolling shots taken at low real speeds?",
              options: ["To save fuel", "Slow convoy speed plus slow shutter creates the speed illusion safely — real speed adds danger, not drama", "Cameras can't focus above 40 km/h", "Because of noise regulations"],
              answer: 1,
              why: "The blur comes from shutter duration and relative motion, so 30 km/h at 1/30 looks faster than 100 km/h at 1/500."
            },
            {
              q: "During light painting, why doesn't the photographer walking through frame appear in the image?",
              options: ["They're edited out frame by frame", "A person in constant motion during a long exposure never stays anywhere long enough to register", "The camera ignores people", "Dark clothing makes them invisible instantly"],
              answer: 1,
              why: "Long exposures record what persists; a continuously moving dark figure contributes almost nothing to any single spot."
            },
            {
              q: "Best baseline for a static night car shot?",
              options: ["Handheld, ISO 12800, f/1.8", "Tripod, ISO 100, f/8, long exposure", "Flash on camera, auto everything", "Portrait mode"],
              answer: 1,
              why: "A tripod lets you gather light over time at base ISO — clean files, deep depth of field, and deliberate trails."
            }
          ],
          drill: "Produce one 'campaign night frame': blue hour or full dark, tripod, light trails or a two-pass light paint, wet ground if available. Edit with one dominant color story."
        },
        {
          id: "photography-4-5",
          title: "The Brand & Lifestyle Shoot",
          minutes: 13,
          xp: 90,
          skill: "branding",
          intro: "A brand shoot isn't photography plus a client — it's a different discipline where the images are raw material for someone else's marketing machine. Here's how pros plan, run, and deliver lifestyle campaigns that clients rebook.",
          sections: [
            {
              h: "Reverse-Engineer From Usage",
              body: "Amateurs plan shoots around pretty pictures; professionals plan around **usage**. Before any creative conversation, get answers: where will these images live? A feed post is 4:5. A Story or Reel cover is 9:16 with UI zones to avoid. A website hero banner is a wide crop needing empty space where the headline will sit. An ad needs room for a logo and a button.\n\nEvery answer becomes a shooting requirement — most critically **copy space**: deliberately composed emptiness (clean sky, blurred interior, plain wall) where designers will place text. A gorgeous frame with no copy space is unusable as a banner, and 'can you leave more room next time' is the classic first-shoot lesson.\n\nBuild the shot list backwards from a deliverables grid: formats × scenes × orientations. Ten deliverable slots might need six setups; the grid tells you before the day does. This one habit — usage first — is most of what separates commissioned photographers from hobbyists with clients."
            },
            {
              h: "Staged Authenticity: Directing 'Candid'",
              body: "Lifestyle photography's paradox: it must feel unposed and be entirely constructed. The audience's radar for fake is sharp — the laughing-salad stock photo is a punchline — so the craft is **staging real behavior**, not simulating it.\n\nGive subjects genuine tasks, not mimed ones: actually make the coffee, really tie the shoes, hold a real conversation with the other model. Real activity produces correct micro-details — hand tension, eye lines, posture — that miming never does. Then harvest with burst during the action and the beats between takes; the frame after the 'moment' often IS the moment.\n\nDress the flaws in: a lived-in room reads truer than a showroom, one imperfect prop (the half-drunk coffee, the open notebook) grounds the scene. Keep wardrobe in the brand palette but unbranded elsewhere — competing logos and loud graphics date the images and restrict usage. Authenticity is a production value; it's built, not hoped for."
            },
            {
              h: "Coverage Systems and Set Flow",
              body: "Run each scene through a repeatable coverage block, roughly ten minutes per setup:\n\n1. **Hero** — the money frame the scene was designed for, both orientations.\n2. **Action** — the activity, in burst, multiple angles.\n3. **Detail** — hands, product, texture; the credibility close-ups.\n4. **Environment** — the wide that establishes the world.\n5. **Copy-space variant** — the same beauty with engineered emptiness.\n\nSequence the day by light and location, never by narrative — the story order is assembled in post, but golden hour won't wait for act three. Build a schedule with 20% buffer, front-load must-haves so a delay kills the nice-to-haves rather than the campaign, and shoot the client's product close-ups early while everyone is fresh and the set is clean.\n\nAssign one person (even on a two-person shoot: you) to check continuity between frames — filled glasses, moved props, wardrobe drift. Continuity errors surface at delivery, which is the worst possible time."
            },
            {
              h: "Releases, Rights, and Delivery That Rebooks",
              body: "The unglamorous layer that decides whether you get paid twice.\n\n**Model releases** — signed permission to use a person's likeness commercially — for every recognizable face, including the founder; **property releases** where a location requires them. No release, no ad usage: a brand's legal team will drop unreleased images regardless of beauty. Carry a release app or paper forms; collect signatures on the day, because chasing them later is misery.\n\n**Usage rights** belong in the agreement before the shoot: which channels (organic social? paid ads? packaging?), what duration, what exclusivity. Paid-ad usage is licensed above organic; unlimited-forever-everything is a premium, not a default courtesy.\n\n**Delivery** is marketing: culled selects only (never the full take), edited consistently, exported per platform ratio, in a clean gallery with clear filenames, on or before the promised date. Include a bonus vertical crop set they didn't ask for. Photographers get rebooked on reliability and usability at least as much as on artistry."
            }
          ],
          takeaways: [
            "Plan from usage backwards: a deliverables grid of formats × scenes dictates the shot list.",
            "Compose copy space deliberately — a frame with nowhere for the headline is unusable as an ad.",
            "Stage real behavior and harvest bursts between takes; authenticity is a built production value.",
            "Run the five-part coverage block per scene and sequence the day by light, not story.",
            "Releases, defined usage rights, and clean on-time delivery are what turn one booking into a client."
          ],
          actions: [
            "Draft a deliverables grid for an imaginary (or real) client: 10 slots across feed, Stories, and one web banner — then derive the minimum setups.",
            "Reshoot one 'lifestyle' scene from your life with a real task, burst harvesting, and one copy-space variant.",
            "Download or draft a basic model release and store it on your phone today."
          ],
          quiz: [
            {
              q: "What is 'copy space' and why does it matter?",
              options: ["Backup storage for files", "Deliberately composed empty area where designers will place text — without it, frames can't become banners or ads", "Duplicate frames for safety", "A watermark zone"],
              answer: 1,
              why: "Commercial images are raw material for layouts; engineered emptiness is what makes them usable."
            },
            {
              q: "How do professionals make lifestyle images feel authentic?",
              options: ["Ask subjects to mime activities quickly", "Give subjects real tasks and harvest bursts during and between takes", "Shoot only strangers unaware", "Add film grain in post"],
              answer: 1,
              why: "Genuine activity produces the true micro-details — hand tension, eye lines — that miming never replicates."
            },
            {
              q: "Why can a brand's legal team reject a beautiful campaign image?",
              options: ["Wrong aspect ratio", "It lacks a signed model release for a recognizable person", "Too much negative space", "It was shot on a phone"],
              answer: 1,
              why: "Commercial use of a person's likeness requires signed permission; without a release the image is legally unusable in ads."
            }
          ],
          drill: "Produce a mini brand shoot for any local product you own: deliverables grid, two setups, the five-part coverage block, and a delivered set of 8 images in three aspect ratios."
        }
      ]
    },
    {
      id: "photography-5",
      level: "Master",
      title: "Creative Direction",
      description: "Agency-level craft: engineering a signature look, concepting campaigns, running sets like a director, wielding the luxury visual codes, and turning single shoots into content systems.",
      lessons: [
        {
          id: "photography-5-1",
          title: "Engineering a Signature Look",
          minutes: 12,
          xp: 110,
          skill: "branding",
          intro: "At the top of the craft, clients don't hire a camera operator — they hire a way of seeing. A signature look is not luck or 'style discovery'; it's a system of constraints, chosen deliberately and repeated until the market can recognize you at thumbnail size.",
          sections: [
            {
              h: "Style Is a Constraint System",
              body: "Deconstruct any photographer whose work you can identify without a credit and you'll find the same underlying structure: a small set of recurring decisions applied with unreasonable consistency. A restricted palette. A habitual focal range. A lighting philosophy (always soft and frontal; always hard and raking). A recurring subject treatment — centered and symmetrical, or caught mid-motion, or never looking at camera. A tonal signature in the grade.\n\nStyle, in other words, is what you refuse to do. The photographer who shoots everything every way has range and no signature; the one who owns five constraints owns a market position.\n\nThe practical inversion for masters: stop asking 'what do I like?' and ask '**what will I repeat?**' Choose constraints you can love for three years, because recognition compounds only through repetition — a look changed quarterly is a look nobody ever learns."
            },
            {
              h: "The Audit: Find the Style You Already Have",
              body: "You don't build a signature from a blank page; you excavate it. Run the fifty-frame audit: pull your fifty strongest images from the last year into one grid and interrogate the patterns like an outside analyst.\n\n- Which three colors keep appearing? Which never do?\n- Where does light come from in your best work — and how hard is it?\n- What focal lengths do the winners cluster around?\n- How much negative space does your eye naturally leave?\n- What do your subjects have in common — mood, gesture, gaze?\n\nThe grid never lies: patterns you didn't know you had will surface, and so will the incoherence — the five frames that belong to someone else's portfolio. Your emerging signature is the overlap between what recurs and what you're proud of. Name it in one sentence ('quiet, warm, side-lit, centered, room to breathe'). If you can't say it, you can't repeat it — and repetition is the whole game."
            },
            {
              h: "Codify: The One-Page Style Bible",
              body: "Agencies encode a campaign's look in a style guide so that any photographer, editor, or retoucher can produce on-brand frames. Do the same for yourself — one page, five blocks:\n\n1. **Palette:** 3–5 colors you bias toward, 2 you exclude. Actual swatches.\n2. **Light:** your default quality, direction, and contrast ratio — and your named exceptions.\n3. **Lens and framing:** habitual focal lengths, subject placement, negative-space philosophy.\n4. **Grade:** your baseline preset settings, written out — curve shape, HSL biases, grain, sharpening.\n5. **Never list:** the five things that are off-brand for you (e.g., HDR skies, dutch tilts, cluttered flat lays, neon saturation).\n\nThe bible earns its keep at decision speed: on set, in the cull, in the edit, 'does this match page one?' replaces taste-wobble with policy. It's also the document that lets you delegate editing without losing yourself — the true test of whether a style is a system or a mood."
            },
            {
              h: "Evolution Without Drift",
              body: "A signature must evolve or it fossilizes — but evolution and drift are different animals. Drift is accidental: trends leak in, presets get swapped, and eighteen months later the feed is a stranger's. Evolution is governed: deliberate revisions, made rarely, for stated reasons.\n\nThe operating rhythm of mature creative brands: revisit the style bible **twice a year**, change at most one block per revision, and A/B the change across a real project before committing it. Keep a 'lab' space — personal work, a second account, unpublished shoots — where you can violate your own rules freely; the lab is where the next evolution auditions without confusing your market.\n\nAnd measure recognition, not just engagement: the working test is whether a follower can pick your frame out of a nine-image grid of your niche's content. When clients start sending you moodboards made of your own work — the quiet milestone every creative director knows — the system is functioning. Protect it accordingly."
            }
          ],
          takeaways: [
            "Style is a constraint system — defined as much by what you refuse as what you repeat.",
            "Run the fifty-frame audit: your signature already exists in the overlap of what recurs and what you're proud of.",
            "Codify it into a one-page style bible: palette, light, framing, grade, and a never list.",
            "Evolve by governed revision — one block, twice a year, tested — never by drift.",
            "The success metric is recognition at thumbnail size, not just engagement."
          ],
          actions: [
            "Run the fifty-frame audit this week and write your one-sentence signature.",
            "Draft your one-page style bible with all five blocks, including the never list.",
            "Create your 'lab' space — a private album or alt account — and schedule your first six-month style review."
          ],
          quiz: [
            {
              q: "What actually constitutes a photographic 'signature look'?",
              options: ["Owning distinctive gear", "A small set of constraints repeated with unreasonable consistency", "Using one famous preset", "Shooting only one subject forever"],
              answer: 1,
              why: "Recognition comes from repeated deliberate decisions — palette, light, framing, grade — not equipment or luck."
            },
            {
              q: "What's the purpose of the fifty-frame audit?",
              options: ["To delete old work", "To excavate the patterns your best work already shows and name your emerging signature", "To count your lenses", "To benchmark against competitors"],
              answer: 1,
              why: "Style is discovered in your own recurring choices; the grid surfaces patterns and incoherence you can't see frame by frame."
            },
            {
              q: "What separates evolution from drift in a signature style?",
              options: ["Evolution is faster", "Evolution is governed — rare, deliberate, tested revisions; drift is accidental accumulation of trends", "Drift only happens to beginners", "They're the same thing"],
              answer: 1,
              why: "Mature creative brands revise their look deliberately and rarely, testing changes before committing them."
            }
          ],
          drill: "Take one subject and shoot it twice: once in your documented signature, once deliberately violating every rule in your bible. Study which violation, if any, deserves to audition in the lab."
        },
        {
          id: "photography-5-2",
          title: "Campaign Concepting: From Brief to Treatment",
          minutes: 13,
          xp: 110,
          skill: "photo",
          intro: "The jump from photographer to creative director happens before any camera is unpacked: it's the ability to turn a business problem into a visual idea, and sell that idea on paper. This is the agency process, compressed.",
          sections: [
            {
              h: "Read the Brief for the Problem Behind It",
              body: "Every brief contains two layers. The surface layer asks for assets: 'we need lifestyle photos for the new product launch.' The real layer is a business problem: nobody under 35 considers us; we're seen as cheap; our competitor owns 'premium' in this category. Masters interrogate until the second layer is explicit, because imagery can only be judged against it — 'nice photos' is not a success criterion; 'reads as premium to a 28-year-old scrolling at speed' is.\n\nThe questions that surface it: What should someone think about the brand after seeing this that they don't think now? Who exactly is the viewer, and where do they encounter it? What does success look like in ninety days? What have you tried that didn't work — and why do you think it didn't?\n\nWrite the answer as a single proposition sentence and get sign-off on THAT before any visual thinking. Concepts built on unagreed problems die in review, every time."
            },
            {
              h: "Territories: Three Roads, Not One Destination",
              body: "Agencies never present a single idea — they develop **territories**: distinct conceptual directions that each solve the agreed problem a different way. For a watch brand chasing younger buyers, three territories might be: 'Earned Moments' (the watch appears at quiet personal victories), 'After Hours' (nocturnal, city, blue-hour energy), 'Inheritance' (generational, tactile, archival warmth). Same problem; three worlds.\n\nThe discipline of three protects everyone. It forces you past your first idea (which is usually the category's cliché), it gives the client a real decision instead of a yes/no hostage situation, and it reveals their taste before production money is spent.\n\nDevelop each territory to equal depth — a name, a one-paragraph story, five reference images, a sample shot description. Then recommend one, with reasons. Directors who present three-but-recommend-one read as leaders; those who present ten read as unsure. Never present an option you'd be unhappy producing: clients reliably choose the one you secretly hate."
            },
            {
              h: "Moodboards That Argue, Not Decorate",
              body: "A master's moodboard is a persuasive instrument, not a Pinterest dump. Every image on it earns placement by answering a production question: THIS light quality, THIS palette, THIS casting energy, THIS texture, THIS framing philosophy. Eight to fifteen images, curated so hard they feel inevitable, each annotated with one line naming exactly what it's borrowing ('this frame: the hard side-light, not the styling').\n\nStructure beats collage: group by function — light / color / casting and wardrobe / location / composition — so the board reads as a plan wearing pictures. Include one 'anti-board' panel: three images of what this campaign is NOT, which prevents the most expensive misunderstanding in the business (client approves 'moody,' means 'slightly warm').\n\nAnd pull references from outside the client's category — a hotel campaign referencing perfume ads, a car brand referencing architecture photography. Same-category references produce same-category work, and nobody pays director rates for that."
            },
            {
              h: "The Treatment: Selling the Idea on Paper",
              body: "The treatment is the deliverable that wins the job: a short, art-directed document — typically six to twelve pages — that walks a decision-maker through the campaign as if it already exists. The canonical spine:\n\n1. **The idea** in two sentences, stated with conviction.\n2. **The world** — tone, palette, light, texture; moodboard pages live here.\n3. **The frames** — five to eight described hero shots, specific enough to be budgeted ('dawn, empty hotel corridor, subject small and centered, one warm doorway glow').\n4. **Casting and location** direction.\n5. **Deliverables** mapped to usage — formats, ratios, quantities (lesson 4-5's grid, elevated to strategy).\n6. **Why this works** — one page connecting every choice back to the agreed business problem.\n\nWrite it in confident present tense — 'the campaign opens on', never 'we could maybe'. Then present it live, walking the pages; a treatment emailed cold is a treatment argued with in your absence. Pre-answer the two objections you'd raise if you were them. That's the job: certainty, on paper, before a single frame exists."
            }
          ],
          takeaways: [
            "Dig past the asset request to the business problem, and get the proposition signed off first.",
            "Develop three territories to equal depth; recommend one with reasons.",
            "Moodboards argue: annotated, grouped by function, with an anti-board — references from outside the category.",
            "The treatment walks the client through a campaign that doesn't exist yet, in confident present tense.",
            "Present live and pre-answer objections; concepts die when they travel without their director."
          ],
          actions: [
            "Take any brand you follow and write its unstated business problem as one proposition sentence.",
            "Develop three named territories for that proposition — a paragraph and five references each.",
            "Build one 8-page treatment for your favorite territory and pitch it out loud to a friend or camera."
          ],
          quiz: [
            {
              q: "Why do agencies present three territories instead of one idea?",
              options: ["To charge more", "It escapes the first-idea cliché, gives the client a real decision, and surfaces taste before production money is spent", "Clients demand exactly three", "To hedge against blame"],
              answer: 1,
              why: "Multiple developed directions protect the work and the relationship — and force thinking past the category default."
            },
            {
              q: "What makes a moodboard 'argue' rather than decorate?",
              options: ["More images", "Every image is annotated with the specific element it borrows and grouped by production function", "Trendy references", "High-resolution files"],
              answer: 1,
              why: "A directed board answers production questions — light, palette, casting, framing — instead of gesturing at vibes."
            },
            {
              q: "What belongs in a treatment's 'why this works' page?",
              options: ["The photographer's biography", "A connection from every creative choice back to the agreed business problem", "Equipment lists", "Legal disclaimers"],
              answer: 1,
              why: "The treatment sells certainty that the idea solves the problem the client signed off on — that page closes the loop."
            }
          ],
          drill: "Find a real campaign you admire and reverse-engineer its treatment: write the problem, the territory it chose, and describe five of its hero frames as if you had pitched them."
        },
// @@CHUNK@@
      ]
    }
  ]
});
