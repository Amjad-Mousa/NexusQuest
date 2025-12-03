import mongoose, { Document, Schema } from 'mongoose';
import { NotificationType } from '../enums/NotificationType';


export interface INotification extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    type: NotificationType;
    message: string;
    relatedTask?: mongoose.Types.ObjectId;
    metadata?: {
        points?: number;
        taskTitle?: string;
        [key: string]: any;
    }
    read: boolean;
    createdAt: Date;
    updatedAt: Date;
    readAt?: Date;
}

const notificationSchema = new Schema<INotification>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        type: {
            type: String,
            enum: Object.values(NotificationType),
            required: true
        },
        message: {
            type: String,
            required: true
        },
        relatedTask: {
            type: Schema.Types.ObjectId,
            ref: 'Task',
            required: false
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: {},
            required: false
        },
        read: {
            type: Boolean,
            default: false,
            index: true
        },
        readAt: {
            type: Date,
            required: false
        }
    },
    {
        timestamps: true
    }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);

