import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { errorHandler } from './api/middleware';
import { createAgentRoutes, createTaskRoutes } from './api/routes';
import { MessageBroker, TaskManager, AgentManager } from './core';
import { CoordinatorAgent } from './agents/coordinator';
import { logger } from './utils/logger';

export const createApp = async () => {
  const app = express();
  
  app.use(helmet());
  app.use(cors(config.cors));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  const messageBroker = new MessageBroker();
  const taskManager = new TaskManager();
  const agentManager = new AgentManager(messageBroker);
  
  const coordinator = new CoordinatorAgent({ taskManager, messageBroker });
  await coordinator.initialize();
  
  app.use('/api/agents', createAgentRoutes(agentManager));
  app.use('/api/tasks', createTaskRoutes(taskManager));
  
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });
  
  app.use(errorHandler);
  
  const context = {
    app,
    messageBroker,
    taskManager,
    agentManager,
    coordinator,
  };
  
  logger.info('Application initialized');
  
  return context;
};