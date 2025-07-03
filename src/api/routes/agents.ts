import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate, AppError } from '../middleware';
import type { AgentManager } from '../../core/AgentManager';

const agentRegistrationSchema = z.object({
  body: z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    capabilities: z.array(z.string()),
  }),
});

export const createAgentRoutes = (agentManager: AgentManager) => {
  const router = Router();
  
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const agents = await agentManager.getAgents();
      res.json({ agents });
    } catch (error) {
      next(error);
    }
  });
  
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const agent = await agentManager.getAgent(req.params.id);
      if (!agent) {
        throw new AppError(404, 'Agent not found');
      }
      res.json({ agent });
    } catch (error) {
      next(error);
    }
  });
  
  router.post(
    '/register',
    validate(agentRegistrationSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const agent = await agentManager.registerAgent(req.body);
        res.status(201).json({ agent });
      } catch (error) {
        next(error);
      }
    }
  );
  
  router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      await agentManager.unregisterAgent(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });
  
  router.get('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = await agentManager.getAgentStatus(req.params.id);
      if (!status) {
        throw new AppError(404, 'Agent not found');
      }
      res.json({ status });
    } catch (error) {
      next(error);
    }
  });
  
  return router;
};