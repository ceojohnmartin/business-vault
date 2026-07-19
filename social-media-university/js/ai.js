/* ============================================================
   SMU ai — Claude API client (direct from the browser).
   The user's API key lives ONLY in localStorage on their device.
   Every AI feature in the app has an offline fallback; this layer
   throws NoKeyError so callers can branch.
   ============================================================ */

window.SMU = window.SMU || {};
SMU.ai = (function () {
  const API_URL = "https://api.anthropic.com/v1/messages";

  function NoKeyError() {
    const e = new Error("No API key configured");
    e.name = "NoKeyError";
    return e;
  }

  function hasKey() { return !!(SMU.state.settings.apiKey || "").trim(); }
  function model() { return SMU.state.settings.model || "claude-opus-4-8"; }

  function headers() {
    return {
      "content-type": "application/json",
      "x-api-key": SMU.state.settings.apiKey.trim(),
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    };
  }

  /* Personalized mentor context injected into every system prompt */
  function profileContext() {
    const s = SMU.state, r = SMU.rank(), weak = SMU.weakestSkills(2);
    const p = SMU.overallProgress();
    return [
      "Student profile:",
      "- Name: " + (s.name || "(not set)"),
      "- Niche: " + (SMU.NICHE_LABELS[s.niche] || s.niche),
      "- Primary goal: " + s.goal,
      "- Rank: " + r.name + " (" + s.xp + " XP), " + p.done + "/" + p.total + " lessons complete",
      "- Current streak: " + SMU.liveStreak() + " days",
      "- Weakest skills: " + weak.map((k) => SMU.SKILL_LABELS[k]).join(", "),
      s.brand ? "- Brand: " + JSON.stringify(s.brand).slice(0, 600) : "",
    ].filter(Boolean).join("\n");
  }

  const MENTOR_SYSTEM =
    "You are the AI mentor inside Social Media University — an elite, private education app for " +
    "content creators, personal brands and luxury businesses. You are a world-class social media " +
    "strategist, viral-content expert, photographer, cinematographer, editor and marketer rolled into one. " +
    "Coach like a $10,000/year mentor: direct, specific, tactical, warm but never fluffy. " +
    "Give concrete examples, exact hooks, exact numbers and named techniques. Format with short " +
    "paragraphs and - bullet lists (markdown-lite: **bold** and lists only, no headings/tables/links). " +
    "Keep answers tight: usually under 250 words unless the user asks for scripts or plans.";

  function friendly(status, body) {
    if (status === 401) return "That API key was rejected (401). Double-check it in Profile → Settings.";
    if (status === 403) return "This key doesn't have permission for this model (403).";
    if (status === 404) return "Model not found (404). Try a different model in Settings.";
    if (status === 429) return "Rate limited (429). Wait a moment and try again.";
    if (status === 529) return "Claude is overloaded right now (529). Try again shortly.";
    let detail = "";
    try { detail = JSON.parse(body).error.message || ""; } catch (e) {}
    return "AI request failed (" + status + ")" + (detail ? ": " + detail : ".");
  }

  /**
   * chat(messages, opts) -> Promise<string>
   * messages: [{role:'user'|'assistant', content: string | blocks[]}]
   * opts: { system, maxTokens, onDelta(text), signal }
   * Streams when onDelta is provided.
   */
  async function chat(messages, opts) {
    opts = opts || {};
    if (!hasKey()) throw NoKeyError();
    const body = {
      model: model(),
      max_tokens: opts.maxTokens || 4096,
      system: (opts.system || MENTOR_SYSTEM) + "\n\n" + profileContext(),
      messages: messages,
    };
    if (opts.onDelta) body.stream = true;

    const res = await fetch(API_URL, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
      signal: opts.signal,
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(friendly(res.status, txt));
    }

    if (!opts.onDelta) {
      const data = await res.json();
      if (data.stop_reason === "refusal") return "I can't help with that one — try rephrasing.";
      return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    }

    /* SSE streaming */
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "", full = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        let ev;
        try { ev = JSON.parse(payload); } catch (e) { continue; }
        if (ev.type === "content_block_delta" && ev.delta && ev.delta.type === "text_delta") {
          full += ev.delta.text;
          opts.onDelta(ev.delta.text, full);
        }
        if (ev.type === "error") throw new Error(ev.error && ev.error.message || "Stream error");
      }
    }
    return full;
  }

  /** One-shot helper with a task-specific system prompt. */
  function ask(prompt, opts) {
    return chat([{ role: "user", content: prompt }], opts);
  }

  /** Vision helper: critique an image (e.g. a thumbnail). fileDataUrl = data:image/...;base64,... */
  function askWithImage(prompt, mediaType, base64Data, opts) {
    return chat([{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } },
        { type: "text", text: prompt },
      ],
    }], opts);
  }

  return { hasKey, chat, ask, askWithImage, NoKeyError, MENTOR_SYSTEM, profileContext, model };
})();
