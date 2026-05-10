from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional
from uuid import uuid4


from app.models.schemas import AgentMessage, AgentProcess

MODEL = os.getenv("OPENAI_AGENT_MODEL", "gpt-4.1-mini")

PROCESS_REGISTRY: Dict[str, List[AgentProcess]] = {
    "dashboard": [
        AgentProcess(
            id="executive-brief",
            title="Create an executive macro brief",
            outcome="A board-ready summary of signals, risks, and next actions.",
            starter_prompt="Turn the dashboard signals into a concise executive brief with priorities.",
            steps=["Read current KPIs", "Identify conflicting signals", "Draft decisions and watch items"],
        )
    ],
    "stock": [
        AgentProcess(
            id="stock-driver-analysis",
            title="Explain a stock's macro drivers",
            outcome="A ranked explanation of macro factors and follow-up tests for the selected stock.",
            starter_prompt="Help me interpret this stock analysis and decide which macro driver matters most.",
            steps=["Validate selected factors", "Interpret coefficients and feature importance", "Recommend robustness checks"],
        )
    ],
    "portfolio": [
        AgentProcess(
            id="portfolio-risk-plan",
            title="Build a portfolio risk plan",
            outcome="A practical rebalance and hedge checklist tied to current factor exposures.",
            starter_prompt="Guide me through reducing portfolio macro risk without overreacting.",
            steps=["Map holdings to macro shocks", "Prioritize exposures", "Draft hedges and rebalance actions"],
        )
    ],
    "scenario": [
        AgentProcess(
            id="scenario-design",
            title="Design a stress scenario",
            outcome="A complete scenario with shocks, assumptions, and expected portfolio impact.",
            starter_prompt="Help me create a realistic stress scenario and translate it into shocks.",
            steps=["Choose a narrative", "Quantify factor shocks", "Interpret P&L and caveats"],
        )
    ],
    "event-study": [
        AgentProcess(
            id="event-study-readout",
            title="Turn event results into a readout",
            outcome="A clear event-study conclusion with CAR interpretation and caveats.",
            starter_prompt="Help me explain whether this event had a meaningful market impact.",
            steps=["Check event window", "Interpret AAR/CAR", "Draft conclusion and limitations"],
        )
    ],
    "model-compare": [
        AgentProcess(
            id="model-selection",
            title="Select a defensible model",
            outcome="A model choice rationale that balances fit, explainability, and robustness.",
            starter_prompt="Help me choose which model result to trust and how to justify it.",
            steps=["Compare fit metrics", "Evaluate stability", "Document model governance notes"],
        )
    ],
    "classroom": [
        AgentProcess(
            id="teach-this-page",
            title="Learn the method",
            outcome="A plain-English lesson and quiz for the current analytics method.",
            starter_prompt="Teach me the concept on this page and check my understanding.",
            steps=["Explain intuition", "Walk through a simple example", "Ask a short comprehension check"],
        )
    ],
    "reports": [
        AgentProcess(
            id="report-writer",
            title="Draft an investment report",
            outcome="A polished report section with findings, methodology, and caveats.",
            starter_prompt="Help me turn these findings into an investment report section.",
            steps=["Organize findings", "Write executive language", "Add caveats and next steps"],
        )
    ],
}

_HISTORY: Dict[str, List[AgentMessage]] = {}
_PAID_SESSIONS: set[str] = set()


def _history_path() -> Path:
    return Path(os.getenv("AGENT_HISTORY_PATH", "/tmp/macroboard_agent_history.json"))


def _load_history() -> None:
    path = _history_path()
    if _HISTORY or not path.exists():
        return
    raw = json.loads(path.read_text())
    for conversation_id, messages in raw.items():
        _HISTORY[conversation_id] = [AgentMessage(**message) for message in messages]


def _persist_history() -> None:
    path = _history_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    serializable = {cid: [message.model_dump(mode="json") for message in messages] for cid, messages in _HISTORY.items()}
    path.write_text(json.dumps(serializable, indent=2))


def normalize_page_id(page_id: str) -> str:
    page = page_id.strip("/") or "dashboard"
    return page if page in PROCESS_REGISTRY else "dashboard"


def default_process(page_id: str) -> AgentProcess:
    return PROCESS_REGISTRY[normalize_page_id(page_id)][0]


