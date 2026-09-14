import sys
from pathlib import Path
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from wait_for_branch_pages import pending_branch_builds


class BranchPagesTests(unittest.TestCase):
    def test_older_and_current_branch_deployments_both_block(self):
        build={'id':1,'head_sha':'current','event':'dynamic',
               'name':'pages build and deployment','status':'queued'}
        previous={**build,'id':2,'head_sha':'previous','status':'in_progress'}
        runs=[build, previous,
              {**build,'id':3,'status':'completed'},
              {**build,'id':4,'event':'push'}]
        self.assertEqual(pending_branch_builds(runs),[build,previous])
        build['status']='in_progress'
        self.assertEqual(pending_branch_builds(runs),[build,previous])
        build['status']='completed'
        self.assertEqual(pending_branch_builds(runs),[previous])
        previous['status']='completed'
        self.assertEqual(pending_branch_builds(runs),[])
