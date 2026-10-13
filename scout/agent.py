"""
Scout — an autonomous competitive-intelligence analyst.

A team of agents turns a single company/topic into a cited, reviewed brief:
  1. A ParallelAgent fans out THREE researchers at once (Market, Competitors, Risks),
     each grounded with Google Search.
  2. An Analyst synthesises their findings into a structured brief.
  3. A Critic reviews it in a LoopAgent — if a claim is unsupported or a section is thin
     it sends the Analyst back to revise; when satisfied it calls exit_loop to finish.

Orchestration shown: Parallel (fan-out) + Sequential (pipeline) + Loop (self-correction).

Built with Google Antigravity + the Google Agent Development Kit (ADK), on Gemini
(2.5 Flash for fast research, 2.5 Pro for synthesis & review) via Vertex AI.
"""

from google.adk.agents import LlmAgent, LoopAgent, ParallelAgent, SequentialAgent
from google.adk.tools import google_search
from google.adk.tools.tool_context import ToolContext

FLASH = "gemini-2.5-flash"  # fast, cheap — the research tier
PRO = "gemini-2.5-pro"      # stronger reasoning — synthesis & review tier


def exit_loop(tool_context: ToolContext) -> dict:
    """Call this ONLY when the brief is complete and every claim is supported."""
    tool_context.actions.escalate = True
    return {"status": "approved"}


# ── 1) Three researchers, run in PARALLEL, each grounded with Google Search ──────

market_researcher = LlmAgent(
    name="MarketResearcher",
    model=FLASH,
    tools=[google_search],
    instruction=(
        "You research the MARKET for the company/topic the user names. Use Google Search. "
        "Report: what it is, the market category and size/growth if findable, target customers, "
        "and 2-3 notable recent developments. Be concrete and cite sources inline as [source: url]. "
        "Keep it under 180 words."
    ),
    output_key="market_findings",
)

competitor_researcher = LlmAgent(
    name="CompetitorResearcher",
    model=FLASH,
    tools=[google_search],
    instruction=(
        "You research the COMPETITORS of the company/topic the user names. Use Google Search. "
        "List the 3-5 main competitors, each with a one-line positioning and how they differ. "
        "Note who is the current leader and why. Cite sources inline as [source: url]. "
        "Keep it under 180 words."
    ),
    output_key="competitor_findings",
)

risk_researcher = LlmAgent(
    name="RiskResearcher",
    model=FLASH,
    tools=[google_search],
    instruction=(
        "You research the RISKS and headwinds for the company/topic the user names. Use Google Search. "
        "Cover: market/competitive risks, regulatory or legal exposure, and any recent controversies or "
        "financial concerns. Cite sources inline as [source: url]. Keep it under 180 words."
    ),
    output_key="risk_findings",
)

research_team = ParallelAgent(
    name="ResearchTeam",
    sub_agents=[market_researcher, competitor_researcher, risk_researcher],
)

# ── 2) Analyst synthesises, 3) Critic reviews — in a self-correcting LOOP ────────

analyst = LlmAgent(
    name="Analyst",
    model=PRO,
    instruction=(
        "You are a senior analyst. Write a crisp competitive-intelligence brief from the research below.\n\n"
        "MARKET:\n{market_findings}\n\n"
        "COMPETITORS:\n{competitor_findings}\n\n"
        "RISKS:\n{risk_findings}\n\n"
        "Produce markdown with these sections: '## Snapshot' (3 bullets), '## Market', '## Competitive "
        "landscape', '## Key risks', and '## Analyst take' (your 2-3 sentence verdict). Keep every claim "
        "traceable to the research and preserve the inline [source: url] citations. If a reviewer left "
        "feedback earlier in this conversation, revise the brief to address every point. Be decisive and "
        "under 450 words."
    ),
    output_key="brief",
)

critic = LlmAgent(
    name="Critic",
    model=PRO,
    tools=[exit_loop],
    instruction=(
        "You are a demanding editor reviewing this brief:\n\n{brief}\n\n"
        "Check: (a) every claim is supported by a citation, (b) all five sections are present and "
        "non-empty, (c) the 'Analyst take' actually takes a position. "
        "If it fully passes, call the exit_loop tool and reply exactly 'APPROVED'. "
        "Otherwise DO NOT call the tool — instead list the specific fixes the analyst must make, as a "
        "short numbered list. Be strict but fair."
    ),
    output_key="critique",
)

review_loop = LoopAgent(
    name="ReviewLoop",
    max_iterations=2,
    sub_agents=[analyst, critic],
)

# ── Root: research in parallel, then synthesise-and-review in a loop ─────────────

root_agent = SequentialAgent(
    name="Scout",
    description="Autonomous competitive-intelligence analyst: parallel research → synthesis → critic review.",
    sub_agents=[research_team, review_loop],
)
