import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import type { 
  AgentConfig, 
  AgentState, 
  AgentStatus, 
  Message, 
  Task, 
  TaskResult 
} from '../../types';

export abstract class Agent extends EventEmitter {
  protected config: AgentConfig;
  protected state: AgentState;
  private messageHandlers: Map<string, (message: Message) => Promise<void>>;

  constructor(config: AgentConfig) {
    super();
    this.config = {
      ...config,
      maxConcurrentTasks: config.maxConcurrentTasks ?? 1,
      timeout: config.timeout ?? 30000,
    };
    
    this.state = {
      status: 'idle',
      currentTasks: [],
      lastActivity: new Date(),
      errorCount: 0,
    };
    
    this.messageHandlers = new Map();
    this.setupDefaultHandlers();
  }

  get id(): string {
    return this.config.id;
  }

  get name(): string {
    return this.config.name;
  }

  get status(): AgentStatus {
    return this.state.status;
  }

  get capabilities(): string[] {
    return this.config.capabilities;
  }

  async initialize(): Promise<void> {
    this.log('info', 'Initializing agent');
    this.state.status = 'idle';
    await this.onInitialize();
    this.emit('initialized', { agentId: this.id });
  }

  async terminate(): Promise<void> {
    this.log('info', 'Terminating agent');
    this.state.status = 'offline';
    await this.onTerminate();
    this.emit('terminated', { agentId: this.id });
    this.removeAllListeners();
  }

  async execute(task: Task): Promise<TaskResult> {
    if (this.state.currentTasks.length >= (this.config.maxConcurrentTasks ?? 1)) {
      throw new Error('Agent is at maximum concurrent task capacity');
    }

    this.state.currentTasks.push(task.id);
    this.state.status = 'busy';
    this.state.lastActivity = new Date();

    const startTime = Date.now();
    let result: TaskResult;

    try {
      this.log('info', `Executing task ${task.id}`, { taskType: task.type });
      const data = await this.onExecute(task);
      
      result = {
        taskId: task.id,
        agentId: this.id,
        success: true,
        data,
        executionTime: Date.now() - startTime,
      };
      
      this.state.errorCount = 0;
    } catch (error) {
      this.log('error', `Task ${task.id} failed`, { error });
      this.state.errorCount++;
      
      result = {
        taskId: task.id,
        agentId: this.id,
        success: false,
        error: error as Error,
        executionTime: Date.now() - startTime,
      };
    } finally {
      this.state.currentTasks = this.state.currentTasks.filter(id => id !== task.id);
      this.state.status = this.state.currentTasks.length > 0 ? 'busy' : 'idle';
    }

    this.emit('taskCompleted', result);
    return result;
  }

  sendMessage(to: string, type: Message['type'], payload: unknown): void {
    const message: Message = {
      id: uuidv4(),
      from: this.id,
      to,
      type,
      payload,
      timestamp: new Date(),
    };
    
    this.emit('messageSent', message);
  }

  async receiveMessage(message: Message): Promise<void> {
    this.log('debug', `Received message from ${message.from}`, { messageType: message.type });
    
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      await handler(message);
    } else {
      await this.onMessage(message);
    }
  }

  registerMessageHandler(type: string, handler: (message: Message) => Promise<void>): void {
    this.messageHandlers.set(type, handler);
  }

  canHandle(task: Task): boolean {
    return this.capabilities.includes(task.type);
  }

  protected abstract onInitialize(): Promise<void>;
  protected abstract onTerminate(): Promise<void>;
  protected abstract onExecute(task: Task): Promise<unknown>;
  protected abstract onMessage(message: Message): Promise<void>;

  protected log(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: unknown): void {
    this.emit('log', {
      level,
      agentId: this.id,
      message,
      meta,
      timestamp: new Date(),
    });
  }

  private setupDefaultHandlers(): void {
    this.registerMessageHandler('ping', async (message) => {
      this.sendMessage(message.from, 'response', {
        pong: true,
        status: this.state.status,
        timestamp: new Date(),
      });
    });

    this.registerMessageHandler('status', async (message) => {
      this.sendMessage(message.from, 'response', {
        ...this.state,
        config: this.config,
      });
    });
  }
}