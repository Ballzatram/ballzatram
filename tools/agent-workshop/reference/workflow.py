"""A runnable, inspectable LangGraph workflow. No model account or network calls.

Run: python workflow.py --config config.json --db workshop.sqlite --thread lesson-1
Resume after restarting: python workflow.py --db workshop.sqlite --thread lesson-1 --decision approve
"""
from __future__ import annotations

import argparse
from copy import deepcopy
import json
from pathlib import Path
import re
import time
from typing import Callable, Literal, TypedDict
from uuid import uuid4

from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.graph import StateGraph, START, END
from langgraph.types import Command, interrupt

HERE = Path(__file__).resolve().parent
SOURCES = json.loads((HERE / "sources.json").read_text())
DEFAULT_CONFIG = json.loads((HERE / "config.json").read_text())


class Config(TypedDict):
    query: str
    top_k: int
    min_sources: int
    max_revisions: int
    fault: Literal["none", "once", "always"]


class Claim(TypedDict):
    text: str
    source_id: str


class State(TypedDict):
    query: str
    config: Config
    plan: list[str]
    evidence: list[dict]
    claims: list[Claim]
    issues: list[str]
    revisions: int
    approved: bool
    status: str
    result: str
    reason: str


def validate_config(raw: dict) -> Config:
    if not isinstance(raw, dict) or not isinstance(raw.get("query"), str) or not raw["query"].strip() or len(raw["query"]) > 500:
        raise ValueError("Enter a question between 1 and 500 characters.")
    for key, low, high in [("top_k", 1, 4), ("min_sources", 1, 4), ("max_revisions", 0, 3)]:
        if type(raw.get(key)) is not int or not low <= raw[key] <= high:
            raise ValueError(f"{key} must be an integer from {low} to {high}.")
    if raw.get("fault") not in ("none", "once", "always"):
        raise ValueError("Unknown fault setting.")
    return {"query": raw["query"].strip(), **{key: raw[key] for key in ("top_k", "min_sources", "max_revisions", "fault")}}


def initial_state(config: Config) -> State:
    checked = validate_config(config)
    return dict(query=checked["query"], config=checked, plan=[], evidence=[], claims=[], issues=[],
                revisions=0, approved=False, status="ready", result="", reason="")


def retrieve(query: str, top_k: int) -> list[dict]:
    """A real deterministic tool: keyword retrieval over four bundled notes."""
    words = set(re.findall(r"[a-z0-9]+", query.lower()))
    scored = [(len(words.intersection(doc["keywords"].split())), index, doc) for index, doc in enumerate(SOURCES)]
    return [deepcopy(doc) for score, _, doc in sorted(scored, key=lambda item: (-item[0], item[1])) if score > 0][:top_k]


def validate_draft(claims: list[Claim], evidence: list[dict], min_sources: int) -> list[str]:
    """Schema and citation-membership checks, NOT proof that a claim is true."""
    issues, cited = [], set()
    known = {item["id"] for item in evidence}
    if not isinstance(claims, list) or not claims:
        return ["The draft has no claims."]
    for i, claim in enumerate(claims, 1):
        if (not isinstance(claim, dict) or not isinstance(claim.get("text"), str)
                or not claim["text"].strip() or len(claim["text"]) > 2000
                or not isinstance(claim.get("source_id"), str)):
            issues.append(f"Claim {i} does not match the output schema.")
            continue
        if claim["source_id"] not in known:
            issues.append(f"Claim {i} cites an unavailable source: {claim['source_id']}.")
        else:
            cited.add(claim["source_id"])
    if len(cited) < min_sources:
        issues.append(f"Need {min_sources} distinct sources; found {len(cited)}.")
    return issues


def practice_writer(state: State, is_revision: bool = False) -> list[Claim]:
    """Model substitute for repeatable learning/evals. It copies selected notes.

    A real writer must use ONLY the selected evidence and return this same schema.
    It must not execute tools, alter approvals, or decide its own repair budget.
    """
    claims = [dict(text=doc["text"], source_id=doc["id"]) for doc in state["evidence"]]
    if claims and (state["config"]["fault"] == "always" or (not is_revision and state["config"]["fault"] == "once")):
        claims[0]["source_id"] = "missing"
    return claims


