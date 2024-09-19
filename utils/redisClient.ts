// import { createClient, RedisClientType } from 'redis';

// // Create and configure the Redis client
// const redisClient: RedisClientType = createClient({ url: 'redis://redis:6379' });

// // Connect to the Redis server and handle any errors
// redisClient.connect().catch((error) => {
//   console.error('Failed to connect to Redis:', error);
// });

// // Event handler for successful connection
// redisClient.on('connect', () => {
//   console.log('Connected to Redis');
// });

// // Event handler for errors
// redisClient.on('error', (err) => {
//   console.error('Redis client error:', err);
// });

// // Export the configured Redis client
// export { redisClient };

import Redis from 'ioredis';

// Create and configure the Redis client
const redisClient = new Redis({
  host: 'redis', // Redis host (adjust based on your setup)
  port: 6379,    // Redis port
});

// Event handler for successful connection
redisClient.on('connect', () => {
  console.log('Connected to Redis');
});

// Event handler for errors
redisClient.on('error', (err) => {
  console.error('Redis client error:', err);
});

// Export the configured Redis client
export { redisClient };
