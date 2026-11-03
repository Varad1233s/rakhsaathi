import { test } from 'node:test';
import assert from 'node:assert/strict';
import { haversineKm, approxDistanceKm, isValidCoord } from './geo';
import { canDonate, donorGroupsFor, recipientsFor, BLOOD_GROUPS } from './bloodGroups';
import { canTransition, TRANSITIONS } from './transitions';
import { scoreDonor, isLikelyDuplicate, forecastShortage, nameSimilarity } from './ai';

test('haversine: Kolhapur -> Pune is roughly 200 km', () => {
  const d = haversineKm(16.705, 74.2433, 18.5204, 73.8567);
  assert.ok(d > 190 && d < 240, `got ${d}`);
});
test('haversine: same point is zero and approx distance has 0.5km floor', () => {
  assert.equal(haversineKm(10, 10, 10, 10), 0);
  assert.equal(approxDistanceKm(0.1), 0.5);
  assert.equal(approxDistanceKm(2.31), 2.5);
});
test('coordinate validation', () => {
  assert.equal(isValidCoord(91, 0), false);
  assert.equal(isValidCoord(16.7, 74.2), true);
  assert.equal(isValidCoord(NaN, 74.2), false);
});
test('compatibility: O- universal donor, AB+ universal recipient', () => {
  for (const g of BLOOD_GROUPS) assert.ok(canDonate('O_NEG', g));
  assert.equal(donorGroupsFor('AB_POS').length, 8);
  assert.deepEqual(donorGroupsFor('O_NEG'), ['O_NEG']);
  assert.equal(canDonate('A_POS', 'A_NEG'), false);
  assert.equal(canDonate('B_POS', 'A_POS'), false);
  assert.equal(recipientsFor('AB_POS').length, 1);
});
test('state machine blocks illegal transitions', () => {
  assert.ok(canTransition('PENDING_VERIFICATION', 'VERIFIED'));
  assert.equal(canTransition('PENDING_VERIFICATION', 'FULFILLED'), false);
  assert.equal(canTransition('FULFILLED', 'CANCELLED'), false);
  assert.equal(canTransition('REJECTED', 'VERIFIED'), false);
  assert.deepEqual(TRANSITIONS.EXPIRED, []);
});
test('donor scoring prefers nearer, responsive donors', () => {
  const near = scoreDonor({ distanceKm: 1, daysSinceLastDonation: 200, acceptedBefore: 2, declinedBefore: 0 });
  const far = scoreDonor({ distanceKm: 30, daysSinceLastDonation: 200, acceptedBefore: 0, declinedBefore: 2 });
  assert.ok(near > far);
});
test('duplicate detection', () => {
  const now = new Date();
  const a = { patientName: 'Rahul Sharma', bloodGroup: 'A_POS', hospitalId: 'h1', createdAt: now };
  assert.ok(isLikelyDuplicate(a, { ...a, patientName: 'rahul  sharma.' }));
  assert.equal(isLikelyDuplicate(a, { ...a, hospitalId: 'h2' }), false);
  assert.equal(isLikelyDuplicate(a, { ...a, createdAt: new Date(now.getTime() + 72 * 36e5) }), false);
  assert.ok(nameSimilarity('Amit Kumar', 'Priya Singh') < 0.1);
});
test('shortage forecast', () => {
  assert.equal(forecastShortage(0, 10).level, 'CRITICAL');
  assert.equal(forecastShortage(50, 0).level, 'OK');
  assert.equal(forecastShortage(10, 28).level, 'LOW'); // 2/day -> 5 days
});
