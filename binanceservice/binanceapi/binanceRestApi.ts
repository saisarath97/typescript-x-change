import { getOrderBook } from './binanceApiService';

// Define the type for the handleData function
type HandleDataFunction = (data: any, symbol: string, streamType: string) => void;

// Define the type for the BinanceRestApi function parameters
const BinanceRestApi = async (symbol: string, handleData: HandleDataFunction): Promise<void> => {
  try {
    const limit = 100;
    await getOrderBook(symbol, limit, handleData); // Ensure this is awaited to handle async properly
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
};

export default BinanceRestApi;
