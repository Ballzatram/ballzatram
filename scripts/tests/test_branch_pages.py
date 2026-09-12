import sys
from pathlib import Path
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from wait_for_branch_pages import pending_branch_builds


class BranchPagesTests(unittest.TestCase):
    def test_only_competing_same_commit_branch_deployment_blocks(self):
        build={'id':1,'head_sha':'current','event':'dynamic',
               'name':'pages build and deployment','status':'queued'}
        runs=[build, {**build,'id':2,'head_sha':'previous'},
              {**build,'id':3,'status':'completed'},
              {**build,'id':4,'event':'push'}]
        self.assertEqual(pending_branch_builds(runs,'current'),[build])
        build['status']='in_progress'
        self.assertEqual(pending_branch_builds(runs,'current'),[build])
        build['status']='completed'
        self.assertEqual(pending_branch_builds(runs,'current'),[])
