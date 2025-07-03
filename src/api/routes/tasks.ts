import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate, AppError } from '../middleware';
import type { TaskManager } from '../../core/tasks';

const createTaskSchema = z.object({
  body: z.object({
    type: z.string(),
    priority: z.number().min(1).max(10),
    payload: z.unknown(),
    dependencies: z.array(z.string()).optional().default([]),
  }),
});

const updateTaskStatusSchema = z.object({
  body: z.object({
    status: z.enum(['pending', 'queued', 'in_progress', 'completed', 'failed', 'cancelled']),
    result: z.unknown().optional(),
    error: z.string().optional(),
  }),
});

export const createTaskRoutes = (taskManager: TaskManager) => {
  const router = Router();
  
  router.post(
    '/',
    validate(createTaskSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const task = taskManager.createTask(req.body);
        res.status(201).json({ task });
      } catch (error) {
        next(error);
      }
    }
  );
  
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = req.query.status as string | undefined;
      let tasks;
      
      if (status) {
        tasks = taskManager.getTasksByStatus(status as any);
      } else {
        const metrics = taskManager.getMetrics();
        tasks = {
          pending: taskManager.getTasksByStatus('pending'),
          inProgress: taskManager.getTasksByStatus('in_progress'),
          completed: taskManager.getTasksByStatus('completed'),
          failed: taskManager.getTasksByStatus('failed'),
          metrics,
        };
      }
      
      res.json({ tasks });
    } catch (error) {
      next(error);
    }
  });
  
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const task = taskManager.getTask(req.params.id);
      if (!task) {
        throw new AppError(404, 'Task not found');
      }
      res.json({ task });
    } catch (error) {
      next(error);
    }
  });
  
  router.patch(
    '/:id/status',
    validate(updateTaskStatusSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { status, result, error } = req.body;
        taskManager.updateTaskStatus(req.params.id, status, result, error);
        res.json({ success: true });
      } catch (error) {
        next(error);
      }
    }
  );
  
  router.get('/metrics', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const metrics = taskManager.getMetrics();
      res.json({ metrics });
    } catch (error) {
      next(error);
    }
  });
  
  return router;
};