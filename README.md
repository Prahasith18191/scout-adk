# 🛰️ Scout — Autonomous Competitive-Intelligence Analyst

**Built with Google Antigravity + the Google Agent Development Kit (ADK), on Gemini & Vertex AI.**

Give Scout a company or topic and a **team of AI agents** returns a cited, peer-reviewed
competitive-intelligence brief in ~60 seconds — the kind of brief an analyst would spend an
afternoon on.

> *"Analyze: Stripe"* → Market size & growth · Competitive landscape · Key risks · a decisive
> Analyst take — every claim grounded in a live Google Search and signed off by a critic agent.

---

## 🧠 How it works — multi-agent orchestration

Scout is not one chatbot; it's a coordinated crew that uses **all three** ADK orchestration
patterns:

```
                 ┌────────────────── ResearchTeam (ParallelAgent) ──────────────────┐
  "Analyze: X" ─▶│  MarketResearcher   CompetitorResearcher   RiskResearcher        │
                 │  (Gemini Flash + Google Search, all running at once)             │
                 └──────────────────────────────┬───────────────────────────────────┘
                                                 ▼
                        ┌──────────── ReviewLoop (LoopAgent, ≤2x) ────────────┐
                        │   Analyst (Gemini Pro) ─▶ Critic (Gemini Pro)       │
                        │   synthesises brief       checks every claim;       │
                        │        ▲                  if weak → back to Analyst │
                        │        └──────── revise ──────────┘                 │
                        │                  else → exit_loop() ✓               │
                        └──────────────────────┬──────────────────────────────┘
                                               ▼
                                     ✅ Cited, reviewed brief
```

- **Parallel** — three researchers fan out simultaneously, each grounded with **Google Search**.
- **Sequential** — research → synthesis → review runs as a pipeline.
- **Loop** — the **Critic** sends the brief back to the **Analyst** until every claim is supported,
  then calls an `exit_loop` tool to finish. Real self-correction, not a single shot.

| Agent | Tier | Job |
|---|---|---|
| MarketResearcher | Gemini 2.5 Flash | market size, customers, momentum |
| CompetitorResearcher | Gemini 2.5 Flash | rivals & positioning |
| RiskResearcher | Gemini 2.5 Flash | risks, regulation, controversies |
| Analyst | Gemini 2.5 Pro | synthesises the brief |
| Critic | Gemini 2.5 Pro | reviews & approves (or loops) |

## 🧰 Google stack used

ADK · agents-cli (`adk run` / `adk web`) · Gemini 2.5 **Pro + Flash** · built-in **Google Search**
tool · **Vertex AI** · ADK **Playground / Sessions / Traces** (`adk web`) · ADK **eval** ·
**Cloud Run** deploy.

## ▶️ Run it locally

```bash
pip install -r requirements.txt
cp .env.example .env          # fill in your GCP project + service-account path
adk web                       # open the Playground, pick "scout", watch the agents work
# or headless:
python eval/test_scout.py "Analyze: Notion"
```

## ✅ Evaluate

```bash
pytest -q                     # runs Scout on a known company, asserts all 5 sections + critic sign-off
```

## ☁️ Deploy to Cloud Run

```bash
adk deploy cloud_run --project=$GOOGLE_CLOUD_PROJECT --region=us-central1 \
  --service_name=scout --with_ui ./scout -- --allow-unauthenticated
```

**Live demo:** **https://scout-puxir3jrda-uc.a.run.app** (open `/dev-ui/`, pick `scout`, watch the agents work)

---

_Built with Google Antigravity. Agents on Google ADK; models on Gemini via Vertex AI._
