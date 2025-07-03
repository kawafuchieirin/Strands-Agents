import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/strands_agents',
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },
  
  agents: {
    maxConcurrentTasks: parseInt(process.env.MAX_CONCURRENT_TASKS || '10', 10),
    taskTimeout: parseInt(process.env.TASK_TIMEOUT || '30000', 10),
    messageQueueSize: parseInt(process.env.MESSAGE_QUEUE_SIZE || '1000', 10),
  },
  
  security: {
    apiKeyHeader: 'x-api-key',
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
};