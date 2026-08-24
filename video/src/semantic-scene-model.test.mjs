import test from 'node:test';
import assert from 'node:assert/strict';
import {entityShapeForKey, normalizeShotKind, semanticVisualType} from './semantic-scene-model.mjs';

test('maps common hidden-mechanism subjects to distinct glyphs', () => {
  assert.equal(entityShapeForKey('battery'),'battery');
  assert.equal(entityShapeForKey('phone'),'phone');
  assert.equal(entityShapeForKey('eye'),'eye');
  assert.equal(entityShapeForKey('wifi'),'wifi');
  assert.notEqual(entityShapeForKey('battery'),entityShapeForKey('phone'));
});

test('normalizes unknown shot kinds without falling back to a random content template', () => {
  assert.equal(normalizeShotKind('cause-effect'),'cause-effect');
  assert.equal(normalizeShotKind('nonsense'),'object-focus');
});

test('maps semantic shot relationships to renderer-safe legacy visual types', () => {
  assert.equal(semanticVisualType({kind:'contrast',subject:{key:'battery'}}),'compare');
  assert.equal(semanticVisualType({kind:'network',subject:{key:'grid'}}),'map');
  assert.equal(semanticVisualType({kind:'timeline',subject:{key:'phone'}}),'timeline');
  assert.equal(semanticVisualType({kind:'process',subject:{key:'brain'}}),'brain');
});
