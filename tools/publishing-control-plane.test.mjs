import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePublishingControls } from './publishing-control-plane.mjs';

const validAutonomy = {
  autonomy_version: '1.1',
  revision: 1,
  autoPublishEnabled: true,
  requiredCoreScore: 9,
  publishReadyStates: ['QA_PASSED', 'AUTO_PUBLISH_READY'],
  requiredGates: [
    'factual',
    'package',
    'retention',
    'narration',
    'visual',
    'technical',
    'policy',
    'copyright',
  ],
  verification: {
    privateFirst: true,
    requireProcessingVerification: true,
    requireMetadataVerification: true,
    requireThumbnailVerification: true,
    requirePlaybackVerification: true,
    promoteSameVideoIdOnly: true,
  },
  publication: {
    failClosedOnUncertainty: true,
  },
  recording: {
    requireVideoId: true,
    requireChosenPackage: true,
    requirePublicationOrScheduleTime: true,
    requireExperimentAssignment: true,
    revisionSafeWrites: true,
  },
};

const validDaily = {
  control_version: '1.0',
  revision: 4,
  date: '2026-08-08',
  pauseAllProduction: false,
  pausePublishing: false,
  dailyPublishQuota: 1,
  publishedToday: 0,
  minimumSpacingMinutes: 0,
  lastPublicationAt: null,
  lastSuccessfulCanaryAt: null,
  notes: '',
};

test('accepts private-first per-video verification config', () => {
  assert.equal(validatePublishingControls(validAutonomy, validDaily), true);
});

test('rejects public publishing without private-first verification', () => {
  assert.throws(
    () =>
      validatePublishingControls(
        {
          ...validAutonomy,
          verification: {...validAutonomy.verification, privateFirst: false},
        },
        validDaily,
      ),
    /privateFirst/,
  );
});

test('rejects core score below 9', () => {
  assert.throws(
    () => validatePublishingControls({...validAutonomy, requiredCoreScore: 8.9}, validDaily),
    />= 9/,
  );
});

test('rejects fail-open publication config', () => {
  assert.throws(
    () =>
      validatePublishingControls(
        {...validAutonomy, publication: {failClosedOnUncertainty: false}},
        validDaily,
      ),
    /failClosedOnUncertainty/,
  );
});

test('rejects missing required gate', () => {
  assert.throws(
    () =>
      validatePublishingControls(
        {
          ...validAutonomy,
          requiredGates: validAutonomy.requiredGates.filter((gate) => gate !== 'copyright'),
        },
        validDaily,
      ),
    /copyright/,
  );
});

test('rejects invalid daily publish counters', () => {
  assert.throws(
    () => validatePublishingControls(validAutonomy, {...validDaily, publishedToday: 2}),
    /publishedToday/,
  );
});
