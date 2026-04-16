import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabaseMiddleware } from './src/utils/supabase/middleware.ts';
import { createClient } from './src/utils/supabase/server.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use(supabaseMiddleware);

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // In-memory state for rooms
  // In a real app, this would be synced with a database like Firebase or MongoDB
  const roomsState: Record<string, any> = {
    'room1': {
      currentAuction: null,
      bidHistory: [],
      liveChat: []
    },
    'room2': {
      currentAuction: null,
      bidHistory: [],
      liveChat: []
    },
    'room3': {
      currentAuction: null,
      bidHistory: [],
      liveChat: []
    }
  };

  const connectedUsers = new Map<string, string>(); // socket.id -> uid

  function getOnlineCount() {
    const uids = new Set<string>();
    
    io.sockets.sockets.forEach((socket) => {
      const uid = connectedUsers.get(socket.id);
      if (uid) {
        uids.add(uid);
      }
    });
    
    return uids.size;
  }

  function broadcastOnlineCount() {
    const count = getOnlineCount();
    console.log(`[Socket.io] Broadcasting registered online count: ${count} (Total sockets: ${io.sockets.sockets.size})`);
    io.emit('online_count', count);
  }

  // Periodic broadcast to ensure sync
  const broadcastInterval = setInterval(broadcastOnlineCount, 30000);

  io.on('connection', (socket) => {
    console.log(`[Socket.io] New connection: ${socket.id}`);
    
    // Notify all clients of the new connection
    broadcastOnlineCount();

    socket.on('user_connected', (uid: string) => {
      if (!uid) return;
      console.log(`[Socket.io] User ${uid} identified on socket ${socket.id}`);
      connectedUsers.set(socket.id, uid);
      broadcastOnlineCount();
    });

    socket.on('user_disconnected', () => {
      console.log(`[Socket.io] User logged out on socket ${socket.id}`);
      connectedUsers.delete(socket.id);
      broadcastOnlineCount();
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Socket disconnected: ${socket.id}`);
      connectedUsers.delete(socket.id);
      broadcastOnlineCount();
    });

    socket.on('request_online_count', () => {
      socket.emit('online_count', getOnlineCount());
    });

    socket.on('join_room', (roomId: string) => {
      const roomPath = roomId.toLowerCase().replace(' ', '');
      socket.join(roomPath);
      console.log(`User ${socket.id} joined room: ${roomPath}`);
      
      // Send initial state
      socket.emit('initial_state', roomsState[roomPath] || {
        currentAuction: null,
        bidHistory: [],
        liveChat: []
      });

      // Send rooms status update to the connecting client
      const status: Record<string, string | null> = {};
      Object.keys(roomsState).forEach(roomKey => {
        const auction = roomsState[roomKey].currentAuction;
        status[roomKey] = (auction && !auction.isSold) ? auction.name : null;
      });
      socket.emit('rooms_status', status);
    });

    socket.on('send_message', (data: { roomId: string; message: any }) => {
      const roomPath = data.roomId.toLowerCase().replace(' ', '');
      const newMessage = {
        id: Math.random().toString(36).substr(2, 9),
        ...data.message,
        timestamp: Date.now()
      };
      
      if (roomsState[roomPath]) {
        roomsState[roomPath].liveChat.push(newMessage);
        if (roomsState[roomPath].liveChat.length > 50) {
          roomsState[roomPath].liveChat.shift();
        }
      }
      
      io.to(roomPath).emit('new_message', newMessage);
    });

    socket.on('place_bid', (data: { roomId: string; bid: any }) => {
      const roomPath = data.roomId.toLowerCase().replace(' ', '');
      const state = roomsState[roomPath];
      
      if (!state || !state.currentAuction || state.currentAuction.isSold) return;

      const amount = data.bid.amount;
      const currentPrice = state.currentAuction.currentPrice || 0;
      const minIncrement = 1000000;

      if (amount < currentPrice + minIncrement) {
        socket.emit('bid_error', 'Bid too low');
        return;
      }

      // Update state
      state.currentAuction.currentPrice = amount;
      state.currentAuction.winner = data.bid.bidder;
      state.currentAuction.winnerUid = data.bid.uid;

      const newBidEntry = {
        id: Math.random().toString(36).substr(2, 9),
        ...data.bid,
        timestamp: Date.now()
      };
      state.bidHistory.unshift(newBidEntry);
      if (state.bidHistory.length > 50) {
        state.bidHistory.pop();
      }

      io.to(roomPath).emit('auction_update', state.currentAuction);
      io.to(roomPath).emit('new_bid', newBidEntry);
    });

    socket.on('update_auction', (data: { roomId: string; auction: any }) => {
      const roomPath = data.roomId.toLowerCase().replace(' ', '');
      if (roomsState[roomPath]) {
        roomsState[roomPath].currentAuction = data.auction;
        roomsState[roomPath].bidHistory = [];
        roomsState[roomPath].liveChat = [];
        io.to(roomPath).emit('auction_update', data.auction);
        io.to(roomPath).emit('clear_history');
        io.to(roomPath).emit('new_message', {
          id: 'system-' + Date.now(),
          userId: 'system',
          userName: 'SYSTEM',
          text: 'Auction updated. Chat and bid history cleared.',
          timestamp: Date.now()
        });
        
        // Broadcast rooms status update to all clients
        broadcastRoomsStatus();
      }
    });

    socket.on('reset_bids', (roomId: string) => {
      const roomPath = roomId.toLowerCase().replace(' ', '');
      if (roomsState[roomPath]) {
        roomsState[roomPath].bidHistory = [];
        io.to(roomPath).emit('clear_history');
      }
    });

    socket.on('clear_chat', (roomId: string) => {
      const roomPath = roomId.toLowerCase().replace(' ', '');
      if (roomsState[roomPath]) {
        roomsState[roomPath].liveChat = [];
        io.to(roomPath).emit('initial_state', roomsState[roomPath]);
      }
    });

    socket.on('archive_auction', (data: { roomId: string; archive: any }) => {
      const roomPath = data.roomId.toLowerCase().replace(' ', '');
      if (roomsState[roomPath]) {
        roomsState[roomPath].currentAuction = null;
        roomsState[roomPath].bidHistory = [];
      }
      // This event is mainly to notify clients to refresh their archives
      // The actual Firestore write happens on the client (admin)
      io.emit('auction_archived', data.archive);
      broadcastRoomsStatus();
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.io] Socket ${socket.id} disconnected. Reason: ${reason}`);
      connectedUsers.delete(socket.id);
      broadcastOnlineCount();
    });
  });

  function broadcastRoomsStatus() {
    const status: Record<string, string | null> = {};
    Object.keys(roomsState).forEach(roomKey => {
      const auction = roomsState[roomKey].currentAuction;
      status[roomKey] = (auction && !auction.isSold) ? auction.name : null;
    });
    io.emit('rooms_status', status);
  }

  // Supabase API endpoints
  app.get('/api/todos', async (req, res) => {
    try {
      const supabase = createClient(req, res);
      const { data, error } = await supabase.from('todos').select();
      
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // OAuth Callback for Popups
  app.get(['/auth/callback', '/auth/callback/'], (req, res) => {
    res.send(`
      <html>
        <head>
          <title>Authenticating...</title>
        </head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif; background: #0a0a2e; color: white;">
            <p>Authentication successful. This window should close automatically.</p>
          </div>
        </body>
      </html>
    `);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
