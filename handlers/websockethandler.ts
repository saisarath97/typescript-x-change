import { WebSocketServer, WebSocket } from 'ws';
import { redisClient } from '../utils/redisClient'; // Assuming redisClient is correctly typed elsewhere
import http from 'http';

interface MessageData {
  action: 'subscribe' | 'unsubscribe';
  symbol: string;
  channel: string;
}

interface RedisData {
  symbol: string;
  type: string;
  data: any[];  // Adjust the type of data depending on what structure it holds
}

const clients: Map<WebSocket, Set<string>> = new Map(); // Map to track client subscriptions

let wss: WebSocketServer;

// Create WebSocket server
export const createWebSocketServer = (server: http.Server, websocketPort: number): void => {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
    clients.set(ws, new Set());
    ws.send('Welcome to new websocket server');

    ws.on('message', (message: string) => {
      let data: MessageData;
      try {
        data = JSON.parse(message);
        handleSubscribe(ws, data);
        console.log(`Request from connection: ${message}`);
      } catch (err) {
        console.error('Invalid JSON received:', message);
        console.error('Error parsing JSON:', (err as Error).message);
        ws.send('Bad request or invalid JSON');
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log('Client disconnected');
    });
  });

  server.listen(websocketPort, () => {
    console.log(`WebSocket server is listening on http://localhost:${websocketPort}`);
  });
};

// Handle subscription and channels for a client
const handleSubscribe = async (ws: WebSocket, data: MessageData): Promise<void> => {
  if (data.action === 'subscribe') {
    const { symbol, channel } = data;
    if (channel) {
      clients.get(ws)?.add(`${symbol}_${channel}`);
      console.log(`Client subscribed to ${symbol} (${channel})`);
      await sendInitialData(ws, symbol, channel);
    }
  } else if (data.action === 'unsubscribe') {
    const { symbol, channel } = data;
    if (channel) {
      clients.get(ws)?.delete(`${symbol}_${channel}`);
      console.log(`Client unsubscribed from ${symbol} (${channel})`);
    }
  }
};

// Send initial data (e.g., 100 asks and bids) for orderbook data
const sendInitialData = async (ws: WebSocket, symbol: string, channel: string): Promise<void> => {
  try {
    const redisKey = `${symbol}_${channel}`;
    const redisData = await redisClient.get(redisKey);

    if (redisData) {
      const parsedData: RedisData = JSON.parse(redisData);
      console.log('Redis data:', parsedData.data);

      ws.send(JSON.stringify({
        symbol: parsedData.symbol,
        data: parsedData.data,
        type: parsedData.type,
      }));

      console.log(`Sent initial 100 asks and bids for ${symbol} (${channel})`);
    } else {
      ws.send(JSON.stringify({ type: 'error', message: 'No data available in Redis' }));
    }
  } catch (err) {
    console.error('Redis get error:', err);
  }
};

// Send data from Redis for other channels
const sendDataFromRedis = async (ws: WebSocket, symbol: string, channel: string): Promise<void> => {
  try {
    const redisKey = `${symbol}_${channel}`;
    const data = await redisClient.get(redisKey);

    if (data) {
      ws.send(JSON.stringify({
        type: 'initial_data',
        symbol,
        channel,
        data: JSON.parse(data),
      }));

      console.log(`Sent initial data for ${symbol} (${channel})`);
    } else {
      ws.send(JSON.stringify({ type: 'error', message: `No data available for ${symbol} (${channel})` }));
    }
  } catch (err) {
    console.error('Redis get error:', err);
  }
};

// Broadcast data to subscribed clients
export const broadcastData = (symbol: string, streamType: string, jsonData: any): void => {
  wss.clients.forEach((client: WebSocket) => {
    if (client.readyState === WebSocket.OPEN && clients.get(client)?.has(`${symbol}_${streamType}`)) {
      client.send(JSON.stringify(jsonData));
    }
  });
};
