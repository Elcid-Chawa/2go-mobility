// This file defines the Mongoose schema and TypeScript interface for the Ticket model in the backend application. It includes fields for ticket number, channel, category, user ID, subject, description, status, priority, assigned support agent, resolution details, messages exchanged regarding the ticket, and timestamps for creation and updates. The schema enforces data types and constraints for each field to ensure data integrity in the MongoDB database.
// Central repository for customer/driver issues, phone call logs, and support instructions. This model is used to track and manage support tickets raised by users, including their status, priority, and communication history.
import mongoose, { Schema, Document } from 'mongoose';

export interface ITicket extends Document {
  _id: mongoose.Types.ObjectId;
  ticketNumber: string; // For example, "TCKT-20230001"
  channel: 'EMAIL' | 'PHONE' | 'IN_APP';
  category: 'TECHNICAL' | 'BILLING' | 'GENERAL' | 'FEEDBACK' | 'FARE_DISPUTE' | 'LOST_FOUND' | 'SAFETY' | 'OTHER';
  userId: mongoose.Types.ObjectId;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: mongoose.Types.ObjectId; // Support agent or team member
  resolution?: string; // Resolution details if resolved
  messages: {
    sender: mongoose.Types.ObjectId;
    content: string;
    sentAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const TicketSchema = new Schema<ITicket>(
  {
    ticketNumber: { type: String, required: true, unique: true },
    channel: {
      type: String, 
      enum: ['EMAIL', 'PHONE', 'IN_APP'],
      required: true
    },
    category: {
      type: String,
      enum: ['TECHNICAL', 'BILLING', 'GENERAL', 'FEEDBACK', 'FARE_DISPUTE', 'LOST_FOUND', 'SAFETY', 'OTHER'],
      required: true
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
      default: 'OPEN'
    },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    resolution: { type: String },
    messages: [{
      sender: { type: Schema.Types.ObjectId, ref: 'User' },
      content: { type: String, required: true },
      sentAt: { type: Date, default: Date.now }
    }]
    },
    {
      timestamps: true
    }
);

export const TicketModel = mongoose.model<ITicket>('Ticket', TicketSchema);