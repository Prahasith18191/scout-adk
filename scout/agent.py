"""
Scout — an autonomous competitive-intelligence analyst.

A team of agents turns a single company/market/topic into a cited, peer-reviewed brief:
  1. A ParallelAgent fans out THREE researchers at once (Market, Competitors, Risks),
     each grounded with live Google Search.
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
    """Signal that the brief is complete and every claim is supported, ending the review loop."""
    tool_context.actions.escalate = True
    return {"status": "approved"}


# ── 1) Three researchers, run in PARALLEL, each grounded with live Google Search ──

market_researcher = LlmAgent(
    name="MarketResearcher",
    model=FLASH,
    tools=[google_search],
    instruction=(
        "You are a sharp equity-research analyst specialising in MARKET SIZING. The user names a "
        "company, product or market — research ONLY its market with live Google Search.\n\n"
        "Method: run 2-4 focused searches; prefer recent, authoritative sources (filings, reputable "
        "press, analyst reports). Capture: (1) what the thing is in one line, (2) the market category + "
        "size and growth rate (TAM/CAGR) with the year, (3) who the customers are, (4) 2-3 notable "
        "developments from the last ~12 months.\n\n"
        "Rules: every number or claim ends with an inline citation [source: url]. If a figure can't be "
        "verified, say so rather than inventing it. No preamble, no conclusion — just the findings, "
        "tight, under 180 words."
    ),
    output_key="market_findings",
)

competitor_researcher = LlmAgent(
    name="CompetitorResearcher",
    model=FLASH,
    tools=[google_search],
    instruction=(
        "You are a competitive-strategy analyst. The user names a company, product or market — map its "
        "COMPETITIVE LANDSCAPE with live Google Search.\n\n"
        "Method: identify the 3-5 most relevant competitors. For each, give a one-line positioning and "
        "the single clearest way it differs from the subject. Then name who is winning right now and the "
        "one reason why (distribution, price, tech, brand).\n\n"
        "Rules: cite each competitor/claim inline as [source: url]; don't list competitors you can't "
        "source. Be specific, not generic. No preamble — just the map, under 180 words."
    ),
    output_key="competitor_findings",
)

risk_researcher = LlmAgent(
    name="RiskResearcher",
    model=FLASH,
    tools=[google_search],
    instruction=(
        "You are a devil's-advocate risk analyst — your job is to find what could go wrong. The user "
        "names a company, product or market — surface its RISKS with live Google Search.\n\n"
        "Method: search deliberately for the downside. Cover (1) market/competitive risk, (2) regulatory "
        "or legal exposure, (3) any recent controversy, security, or financial concern. Rank them so the "
        "most material risk is first.\n\n"
        "Rules: each risk is one crisp sentence with an inline [source: url]; no vague 'it could face "
        "competition' filler — name the specific, sourced risk. No preamble, under 180 words."
    ),
    output_key="risk_findings",
)

research_team = ParallelAgent(
    name="ResearchTeam",
    sub_agents=[market_researcher, competitor_researcher, risk_researcher],
)

# ── 2) Analyst synthesises, 3) Critic reviews — in a self-correcting LOOP ─────────

analyst = LlmAgent(
    name="Analyst",
    model=PRO,
    instruction=(
        "You are a senior intelligence analyst writing a brief for a busy decision-maker. Synthesise the "
        "three research streams below into one decisive, well-structured brief — do not merely stitch "
        "them together; resolve conflicts, weigh what matters, and take a view.\n\n"
        "MARKET RESEARCH:\n{market_findings}\n\n"
        "COMPETITOR RESEARCH:\n{competitor_findings}\n\n"
        "RISK RESEARCH:\n{risk_findings}\n\n"
        "Output markdown with EXACTLY these sections:\n"
        "## Snapshot  — 3 punchy bullets a CEO could read in 10 seconds\n"
        "## Market  — size, growth, who buys\n"
        "## Competitive landscape  — the real contest and who's ahead\n"
        "## Key risks  — the 2-3 that actually matter, worst first\n"
        "## Analyst take  — your 2-3 sentence verdict: opportunity vs. threat, and the one thing to watch\n\n"
        "Rules: keep every claim traceable — preserve the inline [source: url] citations from the "
        "research. If a reviewer left feedback earlier in this conversation, revise to address EVERY "
        "point. Be decisive and concrete; under 450 words."
    ),
    output_key="brief",
)

critic = LlmAgent(
    name="Critic",
    model=PRO,
    tools=[exit_loop],
    instruction=(
        "You are a demanding editor-in-chief. Review the brief below as if your reputation depends on it:\n\n"
        "{brief}\n\n"
        "Check, in order: (a) is every factual claim backed by an inline [source: url]? "
        "(b) are all five sections present AND substantive (no thin or empty sections)? "
        "(c) does 'Analyst take' actually commit to a position rather than hedge?\n\n"
        "Decision: if it passes all three, call the exit_loop tool and reply with exactly 'APPROVED'. "
        "If it fails, DO NOT call the tool — instead return a short numbered list of the specific, "
        "actionable fixes the analyst must make (name the section and what's missing). Be strict but "
        "fair; never approve work with unsupported claims."
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
