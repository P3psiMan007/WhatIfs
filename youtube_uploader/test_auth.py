from unittest import TestCase
from unittest.mock import Mock

from google.auth.exceptions import RefreshError

from youtube_uploader.auth import (
    AUTHORIZE_SCOPES,
    YOUTUBE_MANAGE_SCOPE,
    ensure_publication_credentials,
)


class AuthTests(TestCase):
    def test_authorization_requests_management_scope(self):
        self.assertIn(YOUTUBE_MANAGE_SCOPE, AUTHORIZE_SCOPES)

    def test_publication_preflight_refreshes_credentials(self):
        credentials = Mock()
        credentials.scopes = list(AUTHORIZE_SCOPES)
        credentials.granted_scopes = list(AUTHORIZE_SCOPES)
        request = object()
        result = ensure_publication_credentials(credentials, request=request)
        credentials.refresh.assert_called_once_with(request)
        self.assertIs(result, credentials)

    def test_publication_preflight_rejects_missing_granted_management_scope(self):
        credentials = Mock()
        credentials.scopes = list(AUTHORIZE_SCOPES)
        credentials.granted_scopes = [
            scope for scope in AUTHORIZE_SCOPES if scope != YOUTUBE_MANAGE_SCOPE
        ]
        with self.assertRaisesRegex(RuntimeError, "re-authorize"):
            ensure_publication_credentials(credentials, request=object())

    def test_publication_preflight_turns_refresh_scope_failure_into_clear_blocker(self):
        credentials = Mock()
        credentials.scopes = list(AUTHORIZE_SCOPES)
        credentials.granted_scopes = None
        credentials.refresh.side_effect = RefreshError("invalid_scope")
        with self.assertRaisesRegex(RuntimeError, "re-authorize"):
            ensure_publication_credentials(credentials, request=object())
