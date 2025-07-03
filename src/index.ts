import { createApp } from './app';
import { config } from './config';
import { logger } from './utils/logger';

const startServer = async () => {
  try {
    const { app } = await createApp();
    
    const server = app.listen(config.server.port, config.server.host, () => {
      logger.info(`Server running on http://${config.server.host}:${config.server.port}`);
    });
    
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, starting graceful shutdown`);
      
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
      
      setTimeout(() => {
        logger.error('Graceful shutdown timeout, forcing exit');
        process.exit(1);
      }, 10000);
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

startServer();