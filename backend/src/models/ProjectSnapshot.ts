import mongoose, { Document, Schema } from 'mongoose';

export interface IProjectSnapshot extends Document {
    projectId: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    files: Array<{
        fileId: string;
        fileName: string;
        content: string;
    }>;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
}

const ProjectSnapshotSchema = new Schema<IProjectSnapshot>(
    {
        projectId: {
            type: Schema.Types.ObjectId,
            ref: 'Project',
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
        },
        files: [{
            fileId: {
                type: String,
                required: true,
            },
            fileName: {
                type: String,
                required: true,
            },
            content: {
                type: String,
                required: true,
            },
        }],
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
ProjectSnapshotSchema.index({ projectId: 1, createdAt: -1 });

// Limit snapshots per project (keep last 50)
ProjectSnapshotSchema.statics.cleanupOldSnapshots = async function (projectId: string, keepCount = 50) {
    const snapshots = await this.find({ projectId })
        .sort({ createdAt: -1 })
        .skip(keepCount)
        .select('_id');

    if (snapshots.length > 0) {
        await this.deleteMany({ _id: { $in: snapshots.map((s: any) => s._id) } });
    }
};

export const ProjectSnapshot = mongoose.model<IProjectSnapshot>('ProjectSnapshot', ProjectSnapshotSchema);
