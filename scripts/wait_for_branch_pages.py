"""Publish the refreshed artifact after all legacy branch Pages builds finish.

This repository also has GitHub's branch-triggered Pages deployment enabled.
Those builds contain only the committed bootstrap. A build for an earlier
commit can still own the deployment slot, so wait regardless of commit SHA.
"""
import json
import os
import time
import urllib.request


def pending_branch_builds(runs):
    return [run for run in runs if run.get('event') == 'dynamic'
            and run.get('name') == 'pages build and deployment'
            and run.get('status') != 'completed']


def wait_for_branch_build(repository, token):
    url = f'https://api.github.com/repos/{repository}/actions/runs?per_page=100'
    deadline = time.monotonic() + 300
    request = urllib.request.Request(url, headers={
        'Authorization': f'Bearer {token}', 'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'})
    # Allow a newly triggered branch build to enter GitHub's run collection.
    time.sleep(15)
    while time.monotonic() < deadline:
        with urllib.request.urlopen(request, timeout=20) as response:
            runs = json.load(response)['workflow_runs']
        pending = pending_branch_builds(runs)
        if not pending:
            print('No competing branch Pages build remains; publishing refreshed data.')
            return
        print('Waiting for branch Pages build: ' + ', '.join(str(r['id']) for r in pending), flush=True)
        time.sleep(10)
    raise TimeoutError('Branch Pages build is still running; do not race its deployment.')


if __name__ == '__main__':
    wait_for_branch_build(os.environ['GITHUB_REPOSITORY'], os.environ['GH_TOKEN'])
