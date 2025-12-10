export interface CollaborationParticipant {
  userId: string;
  username: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: Date;
  isActive: boolean;
  cursor?: {
    line: number;
    column: number;
  };
  color: string;
}

export interface CollaborationSession {
  sessionId: string;
  name: string;
  description?: string;
  owner: string;
  participants: CollaborationParticipant[];
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
  updatedAt?: Date;
  lastActivity: Date;
}

export interface CollaborationMessage {
  _id: string;
  sessionId: string;
  userId: string;
  username: string;
  message: string;
  type: 'text' | 'system' | 'code' | 'file';
  metadata?: {
    language?: string;
    fileName?: string;
    lineNumber?: number;
  };
  createdAt: Date;
}

export interface CodeChange {
  sessionId: string;
  userId: string;
  username: string;
  changes: {
    from: { line: number; ch: number };
    to: { line: number; ch: number };
    text: string[];
    removed?: string[];
  };
  timestamp: number;
}

export interface CursorPosition {
  sessionId: string;
  userId: string;
  username: string;
  cursor: {
    line: number;
    column: number;
  };
  color: string;
}

export interface CreateSessionData {
  name: string;
  description?: string;
  language?: string;
  isPublic?: boolean;
  maxParticipants?: number;
  settings?: Partial<CollaborationSession['settings']>;
}

export interface JoinSessionData {
  sessionId: string;
  userId: string;
  username: string;
}
