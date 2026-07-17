/* ============================================================
   Deal Vault — app.js
   Shell: router, navigation, theme, toasts, modals, PIN lock,
   nested-field data binding used by every form in the app.
   ============================================================ */
window.DV = window.DV || {};

DV.app = (() => {
  const U = DV.util;

  /* ---------- nested path helpers (data binding) ---------- */
  const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  const setPath = (obj, path, val) => {
    const parts = path.split('.'); const last = parts.pop();
    let o = obj;
    for (const p of parts) { if (o[p] == null || typeof o[p] !== 'object') o[p] = {}; o = o[p]; }
    o[last] = val;
  };

  /* ---------- icons ---------- */
  const IC = {
    dash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7.5" height="9" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="5.5" rx="1.5"/><rect x="13.5" y="12" width="7.5" height="9" rx="1.5"/><rect x="3" y="15.5" width="7.5" height="5.5" rx="1.5"/></svg>',
    analyze: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.8-3.8M8 11h6M11 8v6"/></svg>',
    deals: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16v13H4z"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M4 12h16"/></svg>',
    compare: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 3v18M16 3v18M3 8h5M3 16h5M16 8h5M16 16h5"/></svg>',
    watch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
    report: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2.5h9L20 7.5v14H6z"/><path d="M14 3v5h5M9.5 13h5M9.5 17h5"/></svg>',
    tune: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 8h10M18 8h2M4 16h2M10 16h10"/><circle cx="16" cy="8" r="2.2"/><circle cx="8" cy="16" r="2.2"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7"/></svg>',
    vault: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="12" cy="12" r="4.2"/><path d="M12 9.4v2.6l1.8 1.4M6.5 20v1.8M17.5 20v1.8"/></svg>'
  };

  const NAV = [
    { route: 'dashboard', label: 'Dashboard', icon: IC.dash },
    { route: 'analyze',   label: 'Analyze New Deal', icon: IC.analyze },
    { route: 'deals',     label: 'Saved Deals', icon: IC.deals },
    { route: 'compare',   label: 'Compare Deals', icon: IC.compare },
    { route: 'watchlist', label: 'Watchlist', icon: IC.watch },
    { route: 'reports',   label: 'Reports', icon: IC.report },
    { route: 'assumptions', label: 'Assumptions', icon: IC.tune },
    { route: 'settings',  label: 'Settings', icon: IC.gear }
  ];
  const MOBILE_NAV = ['dashboard', 'analyze', 'deals', 'compare', 'settings'];

  /* ---------- theme ---------- */
  function applyTheme() {
    const pref = DV.store.settings().theme || 'auto';
    const dark = pref === 'dark' || (pref === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }

  /* ---------- toast & modal ---------- */
  function toast(msg, kind = '') {
    const wrap = document.getElementById('toasts');
    const t = U.el('div', { class: 'toast ' + kind }, U.esc(msg));
    wrap.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 320); }, 3200);
  }
  function modal(html, onMount) {
    const back = U.el('div', { class: 'modal-back' });
    const box = U.el('div', { class: 'modal' }, html);
    back.appendChild(box);
    back.addEventListener('click', e => { if (e.target === back) back.remove(); });
    document.body.appendChild(back);
    if (onMount) onMount(box, () => back.remove());
    return { close: () => back.remove(), box };
  }
  function confirmBox(title, body, okLabel, cb, danger) {
    modal(`<h3>${U.esc(title)}</h3><p style="margin:10px 0 18px;color:var(--ink-2);font-size:14px">${U.esc(body)}</p>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button class="btn" data-x>Cancel</button>
        <button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${U.esc(okLabel)}</button></div>`,
      (box, close) => {
        box.querySelector('[data-x]').onclick = close;
        box.querySelector('[data-ok]').onclick = () => { close(); cb(); };
      });
  }

  /* ---------- shared form field renderer ----------
     def: {key(path), label, type, help, req, opts, placeholder}
     type: money num pct text textarea select bool year          */
  function fieldHTML(deal, def) {
    const val = getPath(deal, def.key);
    const src = deal.fieldSources?.[def.key];
    const chip = src ? `<span class="src-chip ${DV.SOURCES[src].cls}" title="${DV.SOURCES[src].label}">${DV.SOURCES[src].short}</span>` : '';
    const tip = def.help ? ` <span class="tip" title="${U.esc(def.help)}">?</span>` : '';
    const id = 'f_' + def.key.replace(/\./g, '_');
    let input = '';
    const vAttr = val === null || val === undefined ? '' : U.esc(val);
    if (def.type === 'money')
      input = `<div class="money-input"><input id="${id}" data-path="${def.key}" data-type="num" type="text" inputmode="decimal" value="${vAttr === '' ? '' : Number(val).toLocaleString('en-US')}" placeholder="${def.placeholder || '0'}"></div>`;
    else if (def.type === 'num' || def.type === 'pct' || def.type === 'year')
      input = `<input id="${id}" data-path="${def.key}" data-type="num" type="text" inputmode="decimal" value="${vAttr}" placeholder="${def.placeholder || (def.type === 'pct' ? '%' : '')}">`;
    else if (def.type === 'textarea')
      input = `<textarea id="${id}" data-path="${def.key}" data-type="str" placeholder="${def.placeholder || ''}">${vAttr}</textarea>`;
    else if (def.type === 'select')
      input = `<select id="${id}" data-path="${def.key}" data-type="str"><option value="">—</option>${(def.opts || []).map(o => {
        const [v, l] = Array.isArray(o) ? o : [o, o];
        return `<option value="${U.esc(v)}"${String(val) === String(v) ? ' selected' : ''}>${U.esc(l)}</option>`; }).join('')}</select>`;
    else if (def.type === 'bool')
      input = `<select id="${id}" data-path="${def.key}" data-type="bool"><option value=""${val === null || val === undefined || val === '' ? ' selected' : ''}>—</option><option value="yes"${val === true ? ' selected' : ''}>Yes</option><option value="no"${val === false ? ' selected' : ''}>No</option></select>`;
    else
      input = `<input id="${id}" data-path="${def.key}" data-type="str" type="text" value="${vAttr}" placeholder="${def.placeholder || ''}">`;
    return `<div class="field ${def.span2 ? 'span2' : ''}"><label for="${id}">${U.esc(def.label)}${def.req ? ' <span class="req">*</span>' : ''}${tip} ${chip}</label>${input}${def.hint ? `<div class="hint">${U.esc(def.hint)}</div>` : ''}</div>`;
  }

  /* Wire all [data-path] inputs inside `root` to write into `deal`. */
  function bindFields(root, deal, onChange) {
    root.querySelectorAll('[data-path]').forEach(inp => {
      const evt = inp.tagName === 'SELECT' ? 'change' : 'input';
      inp.addEventListener(evt, () => {
        let v = inp.value;
        if (inp.dataset.type === 'num') { v = U.num(v); }
        else if (inp.dataset.type === 'bool') v = v === '' ? null : v === 'yes';
        setPath(deal, inp.dataset.path, v === '' ? (inp.dataset.type === 'str' ? '' : null) : v);
        if (inp.dataset.type !== 'str') deal.fieldSources[inp.dataset.path] = deal.fieldSources[inp.dataset.path] === 'imported' && document.activeElement !== inp ? 'imported' : 'user';
        DV.store.upsertDeal(deal);
        if (onChange) onChange(inp.dataset.path);
      });
      if (inp.dataset.type === 'num' && inp.closest('.money-input'))
        inp.addEventListener('blur', () => { const n = U.num(inp.value); inp.value = n === null ? '' : n.toLocaleString('en-US'); });
    });
  }

  /* ---------- router ---------- */
  let current = { route: 'dashboard', args: [] };
  function navigate(hash) { location.hash = '#/' + hash; }
  function parseHash() {
    const h = location.hash.replace(/^#\/?/, '');
    const parts = h.split('/').filter(Boolean);
    return { route: parts[0] || 'dashboard', args: parts.slice(1) };
  }
  function render() {
    applyTheme();
    current = parseHash();
    const main = document.getElementById('main');
    const view = DV.views[current.route] || DV.views.dashboard;
    main.innerHTML = '';
    main.className = 'main view-enter';
    try { view.render(main, current.args); }
    catch (e) {
      console.error(e);
      main.innerHTML = `<div class="card"><h3>Something went wrong rendering this view</h3><p style="color:var(--ink-3);font-size:13px;margin-top:8px">${U.esc(e.message)}</p><button class="btn primary" style="margin-top:12px" onclick="location.hash='#/dashboard'">Back to dashboard</button></div>`;
    }
    renderNav();
    window.scrollTo(0, 0);
  }
  function renderNav() {
    const activeRoot = ['wizard'].includes(current.route) ? 'analyze' : ['deal', 'report'].includes(current.route) ? 'deals' : current.route;
    document.getElementById('nav').innerHTML = NAV.map(n =>
      `<button class="nav-item ${n.route === activeRoot ? 'active' : ''}" onclick="DV.app.navigate('${n.route}')">${n.icon}<span>${n.label}</span></button>`).join('')
      + `<div class="nav-spacer"></div><div class="nav-foot">Deal Vault · local &amp; private<br>Not legal, tax or investment advice.</div>`;
    document.getElementById('tabbar').innerHTML = MOBILE_NAV.map(r => {
      const n = NAV.find(x => x.route === r);
      return `<button class="${r === activeRoot ? 'active' : ''}" onclick="DV.app.navigate('${r}')">${n.icon}<span>${r === 'analyze' ? 'Analyze' : n.label.split(' ')[0]}</span></button>`;
    }).join('');
  }

  /* ---------- PIN lock (device privacy lock, not encryption) ---------- */
  async function sha(s) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('dv:' + s));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  async function maybeLock() {
    const pin = DV.store.settings().pinHash;
    if (!pin || sessionStorage.getItem('dv.unlocked') === pin) return;
    const lock = U.el('div', { class: 'lock' }, `<div class="card">
      <div class="brand" style="justify-content:center"><div class="brand-mark">${IC.vault}</div></div>
      <h2 style="margin-bottom:4px">Deal Vault</h2>
      <p style="color:var(--ink-3);font-size:13px;margin-bottom:14px">Enter your PIN to open the vault</p>
      <input id="pin-in" type="password" inputmode="numeric" autocomplete="off" style="text-align:center;font-size:22px;letter-spacing:8px;border:1px solid var(--line-2);border-radius:9px;padding:10px;width:100%" maxlength="8">
      <div id="pin-err" style="color:var(--bad);font-size:12.5px;height:18px;margin-top:6px"></div>
      <button class="btn primary" id="pin-go" style="width:100%;justify-content:center">Unlock</button></div>`);
    document.body.appendChild(lock);
    const inp = lock.querySelector('#pin-in');
    const go = async () => {
      if (await sha(inp.value) === pin) { sessionStorage.setItem('dv.unlocked', pin); lock.remove(); }
      else { lock.querySelector('#pin-err').textContent = 'Wrong PIN'; inp.value = ''; }
    };
    lock.querySelector('#pin-go').onclick = go;
    inp.addEventListener('keydown', e => e.key === 'Enter' && go());
    inp.focus();
  }

  /* ---------- boot ---------- */
  function boot() {
    const st = DV.store.load();
    if (!st.settings.demoSeeded) { DV.demo.seed(); st.settings.demoSeeded = true; DV.store.save(); }
    document.getElementById('app').innerHTML = `
      <aside class="sidebar">
        <div class="brand"><div class="brand-mark">${IC.vault}</div>
          <div><div class="brand-name">Deal Vault</div><div class="brand-sub">Acquisition analysis</div></div></div>
        <nav id="nav"></nav>
      </aside>
      <main id="main" class="main"></main>
      <nav class="tabbar" id="tabbar"></nav>
      <div id="toasts"></div>`;
    window.addEventListener('hashchange', render);
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
    maybeLock();
    render();
    if ('serviceWorker' in navigator && location.protocol !== 'file:')
      navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  return { boot, navigate, render, toast, modal, confirmBox, fieldHTML, bindFields, getPath, setPath, sha, IC, applyTheme };
})();

document.addEventListener('DOMContentLoaded', DV.app.boot);
