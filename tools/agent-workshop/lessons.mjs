export const LESSONS = {
  intake: {
    title: 'Start with a contract.',
    description: 'Turn the request into explicit shared state before doing any work.',
    why: 'The graph is a program, not a group chat. The goal, evidence limits, repair budget, and eventual result need names and types so every step knows what it can read or change.',
    try: 'Step once. Open State, then compare the input with Fields changed. The goal stays put; the node adds a plan and marks the run as running.',
    contract: 'Reads: query + config. Writes: plan + status. The plan is fixed here; a planning model would be a separate design choice.',
    code: 'def intake(state):\n    return {\n        "plan": ["Search bundled notes",\n                 "Draft cited claims",\n                 "Validate and repair within budget",\n                 "Ask for human review"],\n        "status": "running",\n    }'
  },
  retrieve: {
    title: 'Tools turn a goal into evidence.',
    description: 'Search a small, known corpus with an ordinary function.',
    why: 'Retrieval is a tool, not necessarily an agent. Here it ranks four notes by keyword overlap. The result contains source IDs, text, and provenance. A model should never invent the result of a tool it did not call.',
    try: 'Reset and choose Missing evidence. Nothing matches, so the graph stops before drafting. Then try “human review” and inspect which note is selected.',
    contract: 'Reads: query + top_k. Writes: evidence + reason. Empty evidence takes the blocked branch. URLs identify the original documentation; this tool does not fetch those pages.',
    code: 'def search(state):\n    evidence = retrieve(\n        state["query"], state["config"]["top_k"]\n    )\n    return {"evidence": evidence,\n            "reason": "" if evidence else\n                "No bundled note matched. Try a question about agents, state, or human review."}'
  },
  draft: {
    title: 'Give the writer a bounded job.',
    description: 'Produce structured claims from the selected evidence.',
    why: 'In a live agent this is a model boundary: instructions + selected context in, structured output out. Here a deterministic writer copies evidence text. It makes failures reproducible and costs no tokens.',
    try: 'Use Catch a broken citation. The first claim points to “missing”. The writer is allowed to be wrong; the next node must catch it.',
    contract: 'Reads: evidence + fault setting. Writes: claims, each with text and source_id. It cannot approve its own draft or change the repair budget.',
    code: 'def draft(state):\n    return {"claims": writer(state, False)}\n\n# The replaceable writer has this signature:\n# writer(state, is_revision) -> list[Claim]\n# Claim = {"text": str, "source_id": str}'
  },
  check: {
    title: 'Make the next step a decision.',
    description: 'Validate the draft, then take a conditional edge.',
    why: 'Code checks the output schema and whether citations refer to retrieved notes. The router sends a valid draft to review, an invalid one to repair, or an exhausted run to a stop. A known source ID does not prove factual support.',
    try: 'Set minimum citations to 4 and retrieval to 1. Extra writing cannot create the missing evidence. Watch the run stop rather than quietly lower the standard.',
    contract: 'Reads: claims + evidence + minimum citations. Writes: issues. The router reads issues, revisions, and the budget; it does not call a model.',
    code: 'def route_after_check(state):\n    if not state["issues"]:\n        return "review"\n    if state["revisions"] >= state["config"]["max_revisions"]:\n        return "blocked"\n    return "revise"'
  },
  revise: {
    title: 'Repair with a stopping rule.',
    description: 'Try a better draft, then validate it again.',
    why: 'A production writer would receive the validation errors along with the evidence. Our practice writer restores the correct citation unless the experiment deliberately breaks every draft. Every attempt increments the counter.',
    try: 'Choose Exhaust the repair budget. Two repairs are allowed by default. The graph stops after the second still fails; it never loops forever.',
    contract: 'Reads: claims + evidence + issues + config. Writes: new claims + revisions. A content repair is different from retrying a failed HTTP request.',
    code: 'def revise(state):\n    return {\n        "claims": writer(state, True),\n        "revisions": state["revisions"] + 1,\n    }\n\nbuilder.add_edge("revise", "check")'
  },
  review: {
    title: 'A person owns the decision.',
    description: 'Pause with the draft intact, then approve or reject.',
    why: 'Passing mechanical checks is not enough. The browser stops at a node boundary; your decision updates checkpointed state. The Python implementation uses a dynamic interrupt and a persistent database.',
    try: 'Run until review, inspect the claims, then reject them. Compare that final state with an approved run. Neither action publishes anything.',
    contract: 'Reads: claims. Writes: approved after an explicit decision. Browser memory clears on reload; Python’s SQLite checkpoint survives a process restart.',
    code: 'def review(state):\n    decision = interrupt({\n        "claims": state["claims"],\n        "instruction": "Approve or reject; neither choice publishes anything."\n    })\n    if decision not in ("approve", "reject"):\n        raise ValueError("Expected approve or reject.")\n    return {"approved": decision == "approve"}\n\n# Same thread_id and checkpoint database:\n# graph.invoke(Command(resume="approve"), config)'
  },
  finish: {
    title: 'Return a result with a clear status.',
    description: 'An approved draft and a rejected draft are different outcomes.',
    why: 'The application needs structured completion, not a reassuring paragraph. A downstream tool can check status before doing anything. A real publish action would need its own authorization and idempotency controls.',
    try: 'Download the trace. Compare node inputs and patches; you can reconstruct what happened without guessing from the final answer.',
    contract: 'Reads: approved + claims. Writes: status + result. Both approve and reject end the run. No email, database write, or public post occurs.',
    code: 'def finish(state):\n    return {\n        "status": "approved" if state["approved"] else "rejected",\n        "result": "\\n\\n".join(\n            f"{c[\'text\']} [{c[\'source_id\']}]"\n            for c in state["claims"]\n        ) if state["approved"] else\n            "Draft rejected. Nothing was published.",\n    }'
  },
  blocked: {
    title: 'Stopping can be the correct answer.',
    description: 'Make insufficient evidence and exhausted budgets visible.',
    why: 'An orchestration system should fail clearly instead of manufacturing a successful result. The stop reason lets a person fix retrieval, adjust a requirement, or investigate the writer.',
    try: 'Compare Missing evidence with Exhaust the repair budget. Both stop, but at different stages and for different reasons.',
    contract: 'Reads: evidence + issues + reason. Writes: status=blocked + reason. The final result stays empty, so failure cannot masquerade as an approved answer.',
    code: 'builder.add_conditional_edges(\n    "retrieve",\n    lambda s: "draft" if s["evidence"] else "blocked",\n    ["draft", "blocked"],\n)\nbuilder.add_edge("blocked", END)'
  }
};
