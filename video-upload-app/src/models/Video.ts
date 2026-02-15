import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVideo extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  publicId: string;
  secureUrl: string;
  format: string;
  duration: number;
  width: number;
  height: number;
  aspectRatio: string;
  bitRate?: number;
  frameRate?: number;
  videoCodec?: string;
  audioCodec?: string;
  fileSize: number;
  thumbnail: string;
  isMultipart?: boolean;
  totalParts?: number;
  parts?: Array<{
    publicId: string;
    secureUrl: string;
    format: string;
    duration: number;
    width: number;
    height: number;
    aspectRatio?: string;
    bitRate?: number;
    frameRate?: number;
    videoCodec?: string;
    audioCodec?: string;
    fileSize: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const VideoSchema = new Schema<IVideo>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide a title'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    publicId: {
      type: String,
      required: true,
      unique: true,
    },
    secureUrl: {
      type: String,
      required: true,
    },
    format: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    width: {
      type: Number,
      required: true,
    },
    height: {
      type: Number,
      required: true,
    },
    aspectRatio: {
      type: String,
    },
    bitRate: {
      type: Number,
    },
    frameRate: {
      type: Number,
    },
    videoCodec: {
      type: String,
    },
    audioCodec: {
      type: String,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    thumbnail: {
      type: String,
      required: true,
    },
    isMultipart: {
      type: Boolean,
      default: false,
    },
    totalParts: {
      type: Number,
      default: 1,
    },
    parts: [
      {
        publicId: { type: String, required: true },
        secureUrl: { type: String, required: true },
        format: { type: String, required: true },
        duration: { type: Number, required: true },
        width: { type: Number, required: true },
        height: { type: Number, required: true },
        aspectRatio: { type: String },
        bitRate: { type: Number },
        frameRate: { type: Number },
        videoCodec: { type: String },
        audioCodec: { type: String },
        fileSize: { type: Number, required: true },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
VideoSchema.index({ userId: 1, createdAt: -1 });
VideoSchema.index({ title: 'text' });

const Video: Model<IVideo> = mongoose.models.Video || mongoose.model<IVideo>('Video', VideoSchema);

export default Video;