def has_paid_access(access_token: Optional[str] = None) -> tuple[bool, str]:
    if os.getenv("AGENT_REQUIRE_PAYMENT", "false").lower() != "true":
        return True, "payment not required in this environment"
    dev_access_code = os.getenv("AGENT_DEV_ACCESS_CODE")
    if access_token and dev_access_code and access_token == dev_access_code:
        return True, "developer access code accepted"
    if access_token and access_token in _PAID_SESSIONS:
        return True, "verified Stripe checkout session"
    return False, "paid access required"


def remember_paid_session(session_id: str) -> None:
    _PAID_SESSIONS.add(session_id)


def build_instructions(page_id: str, process: AgentProcess) -> str:
    steps = "\n".join(f"- {step}" for step in process.steps)
    return (
        "You are MacroBoard Agent, a specialized macro/portfolio analytics copilot. "
        "Help users accomplish the selected workflow on the current page. Be concise, practical, and financially cautious. "
        "Never claim investment certainty; surface assumptions, risks, and next checks. "
        f"Current page: {page_id}. Workflow: {process.title}. Desired end result: {process.outcome}. "
        f"Workflow steps:\n{steps}"
    )


def _fallback_answer(page_id: str, process: AgentProcess, message: str) -> str:
    return (
        f"I can guide the **{process.title}** workflow for the {page_id} page. "
        f"End result: {process.outcome}\n\n"
        f"Based on your request — {message!r} — start with: "
        f"1) {process.steps[0]}, 2) {process.steps[1]}, 3) {process.steps[2]}. "
        "Configure OPENAI_API_KEY to replace this deterministic development response with a live OpenAI response."
    )


def chat(page_id: str, process_id: Optional[str], message: str, conversation_id: Optional[str], access_token: Optional[str]) -> dict:
    paid, reason = has_paid_access(access_token)
    if not paid:
        raise PermissionError(reason)

    _load_history()
    normalized_page = normalize_page_id(page_id)
    process = next((p for p in PROCESS_REGISTRY[normalized_page] if p.id == process_id), default_process(normalized_page))
    cid = conversation_id or f"conv_{uuid4().hex}"
    history = _HISTORY.setdefault(cid, [])
    history.append(AgentMessage(role="user", content=message, created_at=datetime.now(timezone.utc)))

    if os.getenv("OPENAI_API_KEY"):
        from openai import OpenAI

        client = OpenAI()
        transcript = [f"{m.role}: {m.content}" for m in history[-10:]]
        response = client.responses.create(
            model=MODEL,
            instructions=build_instructions(normalized_page, process),
            input="\n".join(transcript),
        )
        answer = response.output_text
    else:
        answer = _fallback_answer(normalized_page, process, message)

    history.append(AgentMessage(role="assistant", content=answer, created_at=datetime.now(timezone.utc)))
    _persist_history()
    return {
        "conversation_id": cid,
        "page_id": normalized_page,
        "process_id": process.id,
        "answer": answer,
        "history": history,
        "paid_access": paid,
    }


def get_history(conversation_id: str) -> List[AgentMessage]:
    _load_history()
    return _HISTORY.get(conversation_id, [])


def create_checkout_session(success_url: str, cancel_url: str, customer_email: Optional[str], page_id: str) -> dict:
    stripe_key = os.getenv("STRIPE_SECRET_KEY")
    stripe_price_id = os.getenv("STRIPE_AGENT_PRICE_ID")
    if not stripe_key or not stripe_price_id:
        raise RuntimeError("Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_AGENT_PRICE_ID.")
    import stripe

    stripe.api_key = stripe_key
    session = stripe.checkout.Session.create(
        mode="payment",
        line_items=[{"price": stripe_price_id, "quantity": 1}],
        success_url=success_url,
        cancel_url=cancel_url,
        customer_email=customer_email,
        metadata={"feature": "macroboard-agent", "page_id": normalize_page_id(page_id)},
    )
    return {"checkout_url": session.url, "session_id": session.id}


def verify_checkout_session(session_id: Optional[str], access_token: Optional[str]) -> tuple[bool, str]:
    paid, reason = has_paid_access(access_token)
    if paid:
        return paid, reason
    if not session_id:
        return False, "missing Stripe session_id"
    stripe_key = os.getenv("STRIPE_SECRET_KEY")
    if not stripe_key:
        return False, "Stripe is not configured"
    import stripe

    stripe.api_key = stripe_key
    session = stripe.checkout.Session.retrieve(session_id)
    if session.payment_status == "paid":
        remember_paid_session(session_id)
        return True, "Stripe payment verified"
    return False, f"Stripe payment status is {session.payment_status}"
