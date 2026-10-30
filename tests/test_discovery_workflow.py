"""Exercise the real checkpoint shell with a local bare remote, never GitHub/YouTube."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

WORKFLOW = Path(__file__).resolve().parents[1] / '.github/workflows/discovery-playlist.yml'


def script_for(name):
    text = WORKFLOW.read_text().split('      - name: ' + name, 1)[1]
    block = text.split('        run: |\n', 1)[1].split('      - name:', 1)[0]
    return '\n'.join(line[10:] for line in block.splitlines() if line.startswith('          '))


class WorkflowCheckpointTests(unittest.TestCase):
    def test_existing_state_branch_saves_optional_files_and_summary(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            remote, work = root / 'remote.git', root / 'work'
            def run(*args, cwd=None):
                return subprocess.run(args, cwd=cwd, check=True, capture_output=True, text=True).stdout
            run('git', 'init', '--bare', str(remote))
            run('git', 'clone', str(remote), str(work))
            run('git', 'config', 'user.name', 'Offline test', cwd=work)
            run('git', 'config', 'user.email', 'test@example.invalid', cwd=work)
            data = work / 'data/edco-2026'
            data.mkdir(parents=True)
            matches = data / 'youtube-matches.json'
            decisions = data / 'match-decisions.json'
            matches.write_text('{"searched_acts": []}')
            decisions.write_text('{"decisions": {"old": "reject"}}')
            run('git', 'add', '.', cwd=work)
            run('git', 'commit', '-m', 'Initial fixture', cwd=work)
            run('git', 'push', 'origin', 'HEAD:discovery/state', cwd=work)
            run('git', 'fetch', 'origin', 'discovery/state', cwd=work)
            matches.write_text('{"searched_acts": ["saved"]}')
            (data / 'discovery-run-summary.json').write_text('{"status": "paused"}')
            marker = root / 'restored'
            marker.touch()
            script = script_for('Save matching state (runs even if publishing failed)')
            script = script.replace('/tmp/discovery-state-restored', str(marker)).replace(
                '/tmp/state', str(root / 'checkpoint')).replace('${{ github.run_id }}', 'offline-test')
            env = dict(os.environ, STATE_BRANCH='discovery/state',
                       STATE_FILES=' '.join('data/edco-2026/' + name for name in (
                           'youtube-matches.json', 'match-decisions.json', 'review-queue.json',
                           'discovery-run-summary.json')), GITHUB_STEP_SUMMARY=str(root / 'summary.md'))
            subprocess.run(['bash', '-e', '-c', script], cwd=work, env=env,
                           check=True, capture_output=True, text=True)
            self.assertIn('saved', run('git', '--git-dir=' + str(remote), 'show',
                                      'discovery/state:data/edco-2026/youtube-matches.json'))
            self.assertIn('reject', run('git', '--git-dir=' + str(remote), 'show',
                                       'discovery/state:data/edco-2026/match-decisions.json'))
            self.assertIn('paused', run('git', '--git-dir=' + str(remote), 'show',
                                       'discovery/state:data/edco-2026/discovery-run-summary.json'))
            self.assertIn('Checkpoint committed:', (root / 'summary.md').read_text())

    def test_restore_fetch_failure_stops_before_live_step(self):
        with tempfile.TemporaryDirectory() as folder:
            work = Path(folder)
            subprocess.run(['git', 'init'], cwd=work, check=True, capture_output=True)
            script = script_for('Restore matching state and owner decisions (no network to YouTube)')
            script = script.split('# Tests')[0]
            result = subprocess.run(['bash', '-e', '-c', script], cwd=work,
                                    env=dict(os.environ, STATE_BRANCH='discovery/state'), capture_output=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertFalse((work / 'data/edco-2026/youtube-matches.json').exists())
