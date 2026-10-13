import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AGENTS, byKey } from "./data/agents";
import { SERVICES } from "./data/services";
import { TOOLS } from "./data/tools";
import { runScout } from "./lib/scoutClient";
import FlowGraph from "./components/FlowGraph";

const VIEWS = [
  ["console", "Live Console"],
  ["agents", "Agents"],
  ["flow", "Flow"],
  ["services", "Google Services"],
  ["tools", "Tools"],
];
const SUGGESTIONS = ["Anthropic", "Nvidia vs AMD", "the EV charging market", "Notion", "Stripe", "Perplexity AI"];

/* tiny markdown → react for the brief */
function Markdown({ text }) {
  const lines = (text || "").split("\n");
  return (
    <div>
      {lines.map((ln, i) => {
        if (ln.startsWith("## ")) return <h3 key={i} style={{ margin: "16px 0 6px", fontSize: "1.05rem" }}>{inline(ln.slice(3))}</h3>;
        if (ln.startsWith("# ")) return <h3 key={i} style={{ margin: "16px 0 6px" }}>{inline(ln.slice(2))}</h3>;
        if (/^\s*[-*]\s+/.test(ln)) return <div key={i} style={{ display: "flex", gap: 8, margin: "3px 0" }}><span style={{ color: "var(--cyan)" }}>▸</span><span>{inline(ln.replace(/^\s*[-*]\s+/, ""))}</span></div>;
        if (!ln.trim()) return <div key={i} style={{ height: 6 }} />;
        return <p key={i} style={{ margin: "5px 0", lineHeight: 1.55 }}>{inline(ln)}</p>;
      })}
    </div>
  );
}
function inline(s) {
  // bold + [source: url] chips
  const parts = s.split(/(\*\*[^*]+\*\*|\[source:[^\]]+\])/g);
  return parts.map((p, i) => {
    if (p.startsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("[source:")) {
      const url = p.slice(8, -1).trim();
      return <a key={i} href={url} target="_blank" rel="noreferrer" style={{ color: "var(--blue)", fontSize: ".82em", textDecoration: "none" }}>↗ source</a>;
    }
    return <span key={i}>{p}</span>;
  });
}

