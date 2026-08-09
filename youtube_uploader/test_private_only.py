import tempfile
from pathlib import Path
from unittest import TestCase
from unittest.mock import Mock, patch

from youtube_uploader.publisher import publish_episode


class PrivateOnlyPublisherTests(TestCase):
    @patch('youtube_uploader.publisher.fetch_video')
    @patch('youtube_uploader.publisher.promote_public')
    @patch('youtube_uploader.publisher.wait_until_processed')
    @patch('youtube_uploader.publisher.set_thumbnail')
    @patch('youtube_uploader.publisher.upload_private')
    def test_stop_after_private_verifies_and_never_promotes(
        self, upload_private, set_thumbnail, wait_until_processed, promote_public, fetch_video
    ):
        upload_private.return_value = 'new-private-id'
        private_video = {
            'id': 'new-private-id',
            'status': {'privacyStatus': 'private'},
            'processingDetails': {'processingStatus': 'succeeded'},
            'snippet': {
                'title': 'What If Humans Never Needed Sleep?',
                'description': 'Description',
                'thumbnails': {'default': {'url': 'thumb'}},
            },
        }
        wait_until_processed.return_value = private_video

        qa = {
            'status': 'QA_PASSED', 'publishDecision': 'PASS',
            'coreScores': {k: 9.5 for k in ['factual','package','retention','narration','visual','technical','policy','copyright']},
            'failures': [],
            'reviewedStateRevision': 80,
            'reviewedRenderAsset': 'github-actions://run/999/artifact/episode-render/episode.mp4',
        }
        state = {'episode_id': 'ep-1', 'state': 'QA_PASSED', 'state_revision': 80}
        manifest = {
            'episodeId': 'ep-1', 'title': 'What If Humans Never Needed Sleep?',
            'description': 'Description', 'chosenPackage': 'A', 'experimentAssignment': 'baseline',
        }
        autonomy = {
            'autoPublishEnabled': True, 'requiredCoreScore': 9,
            'publishReadyStates': ['QA_PASSED'], 'requiredGates': list(qa['coreScores']),
            'verification': {'privateFirst': True, 'requireProcessingVerification': True, 'requireMetadataVerification': True, 'requireThumbnailVerification': True, 'promoteSameVideoIdOnly': True},
            'publication': {'failClosedOnUncertainty': True},
        }
        daily = {'pausePublishing': False, 'dailyPublishQuota': 1, 'publishedToday': 0, 'lastPublicationAt': None, 'lastCountedVideoId': None}

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            video = root / 'episode.mp4'; video.write_bytes(b'video')
            thumb = root / 'thumb.jpg'; thumb.write_bytes(b'thumb')
            record_path = root / 'publication.json'
            record = publish_episode(
                video_path=str(video), thumbnail_path=str(thumb),
                identity={'runId':'999','artifactName':'episode-render','videoSha256':'v','thumbnailSha256':'t','manifestSha256':'m'},
                qa_review=qa, episode_state=state, render_manifest=manifest,
                autonomy=autonomy, daily_control=daily, publication_record_path=str(record_path),
                youtube=Mock(), stop_after_private=True,
            )

        yt = record['youtube']
        self.assertEqual(yt['videoId'], 'new-private-id')
        self.assertTrue(yt['privateVerifiedAt'])
        self.assertIsNone(yt['publicVerifiedAt'])
        self.assertEqual(yt['privacyTransitions'], ['private'])
        promote_public.assert_not_called()
        fetch_video.assert_not_called()
        self.assertEqual(daily['publishedToday'], 0)
