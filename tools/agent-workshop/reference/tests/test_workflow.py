"""Behavior checks for the runnable graph; standard-library unittest only."""
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from workflow import DEFAULT_CONFIG, build_graph, initial_state, validate_config, validate_draft
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.types import Command

CASES = json.loads((Path(__file__).with_name("cases.json")).read_text())


class WorkflowTests(unittest.TestCase):
    def test_scenarios(self):
        for case in CASES:
            with self.subTest(case=case["name"]):
                events = []
                graph = build_graph(InMemorySaver(), events.append)
                config = {"configurable": {"thread_id": case["name"]}, "recursion_limit": 30}
                result = graph.invoke(initial_state({**DEFAULT_CONFIG, **case["config"]}), config)
                if "__interrupt__" in result:
                    self.assertNotIn("finish", [event["node"] for event in events])
                    result = graph.invoke(Command(resume=case.get("decision", "approve")), config)
                self.assertEqual(result["status"], case["status"])
                self.assertEqual([event["node"] for event in events], case["path"])
                if result["status"] == "blocked":
                    self.assertEqual(result["result"], "")
                    self.assertTrue(result["reason"])

    def test_sqlite_resume_after_reopening(self):
        with tempfile.TemporaryDirectory() as directory:
            db = str(Path(directory) / "checkpoint.sqlite")
            config = {"configurable": {"thread_id": "durable"}}
            with SqliteSaver.from_conn_string(db) as saver:
                graph = build_graph(saver)
                paused = graph.invoke(initial_state(DEFAULT_CONFIG), config)
                self.assertIn("__interrupt__", paused)
            resumed_events = []
            with SqliteSaver.from_conn_string(db) as saver:
                graph = build_graph(saver, resumed_events.append)
                self.assertFalse(graph.get_state({"configurable": {"thread_id": "different"}}).values)
                result = graph.invoke(Command(resume="approve"), config)
                self.assertEqual(result["status"], "approved")
                self.assertEqual([e["node"] for e in resumed_events], ["review", "finish"])

    def test_runtime_validation(self):
        for patch in [{"query": ""}, {"max_revisions": -1}, {"top_k": True}, {"min_sources": 9}, {"fault": "unknown"}]:
            with self.subTest(patch=patch), self.assertRaises(ValueError):
                validate_config({**DEFAULT_CONFIG, **patch})
        self.assertTrue(validate_draft([{"text": "Claim", "source_id": "invented"}], [{"id": "real"}], 1))
        self.assertTrue(validate_draft([{"text": 5}], [], 1))

    def test_reviewer_decision_is_validated(self):
        graph = build_graph(InMemorySaver())
        config = {"configurable": {"thread_id": "invalid-decision"}}
        graph.invoke(initial_state(DEFAULT_CONFIG), config)
        with self.assertRaises(ValueError):
            graph.invoke(Command(resume="publish-everything"), config)


if __name__ == "__main__":
    unittest.main()