export default function App() {
  const [view, setView] = useState("console");
  const [modal, setModal] = useState(null); // {type, data}

  return (
    <>
      <div className="aurora" />
      <div className="grid-overlay" />
      <header className="topbar">
        <div className="shell topbar-inner">
          <div className="brand"><span className="mark">🛰️</span> Scout</div>
          <nav className="nav">
            {VIEWS.map(([k, label]) => (
              <button key={k} className={view === k ? "on" : ""} onClick={() => setView(k)}>
                {view === k && <motion.span layoutId="pill" className="pill" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="shell">
        <AnimatePresence mode="wait">
          <motion.div key={view} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
            {view === "console" && <Console />}
            {view === "agents" && <Agents onOpen={(a) => setModal({ type: "agent", data: a })} />}
            {view === "flow" && <FlowView />}
            {view === "services" && <Services onOpen={(s) => setModal({ type: "service", data: s })} />}
            {view === "tools" && <Tools />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="shell">
        Scout · built with <strong style={{ color: "var(--muted)" }}>Google Antigravity</strong> + Agent Development Kit · Gemini on Vertex AI · deployed on Cloud Run
      </footer>

      <AnimatePresence>
        {modal?.type === "agent" && <AgentModal a={modal.data} onClose={() => setModal(null)} />}
        {modal?.type === "service" && <ServiceModal s={modal.data} onClose={() => setModal(null)} />}
      </AnimatePresence>
    </>
  );
}

/* ───────────────────────── Live Console ───────────────────────── */
function Console() {
  const [topic, setTopic] = useState("");
  const [running, setRunning] = useState(false);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState({});
  const [stats, setStats] = useState({}); // key -> {tokens, hits}
  const [active, setActive] = useState(null);
  const [approved, setApproved] = useState(false);
  const [err, setErr] = useState(null);
  const startRef = useRef(0);
  const [elapsed, setElapsed] = useState(0);

  const totals = useMemo(() => {
    const vals = Object.values(stats);
    return {
      agents: new Set(messages.map((m) => m.author)).size,
      tokens: vals.reduce((s, v) => s + v.tokens, 0),
      hits: vals.reduce((s, v) => s + v.hits, 0),
    };
  }, [stats, messages]);

  const brief = useMemo(() => [...messages].reverse().find((m) => m.author === "Analyst" && m.text.includes("##"))?.text, [messages]);

  async function go(q) {
    const query = (q ?? topic).trim();
    if (!query || running) return;
    setRunning(true); setErr(null); setApproved(false);
    setMessages([]); setStats({}); setActive(null);
    setStatus({ MarketResearcher: "active", CompetitorResearcher: "active", RiskResearcher: "active" });
    startRef.current = Date.now();
    const timer = setInterval(() => setElapsed(((Date.now() - startRef.current) / 1000)), 100);
    try {
      await runScout(query, {
        onEvent: (ev) => {
          const { author, text, tokens, funcCalls } = ev;
          setActive(author);
          setStatus((p) => {
            const n = { ...p, [author]: "done" };
            if (author === "Analyst") n.Critic = "active";
            if (author === "Critic") n.Analyst = p.Analyst === "active" ? "done" : p.Analyst;
            return n;
          });
          setStats((p) => {
            const cur = p[author] || { tokens: 0, hits: 0 };
            return { ...p, [author]: { tokens: cur.tokens + (tokens || 0), hits: cur.hits + 1 } };
          });
          const approvedNow = author === "Critic" && /APPROVED/i.test(text);
          if (approvedNow) setApproved(true);
          const label = funcCalls?.length ? `🏁 called ${funcCalls.join(", ")}()` : "";
          if (text || label) {
            setMessages((m) => [...m, { id: m.length + "-" + author, author, text: text || label, tokens }]);
          }
        },
      });
    } catch (e) {
      setErr(e.message || "Run failed");
    } finally {
      clearInterval(timer);
      setRunning(false);
      setActive(null);
    }
  }

  return (
    <>
      <section className="hero">
        <div className="eyebrow">Autonomous intelligence · multi-agent</div>
        <h1>Point it at any company.<br /><span className="g">Watch a team of agents investigate.</span></h1>
        <p className="sub">
          Scout fans out three researchers to search the live web in parallel, has an Analyst synthesise a cited brief, and a Critic review it until it holds up — in about a minute.
        </p>
        <div className="card pad" style={{ marginTop: 28 }}>
          <div className="row">
            <input className="input" placeholder="A company, product or market…  e.g. Anthropic"
              value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} style={{ flex: 1, minWidth: 240 }} />
            <motion.button className="btn" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} disabled={running} onClick={() => go()}>
              {running ? "Investigating…" : "Run Scout ▸"}
            </motion.button>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <span className="faint" style={{ fontSize: ".8rem" }}>Try:</span>
            {SUGGESTIONS.map((s) => <button key={s} className="chip" disabled={running} onClick={() => { setTopic(s); go(s); }}>{s}</button>)}
          </div>
        </div>
      </section>

      {/* stat row */}
      <div className="grid a3" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginTop: 8 }}>
        <Stat n={totals.agents} l="Agents fired" />
        <Stat n={totals.tokens.toLocaleString()} l="Tokens used" />
        <Stat n={totals.hits} l="LLM / tool calls" />
        <Stat n={(running || elapsed ? elapsed.toFixed(1) + "s" : "—")} l="Elapsed" accent={approved ? "var(--lime)" : undefined} extra={approved ? "✅ approved" : running ? <span className="live"><span className="blip" /> live</span> : null} />
      </div>

      {/* flow graph */}
      <div className="card pad" style={{ marginTop: 18 }}>
        <div className="row" style={{ marginBottom: 6 }}><span className="eyebrow">Orchestration</span><span className="spacer" /><span className="faint" style={{ fontSize: ".78rem" }}>parallel → synthesis → critic loop</span></div>
        <FlowGraph status={status} active={active} />
      </div>

      {/* live stream + brief */}
      <div className="grid" style={{ gridTemplateColumns: "1fr", marginTop: 18, gap: 18 }}>
        <div className="card pad">
          <div className="row" style={{ marginBottom: 6 }}>
            <span className="eyebrow">Agents talking</span><span className="spacer" />
            {running && <span className="live"><span className="blip" /> streaming</span>}
          </div>
          {err && <p style={{ color: "var(--rose)" }}>⚠ {err}</p>}
          {!messages.length && !running && <p className="faint">Run a topic to watch the agents research, debate and sign off in real time.</p>}
          <AnimatePresence initial={false}>
            {messages.map((m) => {
              const a = byKey[m.author] || { name: m.author, color: "#8899bb", emoji: "🤖", tier: "" };
              const isBrief = m.author === "Analyst" && m.text.includes("##");
              return (
                <motion.div key={m.id} className="msg" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", stiffness: 260, damping: 22 }}>
                  <div className="dot" style={{ background: a.color }}>{a.emoji}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="row">
                      <span className="who">{a.name}</span>
                      <span className="meta">{a.tier && `${a.tier} · `}{m.tokens ? `${m.tokens.toLocaleString()} tok` : ""}</span>
                    </div>
                    <div className={"body" + (isBrief ? " brief" : "")}>{isBrief ? <Markdown text={m.text} /> : m.text}</div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

function Stat({ n, l, accent, extra }) {
  return (
    <div className="card pad stat">
      <div className="n" style={accent ? { color: accent } : undefined}>{n}</div>
      <div className="l">{l} {extra && <span style={{ marginLeft: 6 }}>{extra}</span>}</div>
    </div>
  );
}

/* ───────────────────────── Agents ───────────────────────── */
function Agents({ onOpen }) {
  return (
    <section style={{ paddingTop: 36 }}>
      <div className="section-title"><h2>The agent team</h2><span className="muted">5 specialists · click any to see its brain</span></div>
      <div className="grid a3">
        {AGENTS.map((a, i) => (
          <motion.div key={a.key} className="card pad agent-card" onClick={() => onOpen(a)}
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <div className="rail" style={{ background: a.color }} />
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div style={{ fontSize: 30 }}>{a.emoji}</div>
              <span className="tag mono">{a.tier}</span>
            </div>
            <h3 style={{ margin: "12px 0 2px", fontSize: "1.2rem" }}>{a.name}</h3>
            <div className="faint" style={{ fontSize: ".86rem" }}>{a.role}</div>
            <p className="muted" style={{ fontSize: ".9rem", lineHeight: 1.5, marginTop: 10 }}>{a.what}</p>
            <div className="row" style={{ marginTop: 12 }}>
              <span className="tag mono">{a.model}</span>
              {a.tools.map((t) => <span key={t} className="tag">🔧 {t}</span>)}
            </div>
            <div className="faint" style={{ fontSize: ".78rem", marginTop: 12 }}>View prompt →</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function AgentModal({ a, onClose }) {
  return (
    <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="card pad modal" initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }} onClick={(e) => e.stopPropagation()}>
        <div className="rail" style={{ background: a.color, width: 60 }} />
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="row"><span style={{ fontSize: 34 }}>{a.emoji}</span><div><h2 style={{ margin: 0 }}>{a.name}</h2><span className="faint">{a.role}</span></div></div>
          <button className="chip" onClick={onClose}>✕ close</button>
        </div>
        <div className="row" style={{ marginTop: 14 }}>
          <span className="tag mono">{a.model}</span><span className="tag">{a.tier} tier</span>
          <span className="tag mono">→ state.{a.outputKey}</span>
          {a.tools.length ? a.tools.map((t) => <span key={t} className="tag">🔧 {t}</span>) : <span className="tag">no tools</span>}
        </div>
        <p className="muted" style={{ lineHeight: 1.55, marginTop: 14 }}>{a.what}</p>
        <div className="eyebrow" style={{ marginTop: 16, marginBottom: 8 }}>System prompt (prompt-engineered)</div>
        <div className="prompt-box">{a.prompt}</div>
      </motion.div>
    </motion.div>
  );
}

/* ───────────────────────── Flow view ───────────────────────── */
function FlowView() {
  return (
    <section style={{ paddingTop: 36 }}>
      <div className="section-title"><h2>How the team is wired</h2><span className="muted">three ADK orchestration patterns in one flow</span></div>
      <div className="card pad"><FlowGraph status={{ MarketResearcher: "done", CompetitorResearcher: "done", RiskResearcher: "done", Analyst: "done", Critic: "done" }} /></div>
      <div className="grid a3" style={{ marginTop: 18 }}>
        {[
          ["Parallel", "⇉", "The 3 researchers run at the same time (ParallelAgent) — each grounded with live Google Search."],
          ["Sequential", "→", "Research then review runs as a pipeline (SequentialAgent): nothing is written before the facts are in."],
          ["Loop", "↺", "Analyst ⇄ Critic repeat (LoopAgent, ≤2x). The Critic calls exit_loop only when the brief holds up."],
        ].map(([t, i, d]) => (
          <div key={t} className="card pad">
            <div style={{ fontSize: 26 }}>{i}</div>
            <h3 style={{ margin: "8px 0 4px" }}>{t}</h3>
            <p className="muted" style={{ fontSize: ".9rem", lineHeight: 1.5 }}>{d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────── Services ───────────────────────── */
function Services({ onOpen }) {
  return (
    <section style={{ paddingTop: 36 }}>
      <div className="section-title"><h2>Google services used</h2><span className="muted">click a service to see exactly how Scout uses it</span></div>
      <div className="grid a3">
        {SERVICES.map((s, i) => (
          <motion.div key={s.name} className="card pad svc" onClick={() => onOpen(s)}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="ico">{s.emoji}</div><span className="tag">{s.tag}</span>
            </div>
            <h3 style={{ margin: "12px 0 4px", fontSize: "1.1rem" }}>{s.name}</h3>
            <p className="muted" style={{ fontSize: ".9rem" }}>{s.short}</p>
            <div className="faint" style={{ fontSize: ".78rem", marginTop: 10 }}>How we use it →</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function ServiceModal({ s, onClose }) {
  return (
    <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="card pad modal" style={{ maxWidth: 620 }} initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }} onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="row"><div className="ico" style={{ fontSize: 24 }}>{s.emoji}</div><div><h2 style={{ margin: 0, fontSize: "1.3rem" }}>{s.name}</h2><span className="tag">{s.tag}</span></div></div>
          <button className="chip" onClick={onClose}>✕</button>
        </div>
        <div className="eyebrow" style={{ marginTop: 18, marginBottom: 8 }}>How Scout uses it</div>
        <p className="muted" style={{ lineHeight: 1.6 }}>{s.how}</p>
      </motion.div>
    </motion.div>
  );
}

/* ───────────────────────── Tools ───────────────────────── */
function Tools() {
  return (
    <section style={{ paddingTop: 36 }}>
      <div className="section-title"><h2>Tools the agents call</h2><span className="muted">yes — grounded, not guessed</span></div>
      <div className="grid a2">
        {TOOLS.map((t, i) => (
          <motion.div key={t.name} className="card pad" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="row"><span style={{ fontSize: 26 }}>{t.emoji}</span><code className="mono" style={{ fontSize: "1.05rem", color: "var(--text)" }}>{t.name}</code></div>
              <span className="tag">{t.kind}</span>
            </div>
            <p className="muted" style={{ fontSize: ".92rem", lineHeight: 1.55, marginTop: 12 }}>{t.what}</p>
            <div className="row" style={{ marginTop: 12 }}>
              <span className="faint" style={{ fontSize: ".78rem" }}>Used by:</span>
              {t.usedBy.map((k) => <span key={k} className="tag" style={{ color: byKey[k]?.color }}>{byKey[k]?.emoji} {byKey[k]?.name || k}</span>)}
            </div>
            {t.code && <div className="prompt-box" style={{ marginTop: 12 }}>{t.code}</div>}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
