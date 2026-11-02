import { io, Socket } from 'socket.io-client';
import { API_URL } from './api';

// Extract the base host (e.g. http://192.168.1.8:5000) from API_URL
export const SOCKET_URL = API_URL.replace('/api/v1', '');

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });

    socket.on('connect', () => {
      console.log(`[Socket.IO Client] 🟢 Connected to ${SOCKET_URL} (ID: ${socket?.id})`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO Client] 🔴 Disconnected: ${reason}`);
    });

    socket.on('connect_error', (err) => {
      console.warn(`[Socket.IO Client] ⚠️ Connection error:`, err.message);
    });
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

export const joinDoubtRoom = (doubtId: string) => {
  const s = getSocket();
  s.emit('join_doubt', doubtId);
};

export const leaveDoubtRoom = (doubtId: string) => {
  if (socket && socket.connected) {
    socket.emit('leave_doubt', doubtId);
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
