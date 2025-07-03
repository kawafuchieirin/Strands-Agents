import { EventEmitter } from 'eventemitter3';
import type { Agent } from '../agents/base';
import type { AgentConfig, AgentState, Message } from '../types';
import { MessageBroker } from './messaging';
import { logger } from '../utils/logger';

export class AgentManager extends EventEmitter {
  private agents: Map<string, Agent>;
  private messageBroker: MessageBroker;

  constructor(messageBroker: MessageBroker) {
    super();
    this.agents = new Map();
    this.messageBroker = messageBroker;
  }

  async registerAgent(config: AgentConfig): Promise<Agent> {
    if (this.agents.has(config.id)) {
      throw new Error(`Agent with id ${config.id} already exists`);
    }

    const AgentClass = await this.loadAgentClass(config.type);
    const agent = new AgentClass(config);

    await agent.initialize();
    
    this.setupAgentEventHandlers(agent);
    
    this.messageBroker.register(agent.id, agent.receiveMessage.bind(agent));
    
    this.agents.set(agent.id, agent);
    
    logger.info(`Agent registered: ${agent.id}`, { type: config.type });
    this.emit('agentRegistered', agent);
    
    return agent;
  }

  async unregisterAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    await agent.terminate();
    
    this.messageBroker.unregister(agentId);
    
    this.agents.delete(agentId);
    
    logger.info(`Agent unregistered: ${agentId}`);
    this.emit('agentUnregistered', agentId);
  }

  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  getAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  async getAgentStatus(agentId: string): Promise<AgentState | undefined> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return undefined;
    }

    return {
      status: agent.status,
      currentTasks: [],
      lastActivity: new Date(),
      errorCount: 0,
    };
  }

  private async loadAgentClass(type: string): Promise<typeof Agent> {
    switch (type) {
      case 'text-processor':
        const { TextProcessorAgent } = await import('../agents/workers');
        return TextProcessorAgent as any;
      case 'data-transformer':
        const { DataTransformAgent } = await import('../agents/workers');
        return DataTransformAgent as any;
      case 'coordinator':
        const { CoordinatorAgent } = await import('../agents/coordinator');
        return CoordinatorAgent as any;
      default:
        throw new Error(`Unknown agent type: ${type}`);
    }
  }

  private setupAgentEventHandlers(agent: Agent): void {
    agent.on('messageSent', (message: Message) => {
      this.messageBroker.publish(message).catch(error => {
        logger.error('Failed to publish message', { error, message });
      });
    });

    agent.on('log', (logData: any) => {
      const { level, message, meta } = logData;
      logger.log(level, message, meta);
    });

    agent.on('taskCompleted', (result: any) => {
      this.emit('taskCompleted', result);
    });
  }
}