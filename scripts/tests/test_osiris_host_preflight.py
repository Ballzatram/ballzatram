"""Exercise actual Git/tar permissions without installing Docker or using a provider."""
import os
from pathlib import Path
import shutil
import stat
import subprocess
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[1] / "osiris-host-preflight.sh"


class HostBuildContextTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="osiris-permission-test-")
        self.root = Path(self.temporary.name)
        self.checkout = self.root / "source"
        self.checkout.mkdir(mode=0o700)
        self.files = {
            "osiris-runtime/Dockerfile": "FROM scratch\nUSER 1000\n",
            "osiris-runtime/scripts/check-runtime.mjs": "console.log('fixture');\n",
            "assets/ai-features.js": "module.exports = {};\n",
            "tools/parcel/core.js": "module.exports = {};\n",
        }
        previous = os.umask(0o077)
        try:
            for name, content in self.files.items():
                path = self.checkout / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(content)
        finally:
            os.umask(previous)
        self.git("init", "-q")
        self.git("add", ".")
        self.git("-c", "user.name=Test", "-c", "user.email=test@example.invalid",
                 "commit", "-qm", "permission fixture")
        self.revision = self.git("rev-parse", "HEAD").stdout.strip()
        (self.checkout / "osiris-runtime/.env").write_text("PRIVATE_FIXTURE=not-for-build\n")
        self.work = self.root / "private-work"
        self.work.mkdir(mode=0o700)

    def tearDown(self):
        self.temporary.cleanup()

    def git(self, *args):
        return subprocess.run(["git", "-C", str(self.checkout), *args],
                              check=True, capture_output=True, text=True)

    def context(self):
        result = subprocess.run([
            "bash", "-c",
            'source "$1"; umask 077; OSIRIS_CHECK_ROOT="$2"; '
            'prepare_build_context "$3" "$4"; printf "%s" "$OSIRIS_CHECK_CONTEXT"',
            "test", str(SCRIPT), str(self.work), str(self.checkout), self.revision,
        ], check=True, capture_output=True, text=True)
        return Path(result.stdout)

    def test_private_checkout_produces_readable_tracked_context(self):
        context = self.context()
        for name, content in self.files.items():
            original = self.checkout / name
            copied = context / name
            self.assertEqual(copied.read_text(), content)
            self.assertEqual(stat.S_IMODE(original.stat().st_mode), 0o600)
            self.assertEqual(stat.S_IMODE(copied.stat().st_mode), 0o644)
            self.assertEqual(stat.S_IMODE(copied.parent.stat().st_mode), 0o755)
        self.assertEqual(stat.S_IMODE(self.checkout.stat().st_mode), 0o700)
        self.assertEqual(stat.S_IMODE(self.work.stat().st_mode), 0o700)
        self.assertFalse((context / ".git").exists())
        self.assertFalse((context / "osiris-runtime/.env").exists())

    @unittest.skipUnless(os.geteuid() == 0, "requires UID switching to verify actual reader access")
    def test_nonroot_reader_fails_before_fix_and_succeeds_after(self):
        self.root.chmod(0o755)
        before = self.root / "before-copy"
        after = self.root / "after-copy"
        # Docker COPY preserves nested permissions; these copies model that part.
        shutil.copytree(self.checkout / "osiris-runtime", before)
        shutil.copytree(self.context() / "osiris-runtime", after)
        before.chmod(0o755)
        after.chmod(0o755)

        def drop_identity():
            os.setgroups([])
            os.setgid(1000)
            os.setuid(1000)

        def read(path):
            return subprocess.run([
                "/usr/bin/python3", "-c",
                "import pathlib,sys; pathlib.Path(sys.argv[1]).read_bytes()", str(path),
            ], preexec_fn=drop_identity, capture_output=True, text=True)

        try:
            old = read(before / "scripts/check-runtime.mjs")
        except subprocess.SubprocessError:
            if os.environ.get("OSIRIS_REQUIRE_UID_TEST") == "1":
                raise
            self.skipTest("This environment cannot switch UID; the CI permission gate requires it.")
        new = read(after / "scripts/check-runtime.mjs")
        self.assertNotEqual(old.returncode, 0)
        self.assertIn("PermissionError", old.stderr)
        self.assertEqual(new.returncode, 0, new.stderr)

    def test_build_context_contains_committed_bytes_only(self):
        (self.checkout / "osiris-runtime/scripts/check-runtime.mjs").write_text("local edit\n")
        context = self.context()
        self.assertEqual((context / "osiris-runtime/scripts/check-runtime.mjs").read_text(),
                         self.files["osiris-runtime/scripts/check-runtime.mjs"])


if __name__ == "__main__":
    unittest.main()