def route_after_check(state: State) -> str:
    if not state["issues"]:
        return "review"
    if state["revisions"] >= state["config"]["max_revisions"]:
        return "blocked"
    return "revise"


def build_graph(checkpointer, on_event: Callable | None = None, writer: Callable = practice_writer):
    """Inject a writer here; keep orchestration, validation, and approvals in code."""
    def traced(name, fn):
        def run(state):
            before, started = deepcopy(state), time.perf_counter()
            patch = fn(state)  # Do not catch LangGraph's interrupt exception here.
            if on_event:
                on_event(dict(node=name, before=before, patch=deepcopy(patch), after={**before, **deepcopy(patch)},
                              duration_ms=round((time.perf_counter() - started) * 1000, 2)))
            return patch
        return run

    def intake(state):
        return {"plan": ["Search bundled notes", "Draft cited claims", "Validate and repair within budget", "Ask for human review"], "status": "running"}

    def search(state):
        evidence = retrieve(state["query"], state["config"]["top_k"])
        return {"evidence": evidence, "reason": "" if evidence else "No bundled note matched. Try a question about agents, state, or human review."}

    def draft(state):
        return {"claims": writer(state, False)}

    def check(state):
        return {"issues": validate_draft(state["claims"], state["evidence"], state["config"]["min_sources"])}

    def revise(state):
        return {"claims": writer(state, True), "revisions": state["revisions"] + 1}

    def review(state):
        # On resume this node starts again. No external side effects before this call.
        decision = interrupt({"claims": state["claims"], "instruction": "Approve or reject; neither choice publishes anything."})
        if decision not in ("approve", "reject"):
            raise ValueError("Expected approve or reject.")
        return {"approved": decision == "approve"}

    def finish(state):
        return {"status": "approved" if state["approved"] else "rejected",
                "result": "\n\n".join(f"{c['text']} [{c['source_id']}]" for c in state["claims"]) if state["approved"] else "Draft rejected. Nothing was published."}

    def blocked(state):
        return {"status": "blocked", "reason": f"Repair budget exhausted. {' '.join(state['issues'])}" if state["evidence"] else state["reason"]}

    builder = StateGraph(State)
    for name, fn in [("intake", intake), ("retrieve", search), ("draft", draft), ("check", check),
                     ("revise", revise), ("review", review), ("finish", finish), ("blocked", blocked)]:
        builder.add_node(name, traced(name, fn))
    builder.add_edge(START, "intake")
    builder.add_edge("intake", "retrieve")
    builder.add_conditional_edges("retrieve", lambda s: "draft" if s["evidence"] else "blocked", ["draft", "blocked"])
    builder.add_edge("draft", "check")
    builder.add_conditional_edges("check", route_after_check, ["review", "revise", "blocked"])
    builder.add_edge("revise", "check")
    builder.add_edge("review", "finish")
    builder.add_edge("finish", END)
    builder.add_edge("blocked", END)
    return builder.compile(checkpointer=checkpointer)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=HERE / "config.json")
    parser.add_argument("--db", default="workshop.sqlite")
    parser.add_argument("--thread", default=None)
    parser.add_argument("--decision", choices=["approve", "reject"])
    args = parser.parse_args()
    if args.decision and not args.thread:
        parser.error("Resuming requires --thread with the original thread ID.")
    thread = args.thread or str(uuid4())
    run_config = {"configurable": {"thread_id": thread}, "recursion_limit": 30}
    print(f"Thread: {thread}. Mode: deterministic practice; 0 model calls.")
    with SqliteSaver.from_conn_string(args.db) as saver:
        graph = build_graph(saver, on_event=lambda event: print(json.dumps(event)))
        existing = graph.get_state(run_config)
        if args.decision:
            if not any(task.interrupts for task in existing.tasks):
                parser.error("This thread has no pending human review. Check the database and thread ID.")
            result = graph.invoke(Command(resume=args.decision), run_config)
        else:
            if existing.values:
                parser.error("This thread already exists. Resume its review or use a new thread ID.")
            result = graph.invoke(initial_state(json.loads(args.config.read_text())), run_config)
        if "__interrupt__" in result:
            print("PAUSED for human review. Re-run with the same --db and --thread plus --decision approve or reject.")
        else:
            print(json.dumps({key: result[key] for key in ("status", "result", "reason", "revisions")}, indent=2))


if __name__ == "__main__":
    main()
