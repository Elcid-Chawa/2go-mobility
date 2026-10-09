import mongoose, { Schema, Document } from 'mongoose';

export interface IWallet extends Document {
    _id: mongoose.Types.ObjectId;
    ownerId: mongoose.Types.ObjectId; // Reference to the user or driver who owns the wallet
    balance: number; // Current balance in the wallet
    currency: string; // Currency code (e.g., USD, EUR)
    status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED'; // Status of the wallet
    createdAt: Date; // Timestamp when the wallet was created
    updatedAt: Date; // Timestamp when the wallet was last updated
}

const WalletSchema = new Schema<IWallet>(
    {
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        balance: {
            type: Number,
            default: 0,
        },
        currency: {
            type: String,
            default: 'RWF', // Default currency is Rwandan Franc
        },
        status: {
            type: String,
            enum: ['ACTIVE', 'SUSPENDED', 'CLOSED'],
            default: 'ACTIVE',
        },
    },
    {
        timestamps: true,
    }
);

export const Wallet = mongoose.model<IWallet>('Wallet', WalletSchema);
