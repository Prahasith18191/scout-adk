// Google services Scout actually uses — click a tile to see HOW.

export const SERVICES = [
  {
    name: "Agent Development Kit (ADK)",
    emoji: "🧩",
    tag: "Framework",
    short: "The multi-agent framework Scout is built on.",
    how: "Scout's whole team is defined in ADK: a ParallelAgent fans out the 3 researchers, a SequentialAgent pipelines research → review, and a LoopAgent drives the Analyst⇄Critic self-correction. Function tools (exit_loop) and the built-in Google Search tool are wired through ADK. `adk web`, `adk run` and `adk deploy` come from the same kit.",
  },
  {
    name: "Gemini 2.5 Pro",
    emoji: "🧠",
    tag: "Model · reasoning",
    short: "The synthesis & review brain.",
    how: "The Analyst and the Critic run on Gemini 2.5 Pro — the heavier reasoning needed to fuse three research streams into a decisive brief and to adversarially review it for unsupported claims.",
  },
  {
    name: "Gemini 2.5 Flash",
    emoji: "⚡",
    tag: "Model · fast",
    short: "The fast research tier.",
    how: "All three researchers run on Gemini 2.5 Flash — fast and cheap, perfect for running many tool-grounded searches in parallel without blowing the latency budget.",
  },
  {
    name: "Google Search (grounding)",
    emoji: "🔍",
    tag: "Tool",
    short: "Live web grounding for every claim.",
    how: "Each researcher is given ADK's built-in google_search tool, so findings are grounded in live results and cited inline as [source: url] — not pulled from the model's memory. This is what makes the brief trustworthy.",
  },
  {
    name: "Vertex AI",
    emoji: "▲",
    tag: "Platform",
    short: "Where the models run.",
    how: "Scout calls Gemini through Vertex AI (GOOGLE_GENAI_USE_VERTEXAI=TRUE) on project " +
      "project-881d951c…, region us-central1. Auth is a Google Cloud service account — no API keys in code.",
  },
  {
    name: "Cloud Run",
    emoji: "☁️",
    tag: "Deploy",
    short: "Hosts the live agent + this UI.",
    how: "`adk deploy cloud_run` containerises the agent and serves it as a scalable HTTPS service (with the ADK API + streaming endpoint). This custom UI is a second Cloud Run service that calls it. Pay-per-use, scales to zero.",
  },
  {
    name: "ADK Playground / Sessions / Traces",
    emoji: "🛰️",
    tag: "Evaluate",
    short: "Watch every step an agent takes.",
    how: "`adk web` ships a dev UI with a Playground, full Session history and step-by-step Traces — used during build to debug which agent called which tool and why the Critic looped.",
  },
  {
    name: "ADK Eval",
    emoji: "✅",
    tag: "Evaluate",
    short: "Automated quality gate.",
    how: "An eval (eval/test_scout.py) runs Scout on a known company and asserts all five brief sections are present and the Critic signed off — so a prompt change that breaks quality fails before deploy.",
  },
];
