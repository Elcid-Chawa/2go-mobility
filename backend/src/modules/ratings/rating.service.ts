import { Rating, IRating } from './rating.model';
import { Trip } from '../trips/trip.model';
import { Driver } from '../drivers/driver.model';
import { Customer } from '../customers/customer.model';
import { TripStatus } from '../../constants/tripStatus';

export class RatingService {
  static async submitRating(
    tripId: string,
    customerUserId: string,
    score: number,
    comment?: string
  ): Promise<IRating> {
    const customer = await Customer.findOne({ userId: customerUserId });
    const trip = await Trip.findById(tripId);

    if (!trip || !customer || trip.customerId.toString() !== customer._id.toString()) {
      throw { statusCode: 403, message: 'Unauthorized or trip not found' };
    }

    if (!trip.driverId) {
      throw { statusCode: 400, message: 'Trip has no assigned driver to rate' };
    }

    const existingRating = await Rating.findOne({ tripId: trip._id });
    if (existingRating) {
      throw { statusCode: 409, message: 'Trip has already been rated' };
    }

    const rating = await Rating.create({
      tripId: trip._id,
      customerId: customer._id,
      driverId: trip.driverId,
      score,
      comment,
    });

    // Update trip status to RATED
    trip.status = TripStatus.RATED;
    await trip.save();

    // Recompute driver average rating
    const allRatings = await Rating.find({ driverId: trip.driverId });
    const avgScore = allRatings.reduce((sum, r) => sum + r.score, 0) / allRatings.length;
    await Driver.findByIdAndUpdate(trip.driverId, {
      rating: Math.round(avgScore * 10) / 10,
    });

    return rating;
  }
}
