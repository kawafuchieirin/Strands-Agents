import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import type { Task, TaskStatus } from '../../types';

interface TaskQueue {
  pending: Task[];
  inProgress: Map<string, Task>;
  completed: Task[];
  failed: Task[];
}

export class TaskManager extends EventEmitter {
  private queues: Map<number, TaskQueue>;
  private taskIndex: Map<string, Task>;
  private agentTasks: Map<string, Set<string>>;

  constructor() {
    super();
    this.queues = new Map();
    this.taskIndex = new Map();
    this.agentTasks = new Map();
    
    for (let priority = 1; priority <= 10; priority++) {
      this.queues.set(priority, {
        pending: [],
        inProgress: new Map(),
        completed: [],
        failed: [],
      });
    }
  }

  createTask(params: Omit<Task, 'id' | 'status' | 'createdAt'>): Task {
    const task: Task = {
      ...params,
      id: uuidv4(),
      status: 'pending',
      createdAt: new Date(),
    };
    
    this.addTask(task);
    return task;
  }

  addTask(task: Task): void {
    const queue = this.queues.get(task.priority);
    if (!queue) {
      throw new Error(`Invalid priority: ${task.priority}. Must be between 1 and 10.`);
    }
    
    queue.pending.push(task);
    this.taskIndex.set(task.id, task);
    this.emit('taskAdded', task);
  }

  getNextTask(agentCapabilities: string[]): Task | null {
    for (let priority = 10; priority >= 1; priority--) {
      const queue = this.queues.get(priority)!;
      
      for (let i = 0; i < queue.pending.length; i++) {
        const task = queue.pending[i];
        
        if (this.canExecuteTask(task, agentCapabilities)) {
          queue.pending.splice(i, 1);
          return task;
        }
      }
    }
    
    return null;
  }

  assignTask(taskId: string, agentId: string): void {
    const task = this.taskIndex.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    const queue = this.queues.get(task.priority)!;
    task.assignedAgent = agentId;
    task.status = 'in_progress';
    task.startedAt = new Date();
    
    queue.inProgress.set(taskId, task);
    
    if (!this.agentTasks.has(agentId)) {
      this.agentTasks.set(agentId, new Set());
    }
    this.agentTasks.get(agentId)!.add(taskId);
    
    this.emit('taskAssigned', { task, agentId });
  }

  updateTaskStatus(taskId: string, status: TaskStatus, result?: unknown, error?: string): void {
    const task = this.taskIndex.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    const queue = this.queues.get(task.priority)!;
    const previousStatus = task.status;
    task.status = status;
    
    if (status === 'completed') {
      task.completedAt = new Date();
      task.result = result;
      queue.inProgress.delete(taskId);
      queue.completed.push(task);
    } else if (status === 'failed') {
      task.completedAt = new Date();
      task.error = error;
      queue.inProgress.delete(taskId);
      queue.failed.push(task);
    }
    
    if (task.assignedAgent && this.agentTasks.has(task.assignedAgent)) {
      this.agentTasks.get(task.assignedAgent)!.delete(taskId);
    }
    
    this.emit('taskStatusChanged', { task, previousStatus });
    
    this.checkDependentTasks(taskId);
  }

  getTask(taskId: string): Task | undefined {
    return this.taskIndex.get(taskId);
  }

  getAgentTasks(agentId: string): Task[] {
    const taskIds = this.agentTasks.get(agentId) || new Set();
    return Array.from(taskIds).map(id => this.taskIndex.get(id)!).filter(Boolean);
  }

  getTasksByStatus(status: TaskStatus): Task[] {
    const tasks: Task[] = [];
    
    this.queues.forEach(queue => {
      if (status === 'pending') {
        tasks.push(...queue.pending);
      } else if (status === 'in_progress') {
        tasks.push(...Array.from(queue.inProgress.values()));
      } else if (status === 'completed') {
        tasks.push(...queue.completed);
      } else if (status === 'failed') {
        tasks.push(...queue.failed);
      }
    });
    
    return tasks;
  }

  private canExecuteTask(task: Task, agentCapabilities: string[]): boolean {
    if (task.dependencies.length === 0) {
      return agentCapabilities.includes(task.type);
    }
    
    const allDependenciesCompleted = task.dependencies.every(depId => {
      const depTask = this.taskIndex.get(depId);
      return depTask && depTask.status === 'completed';
    });
    
    return allDependenciesCompleted && agentCapabilities.includes(task.type);
  }

  private checkDependentTasks(completedTaskId: string): void {
    this.queues.forEach(queue => {
      queue.pending.forEach(task => {
        if (task.dependencies.includes(completedTaskId)) {
          this.emit('dependencyResolved', { task, resolvedDependency: completedTaskId });
        }
      });
    });
  }

  getMetrics() {
    let totalPending = 0;
    let totalInProgress = 0;
    let totalCompleted = 0;
    let totalFailed = 0;
    
    this.queues.forEach(queue => {
      totalPending += queue.pending.length;
      totalInProgress += queue.inProgress.size;
      totalCompleted += queue.completed.length;
      totalFailed += queue.failed.length;
    });
    
    return {
      totalPending,
      totalInProgress,
      totalCompleted,
      totalFailed,
      total: totalPending + totalInProgress + totalCompleted + totalFailed,
      byPriority: Array.from(this.queues.entries()).map(([priority, queue]) => ({
        priority,
        pending: queue.pending.length,
        inProgress: queue.inProgress.size,
        completed: queue.completed.length,
        failed: queue.failed.length,
      })),
    };
  }
}