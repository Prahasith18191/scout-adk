// Tools the agents actually call.

export const TOOLS = [
  {
    name: "google_search",
    emoji: "🔍",
    kind: "Built-in ADK tool · Google Search grounding",
    usedBy: ["MarketResearcher", "CompetitorResearcher", "RiskResearcher"],
    what:
      "ADK's built-in Google Search tool. Each researcher issues real search queries and grounds its findings in live results, citing sources inline. This is why Scout's claims are verifiable instead of hallucinated.",
  },
  {
    name: "exit_loop",
    emoji: "🏁",
    kind: "Custom function tool",
    usedBy: ["Critic"],
    what:
      "A function tool the Critic calls ONLY when the brief passes review. It sets the loop's escalate flag, which breaks the Analyst⇄Critic LoopAgent and finishes the run. If the Critic doesn't call it, the brief goes back to the Analyst for another pass (up to 2).",
    code: "def exit_loop(tool_context):\n    tool_context.actions.escalate = True\n    return {\"status\": \"approved\"}",
  },
];
