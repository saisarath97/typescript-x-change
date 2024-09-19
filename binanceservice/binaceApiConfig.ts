// apiUrls.ts

// Define constants with explicit types
export const BASE_URL: string = 'https://api.binance.com';

export const API_ENDPOINTS: { ORDER_BOOK: string, KLINE_HISTORICAL: string } = {
  ORDER_BOOK: '/api/v3/depth',
  KLINE_HISTORICAL:'/api/v3/klines'
};
