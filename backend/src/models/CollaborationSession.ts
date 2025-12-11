import mongoose, { Document, Schema } from 'mongoose';

export interface ICollaborationSession extends Document {
  sessionId: string;
  name: string;
  description?: string;
  owner: mongoose.Types.ObjectId;
  participants: Array<{
    userId: mongoose.Types.ObjectId;
    username: string;
    role: 'owner' | 'editor' | 'viewer';
    joinedAt: Date;
    isActive: boolean;
    cursor?: {
      line: number;
      column: number;
    };
    color: string;
  }>;
  code: string;
  language: string;
  isActive: boolean;
  isPublic: boolean;
  maxParticipants: number;
  settings: {
    allowChat: boolean;
    allowVoice: boolean;
    allowEdit: boolean;
    autoSave: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  lastActivity: Date;
}

const CollaborationSessionSchema = new Schema<ICollaborationSession>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    participants: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        username: {
          type: String,
          required: true,
        },
        role: {
          type: String,
          enum: ['owner', 'editor', 'viewer'],
          default: 'editor',
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
        cursor: {
          line: Number,
          column: Number,
        },
        color: {
          type: String,
          required: true,
        },
      },
    ],
    code: {
      type: String,
      default: '',
    },
    language: {
      type: String,
      required: true,
      default: 'javascript',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    maxParticipants: {
      type: Number,
      default: 10,
      min: 2,
      max: 50,
    },
    settings: {
      allowChat: {
        type: Boolean,
        default: true,
      },
      allowVoice: {
        type: Boolean,
        default: false,
      },
      allowEdit: {
        type: Boolean,
        default: true,
      },
      autoSave: {
        type: Boolean,
        default: true,
      },
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for finding active sessions
CollaborationSessionSchema.index({ isActive: 1, lastActivity: -1 });
CollaborationSessionSchema.index({ owner: 1, isActive: 1 });

// Update lastActivity on save
CollaborationSessionSchema.pre('save', function () {
  this.lastActivity = new Date();
});

export const CollaborationSession = mongoose.model<ICollaborationSession>(
  'CollaborationSession',
  CollaborationSessionSchema
);
