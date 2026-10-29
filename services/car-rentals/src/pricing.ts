export interface RateForQuote {
  currency: string;
  hourlyRate: number;
  dailyRate: number;
  weeklyRate: number;
  minimumHours: number;
  securityDeposit: number;
  chauffeurDailyRate: number;
}

export class RentalPricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RentalPricingError";
  }
}

export function calculateRentalPrice(
  rate: RateForQuote,
  startAt: Date,
  endAt: Date,
  driverOption: "SELF_DRIVE" | "WITH_DRIVER",
) {
  const durationHours = Math.ceil((endAt.getTime() - startAt.getTime()) / 3_600_000);
  if (!Number.isFinite(durationHours) || durationHours < rate.minimumHours) {
    throw new RentalPricingError(`The minimum rental duration is ${rate.minimumHours} hours.`);
  }
  if (durationHours > 24 * 90) {
    throw new RentalPricingError("Rentals cannot exceed 90 days.");
  }

  let billingUnit: "HOURLY" | "DAILY" | "WEEKLY";
  let units: number;
  let unitRate: number;
  if (durationHours < 24) {
    billingUnit = "HOURLY";
    units = durationHours;
    unitRate = rate.hourlyRate;
  } else if (durationHours < 168) {
    billingUnit = "DAILY";
    units = Math.ceil(durationHours / 24);
    unitRate = rate.dailyRate;
  } else {
    billingUnit = "WEEKLY";
    units = Math.ceil(durationHours / 168);
    unitRate = rate.weeklyRate;
  }

  const rentalAmount = units * unitRate;
  const driverAmount = driverOption === "WITH_DRIVER"
    ? Math.ceil(durationHours / 24) * rate.chauffeurDailyRate
    : 0;
  return {
    durationHours,
    billingUnit,
    units,
    unitRate,
    rentalAmount,
    driverAmount,
    securityDeposit: rate.securityDeposit,
    totalDue: rentalAmount + driverAmount + rate.securityDeposit,
    currency: rate.currency,
  };
}
