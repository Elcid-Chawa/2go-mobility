import assert from "node:assert/strict";
import test from "node:test";
import { moveEndAt, vehicleFitsMove } from "./move.rules";

test("vehicle matching respects requested class, load volume, and required crew", () => {
  const vehicle = { vehicleType: "MEDIUM_TRUCK" as const, volumeM3: 20, crewCapacity: 4 };
  assert.equal(vehicleFitsMove(vehicle, { preferredVehicleType: "MEDIUM_TRUCK", estimatedVolumeM3: 18, crewRequired: 3 }), true);
  assert.equal(vehicleFitsMove(vehicle, { preferredVehicleType: "LARGE_TRUCK", estimatedVolumeM3: 18, crewRequired: 3 }), false);
  assert.equal(vehicleFitsMove(vehicle, { estimatedVolumeM3: 21, crewRequired: 3 }), false);
  assert.equal(vehicleFitsMove(vehicle, { estimatedVolumeM3: 18, crewRequired: 5 }), false);
});

test("move reservation end is derived from the scheduled start and estimated duration", () => {
  const start = new Date("2026-11-01T08:00:00.000Z");
  assert.equal(moveEndAt(start, 6).toISOString(), "2026-11-01T14:00:00.000Z");
});
