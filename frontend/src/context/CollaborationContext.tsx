import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getStoredUser } from '../services/authService';
import {
  CollaborationSession,
  CollaborationParticipant,
  CollaborationMessage,
  CodeChange,
  CursorPosition,
  JoinSessionData,
} from '../types/collaboration';
import { getApiUrl } from '../utils/apiHelpers';

const API_URL = getApiUrl();

interface CollaborationContextType {
  socket: Socket | null;
  currentSession: CollaborationSession | null;
  participants: CollaborationParticipant[];
  messages: CollaborationMessage[];
  isConnected: boolean;
  userColor: string;
  joinSession: (data: JoinSessionData) => void;
  leaveSession: () => void;
  sendCodeChange: (change: CodeChange) => void;
  sendCursorMove: (cursor: CursorPosition) => void;
  sendMessage: (message: string, type?: 'text' | 'code', metadata?: any) => void;
  executeCode: (code: string, language: string) => void;
  onCodeChange: (callback: (change: CodeChange) => void) => void;
  onCursorMove: (callback: (cursor: CursorPosition) => void) => void;
  onExecutionResult: (callback: (result: any) => void) => void;
}

const CollaborationContext = createContext<CollaborationContextType | undefined>(undefined);

export const useCollaboration = () => {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within CollaborationProvider');
  }
  return context;
};

interface CollaborationProviderProps {
  children: React.ReactNode;
}

