# Agent Workshop: build it in Python

A small LangGraph reference implementation for [Osiris Agent Workshop](https://dgallemore.com/tools/agent-workshop/). It executes real retrieval, validation, conditional routing, bounded repair, and human review. The writer is a **deterministic practice adapter**, not an LLM. It copies selected notes so experiments are repeatable and make zero model calls.

## Run

Use Python 3.12. Unzip the starter and open a terminal in this folder.

```sh
python -m venv .venv
```

Activate it on macOS/Linux:

```sh
source .venv/bin/activate
```

Or on Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Then:

```sh
python -m pip install -r requirements.txt
python workflow.py --config config.json --thread first-run
```

Inspect the JSON trace. The first draft deliberately breaks a citation. The validator catches it, the writer repairs it, and the graph pauses before human approval. `workshop.sqlite` holds the checkpoint locally.

In a new process, from the same directory:

```sh
python workflow.py --thread first-run --decision approve
```

Use `reject` to reject instead. Both decisions end the practice run without publishing or sending anything. Use a new thread ID for each new run; use `--db /path/to/workshop.sqlite` if the database is elsewhere. Resuming requires the original database and thread ID. A missing or already-finished thread produces an error.

## What to read, in order

1. `Config`, `Claim`, and `State`: data contracts. Type hints document shape; runtime checks enforce it.
2. `retrieve`: keyword overlap over `sources.json`, not web search. Unknown topics return no evidence.
3. `practice_writer`: the replaceable intelligence boundary. Outputs are structured claims.
4. `validate_draft`: schema and source-membership checks, not factual entailment or completeness.
5. `route_after_check`: pass, repair, or stop based on evidence and a strict budget.
6. `build_graph`: nodes, edges, trace capture, and human interruption.
7. `main`: SQLite checkpoint ownership within this local CLI, new-run versus resume handling.

Run the included evaluations:

```sh
python -m unittest discover -s tests -v
```

Seven fixtures check successful completion, citation repair, exhausted repairs, missing evidence, insufficient evidence, rejection, and a zero repair budget. Other tests reopen a SQLite checkpoint, verify different thread IDs do not collide, reject malformed data, and reject invalid review decisions.

## Experiment

Download `config.json` from the browser workshop and place it next to `workflow.py`. Configuration controls question, retrieved-note limit, minimum distinct citations, maximum revisions, and injected citation failure. The settings intentionally permit a minimum greater than retrieval capacity so you can explore an unsatisfiable requirement.

Useful exercise: request four citations but retrieve one note. Repairing the draft cannot supply missing evidence. Add a conditional edge back to retrieval with a **separate** retrieval budget. Then add a test proving the combined loops stop.

The notes are short teaching paraphrases of linked LangGraph documentation, reviewed October 8, 2026. They are bundled input, not live fetched material. Arbitrary source text must remain data rather than instructions.

## Add a model deliberately

Pass a callable as `build_graph(checkpointer, writer=your_writer)`. It receives `(state, is_revision)` and returns `list[Claim]`. The selected evidence and `state['issues']` are available for grounded drafting and repair. Preserve the same validator and human gate when changing this callable.

Before enabling a network writer, implement the actual authorized provider contract, assemble system instructions separately from evidence, validate structured output, enforce input/output limits and timeouts, count attempts, and handle cancellation. Model-generated decisions must not change budgets, grant approvals, or execute arbitrary code. Transport retries are a different mechanism from this example's content repairs.

No live provider adapter, arbitrary-code server, or API-funded fallback is included. Osiris's visitor-subscription integration is separately gated by hosted approval, deployment, consent, and per-feature server authorization. This starter is a functioning workflow implementation, not evidence that subscription inference is live.

## Browser versus Python

The browser runs LangGraph JavaScript with static node breakpoints and `updateState()` for the review decision. Checkpoints exist only in that page's memory and disappear on refresh. Python runs LangGraph with `interrupt()`/`Command(resume=...)` and SQLite checkpoints that survive restarts. Both implementations use the same source notes, configuration meanings, routing, and evaluation scenarios. Their runtime-specific state includes a browser-only `decision` field.

An interrupted Python node starts again when resumed. Never put a non-idempotent side effect before `interrupt()`. A production service also needs authentication, per-user thread ownership, rate/concurrency/usage limits, cancellation, approved tools, protected credentials, and idempotent external effects. Thread IDs alone provide no security. SQLite is for this local lesson; shared production storage and deployment are separate engineering work.

LangGraph is not required for every AI application. Plain functions are preferable for a short fixed sequence. Its value here is exposing branches, state, bounded loops, and resumable human review. No managed LangGraph hosting or DigitalOcean account is required for this local program.

## Sources

- [LangGraph overview](https://docs.langchain.com/oss/python/langgraph/overview)
- [Workflows and agents](https://docs.langchain.com/oss/python/langgraph/workflows-agents)
- [Graph API](https://docs.langchain.com/oss/python/langgraph/graph-api)
- [Persistence](https://docs.langchain.com/oss/python/langgraph/persistence)
- [Interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts)
- [Hosted ChatGPT access](https://developers.openai.com/siwc/request-client-id)

The repository has no general software license selected. This starter does not introduce a new license; dependency licenses remain with their respective authors.
