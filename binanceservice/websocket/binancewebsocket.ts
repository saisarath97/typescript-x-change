// // import WebSocket, { WebSocket as WS } from 'ws';
// import WebSocket from 'ws';
// import { streamTypes } from '../binanceconfig';
// import formatResponse from '../mappedresponses/formatresponse';
// import BinanceRestApi from '../binanceapi/binanceRestApi';
// import { StreamType } from '../../appConfig/enum';

// // Define types for parameters
// interface Stream {
//   url: string;
//   type: string;
// }

// // Define the type for handleData function
// type HandleDataFunction = (data: any, symbol: string, streamType: string) => void;

// const connectToStream = (symbol: string, stream: Stream, handleData: HandleDataFunction): void => {
//   const ws = new WebSocket(stream.url.replace('{symbol}', symbol.toLowerCase().replace('_', '')));

//   ws.on('open', () => {
//     // console.log(`Binance WebSocket connection opened for ${symbol} (${stream.type})`);
//     startPingPong(ws);
//   });

//   ws.on('message', (data: WebSocket.MessageEvent) => {
//     try {
//       const parsedData = JSON.parse(data.toString());
//       const standardizedData = formatResponse(parsedData, symbol, stream.type);
//       handleData(standardizedData, symbol, stream.type);
//     } catch (error) {
//       console.error('Error parsing message:', error);
//     }
//   });

//   ws.on('error', (error: Error) => {
//     console.error(`Binance WebSocket error (${stream.type}):`, error);
//   });

//   ws.on('close', () => {
//     console.log(`Binance WebSocket connection closed for ${symbol} (${stream.type})`);
//     if (pingInterval) {
//       clearInterval(pingInterval);
//     }
//     setTimeout(() => connectToStream(symbol, stream, handleData), 5000); // Reconnect
//   });
// };

// // Ping-pong mechanism to keep the connection alive
// let pingInterval: NodeJS.Timeout | undefined;
// const startPingPong = (ws: WebSocket) => {
//   pingInterval = setInterval(() => {
//     if (ws && ws.readyState === WebSocket.OPEN) {
//       console.log('Sending ping to Binance');
//       ws.send(JSON.stringify({ event: 'ping' }));
//     }
//   }, 30000);
// };

// const BinanceWebSocket = (symbol: string, handleData: HandleDataFunction): void => {
//   streamTypes.forEach((stream: Stream) => {
//     // console.log(StreamType.DEPTH, "   ", stream.type)
//     if (stream.type === StreamType.DEPTH) {
//       BinanceRestApi(symbol, handleData);
//     }
//     connectToStream(symbol, stream, handleData);
//   });
// };

// export default BinanceWebSocket;

import WebSocket from 'ws';
import { streamTypes } from '../binanceconfig';
import formatResponse from '../mappedresponses/formatresponse';
import BinanceRestApi from '../binanceapi/binanceRestApi';
import { StreamType } from '../../appConfig/enum';
import { getHistoricalKlineData } from '../../binanceservice/binanceapi/binanceApiService'; // Importing historical data function

// Define types for parameters
interface Stream {
  url: string;
  type: string;
}

// Define the type for handleData function
type HandleDataFunction = (data: any, symbol: string, streamType: string) => void;

const connectToStream = (symbol: string, stream: Stream, handleData: HandleDataFunction): void => {
  const ws = new WebSocket(stream.url.replace('{symbol}', symbol.toLowerCase().replace('_', '')));

  ws.on('open', () => {
    startPingPong(ws);
  });

  ws.on('message', (data: WebSocket.MessageEvent) => {
    try {
      const parsedData = JSON.parse(data.toString());
      const standardizedData = formatResponse(parsedData, symbol, stream.type);
      handleData(standardizedData, symbol, stream.type);
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  ws.on('error', (error: Error) => {
    console.error(`Binance WebSocket error (${stream.type}):`, error);
  });

  ws.on('close', () => {
    console.log(`Binance WebSocket connection closed for ${symbol} (${stream.type})`);
    if (pingInterval) {
      clearInterval(pingInterval);
    }
    setTimeout(() => connectToStream(symbol, stream, handleData), 5000); // Reconnect
  });
};

// Ping-pong mechanism to keep the connection alive
let pingInterval: NodeJS.Timeout | undefined;
const startPingPong = (ws: WebSocket) => {
  pingInterval = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log('Sending ping to Binance');
      ws.send(JSON.stringify({ event: 'ping' }));
    }
  }, 30000);
};

const BinanceWebSocket = async (symbol: string, handleData: HandleDataFunction): Promise<void> => {
  for (const stream of streamTypes) {
    // For depth streams, fetch historical data using REST API
    if (stream.type === StreamType.DEPTH) {
      BinanceRestApi(symbol, handleData);
    }
    connectToStream(symbol, stream, handleData);
  }
};

export default BinanceWebSocket;
