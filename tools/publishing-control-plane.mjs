import fs from 'node:fs';

const REQUIRED_GATES = [
  'factual',
  'package',
  'retention',
  'narration',
  'visual',
  'technical',
  'policy',
  'copyright',
];

const REQUIRED_VERIFICATION_FLAGS = [
  'privateFirst',
  'requireProcessingVerification',
  'requireMetadataVerification',
  'requireThumbnailVerification',
  'promoteSameVideoIdOnly',
];

const fail = (message) => {
  throw new Error(message);
};

export function validatePublishingControls(autonomy, daily) {
  if (!autonomy || typeof autonomy !== 'object') fail('autonomy config must be an object');
  if (!daily || typeof daily !== 'object') fail('daily control must be an object');

  if (autonomy.autonomy_version !== '1.1') fail('unsupported autonomy_version');
  if (!Number.isInteger(autonomy.revision) || autonomy.revision < 0) fail('invalid autonomy revision');
  if (typeof autonomy.autoPublishEnabled !== 'boolean') fail('autoPublishEnabled must be boolean');
  if (typeof autonomy.requiredCoreScore !== 'number' || autonomy.requiredCoreScore < 9) {
    fail('requiredCoreScore must be >= 9');
  }

  if (!Array.isArray(autonomy.publishReadyStates)) fail('publishReadyStates must be an array');
  for (const state of ['QA_PASSED', 'AUTO_PUBLISH_READY']) {
    if (!autonomy.publishReadyStates.includes(state)) fail(`publish-ready state missing: ${state}`);
  }

  if (!Array.isArray(autonomy.requiredGates)) fail('requiredGates must be an array');
  for (const gate of REQUIRED_GATES) {
    if (!autonomy.requiredGates.includes(gate)) fail(`required gate missing: ${gate}`);
  }

  if (!autonomy.verification || typeof autonomy.verification !== 'object') {
    fail('verification config missing');
  }
  for (const flag of REQUIRED_VERIFICATION_FLAGS) {
    if (autonomy.verification[flag] !== true) fail(`${flag} must be true`);
  }

  if (!autonomy.publication || autonomy.publication.failClosedOnUncertainty !== true) {
    fail('failClosedOnUncertainty must be true');
  }

  if (daily.control_version !== '1.0') fail('unsupported control_version');
  if (!Number.isInteger(daily.revision) || daily.revision < 0) fail('invalid daily-control revision');
  if (typeof daily.pauseAllProduction !== 'boolean') fail('pauseAllProduction must be boolean');
  if (typeof daily.pausePublishing !== 'boolean') fail('pausePublishing must be boolean');
  if (!Number.isInteger(daily.dailyPublishQuota) || daily.dailyPublishQuota < 0) {
    fail('invalid dailyPublishQuota');
  }
  if (
    !Number.isInteger(daily.publishedToday) ||
    daily.publishedToday < 0 ||
    daily.publishedToday > daily.dailyPublishQuota
  ) {
    fail('publishedToday exceeds dailyPublishQuota');
  }
  if (!Number.isInteger(daily.minimumSpacingMinutes) || daily.minimumSpacingMinutes < 0) {
    fail('invalid minimumSpacingMinutes');
  }

  return true;
}

export function validateFiles(autonomyPath, dailyPath) {
  const autonomy = JSON.parse(fs.readFileSync(autonomyPath, 'utf8'));
  const daily = JSON.parse(fs.readFileSync(dailyPath, 'utf8'));
  validatePublishingControls(autonomy, daily);
  console.log('Publishing control plane OK');
  return true;
}
