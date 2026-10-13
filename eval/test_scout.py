"""
Evaluation for Scout. Runs the full multi-agent flow on a known company and asserts the
brief is well-formed, every required section is present, and the Critic signed it off.
Run:  pytest -q   or   python eval/test_scout.py "Notion"
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from google.adk.runners import InMemoryRunner  # noqa: E402
from google.genai import types  # noqa: E402

from scout.agent import root_agent  # noqa: E402

REQUIRED_SECTIONS = ["snapshot", "market", "competitive", "key risks", "analyst take"]


async def run_scout(topic: str) -> dict:
    runner = InMemoryRunner(agent=root_agent, app_name="scout")
    session = await runner.session_service.create_session(app_name="scout", user_id="evaluator")
    message = types.Content(role="user", parts=[types.Part(text=topic)])
    approved = False
    async for event in runner.run_async(
        user_id="evaluator", session_id=session.id, new_message=message
    ):
        if event.author == "Critic" and event.content and event.content.parts:
            text = "".join(p.text or "" for p in event.content.parts)
            if "APPROVED" in text.upper():
                approved = True
    final = await runner.session_service.get_session(
        app_name="scout", user_id="evaluator", session_id=session.id
    )
    return {"state": final.state, "approved": approved}


def evaluate(topic: str) -> dict:
    result = asyncio.run(run_scout(topic))
    brief = result["state"].get("brief", "") or ""
    missing = [s for s in REQUIRED_SECTIONS if s not in brief.lower()]
    return {
        "topic": topic,
        "brief_len": len(brief),
        "sections_present": len(REQUIRED_SECTIONS) - len(missing),
        "sections_total": len(REQUIRED_SECTIONS),
        "missing_sections": missing,
        "critic_approved": result["approved"],
        "brief": brief,
    }


def test_notion_brief_is_complete():
    r = evaluate("Analyze: Notion (the productivity software company)")
    assert r["brief_len"] > 300, f"brief too short: {r['brief_len']}"
    assert not r["missing_sections"], f"missing sections: {r['missing_sections']}"


if __name__ == "__main__":
    topic = sys.argv[1] if len(sys.argv) > 1 else "Analyze: Notion (the productivity software company)"
    r = evaluate(topic)
    print(f"\n=== Scout eval: {r['topic']} ===")
    print(f"sections: {r['sections_present']}/{r['sections_total']}  "
          f"missing: {r['missing_sections']}  critic_approved: {r['critic_approved']}  "
          f"brief_len: {r['brief_len']}")
    print("\n--- BRIEF ---\n")
    print(r["brief"][:1500])