export const CollaborationProvider: React.FC<CollaborationProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentSession, setCurrentSession] = useState<CollaborationSession | null>(null);
  const [participants, setParticipants] = useState<CollaborationParticipant[]>([]);
  const [messages, setMessages] = useState<CollaborationMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [userColor, setUserColor] = useState('#FF6B6B');

  const codeChangeCallbacks = useRef<((change: CodeChange) => void)[]>([]);
  const cursorMoveCallbacks = useRef<((cursor: CursorPosition) => void)[]>([]);
  const executionResultCallbacks = useRef<((result: any) => void)[]>([]);

  // Initialize socket connection
  useEffect(() => {
    // Connect to the /collaboration namespace with /nexusquest/socket.io path
    const SOCKET_ORIGIN = new URL(API_URL).origin;
    const newSocket = io(SOCKET_ORIGIN + '/collaboration', {
      path: '/nexusquest/socket.io',
      transports: ['polling', 'websocket'],
      autoConnect: false,
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('Connected to collaboration server');
      setIsConnected(true);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Collaboration connection error:', error.message);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from collaboration server');
      setIsConnected(false);
    });

    newSocket.on('session-joined', (data: { session: CollaborationSession; userColor: string }) => {
      console.log('Joined session:', data.session.sessionId);
      setCurrentSession(data.session);
      setParticipants(data.session.participants);
      setUserColor(data.userColor);
    });

    newSocket.on('user-joined', (data: { userId: string; username: string; color: string }) => {
      console.log('User joined:', data.username);
      setParticipants((prev) => [
        ...prev,
        {
          userId: data.userId,
          username: data.username,
          role: 'editor',
          joinedAt: new Date(),
          isActive: true,
          color: data.color,
        },
      ]);
    });

    newSocket.on('user-left', (data: { userId: string; username: string }) => {
      console.log('User left:', data.username);
      setParticipants((prev) => prev.filter((p) => p.userId !== data.userId));
    });

    newSocket.on('code-change', (change: CodeChange) => {
      codeChangeCallbacks.current.forEach((callback) => callback(change));
    });

    newSocket.on('cursor-move', (cursor: CursorPosition) => {
      cursorMoveCallbacks.current.forEach((callback) => callback(cursor));
      
      // Update participant cursor position
      setParticipants((prev) =>
        prev.map((p) =>
          p.userId === cursor.userId
            ? { ...p, cursor: cursor.cursor }
            : p
        )
      );
    });

    newSocket.on('chat-message', (message: CollaborationMessage) => {
      setMessages((prev) => [...prev, message]);
    });

    newSocket.on('code-executing', (data: { userId: string; language: string }) => {
      console.log('Code executing:', data);
    });

    newSocket.on('execution-result', (data: { sessionId: string; userId: string; result: any }) => {
      executionResultCallbacks.current.forEach((callback) => callback(data.result));
    });

    newSocket.on('error', (error: { message: string }) => {
      console.error('Collaboration error:', error.message);
      alert(error.message);
    });

    setSocket(newSocket);

    return () => {
      try {
        // Disable reconnection and clear listeners to avoid lingering engine
        const mgr: any = (newSocket as any).io;
        if (mgr && mgr.opts) {
          mgr.opts.reconnection = false;
          mgr.backoff && typeof mgr.backoff.reset === 'function' && mgr.backoff.reset();
        }
        newSocket.off();
        // @ts-ignore
        if (typeof (newSocket as any).removeAllListeners === 'function') {
          // @ts-ignore
          (newSocket as any).removeAllListeners();
        }
        if (newSocket.connected) {
          newSocket.disconnect();
        }
        if (typeof (newSocket as any).close === 'function') {
          (newSocket as any).close();
        }
        if (mgr) {
          try {
            mgr.removeAllListeners && mgr.removeAllListeners();
            mgr.engine && typeof mgr.engine.close === 'function' && mgr.engine.close();
          } catch {}
        }
      } catch {}
    };
  }, []);

  const joinSession = useCallback(
    (data: JoinSessionData) => {
      if (socket && !socket.connected) {
        socket.connect();
      }
      socket?.emit('join-session', data);
    },
    [socket]
  );

  const leaveSession = useCallback(() => {
    socket?.emit('leave-session');
    setCurrentSession(null);
    setParticipants([]);
    setMessages([]);
    if (socket) {
      try {
        const mgr: any = (socket as any).io;
        if (mgr && mgr.opts) {
          mgr.opts.reconnection = false;
          mgr.backoff && typeof mgr.backoff.reset === 'function' && mgr.backoff.reset();
        }
        socket.off();
        // @ts-ignore
        if (typeof (socket as any).removeAllListeners === 'function') {
          // @ts-ignore
          (socket as any).removeAllListeners();
        }
        socket.disconnect();
        if (typeof (socket as any).close === 'function') {
          (socket as any).close();
        }
        if (mgr) {
          try {
            mgr.removeAllListeners && mgr.removeAllListeners();
            mgr.engine && typeof mgr.engine.close === 'function' && mgr.engine.close();
          } catch {}
        }
      } catch {}
    }
  }, [socket]);

  const sendCodeChange = useCallback(
    (change: CodeChange) => {
      socket?.emit('code-change', change);
    },
    [socket]
  );

  const sendCursorMove = useCallback(
    (cursor: CursorPosition) => {
      socket?.emit('cursor-move', cursor);
    },
    [socket]
  );

  const sendMessage = useCallback(
    (message: string, type: 'text' | 'code' = 'text', metadata?: any) => {
      if (!currentSession) return;

      const user = getStoredUser();
      if (!user) return;
      socket?.emit('chat-message', {
        sessionId: currentSession.sessionId,
        userId: user.id,
        username: user.name,
        message,
        type,
        metadata,
      });
    },
    [socket, currentSession]
  );

  const executeCode = useCallback(
    (code: string, language: string) => {
      if (!currentSession) return;

      const user = getStoredUser();
      if (!user) return;
      socket?.emit('execute-code', {
        sessionId: currentSession.sessionId,
        userId: user.id,
        code,
        language,
      });
    },
    [socket, currentSession]
  );

  const onCodeChange = useCallback((callback: (change: CodeChange) => void) => {
    codeChangeCallbacks.current.push(callback);
    return () => {
      codeChangeCallbacks.current = codeChangeCallbacks.current.filter((cb) => cb !== callback);
    };
  }, []);

  const onCursorMove = useCallback((callback: (cursor: CursorPosition) => void) => {
    cursorMoveCallbacks.current.push(callback);
    return () => {
      cursorMoveCallbacks.current = cursorMoveCallbacks.current.filter((cb) => cb !== callback);
    };
  }, []);

  const onExecutionResult = useCallback((callback: (result: any) => void) => {
    executionResultCallbacks.current.push(callback);
    return () => {
      executionResultCallbacks.current = executionResultCallbacks.current.filter(
        (cb) => cb !== callback
      );
    };
  }, []);

  const value: CollaborationContextType = {
    socket,
    currentSession,
    participants,
    messages,
    isConnected,
    userColor,
    joinSession,
    leaveSession,
    sendCodeChange,
    sendCursorMove,
    sendMessage,
    executeCode,
    onCodeChange,
    onCursorMove,
    onExecutionResult,
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
};
