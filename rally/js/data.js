/* RALLY — static data: dispositions, plans, decline reasons, field guide, demo team. */
(function () {
  // Disposition system. Colors are the app's entire chromatic language —
  // identical on pins, badges, funnels and history rows.
  const DISPOSITIONS = {
    sold:    { label: "Sold",           color: "#22B558", contact: true  },
    goback:  { label: "Go Back",        color: "#7C5CFC", contact: true  },
    nothome: { label: "Not Home",       color: "#F5B301", contact: false },
    notint:  { label: "Not Interested", color: "#E5484D", contact: true  },
    dnk:     { label: "Do Not Knock",   color: "#0B0F16", contact: false },
  };

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

  // What counts as a DM (decision-maker) conversation.
  const DM_HINT = "Homeowner or spouse with authority to sign. “Ask my spouse” = a convo, not a DM.";

  // ---------- service plans ----------
  // Prices are FLOORS: the rep can quote up at the door, never below.
  // listInitial is the undiscounted initial-service price printed on the
  // agreement; the gap between it and what the rep charges is the "initial
  // discount" — the early-cancellation fee recaptures that discount (capped),
  // which is the defensible version of an exit fee.
  const PLANS = [
    { id: "basic",   name: "Basic",    monthly: 59, initial: 49, listInitial: 249,
      visits: "4 visits / year",
      blurb: "Quarterly general pest defense",
      services: "Quarterly exterior treatment of the home's perimeter, eaves, and entry points; interior on request; full de-webbing each visit.",
      covered: "Ants, roaches (non-German), spiders, wasps, crickets, earwigs, silverfish, millipedes, centipedes, pantry pests, stink bugs" },
    { id: "pro",     name: "Pro",      monthly: 69, initial: 49, listInitial: 249,
      visits: "6 visits / year",
      blurb: "Bi-monthly general pest defense",
      services: "Every-other-month exterior treatment with barrier refresh, eave and entry-point service, and de-webbing; interior on request.",
      covered: "Ants, roaches (non-German), spiders, wasps, crickets, earwigs, silverfish, millipedes, centipedes, pantry pests, stink bugs" },
    { id: "proplus", name: "Pro Plus", monthly: 79, initial: 49, listInitial: 299,
      visits: "6 visits / year + rodent",
      blurb: "Bi-monthly general pest + rodent coverage",
      services: "Everything in Pro, plus exterior rodent bait stations installed and maintained every visit, rodent monitoring, and entry-point exclusion flagging.",
      covered: "All Pro pests, plus mice and rats (commensal rodents)" },
    { id: "premium", name: "Premium",  monthly: 99, initial: 49, listInitial: 349,
      visits: "~10 visits / year",
      blurb: "Bi-monthly general + monthly mosquito in season",
      services: "Bi-monthly general pest treatment year-round, PLUS monthly mosquito treatments during mosquito season — barrier treatment of resting areas and larvicide at breeding sites. In season that's a visit every month.",
      covered: "All Pro pests, plus mosquitoes (in-season program)" },
  ];

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
    { max: 60,       label: "31–60 days",   color: "#F5B301" },
    { max: 120,      label: "61–120 days",  color: "#FF8A3D" },
    { max: Infinity, label: "120+ days",    color: "#E5484D" },
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
    DISPOSITIONS, DECLINE_REASONS, REKNOCK_REASONS, DM_HINT,
    PLANS, AGREEMENT, PIPELINE, SOURCES, HOOD_COLORS, FRESH_SCALE, FRESH_NEVER, COMPANY_DEFAULTS,
    PESTS, DEMO_TEAM, DEFAULT_GOOGLE_KEY,
  };
})();
