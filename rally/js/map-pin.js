/* RALLY — THE PIN, drawn once, for every map engine.

   This used to live inside map.js next to MapLibre's addImage(). It moved
   here the moment a second engine appeared, because a teardrop that is
   drawn twice is a teardrop that will eventually differ twice: MapLibre
   registers it as a sprite, MapKit puts it in a DOM annotation, and if
   each engine owned its own copy of the geometry the rep would be able to
   tell which map they were on by looking at the pins. One canvas, two
   consumers — MPIN.imageData() for the sprite atlas, MPIN.dataURL() for
   the <img>. Same curve, same halo, same hole, same colours.

   The art itself is unchanged from v42 and the reasoning stands:

     1. A WHITE HALO. Roofs, driveways and lawns run the whole tonal
        range, so a coloured rim disappears against something. A white
        ring plus a soft drop shadow separates the pin from ANY imagery
        underneath, which is what makes a dense street readable.
     2. LESS GLOSS. The heavy 3D bloom read as a game asset next to Apple
        and Google's own map furniture. A single soft vertical gradient
        keeps the form without the shine.
     3. SMALLER, WITH A LONGER TIP. The point is the claim about which
        BUILDING this is — the head can shrink for density as long as the
        tip stays sharp and anchored. */
(function () {
  const D = MDATA.DISPOSITIONS;

  /* NOT-HOME DEPTH. A door nobody answered once and a door nobody answered
     four times are not the same prospect, and a rep walking past should be
     able to tell without opening anything. So not-home darkens toward
     orange with each attempt IN THE CURRENT CYCLE — a fresh pass starts
     every door back at one. */
  const NH_DEPTH = { nothome2: "#E39A00", nothome3: "#D97A16" };

  // every key pinsGeoJSON()/setPins() can emit, and the colour it paints
  const COLORS = {};
  Object.keys(D).forEach((k) => { COLORS[k] = D[k].color; });
  Object.keys(NH_DEPTH).forEach((k) => { COLORS[k] = NH_DEPTH[k]; });

  /* THE SIZE CURVE, in one place for the same reason the shape is.
     MapLibre reads it as a style expression; MapKit has no expression
     language at all, so its adapter samples the same stops itself. Both
     are therefore the same curve by construction, not by coincidence. */
  const SIZE = [[10, 0.20], [14, 0.32], [16, 0.44], [18, 0.62]];
  const SIZE_SEL = [[10, 0.28], [14, 0.44], [16, 0.60], [18, 0.84]];

  // the MapLibre form: ["interpolate", ["linear"], ["zoom"], z, s, ...]
  const expr = (stops) =>
    ["interpolate", ["linear"], ["zoom"]].concat(stops.flat());

  // the MapKit form: the same piecewise-linear curve, evaluated in JS
  function sample(stops, zoom) {
    if (zoom <= stops[0][0]) return stops[0][1];
    const last = stops[stops.length - 1];
    if (zoom >= last[0]) return last[1];
    for (let i = 1; i < stops.length; i++) {
      const [z0, s0] = stops[i - 1], [z1, s1] = stops[i];
      if (zoom <= z1) return s0 + ((zoom - z0) / (z1 - z0)) * (s1 - s0);
    }
    return last[1];
  }

  function shade(hex, f) {
    // f > 0 lightens toward white, f < 0 darkens toward black
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const t = f < 0 ? 0 : 255, p = Math.abs(f);
    r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
    return `rgb(${r},${g},${b})`;
  }

  const S = 96; // 48 CSS px @2x

  function draw(color, opts) {
    const o = opts || {};
    const cv = document.createElement("canvas");
    cv.width = S; cv.height = S;
    const ctx = cv.getContext("2d");
    const x = S / 2, headR = S * 0.255, headCy = S * 0.315, tipY = S * 0.945;

    const tear = () => {
      ctx.beginPath();
      ctx.moveTo(x, tipY);
      ctx.bezierCurveTo(x - headR * 0.40, tipY - S * 0.30, x - headR, headCy + headR * 0.80, x - headR, headCy);
      ctx.arc(x, headCy, headR, Math.PI, 0); // top semicircle
      ctx.bezierCurveTo(x + headR, headCy + headR * 0.80, x + headR * 0.40, tipY - S * 0.30, x, tipY);
      ctx.closePath();
    };

    // separation from the imagery: a soft shadow under the whole shape
    ctx.save();
    ctx.shadowColor = "rgba(8,12,20,.38)";
    ctx.shadowBlur = 7;
    ctx.shadowOffsetY = 2;
    tear();
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.restore();

    // THE HALO — a white ring the imagery cannot swallow
    tear();
    ctx.lineWidth = o.halo || 5.5;
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineJoin = "round";
    ctx.stroke();

    // body
    tear();
    ctx.fillStyle = color;
    ctx.fill();

    // one soft vertical gradient — form, not shine
    tear();
    ctx.save();
    ctx.clip();
    const g = ctx.createLinearGradient(0, headCy - headR, 0, tipY);
    g.addColorStop(0, "rgba(255,255,255,.30)");
    g.addColorStop(0.45, "rgba(255,255,255,.04)");
    g.addColorStop(1, "rgba(0,0,0,.20)");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();

    // a hairline of the colour's own shade keeps the edge crisp inside the halo
    const lum = parseInt(color.slice(1), 16);
    const isDark = (((lum >> 16) & 255) + ((lum >> 8) & 255) + (lum & 255)) / 3 < 70;
    tear();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = isDark ? "rgba(255,255,255,.42)" : shade(color, -0.30);
    ctx.stroke();

    // the white hole, smaller than before so the colour still reads at 12px
    ctx.beginPath();
    ctx.arc(x, headCy, headR * 0.36, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();

    return { canvas: cv, ctx };
  }

  // data URLs are the expensive half (base64 of a 96px canvas), and a
  // MapKit repaint asks for the same six colours over and over
  const urlCache = new Map();

  window.MPIN = {
    SIZE_PX: S / 2,          // the CSS size a scale of 1.0 means
    COLORS, NH_DEPTH,
    sizeExpr: () => expr(SIZE),
    sizeExprSelected: () => expr(SIZE_SEL),
    scaleAt: (zoom) => sample(SIZE, zoom),
    scaleAtSelected: (zoom) => sample(SIZE_SEL, zoom),
    imageData(color) {
      const { ctx } = draw(color);
      return ctx.getImageData(0, 0, S, S);
    },
    dataURL(color) {
      if (urlCache.has(color)) return urlCache.get(color);
      const u = draw(color).canvas.toDataURL("image/png");
      urlCache.set(color, u);
      return u;
    },
    shade,
  };
})();
