import { WebSocketServer, WebSocket } from 'ws';
import { redisClient } from '../utils/redisClient'; // Assuming redisClient is correctly typed elsewhere
import http from 'http';
import { getHistoricalKlineData } from '../binanceservice/binanceapi/binanceApiService'; // Assuming this function fetches historical kline data


interface MessageData {
  action: 'subscribe' | 'unsubscribe';
  symbol: string;
  channel: string;
  startTime?: number;   // Optional start time for kline requests (in milliseconds)
  endTime?: number; 
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
// const handleSubscribe = async (ws: WebSocket, data: MessageData): Promise<void> => {
//   if (data.action === 'subscribe') {
//     const { symbol, channel } = data;
//     if (channel) {
//       clients.get(ws)?.add(`${symbol}_${channel}`);
//       console.log(`Client subscribed to ${symbol} (${channel})`);
//       await sendInitialData(ws, symbol, channel);
//     }
//   } else if (data.action === 'unsubscribe') {
//     const { symbol, channel } = data;
//     if (channel) {
//       clients.get(ws)?.delete(`${symbol}_${channel}`);
//       console.log(`Client unsubscribed from ${symbol} (${channel})`);
//     }
//   }
// };

const handleSubscribe = async (ws: WebSocket, data: MessageData): Promise<void> => {
  const { action, symbol, channel, startTime, endTime } = data;

  if (action === 'subscribe') {
    if (channel && channel.startsWith('kline')) {
      // Handle Kline subscription with optional startTime and endTime
      if (startTime && endTime) {
        await sendKlineData(ws, symbol, channel, startTime, endTime);
      } else {
        // Subscribe to live kline updates if no historical range is provided
        clients.get(ws)?.add(`${symbol}_${channel}`);
        console.log(`Client subscribed to live ${symbol} (${channel})`);
      }
    } else {
      // Handle other channels (e.g., depth, ticker)
      clients.get(ws)?.add(`${symbol}_${channel}`);
      console.log(`Client subscribed to ${symbol} (${channel})`);
      await sendInitialData(ws, symbol, channel);
    }
  } else if (action === 'unsubscribe') {
    if (channel) {
      clients.get(ws)?.delete(`${symbol}_${channel}`);
      console.log(`Client unsubscribed from ${symbol} (${channel})`);
    }
  }
};

// Fetch and send historical kline data to the client
const sendKlineData = async (ws: WebSocket, symbol: string, channel: string, startTime: number, endTime: number): Promise<void> => {
  const interval = channel.split('_')[1]; // Extract the kline interval (e.g., '1m', '5m')
  console.log(`Fetching historical kline data for ${symbol} with interval ${interval}, startTime: ${startTime}, endTime: ${endTime}`);

  try {
    const historicalData = await getHistoricalKlineData(symbol, interval, startTime, endTime); // add endTime later
    console.log("historicalData ",historicalData.length, "symbol ", symbol);
    if (historicalData.length) {
      ws.send(JSON.stringify({
        symbol,
        type: channel,
        data: historicalData,
      }));
      console.log(`Sent historical kline data for ${symbol} (${channel})`);
    } else {
      ws.send(JSON.stringify({ type: 'error', message: `No historical data available for ${symbol} (${channel})` }));
    }
  } catch (err) {
    console.error(`Error fetching historical kline data for ${symbol} (${channel}):`, err);
    ws.send(JSON.stringify({ type: 'error', message: 'Failed to fetch historical kline data' }));
  }
};


// Send initial data (e.g., 100 asks and bids) for orderbook data
const sendInitialData = async (ws: WebSocket, symbol: string, channel: string): Promise<void> => {
  try {
    const redisKey = `${symbol}_${channel}`;
    const redisData = await redisClient.get(redisKey);

    if (redisData) {
      const parsedData: RedisData = JSON.parse(redisData);

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


