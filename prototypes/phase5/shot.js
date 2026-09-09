/* Screenshot harness for the Phase 5 prototype.
   Two headless-only workarounds, neither of which touches what the prototype
   renders in a real browser:
     1. every state gets its OWN page load (a hash-only URL change does not
        reload, so states would otherwise reuse the previous frame);
     2. the WebGL frame is read back with toDataURL and painted into the DOM,
        because headless Chromium does not hand the live GL surface to
        page.screenshot(). */
const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [], reqs = [];

  for (const s of ['A', 'B', 'C']) {
    const ctx = await b.newContext({ ...devices['iPhone 14 Pro'], deviceScaleFactor: 3 });
    const p = await ctx.newPage();
    p.on('console', m => { if (m.type() === 'error') errs.push(s + ': ' + m.text()); });
    p.on('pageerror', e => errs.push(s + ': PAGEERROR ' + e.message));
    p.on('request', r => { const u = r.url(); if (!u.startsWith('file://')) reqs.push(u); });

    await p.goto('file://' + __dirname + '/index.html#' + s, { waitUntil: 'load' });
    await p.waitForFunction(() => window.PROTO_READY === true, { timeout: 15000 });
    await p.evaluate(st => window.setState(st), s);
    await p.waitForTimeout(1200);

    const info = await p.evaluate(() => {
      const m = window.__map;
      m.redraw();
      const cv = m.getCanvas();
      const img = new Image();
      img.src = cv.toDataURL('image/png');
      img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
      cv.parentElement.insertBefore(img, cv.nextSibling);   // markers still paint above
      cv.style.visibility = 'hidden';
      return { zoom: +m.getZoom().toFixed(2),
               center: m.getCenter().toArray().map(n => +n.toFixed(5)),
               ready: img.decode ? 'decode' : 'load' };
    });
    await p.waitForTimeout(500);
    await p.screenshot({ path: `shot-${s}.png` });
    console.log('captured', s, JSON.stringify(info));
    await ctx.close();
  }

  console.log('CONSOLE ERRORS:', errs.length ? errs.join(' | ') : 'none');
  const external = reqs.filter(u => !u.startsWith('blob:'));
  console.log('NON-FILE NETWORK REQUESTS:', external.length ? external.join(' | ') : 'NONE');
  console.log('(blob: URLs are MapLibre\'s own in-page workers, not network)');
  await b.close();
})();
