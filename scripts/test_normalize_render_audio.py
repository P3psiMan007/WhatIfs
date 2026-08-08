import unittest

from scripts.normalize_render_audio import (
    build_loudnorm_second_pass_filter,
    update_manifest_for_normalized_render,
)


class NormalizeRenderAudioTests(unittest.TestCase):
    def test_builds_two_pass_filter_from_first_pass_measurements(self):
        measured = {
            "input_i": "-24.94",
            "input_tp": "-3.59",
            "input_lra": "3.30",
            "input_thresh": "-35.40",
            "target_offset": "0.39",
        }
        filt = build_loudnorm_second_pass_filter(
            measured, target_i=-16.0, target_tp=-1.5, target_lra=7.0
        )
        self.assertIn("I=-16.0", filt)
        self.assertIn("TP=-1.5", filt)
        self.assertIn("measured_I=-24.94", filt)
        self.assertIn("measured_TP=-3.59", filt)
        self.assertIn("linear=true", filt)

    def test_updates_manifest_identity_and_audio_qa_without_changing_visual_qa(self):
        manifest = {
            "episodeId": "ep1",
            "githubRunId": "old",
            "artifactName": "episode-render",
            "filename": "episode.mp4",
            "technical": {
                "streams": [
                    {
                        "codec_name": "h264",
                        "width": 1920,
                        "height": 1080,
                        "r_frame_rate": "30/1",
                    }
                ],
                "format": {"duration": "519.680000", "size": "1", "bit_rate": "2"},
            },
            "visualQa": {"totalBeats": 122, "maxBeatDuration": 5.95},
        }
        probe = {
            "streams": [
                {
                    "index": 0,
                    "codec_name": "h264",
                    "codec_type": "video",
                    "width": 1920,
                    "height": 1080,
                    "r_frame_rate": "30/1",
                },
                {
                    "index": 1,
                    "codec_name": "aac",
                    "codec_type": "audio",
                    "sample_rate": "48000",
                    "channels": 2,
                },
            ],
            "format": {"duration": "519.700000", "size": "123", "bit_rate": "456"},
        }
        updated = update_manifest_for_normalized_render(
            manifest,
            run_id="999",
            probe=probe,
            integrated_lufs=-16.1,
            true_peak_dbfs=-1.2,
            source_run_id="31283336381",
        )
        self.assertEqual(updated["githubRunId"], "999")
        self.assertEqual(updated["artifactName"], "episode-render")
        self.assertEqual(updated["technical"], probe)
        self.assertEqual(updated["visualQa"], manifest["visualQa"])
        self.assertEqual(updated["audioQa"]["integratedLufs"], -16.1)
        self.assertEqual(updated["audioQa"]["truePeakDbfs"], -1.2)
        self.assertEqual(updated["audioQa"]["sourceRunId"], "31283336381")
        self.assertIs(updated["audioQa"]["videoStreamCopied"], True)


if __name__ == "__main__":
    unittest.main()
