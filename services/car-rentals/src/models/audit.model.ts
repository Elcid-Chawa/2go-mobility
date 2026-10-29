import mongoose, { Schema } from "mongoose";

const auditSchema = new Schema(
  {
    actorId: { type: String, required: true, index: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true },
    resourceType: { type: String, required: true },
    resourceId: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
auditSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });

export const RentalAuditModel = mongoose.model("RentalAudit", auditSchema);
