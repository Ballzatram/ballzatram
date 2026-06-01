from __future__ import annotations

import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4


from app.models.schemas import AgentMessage, AgentProcess

MODEL = os.getenv("OPENAI_AGENT_MODEL", "gpt-4.1-mini")

TOOL_OUTPUT_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "summary": {"type": "string"},
        "cards": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "title": {"type": "string"},
                    "type": {"type": "string", "enum": ["opportunity", "risk", "recommendation", "data", "next_step"]},
                    "content": {"type": "string"},
                    "confidence": {"type": "string", "enum": ["low", "medium", "high"]},
                    "assumptions": {"type": "array", "items": {"type": "string"}},
                    "sources": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "properties": {
                                "title": {"type": "string"},
                                "url": {"type": "string"},
                                "status": {"type": "string", "enum": ["live", "fallback", "missing", "unknown"]},
                                "description": {"type": "string"},
                            },
                            "required": ["title", "url", "status", "description"],
                        },
                    },
                    "actions": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "properties": {
                                "label": {"type": "string"},
                                "description": {"type": "string"},
                                "href": {"type": "string"},
                            },
                            "required": ["label", "description", "href"],
                        },
                    },
                },
                "required": ["title", "type", "content", "confidence", "assumptions", "sources", "actions"],
            },
        },
        "risks": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "title": {"type": "string"},
                    "severity": {"type": "string", "enum": ["low", "medium", "high"]},
                    "content": {"type": "string"},
                    "mitigation": {"type": "string"},
                    "confidence": {"type": "string", "enum": ["low", "medium", "high"]},
                },
                "required": ["title", "severity", "content", "mitigation", "confidence"],
            },
        },
        "missingData": {"type": "array", "items": {"type": "string"}},
        "recommendedNextSteps": {"type": "array", "items": {"type": "string"}},
        "sources": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "title": {"type": "string"},
                    "url": {"type": "string"},
                    "status": {"type": "string", "enum": ["live", "fallback", "missing", "unknown"]},
                    "description": {"type": "string"},
                },
                "required": ["title", "url", "status", "description"],
            },
        },
        "confidence": {"type": "string", "enum": ["low", "medium", "high"]},
        "status": {"type": "string", "enum": ["empty", "complete", "partial_success", "error"]},
    },
    "required": ["summary", "cards", "risks", "missingData", "recommendedNextSteps", "sources", "confidence", "status"],
}

PROCESS_REGISTRY: Dict[str, List[AgentProcess]] = {
    "quant-library": [
        AgentProcess(
            id="market-research-workspace",
            title="Build a Quant Library research workspace",
            outcome="A card-based market research workspace with assumptions, risks, sources, and next steps.",
            starter_prompt="Guide me from a market question to an explainable Quant Library workspace.",
            steps=["Clarify the decision and horizon", "Map data, assumptions, and missing evidence", "Produce recommendation, risk, and next-step cards"],
        )
    ],
    "macro-board": [
        AgentProcess(
            id="market-research-workspace",
            title="Build a structured market research workspace",
            outcome="A card-based decision workspace with assumptions, risks, sources, and next steps.",
            starter_prompt="Guide me from a market question to a structured research workspace.",
            steps=["Clarify the decision and horizon", "Map data, assumptions, and missing evidence", "Produce recommendation, risk, and next-step cards"],
        )
    ],
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
    "econ-arcade": [
        AgentProcess(
            id="learning-path-selector",
            title="Choose an economics learning path",
            outcome="A recommended sequence of playable modules with concepts, difficulty, and reflection prompts.",
            starter_prompt="Help me choose which Econ Arcade module to play based on what I want to learn.",
            steps=["Identify the learning goal", "Match the goal to a playable module", "Create a short debrief and retry plan"],
        )
    ],
    "econ-arcade/supply-demand-lab": [
        AgentProcess(
            id="market-lab-coach",
            title="Coach a supply and demand experiment",
            outcome="A clear experiment plan, expected market movement, caveats, and replay prompt.",
            starter_prompt="Help me design a supply and demand experiment and interpret the result.",
            steps=["Name the scenario and lever", "Predict price, quantity, surplus, and stability effects", "Debrief the outcome and suggest a counterfactual"],
        )
    ],
    "econ-arcade/invisible-hands": [
        AgentProcess(
            id="systems-policy-coach",
            title="Guide a systems-policy decision",
            outcome="A structured policy brief with affected actors, transmission channels, risks, and next turn focus.",
            starter_prompt="Help me reason through the next policy move in Invisible Hands.",
            steps=["Read the pressure dashboard", "Trace who gains, who loses, and where stress moves", "Recommend a next-turn watch item"],
        )
    ],
    "invisible-hands": [
        AgentProcess(
            id="systems-policy-coach",
            title="Guide a systems-policy decision",
            outcome="A structured policy brief with affected actors, transmission channels, risks, and next turn focus.",
            starter_prompt="Help me reason through the next policy move in Invisible Hands.",
            steps=["Read the pressure dashboard", "Trace who gains, who loses, and where stress moves", "Recommend a next-turn watch item"],
        )
    ],
}

