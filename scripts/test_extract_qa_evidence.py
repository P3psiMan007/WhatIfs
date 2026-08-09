from __future__ import annotations

import tempfile
from pathlib import Path
from unittest import TestCase

from scripts.extract_qa_evidence import build_evidence, parse_srt


SRT = """1
00:00:00,000 --> 00:00:02,000
This is a calm opening line.

2
00:00:02,140 --> 00:00:05,140
The middle sentence has a little more room to breathe.

3
00:00:05,280 --> 00:00:09,280
Maybe sleep is not only time we lose.

4
00:00:09,420 --> 00:00:14,420
Maybe it is the last part of the day that the world cannot ask us to give back.
"""


class QaEvidenceTests(TestCase):
    def test_parse_srt_keeps_timing_and_text(self):
        cues = parse_srt(SRT)
        self.assertEqual(len(cues), 4)
        self.assertAlmostEqual(cues[1]["start"], 2.14)
        self.assertEqual(cues[-1]["text"], "Maybe it is the last part of the day that the world cannot ask us to give back.")

    def test_build_evidence_identifies_payoff_manifest_and_af_heart_rights(self):
        production = {
            "episodeId": "ep-1",
            "narrator": {
                "provider": "kokoro",
                "model": "hexgrad/Kokoro-82M",
                "license": "Apache-2.0",
                "voice": "af_heart",
            },
            "scenes": [
                {"id": "scene-01", "narration": "This is a calm opening line. The middle sentence has a little more room to breathe."},
                {"id": "scene-09", "headline": "PAYOFF", "narration": "Maybe sleep is not only time we lose. Maybe it is the last part of the day that the world cannot ask us to give back."},
            ],
        }
        manifest = {
            "episodeId": "ep-1",
            "githubRunId": "999",
            "artifactName": "episode-render",
            "technical": {
                "streams": [{"codec_name": "h264", "width": 1920, "height": 1080, "r_frame_rate": "30/1"}],
                "format": {"duration": "14.6"},
            },
            "visualQa": {"totalBeats": 20, "first30BeatCount": 8, "maxBeatDuration": 5.5},
            "narrator": {"audioSha256": "a" * 64},
            "imageAssets": {"sha256": "b" * 64, "assetRevision": "image-first-cinematic-v2"},
        }
        with tempfile.TemporaryDirectory() as tmp:
            rights = Path(tmp) / "rights.md"
            rights.write_text("Kokoro-82M Apache-2.0 af_heart commercial production", encoding="utf-8")
            evidence = build_evidence(parse_srt(SRT), production, manifest, rights)

        self.assertEqual(evidence["render"]["runId"], "999")
        self.assertTrue(evidence["render"]["technicalShapeOk"])
        self.assertEqual(evidence["render"]["narratorAudioSha256"], "a" * 64)
        self.assertEqual(evidence["render"]["imageAssetManifestSha256"], "b" * 64)
        self.assertEqual(evidence["narration"]["provider"], "kokoro")
        self.assertEqual(evidence["narration"]["voice"], "af_heart")
        self.assertEqual(evidence["payoff"]["cueCount"], 2)
        self.assertGreater(evidence["payoff"]["maxWpm"], 0)
        self.assertTrue(evidence["rights"]["kokoroEvidencePresent"])
        self.assertTrue(evidence["rights"]["voiceMentioned"])

    def test_rights_fail_if_document_does_not_cover_declared_voice(self):
        production = {"episodeId": "ep", "narrator": {"voice": "af_heart"}, "scenes": []}
        manifest = {"episodeId": "ep", "githubRunId": "1", "technical": {"streams": [{}], "format": {}}, "visualQa": {}}
        with tempfile.TemporaryDirectory() as tmp:
            rights = Path(tmp) / "rights.md"
            rights.write_text("Kokoro-82M Apache-2.0 an-unapproved-voice commercial production", encoding="utf-8")
            evidence = build_evidence([], production, manifest, rights)
        self.assertFalse(evidence["rights"]["kokoroEvidencePresent"])
        self.assertFalse(evidence["rights"]["voiceMentioned"])

    def test_overlapping_captions_are_reported_not_hidden(self):
        srt = """1
00:00:00,000 --> 00:00:03,000
One caption.

2
00:00:02,500 --> 00:00:04,000
Another caption.
"""
        production = {"episodeId": "ep", "narrator": {}, "scenes": [{"id": "scene-09", "headline": "PAYOFF", "narration": "Another caption."}]}
        manifest = {"episodeId": "ep", "githubRunId": "1", "technical": {"streams": [{}], "format": {}}, "visualQa": {}}
        with tempfile.TemporaryDirectory() as tmp:
            rights = Path(tmp) / "missing.md"
            evidence = build_evidence(parse_srt(srt), production, manifest, rights)
        self.assertEqual(evidence["captions"]["overlapCount"], 1)
        self.assertFalse(evidence["rights"]["kokoroEvidencePresent"])


if __name__ == "__main__":
    import unittest
    unittest.main()
