import assert from "node:assert/strict";
import test from "node:test";
import { calculateRentalPrice, RateForQuote, RentalPricingError } from "./pricing";

const rate: RateForQuote = {
  currency: "RWF",
  hourlyRate: 5000,
  dailyRate: 50000,
  weeklyRate: 300000,
  minimumHours: 2,
  securityDeposit: 100000,
  chauffeurDailyRate: 20000,
};
const start = new Date("2030-01-01T09:00:00.000Z");
const hoursAfter = (hours: number) => new Date(start.getTime() + hours * 3_600_000);

test("prices hourly rentals and includes the security deposit", () => {
  const quote = calculateRentalPrice(rate, start, hoursAfter(3), "SELF_DRIVE");
  assert.equal(quote.billingUnit, "HOURLY");
  assert.equal(quote.units, 3);
  assert.equal(quote.rentalAmount, 15_000);
  assert.equal(quote.totalDue, 115_000);
});

test("rounds partial days up and charges the chauffeur by rental day", () => {
  const quote = calculateRentalPrice(rate, start, hoursAfter(25), "WITH_DRIVER");
  assert.equal(quote.billingUnit, "DAILY");
  assert.equal(quote.units, 2);
  assert.equal(quote.rentalAmount, 100_000);
  assert.equal(quote.driverAmount, 40_000);
  assert.equal(quote.totalDue, 240_000);
});

test("uses weekly billing at seven days and rounds partial weeks up", () => {
  const quote = calculateRentalPrice(rate, start, hoursAfter(169), "SELF_DRIVE");
  assert.equal(quote.billingUnit, "WEEKLY");
  assert.equal(quote.units, 2);
  assert.equal(quote.rentalAmount, 600_000);
});

test("rejects rentals shorter than the approved minimum and longer than 90 days", () => {
  assert.throws(
    () => calculateRentalPrice(rate, start, hoursAfter(1), "SELF_DRIVE"),
    RentalPricingError,
  );
  assert.throws(
    () => calculateRentalPrice(rate, start, hoursAfter(24 * 90 + 1), "SELF_DRIVE"),
    RentalPricingError,
  );
});
