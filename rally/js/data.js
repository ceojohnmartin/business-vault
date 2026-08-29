/* RALLY — static data: dispositions, plans, decline reasons, field guide, demo team. */
(function () {
  // Disposition system. Colors are the app's entire chromatic language —
  // identical on pins, badges, funnels and history rows.
  const DISPOSITIONS = {
    unworked:{ label: "Unworked",       color: "#2E86FF", contact: false }, // imported door, never knocked
    sold:    { label: "Sold",           color: "#22B558", contact: true  },
    goback:  { label: "Go Back",        color: "#7C5CFC", contact: true  },
    nothome: { label: "Not Home",       color: "#F5B301", contact: false },
    notint:  { label: "Not Interested", color: "#E5484D", contact: true  },
    dnk:     { label: "Do Not Knock",   color: "#0B0F16", contact: false },
  };

  // Optional "why" for a Do Not Knock / Not Qualified door.
  const DNK_REASONS = [
    "Renter", "Vacant", "Commercial", "Existing customer",
    "Bad fit", "Inaccessible", "Other",
  ];

  // Why they said no — ranked by how often each appears in real
  // D2D taxonomies (D2DU / D2D Experts objection lists, PestPac and
  // SalesRabbit knock statuses, FieldRoutes script guides).
  const DECLINE_REASONS = [
    "Has a competitor",
    "Not seeing bugs",
    "Need to ask spouse",
    "Too expensive",
    "Renter, not owner",
    "Does it themselves",
    "Bad timing / moving",
    "Wants info first",
    "No soliciting",
    "Other",
  ];
  // Soft nos — worth swinging back on later.
  const REKNOCK_REASONS = ["Need to ask spouse", "Bad timing / moving", "Wants info first"];

  // Built-in Google Maps browser key, shipped so no rep has to paste one.
  // A Maps key in a web app is public by design (it rides along on every
  // tile request); the real protection is the restriction set on the
  // Google project (this site + Map Tiles API). A device can still
  // override it in More -> Google map imagery.
  const DEFAULT_GOOGLE_KEY = "AIzaSyDyf6DCg6-kmOlKgHmTB77ctVkTCbOZHmY";

  // Regrid parcel-data token. Ships empty — paste one in More → Property
  // data (or set a default here for an office build). Never commit a real
  // token to a public repo.
  const DEFAULT_REGRID_KEY = "";

  // ---------- residential eligibility (configurable, never baked into UI) ----------
  // Which parcels become knockable RALLY doors when a territory is imported.
  // Two rule sets because the two live providers speak different languages:
  // OSM tags buildings; Regrid describes land use in prose.
  const ELIGIBILITY = {
    osm: {
      // building=<tag> → shown property type; presence here = eligible
      eligible: {
        house: "Single-family home", detached: "Detached home",
        residential: "Residential", bungalow: "Bungalow",
        semidetached_house: "Semi-detached home", terrace: "Townhome",
        townhouse: "Townhome", duplex: "Duplex",
        static_caravan: "Manufactured home", cabin: "Cabin",
        farm: "Farmhouse", ger: "Residential",
      },
      // explicitly not knockable doors
      excluded: [
        "apartments", "commercial", "retail", "office", "industrial",
        "warehouse", "church", "chapel", "cathedral", "mosque", "synagogue",
        "temple", "school", "kindergarten", "university", "college",
        "hospital", "government", "civic", "public", "hotel", "garage",
        "garages", "shed", "barn", "greenhouse", "hut", "carport", "roof",
        "service", "construction", "ruins", "parking", "stadium", "train_station",
      ],
    },
    regrid: {
      eligiblePatterns: [
        /single\s*family/i, /\bsfr\b/i, /residential/i, /townho(me|use)/i,
        /duplex/i, /triplex/i, /fourplex/i, /condominium/i, /\bcondo\b/i,
        /manufactured/i, /mobile\s*home/i, /rural\s*home/i,
      ],
      excludedPatterns: [
        /commercial/i, /industrial/i, /church/i, /religious/i, /school/i,
        /educat/i, /government/i, /municipal/i, /exempt/i, /park/i,
        /vacant/i, /agricultur/i, /apartment/i, /multi[-\s]?family\s*(1[0-9]|[5-9])/i,
        /office/i, /retail/i, /warehouse/i, /utility/i, /railroad/i,
        /right[-\s]?of[-\s]?way/i, /common\s*area/i,
      ],
    },
    // draw guard: refuse to scan absurdly large areas (protects the free
    // provider and keeps imports neighborhood-sized)
    maxAreaKm2: 9,
  };

  // What counts as a DM (decision-maker) conversation.
  const DM_HINT = "Homeowner or spouse with authority to sign. “Ask my spouse” = a convo, not a DM.";

  // ---------- service plans ----------
  // Every plan wears the same sticker: $450 initial, $99/mo — the rep
  // discounts DOWN from there at the door, and the discount is the pitch.
  // What differs per plan is the FLOOR (floorInitial/floorMonthly): the
  // number an account can never actually go below. Floors are never shown
  // to the customer; typing under one shows UNPROFITABLE instead.
  // listInitial is the sticker printed on the agreement; the gap between
  // it and the sold price is the "initial discount" the early-cancel fee
  // recaptures (capped).
  const PLANS = [
    { id: "basic",   name: "Basic",    monthly: 99, initial: 450, floorMonthly: 59, floorInitial: 49, listInitial: 450,
      visits: "4 visits / year",
      blurb: "Quarterly general pest defense",
      services: "Quarterly exterior treatment of the home's perimeter, eaves, and entry points; interior on request; full de-webbing each visit.",
      covered: "Ants, roaches (non-German), spiders, wasps, crickets, earwigs, silverfish, millipedes, centipedes, pantry pests, stink bugs" },
    { id: "pro",     name: "Pro",      monthly: 99, initial: 450, floorMonthly: 69, floorInitial: 49, listInitial: 450,
      visits: "6 visits / year",
      blurb: "Bi-monthly general pest defense",
      services: "Every-other-month exterior treatment with barrier refresh, eave and entry-point service, and de-webbing; interior on request.",
      covered: "Ants, roaches (non-German), spiders, wasps, crickets, earwigs, silverfish, millipedes, centipedes, pantry pests, stink bugs" },
    { id: "proplus", name: "Pro Plus", monthly: 99, initial: 450, floorMonthly: 79, floorInitial: 49, listInitial: 450,
      visits: "6 visits / year + rodent",
      blurb: "Bi-monthly general pest + rodent coverage",
      services: "Everything in Pro, plus exterior rodent bait stations installed and maintained every visit, rodent monitoring, and entry-point exclusion flagging.",
      covered: "All Pro pests, plus mice and rats (commensal rodents)" },
    { id: "premium", name: "Premium",  monthly: 99, initial: 450, floorMonthly: 99, floorInitial: 49, listInitial: 450,
      visits: "~10 visits / year",
      blurb: "Bi-monthly general + monthly mosquito in season",
      services: "Bi-monthly general pest treatment year-round, PLUS monthly mosquito treatments during mosquito season — barrier treatment of resting areas and larvicide at breeding sites. In season that's a visit every month.",
      covered: "All Pro pests, plus mosquitoes (in-season program)" },
  ];

  // ---------- contract terms & billing ----------
  const TERMS = [12, 18, 24, 36];          // months; custom allowed
  const DEFAULT_TERM = 24;                 // every agreement starts here
  const BILLING = [
    { id: "monthly",   label: "Monthly",     every: "month",    mult: 1 },
    { id: "bimonthly", label: "Bi-monthly",  every: "2 months", mult: 2 },
    { id: "quarterly", label: "Quarterly",   every: "quarter",  mult: 3 },
  ];

  // ---------- specialty pest add-ons ----------
  // base = what the card shows; floor = the quiet profitability line.
  // Add-ons ride the same billing cycle as the plan. custom:true means
  // the quote is written from scratch (bed bugs).
  const SPECIALTY = [
    { id: "german",     name: "German Roach Standard", blurb: "Eliminate German roaches with proven treatments",
      initial: 249, monthly: 40,  floorInitial: 249, floorMonthly: 40 },
    { id: "germanprem", name: "German Roach Premium",  blurb: "Our most advanced German roach elimination program",
      initial: 249, monthly: 109, floorInitial: 249, floorMonthly: 109 },
    { id: "mosquito",   name: "Mosquitoes",            blurb: "Seasonal mosquito control for your yard",
      initial: 49,  monthly: 49,  floorInitial: 15,  floorMonthly: 49 },
    { id: "rodent",     name: "Interior Rodents",      blurb: "Trapping, removal, and ongoing rodent protection",
      initial: 49,  monthly: 49,  floorInitial: 19,  floorMonthly: 19 },
    { id: "snake",      name: "Snake Protection",      blurb: "Yard snake prevention and maintenance",
      initial: 49,  monthly: 49,  floorInitial: 19,  floorMonthly: 19 },
    { id: "fly",        name: "Special Fly Control",   blurb: "Eliminate flies and breeding sources",
      initial: 49,  monthly: 49,  floorInitial: 19,  floorMonthly: 19 },
    { id: "bedbug",     name: "Bed Bug Service",       blurb: "Professional inspection to determine treatment plan and pricing",
      initial: 0,   monthly: 0,   floorInitial: 0,   floorMonthly: 0, custom: true },
  ];

  // ---------- problem pests → forever-notes autotext ----------
  // Tapping a pest chip lights it and drops its note into Forever Notes;
  // untapping removes that exact text if it hasn't been edited.
  const PEST_CHIPS = [
    { id: "fireants",  label: "Fire Ants",
      note: "Fire ants: fire ants in the front and back yard. Customer sees fire ant mounds occasionally." },
    { id: "blackants", label: "Little Black Ants",
      note: "Little black ants: customer primarily sees them in kitchen, bathroom, bedrooms. They're by the weep holes / cracks and crevices of the house." },
    { id: "spiders",   label: "Spiders",
      note: "Spiders: gets both big and small spiders. Gets them everywhere. Garage is heavy with spiders. Sees them in the rooms, inside, and heavy on the back patio area." },
    { id: "roaches",   label: "Roaches",
      note: "Roaches: sees the tree roaches / water roaches occasionally. Bathroom, by the back door, living room, sometimes kitchen and random spots." },
    { id: "fleas",     label: "Fleas / Ticks",
      note: "Fleas / ticks: customer has beautiful pets. They get fleas and ticks. Make sure to treat the full yard and double down on flea and tick products." },
    { id: "wasps",     label: "Wasps",
      note: "Wasps: they get wasps pretty heavy in the back and front of eaves. Tons of mud daubers and paper wasps. Make sure to remove all the wasps every time and treat with the pheromone blocker." },
    { id: "earwigs",   label: "Earwigs",
      note: "Earwigs: earwigs are a problem in the bathroom, kitchen. Sees them very often. Make sure to treat super thoroughly for earwigs." },
    { id: "silverfish", label: "Silverfish",
      note: "Silverfish: silverfish everywhere in bathroom, garage, kitchen. Leave silverfish traps, hit super hard on the silverfish and treat every time for them." },
    { id: "flies",     label: "Flies",
      note: "Flies: flies getting inside and out, leave fly traps, do a thorough fly service every time." },
    { id: "rodents",   label: "Rodents",
      note: "Rodents: mice and rats. Customer gets bait boxes around the house, glue boards, sticky traps and snap traps every time. Make sure to refill bait on each service and really focus on getting rid of and preventing mice / rats." },
    { id: "other",     label: "Other", note: "" },
  ];

  // property-condition chips (no autotext — they're facts for the tech)
  const PROP_NOTES = ["Dog on Property", "Cat on Property", "Gate", "Locked Gate"];

  // additional covered structures — select all that apply
  const ADD_SERVICES = ["Garage", "Patio", "Back Fence", "Deck", "Front Porch", "Shed"];

  // The office identity every device ships with — printed in the header
  // of each agreement. More -> Company & agreement can override per device.
  const COMPANY_DEFAULTS = {
    companyName: "Home Wise Pest",
    companyLicense: "0051HP",
  };

  // ---------- agreement (contract) constants ----------
  // State-neutral on purpose: company identity, license line and service
  // area come from Settings so one build works in any market.
  const AGREEMENT = {
    termMonths: 12,
    etfCap: 199,          // early-termination fee = initial discount received, capped here
    priceNoticeDays: 30,  // notice before any renewal-term price change
    priceExitDays: 15,    // fee-free exit window after a price-increase notice
    renewNoticeDays: 30,  // written notice to stop the month-to-month renewal
    mosquitoSeason: "mosquito season (typically spring through fall, as local conditions dictate)",
    exclusions:
      "termites and other wood-destroying organisms, bed bugs, German cockroaches, " +
      "birds, bats, snakes, wildlife, and any vertebrates other than commensal rodents " +
      "(mice and rats, covered only under plans that include rodent service)",
  };

  // ---------- pipeline ----------
  // Milestone stages, in order. A record's stage is DERIVED from its state
  // (agreement, appointments, service history) — never a dropdown someone
  // forgets to update. Each stage knows the next action and where it lives.
  const PIPELINE = [
    { id: "lead",      label: "Lead",         chip: "#5560E0" },
    { id: "appt",      label: "Appointment",  chip: "#8F6B00" },
    { id: "sold",      label: "Sold",         chip: "#15803D" },
    { id: "scheduled", label: "Scheduled",    chip: "#1A66C9" },
    { id: "active",    label: "Active",       chip: "#057A6C" },
  ];

  // Sources a customer can come from (FieldRoutes-style).
  const SOURCES = ["Door to Door", "Referral", "Online", "Phone-in", "Alumni / winback", "Other"];

  // Rep territory colors — ownership, deliberately DISTINCT from the five
  // house-status colors so a hood can never read as a disposition.
  const HOOD_COLORS = ["#3E8BFF", "#00BFA6", "#FF8A3D", "#F25CA2", "#B8E356", "#8E9BFF"];

  // Freshness heat scale (days since a hood was last worked). Every bucket
  // is named in the on-map legend, so the colors only need distinctness.
  const FRESH_SCALE = [
    { max: 0,        label: "Worked today", color: "#4D9AFF" },
    { max: 7,        label: "1–7 days",     color: "#00BFA6" },
    { max: 30,       label: "8–30 days",    color: "#B8E356" },
    { max: 60,       label: "31–60 days",   color: "#E09F3E" },
    { max: 120,      label: "61–120 days",  color: "#FF8A3D" },
    { max: Infinity, label: "120+ days",    color: "#B4433A" },
  ];
  const FRESH_NEVER = { label: "Never knocked", color: "#F25CA2" };

  // ---------- Field Guide ----------
  // Each pest: what to know, what to say, what we do.
  const PESTS = [
    {
      id: "ants", icon: "🐜", name: "Ants", latin: "Formicidae",
      season: "Spring – Fall",
      signs: "Trails along foundations, driveways and kitchen counters; small dirt mounds in cracks; winged swarmers after rain.",
      fact: "A single colony can hold 300,000+ workers — the ants you see are about 10% of the colony. Spraying the trail yourself splits the colony into more nests (budding).",
      pitch: "Those little trails on your driveway? For every ant you see, there are nine more in the wall. Store spray actually splits the colony — we treat the nest itself.",
      treatment: "Non-repellent barrier the workers carry back to the queen, granules across the yard, and entry-point treatment — the colony collapses within days.",
    },
    {
      id: "roaches", icon: "🪳", name: "Cockroaches", latin: "Blattodea",
      season: "Year-round",
      signs: "Droppings like coffee grounds under sinks, a musty odor, egg cases behind appliances; active at night.",
      fact: "German cockroaches produce up to 30,000 offspring a year, and their droppings are a leading asthma trigger in kids.",
      pitch: "Roaches are the one pest that's genuinely a health issue — their droppings are a top asthma trigger for kids. If you've seen one at night, there's a population behind the wall.",
      treatment: "Gel baits and insect growth regulators placed in the harborage points — breaks the breeding cycle instead of scattering them deeper into the walls.",
    },
    {
      id: "spiders", icon: "🕷️", name: "Spiders", latin: "Araneae",
      season: "Summer – Fall",
      signs: "Webs in eaves, corners of garages, window wells; egg sacs (each holds hundreds); black widows love meter boxes and play sets.",
      fact: "Spiders follow food — a web by the porch light means there's a healthy insect population feeding them. Widows and recluses send thousands of people to the ER yearly.",
      pitch: "See the webbing up in your eaves? Spiders set up where the food is — so it's really two problems. We de-web the whole exterior and cut off what they're eating.",
      treatment: "Full de-webbing of eaves, soffits and play areas every visit, plus barrier treatment that removes their food source. Egg sacs destroyed on sight.",
    },
    {
      id: "wasps", icon: "🐝", name: "Wasps & Hornets", latin: "Vespidae",
      season: "Late Spring – Fall",
      signs: "Paper nests under eaves and in play structures; yellowjackets nesting in the ground near patios; heavy traffic to one gap in the siding.",
      fact: "A yellowjacket colony peaks at 4,000+ by August, and they sting repeatedly — stings send over 200,000 Americans to the ER every year.",
      pitch: "That little paper nest under the eave? By August it's a few thousand yellowjackets, right where the kids play. We knock those down every single service — it's included.",
      treatment: "Nest removal on every visit, eave and soffit treatment to stop rebuilds, and ground-nest treatment for yellowjackets.",
    },
    {
      id: "rodents", icon: "🐁", name: "Mice & Rats", latin: "Rodentia",
      season: "Fall – Winter",
      signs: "Droppings in the garage or pantry, gnaw marks on wiring, scratching in walls at dusk, greasy rub marks along baseboards.",
      fact: "A mouse fits through a gap the size of a dime; rats, a quarter. Rodents chew wiring — they're implicated in roughly a quarter of unexplained house fires.",
      pitch: "Once it cools off, every mouse on the street is looking for a warm garage. They fit through a dime-sized gap — and what they chew first is wiring.",
      treatment: "Exterior bait stations, entry-point exclusion, and monitoring — we stop them at the property line before they're in the walls.",
    },
    {
      id: "mosquitoes", icon: "🦟", name: "Mosquitoes", latin: "Culicidae",
      season: "Summer",
      signs: "Swarming at dusk, bites on ankles, standing water in gutters, plant saucers and toys; they breed in a bottle-cap of water.",
      fact: "Mosquitoes are the deadliest animal on earth, and they breed in a bottle-cap of standing water — a backyard can host thousands from one clogged gutter.",
      pitch: "If the backyard's unusable at dusk, that's breeding on or next to your property — they only need a bottle-cap of water. We treat where they rest and where they hatch.",
      treatment: "Barrier treatment of shaded resting areas (fences, under decks, shrubs) plus larvicide in standing-water spots — knocks populations down 90%+.",
    },
    {
      id: "termites", icon: "🪵", name: "Termites", latin: "Isoptera",
      season: "Year-round (swarm in Spring)",
      signs: "Mud tubes on foundation walls, hollow-sounding wood, discarded wings on window sills, bubbling paint.",
      fact: "Termites cause about $5 billion in U.S. property damage every year — more than fires, floods and storms combined — and homeowner's insurance doesn't cover it.",
      pitch: "Termites do five billion dollars of damage a year and insurance won't touch it. Those mud tubes on a foundation are the only warning you get — we check on every visit.",
      treatment: "Inspection every service; liquid soil treatment or bait systems on detection, with a damage warranty on treated homes.",
    },
    {
      id: "fleasticks", icon: "🦠", name: "Fleas & Ticks", latin: "Siphonaptera / Ixodida",
      season: "Spring – Fall",
      signs: "Pets scratching, bites around ankles, ticks on pets after yard time; flea dirt in pet bedding.",
      fact: "One flea lays 50 eggs a day; ticks carry Lyme and Rocky Mountain spotted fever. The yard is the reservoir — treating only the pet re-infests in weeks.",
      pitch: "If the dog's scratching, the yard is the reservoir — one flea lays fifty eggs a day. Treating the pet alone just re-infests. We treat where they actually live.",
      treatment: "Yard treatment focused on shaded pet runs and fence lines, with growth regulators that stop eggs from maturing.",
    },
    {
      id: "earwigs", icon: "🦗", name: "Earwigs & Crickets", latin: "Dermaptera / Gryllidae",
      season: "Summer",
      signs: "Found in mulch beds, under pots, in bathrooms and basements; crickets chirping in the garage at night.",
      fact: "Moisture pests — mulch against the foundation is a highway indoors. Harmless but relentless: they follow irrigation lines straight to the house.",
      pitch: "All that mulch against the house is basically a hotel for earwigs — they follow the moisture right inside. The barrier we lay down cuts that highway.",
      treatment: "Perimeter barrier at the foundation, granules through mulch and rock beds, and door-sweep gaps flagged for the homeowner.",
    },
    {
      id: "silverfish", icon: "🐛", name: "Silverfish", latin: "Zygentoma",
      season: "Year-round",
      signs: "Silvery, wriggling insects in tubs, sinks and closets at night; yellow stains or notched edges on books, photos and clothing.",
      fact: "They eat starch — books, photos, wallpaper glue, stored clothes — and can live a year without food. An attic infestation can quietly ruin keepsakes.",
      pitch: "Ever seen the little silver ones in the tub? They live on paper and fabric — photo boxes, books, stored clothes. We treat the attic and voids they breed in.",
      treatment: "Dust treatment in attics and wall voids, dehumidification advice, and barrier treatment at entry points.",
    },
    {
      id: "scorpions", icon: "🦂", name: "Scorpions", latin: "Scorpiones",
      season: "Summer (Southwest)",
      signs: "Glow under UV light at night; found in block walls, pool equipment, shoes and attics; bark scorpions climb walls.",
      fact: "Bark scorpions are the one U.S. scorpion with a medically serious sting — and they hunt the crickets and roaches around your foundation at night.",
      pitch: "Scorpions only hang around where there's food — crickets and roaches at the foundation. Kill the food source and seal the block wall, and they move on.",
      treatment: "Night UV inspections, block-wall and foundation treatment, plus elimination of the insects they feed on.",
    },
    {
      id: "stink", icon: "🪲", name: "Stink & Boxelder Bugs", latin: "Pentatomidae / Boisea",
      season: "Fall",
      signs: "Clustering on sunny south-facing walls in fall, slipping in around windows; the smell when crushed.",
      fact: "Overwintering pests — they pick a warm wall in October and spend all winter emerging through your window frames one at a time.",
      pitch: "When they cluster on that sunny wall in October, they're picking where to spend the winter — inside your window frames. A fall barrier stops the move-in.",
      treatment: "Fall exterior barrier on sun-exposed walls, entry-point treatment around windows and rooflines before the overwintering rush.",
    },
  ];

  // Demo teammates for the leaderboard until team sync ships.
  const DEMO_TEAM = [
    { name: "Marcus V.",  team: "Alpine",  doors: 512, dms: 118, sales: 14 },
    { name: "Sofia R.",   team: "Alpine",  doors: 471, dms: 102, sales: 12 },
    { name: "Jake T.",    team: "Summit",  doors: 440, dms: 96,  sales: 10 },
    { name: "Priya N.",   team: "Summit",  doors: 388, dms: 90,  sales: 9  },
    { name: "Danny O.",   team: "Alpine",  doors: 402, dms: 84,  sales: 7  },
    { name: "Chris B.",   team: "Summit",  doors: 350, dms: 70,  sales: 5  },
    { name: "Lena M.",    team: "Alpine",  doors: 300, dms: 61,  sales: 4  },
  ];

  window.MDATA = {
    DISPOSITIONS, DECLINE_REASONS, REKNOCK_REASONS, DNK_REASONS, DM_HINT,
    PLANS, AGREEMENT, PIPELINE, SOURCES, HOOD_COLORS, FRESH_SCALE, FRESH_NEVER, COMPANY_DEFAULTS,
    TERMS, DEFAULT_TERM, BILLING, SPECIALTY, PEST_CHIPS, PROP_NOTES, ADD_SERVICES,
    PESTS, DEMO_TEAM, DEFAULT_GOOGLE_KEY, DEFAULT_REGRID_KEY, ELIGIBILITY,
  };
})();
