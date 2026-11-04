import assert from "node:assert/strict";
import test from "node:test";
import { calculateDeliveryEstimate } from "./pricing";

const pricing = {
  baseFee: 1000,
  perKmRate: 300,
  perKgRate: 100,
  roadFactor: 1.25,
  currency: "RWF",
};

test("delivery fare uses road-adjusted distance, weight, and configured currency", () => {
  const estimate = calculateDeliveryEstimate([30.0619, -1.9441], [30.1053, -1.9536], 2, pricing);
  assert.ok(estimate.distanceKm > 5.5);
  assert.ok(estimate.distanceKm < 7);
  assert.equal(estimate.currency, "RWF");
  assert.equal(estimate.fare % 100, 0);
  assert.ok(estimate.fare > pricing.baseFee);
});

test("a same-point request only charges the base fare and parcel weight", () => {
  const estimate = calculateDeliveryEstimate([30, -2], [30, -2], 1, pricing);
  assert.equal(estimate.distanceKm, 0);
  assert.equal(estimate.fare, 1100);
});
