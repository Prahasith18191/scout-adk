// Talks to the deployed Scout ADK API on Cloud Run. Streams agent events over SSE.

const BASE = (import.meta.env.VITE_SCOUT_API || "https://scout-puxir3jrda-uc.a.run.app").replace(/\/+$/, "");
const APP = "scout";

const pick = (o, ...keys) => keys.map((k) => o?.[k]).find((v) => v !== undefined);

function parseEvent(raw) {
  const author = raw.author || "agent";
  const parts = raw.content?.parts || [];
  const text = parts.map((p) => p?.text || "").join("").trim();
  const funcCalls = parts.filter((p) => p?.functionCall || p?.function_call).map((p) => (p.functionCall || p.function_call)?.name);
  const usage = pick(raw, "usageMetadata", "usage_metadata") || {};
  const tokens = pick(usage, "totalTokenCount", "total_token_count") ||
    ((pick(usage, "promptTokenCount", "prompt_token_count") || 0) + (pick(usage, "candidatesTokenCount", "candidates_token_count") || 0));
  return { author, text, tokens: tokens || 0, funcCalls, raw };
}

/**
 * Run Scout on a topic. Calls onEvent(parsedEvent) for every streamed agent event.
 * Returns a promise that resolves when the run completes.
 */
export async function runScout(topic, { onEvent, signal } = {}) {
  const userId = "web";
  const sessionId = "s-" + Date.now().toString(36);

  // 1) create a session
  await fetch(`${BASE}/apps/${APP}/users/${userId}/sessions/${sessionId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
    signal,
  });

  // 2) stream the run
  const res = await fetch(`${BASE}/run_sse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      app_name: APP,
      user_id: userId,
      session_id: sessionId,
      new_message: { role: "user", parts: [{ text: topic }] },
      streaming: false,
    }),
  });
  if (!res.ok || !res.body) throw new Error(`Scout API error ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const chunks = buf.split("\n\n");
    buf = chunks.pop() || "";
    for (const chunk of chunks) {
      const line = chunk.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      const json = line.slice(5).trim();
      if (!json || json === "[DONE]") continue;
      try {
        onEvent?.(parseEvent(JSON.parse(json)));
      } catch {
        /* ignore partial */
      }
    }
  }
}

export const SCOUT_API = BASE;
