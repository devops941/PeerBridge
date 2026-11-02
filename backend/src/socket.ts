import { Server as SocketIOServer } from 'socket.io';
import http from 'http';

let io: SocketIOServer | null = null;

export const initSocket = (server: http.Server): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    },
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] 🟢 Peer connected: ${socket.id}`);

    // Join doubt-specific room for focused real-time updates (answers, helpers)
    socket.on('join_doubt', (doubtId: string) => {
      socket.join(`doubt_${doubtId}`);
      console.log(`[Socket.IO] Client ${socket.id} joined doubt_${doubtId}`);
    });

    socket.on('leave_doubt', (doubtId: string) => {
      socket.leave(`doubt_${doubtId}`);
    });

    // Chat session room
    socket.on('join_session', (sessionId: string) => {
      socket.join(`session_${sessionId}`);
      console.log(`[Socket.IO] Client ${socket.id} joined session_${sessionId}`);
    });

    socket.on('send_message', (data) => {
      if (data.sessionId) {
        io?.to(`session_${data.sessionId}`).emit('new_message', data);
      } else {
        io?.emit('new_message', data);
      }
    });

    // User personal room for instant notifications (follow requests, accepts, chat alerts)
    socket.on('register_user', (userId: string) => {
      if (userId) {
        socket.join(`user_${userId}`);
        console.log(`[Socket.IO] 👤 Registered user ${userId} in room user_${userId}`);
      }
    });

    socket.on('unregister_user', (userId: string) => {
      if (userId) {
        socket.leave(`user_${userId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] 🔴 Peer disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer | null => {
  return io;
};

// ==========================================
// Centralized Event Broadcasters
// ==========================================

export const emitNewDoubt = (doubt: any) => {
  if (!io) return;
  console.log(`[Socket.IO] Broadcasting doubt:new -> ${doubt._id}`);
  io.emit('doubt:new', doubt);
};

export const emitDoubtUpvoted = (payload: {
  doubtId: string;
  isLiked: boolean;
  upvoteCount: number;
  userId?: string;
}) => {
  if (!io) return;
  console.log(`[Socket.IO] Broadcasting doubt:upvoted -> ${payload.doubtId} (${payload.upvoteCount} likes)`);
  io.emit('doubt:upvoted', payload);
  io.to(`doubt_${payload.doubtId}`).emit('doubt:upvoted', payload);
};

export const emitDoubtResolved = (doubtId: string) => {
  if (!io) return;
  console.log(`[Socket.IO] Broadcasting doubt:resolved -> ${doubtId}`);
  io.emit('doubt:resolved', { doubtId, status: 'RESOLVED' });
  io.to(`doubt_${doubtId}`).emit('doubt:resolved', { doubtId, status: 'RESOLVED' });
};

export const emitDoubtDeleted = (doubtId: string) => {
  if (!io) return;
  console.log(`[Socket.IO] Broadcasting doubt:deleted -> ${doubtId}`);
  io.emit('doubt:deleted', { doubtId });
  io.to(`doubt_${doubtId}`).emit('doubt:deleted', { doubtId });
};

export const emitCommentAdded = (payload: {
  doubtId: string;
  answer: any;
  answerCount: number;
}) => {
  if (!io) return;
  console.log(`[Socket.IO] Broadcasting doubt:comment_added -> ${payload.doubtId}`);
  io.emit('doubt:comment_added', payload);
  io.to(`doubt_${payload.doubtId}`).emit('doubt:comment_added', payload);
};

export const emitVolunteerUpdated = (payload: {
  doubtId: string;
  volunteerCount: number;
  volunteerReq?: any;
}) => {
  if (!io) return;
  console.log(`[Socket.IO] Broadcasting doubt:volunteer_updated -> ${payload.doubtId}`);
  io.emit('doubt:volunteer_updated', payload);
  io.to(`doubt_${payload.doubtId}`).emit('doubt:volunteer_updated', payload);
};

export const emitNotification = (recipientId: string, notification: any) => {
  if (!io) return;
  console.log(`[Socket.IO] Emitting notification:new to user_${recipientId}`);
  io.to(`user_${recipientId}`).emit('notification:new', notification);
};

export const emitFollowRequestReceived = (recipientId: string, requestData: any) => {
  if (!io) return;
  console.log(`[Socket.IO] Emitting follow:request_received to user_${recipientId}`);
  io.to(`user_${recipientId}`).emit('follow:request_received', requestData);
};

export const emitFollowAccepted = (followerId: string, payload: any) => {
  if (!io) return;
  console.log(`[Socket.IO] Emitting follow:accepted to user_${followerId}`);
  io.to(`user_${followerId}`).emit('follow:accepted', payload);
};

export const emitStoryNew = (storyData: any) => {
  if (!io) return;
  console.log(`[Socket.IO] Broadcasting story:new -> ${storyData?._id}`);
  io.emit('story:new', storyData);
};

export const emitStoryLiked = (payload: {
  storyId: string;
  userId: string;
  isLiked: boolean;
  likesCount: number;
}) => {
  if (!io) return;
  console.log(`[Socket.IO] Broadcasting story:liked -> ${payload.storyId} (${payload.likesCount} likes)`);
  io.emit('story:liked', payload);
};

export const emitStoryComment = (payload: {
  storyId: string;
  comment: any;
  commentsCount: number;
}) => {
  if (!io) return;
  console.log(`[Socket.IO] Broadcasting story:comment -> ${payload.storyId}`);
  io.emit('story:comment', payload);
};

export const emitStoryDeleted = (storyId: string) => {
  if (!io) return;
  console.log(`[Socket.IO] Broadcasting story:deleted -> ${storyId}`);
  io.emit('story:deleted', { storyId });
};

