import mongoose, { Document, Schema } from 'mongoose';

export interface IFileSnapshot extends Document {
    projectId: mongoose.Types.ObjectId;
    fileId: string;
    fileName: string;
    content: string;
    message: string;
    createdAt: Date;
    createdBy: mongoose.Types.ObjectId;
}

const FileSnapshotSchema = new Schema<IFileSnapshot>(
    {
        projectId: {
            type: Schema.Types.ObjectId,
            ref: 'Project',
            required: true,
            index: true,
        },
        fileId: {
            type: String,
            required: true,
            index: true,
        },
        fileName: {
            type: String,
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            default: 'Auto-save',
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient queries
FileSnapshotSchema.index({ projectId: 1, fileId: 1, createdAt: -1 });

// Limit snapshots per file (keep last 20)
FileSnapshotSchema.statics.cleanupOldSnapshots = async function (projectId: string, fileId: string, keepCount = 20) {
    const snapshots = await this.find({ projectId, fileId })
        .sort({ createdAt: -1 })
        .skip(keepCount)
        .select('_id');

    if (snapshots.length > 0) {
        await this.deleteMany({ _id: { $in: snapshots.map((s: any) => s._id) } });
    }
};

export const FileSnapshot = mongoose.model<IFileSnapshot>('FileSnapshot', FileSnapshotSchema);
