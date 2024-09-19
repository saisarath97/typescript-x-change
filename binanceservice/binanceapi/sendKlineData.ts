// import { getHistoricalKlineData } from './binanceApiService'; // Assuming this function fetches historical kline data

// // Fetch and send historical kline data to the client
// const sendKlineData = async (ws: WebSocket, symbol: string, channel: string, startTime: number, endTime: number): Promise<void> => {
//   const interval = channel.split('_')[1]; // Extract the kline interval (e.g., '1m', '5m')
//   console.log(`Fetching historical kline data for ${symbol} with interval ${interval}, startTime: ${startTime}, endTime: ${endTime}`);

//   try {
//     const historicalData = await getHistoricalKlineData(symbol, interval, startTime); // add later endTime
//     if (historicalData.length) {
//       ws.send(JSON.stringify({
//         symbol,
//         type: channel,
//         data: historicalData,
//       }));
//       console.log(`Sent historical kline data for ${symbol} (${channel})`);
//     } else {
//       ws.send(JSON.stringify({ type: 'error', message: `No historical data available for ${symbol} (${channel})` }));
//     }
//   } catch (err) {
//     console.error(`Error fetching historical kline data for ${symbol} (${channel}):`, err);
//     ws.send(JSON.stringify({ type: 'error', message: 'Failed to fetch historical kline data' }));
//   }
// };

// module.exports {sendKlineData};
