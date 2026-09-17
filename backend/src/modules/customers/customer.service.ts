import { Customer, ICustomer, ISavedPlace } from './customer.model';
import { User } from '../users/user.model';

export class CustomerService {
  static async getProfileByUserId(userId: string): Promise<any> {
    const customer = await Customer.findOne({ userId }).populate('userId', 'name email phone role status');
    if (!customer) {
      throw { statusCode: 404, message: 'Customer profile not found' };
    }
    return customer;
  }

  static async updateProfile(userId: string, data: { name?: string; phone?: string }): Promise<any> {
    if (data.name || data.phone) {
      const updates: { name?: string; phone?: string } = {};
      if (data.name?.trim()) updates.name = data.name.trim().slice(0, 100);
      if (data.phone?.trim()) updates.phone = data.phone.trim().slice(0, 30);
      await User.findByIdAndUpdate(userId, { $set: updates });
    }
    return this.getProfileByUserId(userId);
  }

  static async addSavedPlace(userId: string, place: ISavedPlace): Promise<ICustomer> {
    const customer = await Customer.findOneAndUpdate(
      { userId },
      { $push: { savedPlaces: place } },
      { new: true }
    );
    if (!customer) {
      throw { statusCode: 404, message: 'Customer not found' };
    }
    return customer;
  }

  static async removeSavedPlace(userId: string, placeId: string): Promise<ICustomer> {
    const customer = await Customer.findOneAndUpdate(
      { userId },
      { $pull: { savedPlaces: { _id: placeId } } },
      { new: true }
    );
    if (!customer) {
      throw { statusCode: 404, message: 'Customer not found' };
    }
    return customer;
  }
}
