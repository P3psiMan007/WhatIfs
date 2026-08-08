import unittest

from scripts.normalize_render_audio import build_ffmpeg_args, loudness_is_publish_grade


class NormalizeRenderAudioTests(unittest.TestCase):
    def test_build_ffmpeg_args_preserves_video_and_targets_youtube_loudness(self):
        args = build_ffmpeg_args("in.mp4", "out.mp4")
        joined = " ".join(args)
        self.assertIn("-c:v copy", joined)
        self.assertIn("loudnorm=I=-16:TP=-1.5:LRA=11", joined)
        self.assertIn("-c:a aac", joined)
        self.assertEqual(args[-1], "out.mp4")

    def test_publish_grade_loudness_window(self):
        self.assertTrue(loudness_is_publish_grade(-16.0, -1.6))
        self.assertTrue(loudness_is_publish_grade(-17.0, -1.5))
        self.assertFalse(loudness_is_publish_grade(-24.9, -3.0))
        self.assertFalse(loudness_is_publish_grade(-15.0, -0.5))


if __name__ == "__main__":
    unittest.main()
