import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
    _id: mongoose.Types.ObjectId
    walletId: mongoose.Types.ObjectId;
    tripId?: mongoose.Types.ObjectId;
    type: 'TRIP_EARNING' | 'COMMISSION' | 'PAYOUT' | 'WITHDRAWAL' | 'BONUS' | 'PENALTY';
    direction: 'CREDIT' | 'DEBIT';
    status: 'SUCCESSFUL' | 'PENDING' | 'FAILED';
    amount: number;
    reference: string; // Unique reference for the transaction/payment
    description: string;
    createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
    {
        walletId: {
            type: Schema.Types.ObjectId,
            ref: 'Wallet',
            required: true,
        },
        tripId: {
            type: Schema.Types.ObjectId,
            ref: 'Trip',
        },
        type: {
            type: String,
            enum: ['TRIP_EARNING', 'COMMISSION', 'PAYOUT', 'WITHDRAWAL', 'BONUS', 'PENALTY'],
            required: true,
        },
        direction: {
            type: String,
            enum: ['CREDIT', 'DEBIT'],
            required: true,
        },
        status: {
            type: String,
            enum: ['SUCCESSFUL', 'PENDING', 'FAILED'],
            default: 'PENDING',
        },
        amount: {
            type: Number,
            required: true,
        },
        reference: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);