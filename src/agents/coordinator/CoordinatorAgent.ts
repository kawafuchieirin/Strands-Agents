import { Agent } from '../base';
import type { Message, Task, TaskResult } from '../../types';
import { TaskManager } from '../../core/tasks';
import { MessageBroker } from '../../core/messaging';

interface CoordinatorConfig {
  taskManager: TaskManager;
  messageBroker: MessageBroker;
}

export class CoordinatorAgent extends Agent {
  private taskManager: TaskManager;
  private messageBroker: MessageBroker;
  private agentRegistry: Map<string, { capabilities: string[]; load: number }>;

  constructor(config: CoordinatorConfig) {
    super({
      id: 'coordinator-001',
      name: 'Task Coordinator',
      type: 'coordinator',
      capabilities: ['task-coordination', 'agent-discovery', 'load-balancing'],
    });
    
    this.taskManager = config.taskManager;
    this.messageBroker = config.messageBroker;
    this.agentRegistry = new Map();
    
    this.setupEventHandlers();
  }

  protected async onInitialize(): Promise<void> {
    this.messageBroker.register(this.id, this.receiveMessage.bind(this));
    
    this.registerMessageHandler('agent-register', this.handleAgentRegistration.bind(this));
    this.registerMessageHandler('agent-unregister', this.handleAgentUnregistration.bind(this));
    this.registerMessageHandler('task-request', this.handleTaskRequest.bind(this));
    this.registerMessageHandler('task-result', this.handleTaskResult.bind(this));
    
    this.sendMessage('*', 'event', { type: 'coordinator-ready' });
  }

  protected async onTerminate(): Promise<void> {
    this.messageBroker.unregister(this.id);
    this.agentRegistry.clear();
  }

  protected async onExecute(task: Task): Promise<unknown> {
    switch (task.type) {
      case 'distribute-task':
        return this.distributeTask(task.payload as Task);
      case 'get-system-status':
        return this.getSystemStatus();
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  protected async onMessage(message: Message): Promise<void> {
    this.log('debug', `Unhandled message type: ${message.type}`);
  }

  private async handleAgentRegistration(message: Message): Promise<void> {
    const { agentId, capabilities } = message.payload as { agentId: string; capabilities: string[] };
    
    this.agentRegistry.set(agentId, { capabilities, load: 0 });
    this.log('info', `Agent registered: ${agentId}`, { capabilities });
    
    this.sendMessage(message.from, 'response', {
      success: true,
      message: 'Agent registered successfully',
    });
    
    this.assignPendingTasks(agentId, capabilities);
  }

  private async handleAgentUnregistration(message: Message): Promise<void> {
    const { agentId } = message.payload as { agentId: string };
    
    this.agentRegistry.delete(agentId);
    this.log('info', `Agent unregistered: ${agentId}`);
    
    this.sendMessage(message.from, 'response', {
      success: true,
      message: 'Agent unregistered successfully',
    });
  }

  private async handleTaskRequest(message: Message): Promise<void> {
    const taskData = message.payload as Omit<Task, 'id' | 'status' | 'createdAt'>;
    
    const task = this.taskManager.createTask(taskData);
    this.log('info', `Task created: ${task.id}`, { type: task.type });
    
    this.sendMessage(message.from, 'response', {
      success: true,
      taskId: task.id,
      message: 'Task queued successfully',
    });
    
    await this.attemptTaskDistribution(task);
  }

  private async handleTaskResult(message: Message): Promise<void> {
    const result = message.payload as TaskResult;
    
    this.taskManager.updateTaskStatus(
      result.taskId,
      result.success ? 'completed' : 'failed',
      result.data,
      result.error?.message,
    );
    
    const agent = this.agentRegistry.get(result.agentId);
    if (agent) {
      agent.load = Math.max(0, agent.load - 1);
    }
    
    this.log('info', `Task ${result.success ? 'completed' : 'failed'}: ${result.taskId}`, {
      agentId: result.agentId,
      executionTime: result.executionTime,
    });
  }

  private async distributeTask(task: Task): Promise<void> {
    await this.attemptTaskDistribution(task);
  }

  private async attemptTaskDistribution(task: Task): Promise<void> {
    const suitableAgent = this.findSuitableAgent(task);
    
    if (!suitableAgent) {
      this.log('warn', `No suitable agent found for task: ${task.id}`, { type: task.type });
      return;
    }
    
    this.taskManager.assignTask(task.id, suitableAgent);
    
    const agent = this.agentRegistry.get(suitableAgent)!;
    agent.load += 1;
    
    this.sendMessage(suitableAgent, 'request', {
      type: 'execute-task',
      task,
    });
    
    this.log('info', `Task assigned: ${task.id} -> ${suitableAgent}`);
  }

  private findSuitableAgent(task: Task): string | null {
    let bestAgent: string | null = null;
    let lowestLoad = Infinity;
    
    this.agentRegistry.forEach((agent, agentId) => {
      if (agent.capabilities.includes(task.type) && agent.load < lowestLoad) {
        bestAgent = agentId;
        lowestLoad = agent.load;
      }
    });
    
    return bestAgent;
  }

  private assignPendingTasks(agentId: string, capabilities: string[]): void {
    let task = this.taskManager.getNextTask(capabilities);
    
    while (task) {
      this.attemptTaskDistribution(task).catch(error => {
        this.log('error', `Failed to distribute task: ${task!.id}`, { error });
      });
      
      task = this.taskManager.getNextTask(capabilities);
    }
  }

  private getSystemStatus() {
    const agents = Array.from(this.agentRegistry.entries()).map(([id, info]) => ({
      id,
      ...info,
    }));
    
    return {
      coordinator: {
        id: this.id,
        status: this.status,
      },
      agents,
      tasks: this.taskManager.getMetrics(),
      timestamp: new Date(),
    };
  }

  private setupEventHandlers(): void {
    this.taskManager.on('taskAdded', (task: Task) => {
      this.attemptTaskDistribution(task).catch(error => {
        this.log('error', `Failed to distribute new task: ${task.id}`, { error });
      });
    });
  }
}