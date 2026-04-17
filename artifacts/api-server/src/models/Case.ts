import mongoose, { Schema, type Document } from "mongoose";

export interface ICase extends Document {
  caseNumber: string;
  title: string;
  description: string;
  applicant: string;
  respondent: string;
  caseType: "civil" | "criminal" | "commercial";
  status: "Pending" | "Ongoing" | "Closed";
  filedDate: Date;
  lawyerId: mongoose.Types.ObjectId;
  assignedJudgeId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const caseSchema = new Schema<ICase>(
  {
    caseNumber: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    applicant: { type: String, required: true, trim: true },
    respondent: { type: String, required: true, trim: true },
    caseType: {
      type: String,
      required: true,
      enum: ["civil", "criminal", "commercial"],
    },
    status: {
      type: String,
      default: "Pending",
      enum: ["Pending", "Ongoing", "Closed"],
    },
    filedDate: { type: Date, required: true },
    lawyerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedJudgeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
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

export const Case = mongoose.model<ICase>("Case", caseSchema);