_HISTORY: Dict[str, List[AgentMessage]] = {}


def _history_path() -> Path:
    default_path = Path(tempfile.gettempdir()) / "macroboard_agent_history.json"
    return Path(os.getenv("AGENT_HISTORY_PATH", str(default_path)))


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


def build_instructions(page_id: str, process: AgentProcess) -> str:
    steps = "\n".join(f"- {step}" for step in process.steps)
    return (
        "You are Ballzatram's AI workflow guide, a specialized assistant for the current tool page. "
        "Help users accomplish the selected workflow without pretending unavailable data or capabilities exist. "
        "Be concise, practical, and cautious where finance, research, or policy decisions are involved. "
        "Never claim certainty; surface assumptions, risks, and next checks. "
        "Return output that can render as product UI cards, not unstructured prose. "
        f"Current page: {page_id}. Workflow: {process.title}. Desired end result: {process.outcome}. "
        f"Workflow steps:\n{steps}"
    )


def _fallback_answer(page_id: str, process: AgentProcess, message: str) -> str:
    return (
        f"I can guide the **{process.title}** workflow for the {page_id} page. "
        f"End result: {process.outcome}\n\n"
        f"Based on your request - {message!r} - start with: "
        f"1) {process.steps[0]}, 2) {process.steps[1]}, 3) {process.steps[2]}. "
        "Configure OPENAI_API_KEY to replace this deterministic development response with a live OpenAI response."
    )


def _fallback_output(page_id: str, process: AgentProcess, message: str) -> dict[str, Any]:
    return {
        "summary": f"I can guide the {process.title} workflow for the {page_id} page.",
        "cards": [
            {
                "title": "Clarify the decision",
                "type": "next_step",
                "content": f"Start by turning {message!r} into a concrete decision, owner, and horizon.",
                "confidence": "high",
                "assumptions": ["The user wants workflow guidance before a final output."],
                "sources": [],
                "actions": [{"label": process.steps[0], "description": "Complete this before asking for final recommendations.", "href": ""}],
            },
            {
                "title": "Evidence before recommendation",
                "type": "recommendation",
                "content": f"Use the workflow steps to build {process.outcome.lower()} rather than accepting a generic answer.",
                "confidence": "medium",
                "assumptions": ["Live OpenAI response generation may be disabled in development."],
                "sources": [],
                "actions": [{"label": process.steps[1], "description": "Use the page data and assumptions as evidence.", "href": ""}],
            },
        ],
        "risks": [
            {
                "title": "Generic prompt risk",
                "severity": "medium",
                "content": "Without a ticker, portfolio, horizon, or decision context, the agent can only provide broad process guidance.",
                "mitigation": "Add the missing context in the next message.",
                "confidence": "high",
            }
        ],
        "missingData": ["Ticker or portfolio", "Decision horizon", "Risk constraint"],
        "recommendedNextSteps": process.steps[:3],
        "sources": [],
        "confidence": "medium",
        "status": "partial_success",
    }


def _coerce_tool_output(raw: Any, page_id: str, process: AgentProcess, message: str) -> dict[str, Any]:
    if isinstance(raw, dict) and "summary" in raw and "cards" in raw:
        return raw
    fallback = _fallback_output(page_id, process, message)
    fallback["summary"] = str(raw) if raw else fallback["summary"]
    fallback["status"] = "partial_success"
    return fallback


def chat(page_id: str, process_id: Optional[str], message: str, conversation_id: Optional[str]) -> dict:
    # TODO: Add plan and entitlement checks here after paid-tool packaging exists.
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
        try:
            # TODO: Stream lifecycle events to the UI after partial card rendering is supported.
            response = client.responses.create(
                model=MODEL,
                instructions=build_instructions(normalized_page, process),
                input="\n".join(transcript),
                text={
                    "format": {
                        "type": "json_schema",
                        "name": "quant_library_tool_output",
                        "strict": True,
                        "schema": TOOL_OUTPUT_JSON_SCHEMA,
                    }
                },
            )
            structured_output = _coerce_tool_output(json.loads(response.output_text), normalized_page, process, message)
        except Exception as exc:
            structured_output = _fallback_output(normalized_page, process, message)
            structured_output["summary"] = f"The live model response could not be rendered as structured cards: {exc}"
            structured_output["status"] = "partial_success"
    else:
        structured_output = _fallback_output(normalized_page, process, message)

    answer = structured_output["summary"]
    history.append(AgentMessage(role="assistant", content=answer, created_at=datetime.now(timezone.utc)))
    _persist_history()
    return {
        "conversation_id": cid,
        "page_id": normalized_page,
        "process_id": process.id,
        "answer": answer,
        "structured_output": structured_output,
        "history": history,
    }


def get_history(conversation_id: str) -> List[AgentMessage]:
    _load_history()
    return _HISTORY.get(conversation_id, [])
