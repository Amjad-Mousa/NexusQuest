import { Server, Socket } from 'socket.io';
import { verifyToken, JwtPayload } from '../middleware/auth.js';
import { Message } from '../models/Message.js';

interface ClientAuthPayload {
    token?: string;
}

interface DirectMessagePayload {
    toUserId: string;
    content: string;
}

interface TypingPayload {
    toUserId: string;
}

const userSocketMap = new Map<string, string>();

function getTokenFromSocket(socket: Socket): string | null {
    const { token } = (socket.handshake.auth || {}) as ClientAuthPayload;
    if (typeof token === 'string' && token.trim()) {
        return token;
    }

    const authHeader = socket.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.split(' ')[1];
    }

    return null;
}

export function setupChat(io: Server) {
    const chatNamespace = io.of('/chat');
    chatNamespace.on('connection', async (socket: Socket) => {
        try {
            const rawToken = getTokenFromSocket(socket);
            if (!rawToken) {
                socket.disconnect(true);
                return;
            }

            let decoded: JwtPayload;
            try {
                decoded = verifyToken(rawToken);
            } catch {
                socket.disconnect(true);
                return;
            }

            const userId = decoded.userId;
            userSocketMap.set(userId, socket.id);
            socket.join(userId);

            socket.on('dm:send', async (payload: DirectMessagePayload) => {
                try {
                    const { toUserId, content } = payload;
                    if (!toUserId || !content || !content.trim()) {
                        return;
                    }

                    const message = await Message.create({
                        sender: userId,
                        recipient: toUserId,
                        content: content.trim(),
                    });

                    const messageData = {
                        id: message._id.toString(),
                        senderId: message.sender.toString(),
                        recipientId: message.recipient.toString(),
                        content: message.content,
                        createdAt: message.createdAt,
                        readAt: message.readAt,
                    };

                    socket.emit('dm:sent', messageData);

                    const recipientSocketId = userSocketMap.get(toUserId);
                    if (recipientSocketId) {
                        chatNamespace.to(recipientSocketId).emit('dm:received', messageData);
                    } else {
                        chatNamespace.to(toUserId).emit('dm:received', messageData);
                    }
                } catch {
                    // Swallow errors to avoid crashing the socket handler
                }
            });

            socket.on('typing', (payload: TypingPayload) => {
                try {
                    const { toUserId } = payload;
                    if (!toUserId) return;

                    const recipientSocketId = userSocketMap.get(toUserId);
                    if (recipientSocketId) {
                        chatNamespace.to(recipientSocketId).emit('user-typing', { fromUserId: userId });
                    } else {
                        chatNamespace.to(toUserId).emit('user-typing', { fromUserId: userId });
                    }
                } catch {
                    // Swallow errors
                }
            });

            socket.on('stop-typing', (payload: TypingPayload) => {
                try {
                    const { toUserId } = payload;
                    if (!toUserId) return;

                    const recipientSocketId = userSocketMap.get(toUserId);
                    if (recipientSocketId) {
                        chatNamespace.to(recipientSocketId).emit('user-stop-typing', { fromUserId: userId });
                    } else {
                        chatNamespace.to(toUserId).emit('user-stop-typing', { fromUserId: userId });
                    }
                } catch {
                    // Swallow errors
                }
            });

            socket.on('disconnect', () => {
                for (const [uid, sid] of userSocketMap.entries()) {
                    if (sid === socket.id) {
                        userSocketMap.delete(uid);
                        break;
                    }
                }
            });
        } catch {
            socket.disconnect(true);
        }
    });
}

