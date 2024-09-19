import axios from 'axios';
import { BASE_URL, API_ENDPOINTS } from '../binaceApiConfig';
import formatResponse from '../mappedresponses/formatresponse';
import { StreamType } from '../../appConfig/enum';

// Define the type for the handleData function
type HandleDataFunction = (data: any, symbol: string, streamType: string) => void;

// Function to get the order book data
const getOrderBook = async (symbol: string, limit: number = 100, handleData: HandleDataFunction): Promise<void> => {
  try {
    // Replace '_' with '' in symbol
    const symbolToSend = symbol.replace('_', '');

    // Fetch order book data from API
    const response = await axios.get(`${BASE_URL}${API_ENDPOINTS.ORDER_BOOK}?symbol=${symbolToSend}&limit=${limit}`);

    // Format the response data
    const standardizedData = formatResponse(response.data, symbol, StreamType.DEPTH);
    // Handle the formatted data
    handleData(standardizedData, symbol, StreamType.DEPTH);
  } catch (error) {
    console.error('Error fetching order book data:', error);
    throw new Error('Error fetching order book data: ' + (error as Error).message); // Ensure proper error message
  }
};

type KlineInterval = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '8h' | '12h' | '1d' | '3d' | '1w' | '1M';

interface KlineParams {
  symbol: string;
  interval: KlineInterval;
  startTime?: number;
  endTime?: number;
  limit?: number;
}

// Fetch historical kline data from Binance
const fetchKlineData = async (params: KlineParams) => {
  try {
    const response = await axios.get(`${BASE_URL}${API_ENDPOINTS.KLINE_HISTORICAL}`, {
      params: {
        symbol: params.symbol,
        interval: params.interval,
        startTime: params.startTime,
        endTime: params.endTime,
        limit: params.limit || 1000,
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching Kline data:', error.message);
    throw new Error(error.message);
  }
};

// Helper function to paginate and fetch historical data (1 year, 2 years, etc.)
const getHistoricalKlineData = async (
  symbol: string,
  interval: KlineInterval,
  yearsBack: number
) => {
  const currentTime = Date.now();
  const oneYearInMs = 365 * 24 * 60 * 60 * 1000;
  const targetTime = currentTime - yearsBack * oneYearInMs;

  let allKlines: any[] = [];
  let startTime = targetTime;
  let lastEndTime = currentTime;

  while (startTime < lastEndTime) {
    const klines = await fetchKlineData({
      symbol,
      interval,
      startTime,
      limit: 1000,
    });

    if (klines.length === 0) break;

    allKlines = [...allKlines, ...klines];

    // Set new startTime based on the last kline's close time
    const lastKline = klines[klines.length - 1];
    startTime = lastKline[6]; // Kline close time

    // Avoid overwhelming the API
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return allKlines;
};

export { getOrderBook, getHistoricalKlineData };
