import json
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest import TestCase

from youtube_uploader.analytics import due_checkpoints, run

PUBLISHED = datetime(2026, 9, 1, 12, 0, tzinfo=timezone.utc)


class FakeQuery:
    def __init__(self, response):
        self.response = response

    def execute(self):
        return self.response


class FakeReports:
    def __init__(self, fail=False, empty=False):
        self.calls = []
        self.fail = fail
        self.empty = empty

    def query(self, **kwargs):
        self.calls.append(kwargs)
        if self.fail:
            raise RuntimeError("insufficient scope")
        if self.empty:
            return FakeQuery({"columnHeaders": [], "rows": []})
        dims = kwargs.get("dimensions")
        if dims == "insightTrafficSourceType":
            return FakeQuery({
                "columnHeaders": [{"name": "insightTrafficSourceType"}, {"name": "views"}],
                "rows": [["YT_SEARCH", 30], ["SUBSCRIBER", 12]],
            })
        if dims == "elapsedVideoTimeRatio":
            return FakeQuery({
                "columnHeaders": [
                    {"name": "elapsedVideoTimeRatio"},
                    {"name": "audienceWatchRatio"},
                    {"name": "relativeRetentionPerformance"},
                ],
                "rows": [[0.01, 1.0, 0.5], [0.5, 0.42, 0.5]],
            })
        names = kwargs["metrics"].split(",")
        return FakeQuery({
            "columnHeaders": [{"name": n} for n in names],
            "rows": [[42] + [1] * (len(names) - 1)],
        })


class FakeService:
    def __init__(self, **kwargs):
        self.fake_reports = FakeReports(**kwargs)

    def reports(self):
        return self.fake_reports


class AnalyticsReaderTests(TestCase):
    def setUp(self):
        self.dir = Path(tempfile.mkdtemp())
        self.state_path = self.dir / "episode-state.json"
        self.pub_path = self.dir / "publication.json"
        self.state_path.write_text(json.dumps({
            "episode_id": "ep-1",
            "state": "PUBLISHED",
            "state_revision": 7,
            "analytics": {"keep": ["x"], "metrics": {}},
            "history": [],
        }))

    def publish(self, public=True, episode="ep-1"):
        self.pub_path.write_text(json.dumps({
            "publicationVersion": "1.0",
            "episodeId": episode,
            "sourceRender": {},
            "youtube": {
                "videoId": "abc123",
                "publicVerifiedAt": "2026-09-01T12:00:00Z" if public else None,
            },
        }))

    def state(self):
        return json.loads(self.state_path.read_text())

    def test_due_checkpoints(self):
        self.assertEqual(due_checkpoints(PUBLISHED, PUBLISHED + timedelta(hours=23), {}), [])
        self.assertEqual(due_checkpoints(PUBLISHED, PUBLISHED + timedelta(hours=80), {}), ["24h", "72h"])
        self.assertEqual(due_checkpoints(PUBLISHED, PUBLISHED + timedelta(days=8), {"24h": {}}), ["72h", "7d"])

    def test_noop_without_publication(self):
        result = run(self.state_path, self.pub_path, lambda: self.fail("no API call"), now=PUBLISHED)
        self.assertEqual(result["status"], "noop")
        self.assertEqual(self.state()["state_revision"], 7)

    def test_noop_when_only_private(self):
        self.publish(public=False)
        result = run(self.state_path, self.pub_path, lambda: self.fail("no API call"),
                     now=PUBLISHED + timedelta(days=9))
        self.assertEqual(result["status"], "noop")

    def test_noop_for_other_episode(self):
        self.publish(episode="ep-0")
        result = run(self.state_path, self.pub_path, lambda: self.fail("no API call"),
                     now=PUBLISHED + timedelta(days=9))
        self.assertEqual(result["status"], "noop")

    def test_records_due_snapshot_and_keeps_critic_fields(self):
        self.publish()
        service = FakeService()
        result = run(self.state_path, self.pub_path, lambda: service, now=PUBLISHED + timedelta(hours=25))
        self.assertEqual(result, {"status": "recorded", "videoId": "abc123", "checkpoints": ["24h"]})
        s = self.state()
        self.assertEqual(s["state_revision"], 8)
        self.assertEqual(s["history"][-1]["actor"], "analytics-reader")
        a = s["analytics"]
        self.assertEqual(a["keep"], ["x"])
        self.assertEqual(a["metrics"]["views"], 42)
        self.assertEqual(a["snapshots"]["24h"]["traffic_sources"], {"YT_SEARCH": 30, "SUBSCRIBER": 12})
        self.assertEqual(len(a["snapshots"]["24h"]["retention_curve"]), 2)
        self.assertIn("impressions", a["snapshots"]["24h"]["unavailable"])
        self.assertIn("too small", a["sample_note"])
        self.assertTrue(all(c["filters"] == "video==abc123" for c in service.fake_reports.calls))

        again = run(self.state_path, self.pub_path, lambda: self.fail("no API call"),
                    now=PUBLISHED + timedelta(hours=30))
        self.assertEqual(again["status"], "noop")

    def test_empty_response_is_recorded_as_unavailable(self):
        self.publish()
        run(self.state_path, self.pub_path, lambda: FakeService(empty=True), now=PUBLISHED + timedelta(hours=25))
        snap = self.state()["analytics"]["snapshots"]["24h"]
        self.assertEqual(snap["metrics"], {})
        self.assertIn("views", snap["unavailable"])
        self.assertIn("No verified view count", self.state()["analytics"]["sample_note"])

    def test_api_failure_fails_closed(self):
        self.publish()
        result = run(self.state_path, self.pub_path, lambda: FakeService(fail=True),
                     now=PUBLISHED + timedelta(hours=25))
        self.assertEqual(result["status"], "unavailable")
        a = self.state()["analytics"]
        self.assertNotIn("snapshots", a)
        self.assertIn("insufficient scope", a["last_error"])

    def test_revision_conflict_aborts(self):
        self.publish()
        original = self.state_path.read_text()

        def racing_service():
            s = json.loads(original)
            s["state_revision"] = 99
            self.state_path.write_text(json.dumps(s))
            return FakeService()

        with self.assertRaises(RuntimeError):
            run(self.state_path, self.pub_path, racing_service, now=PUBLISHED + timedelta(hours=25))
        self.assertEqual(self.state()["state_revision"], 99)
