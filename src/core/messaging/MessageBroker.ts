import { EventEmitter } from 'eventemitter3';
import type { Message } from '../../types';

interface MessageHandler {
  agentId: string;
  handler: (message: Message) => Promise<void>;
}

export class MessageBroker extends EventEmitter {
  private handlers: Map<string, MessageHandler[]>;
  private messageQueue: Map<string, Message[]>;
  private deadLetterQueue: Message[];

  constructor() {
    super();
    this.handlers = new Map();
    this.messageQueue = new Map();
    this.deadLetterQueue = [];
  }

  register(agentId: string, handler: (message: Message) => Promise<void>): void {
    if (!this.handlers.has(agentId)) {
      this.handlers.set(agentId, []);
    }
    
    this.handlers.get(agentId)!.push({ agentId, handler });
    
    const queuedMessages = this.messageQueue.get(agentId) || [];
    if (queuedMessages.length > 0) {
      this.messageQueue.delete(agentId);
      queuedMessages.forEach(message => {
        this.publish(message).catch(error => {
          console.error(`Failed to deliver queued message: ${error}`);
        });
      });
    }
  }

  unregister(agentId: string): void {
    this.handlers.delete(agentId);
  }

  async publish(message: Message): Promise<void> {
    this.emit('messagePublished', message);
    
    if (message.to === '*') {
      await this.broadcast(message);
    } else {
      await this.send(message);
    }
  }

  private async send(message: Message): Promise<void> {
    const handlers = this.handlers.get(message.to) || [];
    
    if (handlers.length === 0) {
      this.queueMessage(message);
      return;
    }
    
    const deliveryPromises = handlers.map(async ({ handler }) => {
      try {
        await handler(message);
        this.emit('messageDelivered', message);
      } catch (error) {
        this.emit('messageDeliveryFailed', { message, error });
        throw error;
      }
    });
    
    try {
      await Promise.all(deliveryPromises);
    } catch (error) {
      this.deadLetterQueue.push(message);
      this.emit('messageMovedToDeadLetter', message);
    }
  }

  private async broadcast(message: Message): Promise<void> {
    const allHandlers: MessageHandler[] = [];
    this.handlers.forEach(handlers => {
      allHandlers.push(...handlers.filter(h => h.agentId !== message.from));
    });
    
    const deliveryPromises = allHandlers.map(async ({ handler }) => {
      try {
        await handler(message);
      } catch (error) {
        console.error(`Broadcast delivery failed: ${error}`);
      }
    });
    
    await Promise.all(deliveryPromises);
    this.emit('messageBroadcasted', message);
  }

  private queueMessage(message: Message): void {
    if (!this.messageQueue.has(message.to)) {
      this.messageQueue.set(message.to, []);
    }
    
    this.messageQueue.get(message.to)!.push(message);
    this.emit('messageQueued', message);
    
    setTimeout(() => {
      const queue = this.messageQueue.get(message.to);
      if (queue) {
        const index = queue.indexOf(message);
        if (index !== -1) {
          queue.splice(index, 1);
          this.deadLetterQueue.push(message);
          this.emit('messageExpired', message);
        }
      }
    }, 60000);
  }

  getQueuedMessages(agentId: string): Message[] {
    return this.messageQueue.get(agentId) || [];
  }

  getDeadLetterMessages(): Message[] {
    return [...this.deadLetterQueue];
  }

  clearDeadLetterQueue(): void {
    this.deadLetterQueue = [];
  }
}