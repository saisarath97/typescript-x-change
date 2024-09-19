import express, { Request, Response } from 'express';
import http from 'http';
import { createWebSocketServer, broadcastData } from './handlers/websockethandler';
import { redisClient } from './utils/redisClient';
import BinanceWebSocket from './binanceservice/websocket/binancewebsocket';
import botsConfig from './appConfig/botconfigs';
import { StreamType } from './appConfig/enum';

interface MarketHistoryData {
  symbol: string;
  type: string;
  data: MarketHistory[];  // Assuming 'data' is an array, you can adjust the type if needed.
}

interface OrderBookEntry {
  price: string;  // Or use 'number' if you store prices as numbers
  quantity: string;  // Assuming quantity is stored as a string, adjust if necessary
}

interface OrderBook {
  data: {
    bids: OrderBookEntry[];
    asks: OrderBookEntry[];
  };
  symbol: string;
  type: string;
}

interface KlineData {
  symbol: string;
  type: string;
  data: Kline[];  // Assuming 'data' is an array, you can adjust the type if needed.
}

interface Kline {
  startTime: number,
  closeTime: number,
  interval: string,
  openPrice: string,
  closePrice: string,
  highPrice: string,
  lowPrice: string,
  volume: string
}

interface MarketHistory {
    symbol: string,
    eventType: string,
    eventTime: string,
    aggregateTradeId: number,
    price: number, // price
    quantity: number, // quantity
    firstTradeId: number,
    lastTradeId: number,
    tradeTime: string, // trade time
    isMarketMaker: boolean,
    ignoreField: boolean
}


const app = express();
const port = 3001;
const websocketPort = 3002;

app.use(express.json());

app.get('/users', (req: Request, res: Response) => {
  res.json({ message: 'List of users' });
});

const server = http.createServer(app);

// Initialize WebSocket server
createWebSocketServer(server, websocketPort);

// Handle data storage and broadcasting
const handleData = async (data: any, symbol: string, streamType: string) => {
  try {
    const jsonData = JSON.stringify(data);

    if (streamType.includes(StreamType.DEPTH)) {
      await handleOrderBookData(data);
    } else if (streamType.includes(StreamType.DEALS)) {
      await handleMarketHistoryData(data);
    } else if (streamType.includes(StreamType.KLINE)) {
      await handleKlineData(data);
    }

    await redisClient.set(`${symbol}_${streamType}`, jsonData);
    // console.log(`Stored data in Redis for ${symbol} (${streamType})`);
  } catch (err) {
    console.error('Redis set error:', err);
  }

  broadcastData(symbol, streamType, data);
};

// Handle Order Book data and store it in Redis
const handleOrderBookData = async (data: any) => {
  try {
    const key = `${data.symbol}_${data.type}`;
    const existingData = await redisClient.get(key);
    let orderBook :OrderBook = {
      data: { bids: [], asks: [] },
      symbol: data.symbol,
      type: data.type,
    };
    if (existingData) {
      orderBook = JSON.parse(existingData);
    }

    orderBook.data.bids = [...orderBook.data.bids, ...data.data.bids].slice(-100);
    orderBook.data.asks = [...orderBook.data.asks, ...data.data.asks].slice(-100);

    const jsonData = JSON.stringify(orderBook);
    // Explicitly delete the key
    // await redisClient.del(key);


    await redisClient.set(key, jsonData);
    // console.log(`Updated order book for ${data.symbol} (${data.type}) stored in Redis`);
  } catch (err:any) {
    console.error("Error in storing order book to Redis:", err.message);
  }
};

// Handle Market History data and store it in Redis
const handleMarketHistoryData = async (data: any) => {
  try {
    console.log("market history reached")
    const key = `${data.symbol}_${data.type}`;
    const existingData = await redisClient.get(key);

    // Define the market history object with explicit types
    let marketHistory: MarketHistoryData = {
      data: [],
      symbol: data.symbol,
      type: data.type,
    };
    

    if (existingData) {
      marketHistory = JSON.parse(existingData);
      if (!Array.isArray(marketHistory.data)) {
        marketHistory.data = [];
      }
    }

    marketHistory.data.push(data.data);
    marketHistory.data = marketHistory.data;

    const jsonData = JSON.stringify(marketHistory);
    console.log("new market data ", jsonData);
    await redisClient.set(key, jsonData);

    // console.log(`Updated market history for ${data.symbol} (${data.type}) stored in Redis with max 100 entries`);
  } catch (err:any) {
    console.error("Error in storing market history to Redis:", err.message);
  }
};




// Handle Kline data and store it in Redis
const handleKlineData = async (data: any) => {
  try {
    const key = `${data.symbol}_${data.type}`;
    const existingData = await redisClient.get(key);
    let klineHistory :KlineData = {
      data: [],
      symbol: data.symbol,
      type: data.type,
    };

    if (existingData) {
      klineHistory = JSON.parse(existingData);
      if (!Array.isArray(klineHistory.data)) {
        klineHistory.data = [];
      }
    }

    klineHistory.data.push(data.data);
    klineHistory.data = klineHistory.data.slice(-200);

    const jsonData = JSON.stringify(klineHistory);
    await redisClient.set(key, jsonData);

    // console.log(`Updated kline data for ${data.symbol} (${data.type}) stored in Redis with max 200 entries`);
  } catch (err:any) {
    console.error("Error in storing kline data to Redis:", err.message);
  }
};

// Dynamically initialize WebSocket connections based on bot configuration
botsConfig.forEach(({ symbol, source }) => {
  setInterval(() => {
  }, 10000);
  switch (source.toLowerCase()) {
    case 'binance':
      BinanceWebSocket(symbol, handleData);
      break;
    default:
      console.log(`Unsupported source: ${source}`);
  }
});

app.listen(port, () => {
  console.log(`WebSocket Service is listening at http://localhost:${port}`);
});
