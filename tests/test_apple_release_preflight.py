"""Synthetic Apple metadata only: no credentials or network requests."""
import contextlib
import importlib.util
import io
import os
from pathlib import Path
import subprocess
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location(
    "preflight", Path(__file__).parents[1] / "scripts/apple-release-preflight.py"
)
preflight = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preflight)


class AppleReleasePreflightTests(unittest.TestCase):
    def responses(self):
        return [
            {"id": preflight.APP_ID, "attributes": {"bundleId": preflight.BUNDLE}},
            [{"id": "synthetic-bundle", "attributes": {"identifier": preflight.BUNDLE}}],
            [{"attributes": {"capabilityType": "PUSH_NOTIFICATIONS"}}],
            [],
        ]

    def run_main(self, responses):
        with patch.dict(os.environ, {
            "APP_STORE_CONNECT_KEY_IDENTIFIER": preflight.KEY_ID,
            "WITNESS_IOS_BUILD_NUMBER": "1020",
        }), patch.object(preflight, "read_apple", side_effect=responses) as read:
            with contextlib.redirect_stdout(io.StringIO()):
                preflight.main()
            return read

    def test_success_uses_only_read_operations(self):
        read = self.run_main(self.responses())
        self.assertEqual([c.args[:2] for c in read.call_args_list], [
            ("apps", "get"), ("bundle-ids", "list"),
            ("bundle-ids", "capabilities"), ("builds", "list"),
        ])

    def test_wrong_selected_key_refuses_before_apple(self):
        with patch.dict(os.environ, {"APP_STORE_CONNECT_KEY_IDENTIFIER": "wrong"}):
            with patch.object(preflight, "read_apple") as read:
                with self.assertRaisesRegex(RuntimeError, "key selection"):
                    preflight.main()
                read.assert_not_called()

    def test_wrong_app_bundle_refuses(self):
        responses = self.responses()
        responses[0]["attributes"]["bundleId"] = "other"
        with self.assertRaisesRegex(RuntimeError, "does not match"):
            self.run_main(responses)

    def test_missing_bundle_refuses(self):
        responses = self.responses()
        responses[1] = []
        with self.assertRaisesRegex(RuntimeError, "not uniquely"):
            self.run_main(responses)

    def test_missing_push_refuses(self):
        responses = self.responses()
        responses[2] = []
        with self.assertRaisesRegex(RuntimeError, "Push Notifications"):
            self.run_main(responses)

    def test_duplicate_build_refuses(self):
        responses = self.responses()
        responses[3] = [{"id": "synthetic-build"}]
        with self.assertRaisesRegex(RuntimeError, "already exists"):
            self.run_main(responses)

    def test_raw_error_is_not_exposed(self):
        result = subprocess.CompletedProcess([], 1, "sensitive-response", "HTTP 401 sensitive-url")
        with patch.object(subprocess, "run", return_value=result):
            with self.assertRaisesRegex(RuntimeError, r"HTTP 401") as error:
                preflight.read_apple("apps", "get", preflight.APP_ID)
            self.assertNotIn("sensitive", str(error.exception))

    def test_unreadable_response_is_not_exposed(self):
        result = subprocess.CompletedProcess([], 0, "sensitive-invalid-json", "")
        with patch.object(subprocess, "run", return_value=result):
            with self.assertRaisesRegex(RuntimeError, "unreadable") as error:
                preflight.read_apple("apps", "get", preflight.APP_ID)
            self.assertNotIn("sensitive", str(error.exception))


if __name__ == "__main__":
    unittest.main()
