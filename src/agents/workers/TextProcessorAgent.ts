import { Agent } from '../base';
import type { Message, Task } from '../../types';

interface TextProcessingTask {
  action: 'extract' | 'summarize' | 'translate' | 'analyze';
  text: string;
  options?: {
    targetLanguage?: string;
    maxLength?: number;
    extractPattern?: string;
  };
}

export class TextProcessorAgent extends Agent {
  constructor(id: string) {
    super({
      id,
      name: `Text Processor ${id}`,
      type: 'text-processor',
      capabilities: ['text-extraction', 'text-summarization', 'text-analysis'],
      maxConcurrentTasks: 3,
    });
  }

  protected async onInitialize(): Promise<void> {
    this.log('info', 'Text processor agent initialized');
  }

  protected async onTerminate(): Promise<void> {
    this.log('info', 'Text processor agent terminated');
  }

  protected async onExecute(task: Task): Promise<unknown> {
    const processingTask = task.payload as TextProcessingTask;
    
    switch (processingTask.action) {
      case 'extract':
        return this.extractText(processingTask.text, processingTask.options?.extractPattern);
      case 'summarize':
        return this.summarizeText(processingTask.text, processingTask.options?.maxLength);
      case 'analyze':
        return this.analyzeText(processingTask.text);
      default:
        throw new Error(`Unknown text processing action: ${processingTask.action}`);
    }
  }

  protected async onMessage(message: Message): Promise<void> {
    if (message.type === 'request' && message.payload) {
      const { type, task } = message.payload as { type: string; task: Task };
      
      if (type === 'execute-task') {
        try {
          const result = await this.execute(task);
          this.sendMessage(message.from, 'response', {
            type: 'task-result',
            ...result,
          });
        } catch (error) {
          this.sendMessage(message.from, 'error', {
            taskId: task.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }
  }

  private async extractText(text: string, pattern?: string): Promise<{ extracted: string[] }> {
    await this.simulateProcessing(100);
    
    if (pattern) {
      const regex = new RegExp(pattern, 'g');
      const matches = text.match(regex) || [];
      return { extracted: matches };
    }
    
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return { extracted: sentences };
  }

  private async summarizeText(text: string, maxLength: number = 100): Promise<{ summary: string }> {
    await this.simulateProcessing(200);
    
    const words = text.split(/\s+/);
    if (words.length <= maxLength) {
      return { summary: text };
    }
    
    const summary = words.slice(0, maxLength).join(' ') + '...';
    return { summary };
  }

  private async analyzeText(text: string): Promise<{
    wordCount: number;
    sentenceCount: number;
    characterCount: number;
    averageWordLength: number;
  }> {
    await this.simulateProcessing(150);
    
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const totalWordLength = words.reduce((sum, word) => sum + word.length, 0);
    
    return {
      wordCount: words.length,
      sentenceCount: sentences.length,
      characterCount: text.length,
      averageWordLength: words.length > 0 ? totalWordLength / words.length : 0,
    };
  }

  private async simulateProcessing(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}