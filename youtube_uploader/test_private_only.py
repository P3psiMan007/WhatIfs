import hashlib
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
        video_sha256 = hashlib.sha256(b'video').hexdigest()
        thumbnail_sha256 = hashlib.sha256(b'thumb').hexdigest()
        narration_sha256 = hashlib.sha256(b'narration').hexdigest()
        image_manifest_sha256 = hashlib.sha256(b'image-manifest').hexdigest()
        private_video = {
            'id': 'new-private-id',
            'status': {'privacyStatus': 'private', 'uploadStatus': 'processed', 'embeddable': True},
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
            'majorBlockers': [],
            'authority': 'critic-qa-independent',
            'reviewedExactArtifact': True,
            'artifactDigest': 'sha256:' + video_sha256,
            'narratorVerification': {
                'verified': True,
                'provider': 'kokoro',
                'voice': 'af_heart',
                'speed': 0.95,
                'flowVersion': 'continuous-v2',
                'audioSha256': narration_sha256,
            },
            'episodeId': 'ep-1',
            'imageAssetsVerification': {'verified': True, 'manifestSha256': image_manifest_sha256, 'assetRevision': 'image-first-cinematic-v2'},
            'reviewedStateRevision': 80,
            'reviewedRenderAsset': 'github-actions://run/999/artifact/episode-render/episode.mp4',
        }
        state = {'episode_id': 'ep-1', 'state': 'QA_PASSED', 'state_revision': 80, 'production': {'render_asset': qa['reviewedRenderAsset']}}
        manifest = {
            'episodeId': 'ep-1', 'title': 'What If Humans Never Needed Sleep?',
            'description': 'Description', 'chosenPackage': 'A', 'experimentAssignment': 'baseline',
            'githubRunId': '999', 'artifactName': 'episode-render', 'filename': 'episode.mp4',
            'narrator': {'provider': 'kokoro', 'voice': 'af_heart', 'speed': 0.95, 'flowVersion': 'continuous-v2', 'audioSha256': narration_sha256},
            'imageAssets': {'path': 'episodes/current/image-assets-v1.json', 'sha256': image_manifest_sha256, 'assetRevision': 'image-first-cinematic-v2'},
        }
        autonomy = {
            'autoPublishEnabled': True, 'requiredCoreScore': 9,
            'publishReadyStates': ['QA_PASSED'], 'requiredGates': list(qa['coreScores']),
            'verification': {'privateFirst': True, 'requireProcessingVerification': True, 'requireMetadataVerification': True, 'requireThumbnailVerification': True, 'requirePlaybackVerification': True, 'promoteSameVideoIdOnly': True},
            'publication': {'failClosedOnUncertainty': True},
        }
        daily = {'pausePublishing': False, 'dailyPublishQuota': 1, 'publishedToday': 0, 'lastPublicationAt': None, 'lastCountedVideoId': None}

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            video = root / 'episode.mp4'; video.write_bytes(b'video')
            thumb = root / 'thumb.jpg'; thumb.write_bytes(b'thumb')
            record_path = root / 'publication.json'
            fetch_video.return_value = {'id': '3EGJqkrn42A', 'status': {'privacyStatus': 'private'}}
            record = publish_episode(
                video_path=str(video), thumbnail_path=str(thumb),
                identity={'runId':'999','artifactName':'episode-render','filename':'episode.mp4','videoSha256':video_sha256,'thumbnailSha256':thumbnail_sha256,'manifestSha256':hashlib.sha256(b'manifest').hexdigest()},
                qa_review=qa, episode_state=state, render_manifest=manifest,
                autonomy=autonomy, daily_control=daily, publication_record_path=str(record_path),
                production_input={'narrator': {'provider': 'kokoro', 'voice': 'af_heart', 'speed': 0.95, 'flowVersion': 'continuous-v2'}},
                youtube=Mock(), stop_after_private=True,
            )

        yt = record['youtube']
        self.assertEqual(yt['videoId'], 'new-private-id')
        self.assertTrue(yt['privateVerifiedAt'])
        self.assertIsNone(yt['publicVerifiedAt'])
        self.assertEqual(yt['privacyTransitions'], ['private'])
        promote_public.assert_not_called()
        fetch_video.assert_called_once()
        self.assertEqual(daily['publishedToday'], 0)
