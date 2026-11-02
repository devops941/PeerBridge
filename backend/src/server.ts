import http from 'http';
import app from './app';
import { connectDB } from './config/db';
import { ENV } from './config/env';
import { initSocket } from './socket';

const server = http.createServer(app);

// Initialize Socket.IO for real-time doubts, comments & messaging
initSocket(server);

const startServer = async () => {
  await connectDB();
  server.listen(Number(ENV.PORT), '0.0.0.0', () => {
    console.log(`===============================================`);
    console.log(`🚀 PeerBridge Backend running on port ${ENV.PORT}`);
    console.log(`📡 Local LAN URL: http://192.168.1.17:${ENV.PORT}/api/v1/health`);
    console.log(`📡 Localhost URL: http://localhost:${ENV.PORT}/api/v1/health`);
    console.log(`💬 Socket.IO real-time server ready`);
    console.log(`===============================================`);
  });
};

startServer();
