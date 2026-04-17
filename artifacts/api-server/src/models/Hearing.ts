import mongoose, { Schema, type Document } from "mongoose";

export interface IHearing extends Document {
  caseId: mongoose.Types.ObjectId;
  hearingDate: Date;
  hearingTime: string;
  location: string;
  description?: string;
  judgeId: mongoose.Types.ObjectId;
  status: "Scheduled" | "Completed" | "Adjourned" | "Postponed";
  outcome?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const hearingSchema = new Schema<IHearing>(
  {
    caseId: {
      type: Schema.Types.ObjectId,
      ref: "Case",
      required: true,
    },
    hearingDate: { type: Date, required: true },
    hearingTime: {
      type: String,
      required: true,
      match: [/^\d{2}:\d{2}$/, "Hearing time must be in HH:MM format"],
    },
    location: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    judgeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      default: "Scheduled",
      enum: ["Scheduled", "Completed", "Adjourned", "Postponed"],
    },
    outcome: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete (ret as Record<string, unknown>)["_id"];
        delete (ret as Record<string, unknown>)["__v"];
      },
    },
  },
);

export const Hearing = mongoose.model<IHearing>("Hearing", hearingSchema);
