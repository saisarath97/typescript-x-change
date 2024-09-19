import { StreamType } from '../../appConfig/enum'; // Adjust the import path as needed

// Interfaces for different types of WebSocket data
interface OrderBookData {
  s?: string;
  bids?: [string, string][];
  asks?: [string, string][];
}

interface KlineRawData {
  0: number; // Kline open time
  1: string; // Open price
  2: string; // High price
  3: string; // Low price
  4: string; // Close price
  5: string; // Volume
  6: number; // Kline Close time
  7: string; // Quote asset volume
  8: number; // Number of trades
  9: string; // Taker buy base asset volume
  10: string; // Taker buy quote asset volume
  11: string; // Unused field, ignore
}

interface KlineData {
  k?: {
    t?: number;
    T?: number;
    i?: string;
    o?: string;
    c?: string;
    h?: string;
    l?: string;
    v?: string;
  };
}

interface DealsData {
  e?: string;
  E?: number;
  a?: number;
  p?: string;
  q?: string;
  f?: number;
  l?: number;
  T?: number;
  m?: boolean;
  M?: any; // Replace with appropriate type if known
}

interface TickerData {
  e?: string;
  E?: number;
  p?: string;
  P?: string;
  w?: string;
  x?: string;
  c?: string;
  Q?: string;
  b?: string;
  B?: string;
  a?: string;
  A?: string;
  o?: string;
  h?: string;
  l?: string;
  v?: string;
  q?: string;
  O?: number;
  C?: number;
  F?: number;
  L?: number;
  n?: number;
}

interface StandardizedData {
  symbol: string;
  data: any;
  type: string;
}

// Maps Binance WebSocket order book data to the standard format
const mapToOrderBook = (data: OrderBookData, symbol: string, type: string): StandardizedData => {
  return {
    symbol: data.s || symbol,
    data: {
      bids: data.bids ? data.bids.map(([price, quantity]) => [price, quantity]) : [],
      asks: data.asks ? data.asks.map(([price, quantity]) => [price, quantity]) : []
    },
    type
  };
};

// Maps Binance WebSocket kline data to the standard format
const mapToStandardKlineFormat = (data: KlineData, symbol: string, type: string): StandardizedData => {
  return {
    symbol,
    data: {
      startTime: data.k?.t !== undefined ? new Date(data.k.t) : null,
      closeTime: data.k?.T !== undefined ? new Date(data.k.T) : null,
      interval: data.k?.i,
      openPrice: data.k?.o,
      closePrice: data.k?.c,
      highPrice: data.k?.h,
      lowPrice: data.k?.l,
      volume: data.k?.v,
    },
    type
  };
};

// Maps Binance WebSocket kline data to the standard format
const mapApiKlineToStandardKlineFormat = (data: KlineRawData, symbol: string, type: string): StandardizedData => {
  return {
    symbol,
    data: {
      startTime: new Date(data[0]),
      closeTime: new Date(data[6]),
      interval: 'UNKNOWN', // Since interval isn't provided in raw data
      openPrice: data[1],
      closePrice: data[4],
      highPrice: data[2],
      lowPrice: data[3],
      volume: data[5],
    },
    type
  };
};

// Maps Binance WebSocket deals (market history) data to the standard format
const mapDealsData = (rawData: DealsData, symbol: string, type: string): StandardizedData => {
  return {
    symbol,
    data: {
      symbol,
      eventType: rawData.e,
      eventTime: rawData.E !== undefined ? new Date(rawData.E) : null,
      aggregateTradeId: rawData.a,
      price: parseFloat(rawData.p || '0'),
      quantity: parseFloat(rawData.q || '0'),
      firstTradeId: rawData.f,
      lastTradeId: rawData.l,
      tradeTime: rawData.T !== undefined ? new Date(rawData.T) : null,
      isMarketMaker: rawData.m,
      ignoreField: rawData.M
    },
    type
  };
};

// Maps Binance WebSocket ticker data to the standard format
const mapTickerData = (data: TickerData, symbol: string, type: string): StandardizedData => {
  return {
    symbol,
    data: {
      eventType: data.e,
      eventTime: data.E !== undefined ? new Date(data.E) : null,
      symbol,
      priceChange: data.p,
      priceChangePercent: data.P,
      weightedAvgPrice: data.w,
      firstTradePrice: data.x,
      lastPrice: data.c,
      lastQuantity: data.Q,
      bestBidPrice: data.b,
      bestBidQuantity: data.B,
      bestAskPrice: data.a,
      bestAskQuantity: data.A,
      openPrice: data.o,
      highPrice: data.h,
      lowPrice: data.l,
      baseAssetVolume: data.v,
      quoteAssetVolume: data.q,
      statsOpenTime: data.O !== undefined ? new Date(data.O) : null,
      statsCloseTime: data.C !== undefined ? new Date(data.C) : null,
      firstTradeId: data.F,
      lastTradeId: data.L,
      totalTrades: data.n
    },
    type
  };
};

// Formats the WebSocket response based on the stream type
const formatResponse = (data: any, symbol: string, type: string): StandardizedData | null => {
  switch (type) {
    case StreamType.DEPTH:
      return mapToOrderBook(data, symbol, type);
    case StreamType.TICKER:
      return mapTickerData(data, symbol, type);
    case StreamType.DEALS:
      return mapDealsData(data, symbol, type);
    default:
      if (type.startsWith(StreamType.KLINE)) {
        return mapToStandardKlineFormat(data, symbol, type);
      }
      if (type.startsWith("historic")) {
        return mapApiKlineToStandardKlineFormat(data, symbol, type);
      }
      return null;
  }
};

export default formatResponse;
