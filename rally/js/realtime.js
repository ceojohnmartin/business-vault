/* RALLY — the realtime doorbell (Phase 3).
   One WebSocket, one private channel: `team:<team_id>` on Supabase
   Realtime, spoken in the Phoenix wire protocol directly (vsn 1.0.0 JSON
   frames — join, heartbeat, broadcast) so there is still no SDK and no
   build step.

   ARCHITECTURE RULE, load-bearing: this module NEVER carries data. The
   server-side trigger broadcasts an EMPTY payload when team rows change;
   all this file ever does with a message is call MSYNC.wake(), and the
   Phase 2 pull/merge engine remains the only path into IndexedDB and the
   UI. If this socket never connects, RALLY behaves exactly as Phase 2
   shipped — the 45-second poll is the floor, this is the ceiling.

   Authorization is server-side: joining `team:X` is granted by an RLS
   policy on realtime.messages that compares the topic against the
   caller's OWN profile row (my_team_id() from the JWT) — the client's
   requested topic is a wish, not a credential. A join for another team's
   topic is refused at the socket.

   Battery: the socket lives only while the app is visible. Hidden → we
   close it and go silent; visible → reconnect, and the join success
   triggers the standard catch-up pull, so anything missed while hidden
   or disconnected arrives the boring, reliable way. */
(function () {
  const HEARTBEAT_MS = 25000;
  const BACKOFF_MAX = 60000;

  let ws = null;
  let topicTeam = null;      // team id the current channel is joined for
  let joined = false;
  let ref = 0;
  let joinRef = null;
  let hbTimer = null;
  let hbPending = null;      // ref of an unanswered heartbeat
  let reconnectT = null;
  let attempts = 0;
  let lastToken = null;
  let stopped = true;
  let pings = 0, connects = 0; // observability for tests/debug

  const topic = () => "realtime:team:" + topicTeam;
  const wsUrl = () => {
    const base = String((window.RALLY_CLOUD && RALLY_CLOUD.url) || "");
    return base.replace(/^http/, "ws").replace(/\/+$/, "") +
      "/realtime/v1/websocket?apikey=" +
      encodeURIComponent(RALLY_CLOUD.anonKey) + "&vsn=1.0.0";
  };

  function send(msg) {
    if (ws && ws.readyState === 1) {
      try { ws.send(JSON.stringify(msg)); } catch (_) {}
    }
  }

  function clearTimers() {
    if (hbTimer) { clearInterval(hbTimer); hbTimer = null; }
    if (reconnectT) { clearTimeout(reconnectT); reconnectT = null; }
    hbPending = null;
  }

  function teardown() {
    clearTimers();
    joined = false;
    if (ws) {
      const dead = ws;
      ws = null;
      dead.onopen = dead.onmessage = dead.onclose = dead.onerror = null;
      try { dead.close(); } catch (_) {}
    }
  }

  function scheduleReconnect() {
    if (stopped || document.visibilityState !== "visible") return;
    if (reconnectT) return;
    const delay = Math.min(1000 * Math.pow(2, attempts), BACKOFF_MAX);
    attempts++;
    reconnectT = setTimeout(() => { reconnectT = null; connect(); }, delay);
  }

  async function join() {
    const t = await (window.MCLOUD && MCLOUD.getTokens());
    if (!t || !t.access) { teardown(); return; }
    lastToken = t.access;
    joinRef = String(++ref);
    send({
      topic: topic(), event: "phx_join", ref: joinRef,
      payload: {
        config: {
          broadcast: { ack: false, self: false },
          presence: { key: "" },
          postgres_changes: [],
          private: true, // authorization runs against realtime.messages RLS
        },
        access_token: t.access,
      },
    });
  }

  async function heartbeat() {
    if (!ws || ws.readyState !== 1) return;
    if (hbPending) { // last heartbeat never came back: the socket is dead air
      teardown();
      scheduleReconnect();
      return;
    }
    // the access token rotates underneath us (refresh/revalidate) — keep
    // the channel's auth current so the server never sees a stale JWT
    try {
      const t = await MCLOUD.getTokens();
      if (t && t.access && t.access !== lastToken && joined) {
        lastToken = t.access;
        send({ topic: topic(), event: "access_token", ref: String(++ref),
          payload: { access_token: t.access } });
      }
    } catch (_) {}
    hbPending = String(++ref);
    send({ topic: "phoenix", event: "heartbeat", payload: {}, ref: hbPending });
  }

  function onMessage(raw) {
    let m = null;
    try { m = JSON.parse(raw.data); } catch (_) { return; }
    if (!m) return;
    if (m.event === "phx_reply" && m.ref === hbPending) { hbPending = null; return; }
    if (m.event === "phx_reply" && m.ref === joinRef) {
      if (m.payload && m.payload.status === "ok") {
        joined = true;
        attempts = 0;
        // whatever happened while we were away arrives the reliable way
        if (window.MSYNC && MSYNC.wake) MSYNC.wake("rt-join");
      } else {
        // refused (wrong team, disabled, policy) — realtime stays off for
        // this team; polling carries the load. Retry slowly, not never:
        // a rep freshly placed on a team should light up eventually.
        teardown();
        attempts = Math.max(attempts, 5);
        scheduleReconnect();
      }
      return;
    }
    if (m.event === "phx_error" || m.event === "phx_close") {
      teardown();
      scheduleReconnect();
      return;
    }
    if (m.event === "broadcast" && m.topic === topic()) {
      // the doorbell. No payload is read ON PRINCIPLE — even if a future
      // server change added data here, this module would not carry it.
      pings++;
      if (window.MSYNC && MSYNC.wake) MSYNC.wake("rt");
    }
  }

  function connect() {
    if (stopped || !topicTeam || document.visibilityState !== "visible") return;
    if (!("WebSocket" in window)) return; // polling remains the floor
    if (ws && (ws.readyState === 0 || ws.readyState === 1)) return;
    teardown();
    let sock;
    try { sock = new WebSocket(wsUrl()); } catch (_) { scheduleReconnect(); return; }
    ws = sock;
    connects++;
    ws.onopen = () => { join(); hbTimer = setInterval(heartbeat, HEARTBEAT_MS); };
    ws.onmessage = onMessage;
    ws.onclose = () => { teardown(); scheduleReconnect(); };
    ws.onerror = () => { /* onclose follows and handles it */ };
  }

  /* The sync engine calls this once per eligible cycle with the team it
     resolved SERVER-SIDE (from the profile row). Idempotent: connected to
     the right team → no-op; team changed → clean rejoin; dead → connect. */
  function ensure(team) {
    if (!team || !(window.RALLY_CLOUD && RALLY_CLOUD.url)) return;
    stopped = false;
    if (team !== topicTeam) {
      topicTeam = team;
      teardown();
      attempts = 0;
    }
    connect();
  }

  function stop() {
    stopped = true;
    topicTeam = null;
    teardown();
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      // MSYNC's own visible-handler runs the catch-up cycle; we just get
      // the doorbell live again
      if (!stopped && topicTeam) { attempts = 0; connect(); }
    } else {
      teardown(); // hidden: no socket, no heartbeats, no battery spend
    }
  });

  window.MREALTIME = {
    ensure, stop,
    status: () => ({
      connected: !!(ws && ws.readyState === 1), joined,
      team: topicTeam, pings, connects, attempts,
    }),
  };
})();
