import mongoose, { Document, Schema } from 'mongoose';

export interface ITutorialSettings extends Document {
  _id: mongoose.Types.ObjectId;
  tutorialId: string; // The ID from defaultTutorials
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const tutorialSettingsSchema = new Schema<ITutorialSettings>(
  {
    tutorialId: {
      type: String,
      required: true,
      unique: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const TutorialSettings = mongoose.model<ITutorialSettings>('TutorialSettings', tutorialSettingsSchema);

export default TutorialSettings;
