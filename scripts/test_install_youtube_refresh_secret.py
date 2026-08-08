from __future__ import annotations

import json
import tempfile
from pathlib import Path
from unittest import TestCase
from unittest.mock import patch

from scripts.install_youtube_refresh_secret import install_refresh_secret


class InstallRefreshSecretTests(TestCase):
    @patch("scripts.install_youtube_refresh_secret.subprocess.run")
    @patch("scripts.install_youtube_refresh_secret.shutil.which", return_value="/usr/bin/gh")
    def test_pipes_refresh_token_to_gh_without_putting_it_in_argv(self, which_mock, run_mock):
        run_mock.return_value.returncode = 0
        run_mock.return_value.stdout = b""
        run_mock.return_value.stderr = b""
        with tempfile.TemporaryDirectory() as tmp:
            token_file = Path(tmp) / "youtube_token.json"
            token_file.write_text(json.dumps({"refresh_token": "super-secret-refresh"}), encoding="utf-8")
            install_refresh_secret(token_file, "P3psiMan007/WhatIfs")

        self.assertEqual(run_mock.call_count, 2)
        secret_call = run_mock.call_args_list[1]
        argv = secret_call.args[0]
        self.assertEqual(argv, ["gh", "secret", "set", "YOUTUBE_REFRESH_TOKEN", "--repo", "P3psiMan007/WhatIfs"])
        self.assertNotIn("super-secret-refresh", " ".join(argv))
        self.assertEqual(secret_call.kwargs["input"], b"super-secret-refresh")

    @patch("scripts.install_youtube_refresh_secret.shutil.which", return_value=None)
    def test_requires_gh_cli(self, which_mock):
        with self.assertRaisesRegex(RuntimeError, "GitHub CLI"):
            install_refresh_secret(Path("missing.json"), "P3psiMan007/WhatIfs")

    @patch("scripts.install_youtube_refresh_secret.subprocess.run")
    @patch("scripts.install_youtube_refresh_secret.shutil.which", return_value="/usr/bin/gh")
    def test_rejects_missing_refresh_token(self, which_mock, run_mock):
        with tempfile.TemporaryDirectory() as tmp:
            token_file = Path(tmp) / "youtube_token.json"
            token_file.write_text("{}", encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError, "refresh_token"):
                install_refresh_secret(token_file, "P3psiMan007/WhatIfs")
        run_mock.assert_not_called()


if __name__ == "__main__":
    import unittest
    unittest.main()
