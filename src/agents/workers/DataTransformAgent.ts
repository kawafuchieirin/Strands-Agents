import { Agent } from '../base';
import type { Message, Task } from '../../types';

interface DataTransformTask {
  action: 'filter' | 'map' | 'reduce' | 'sort' | 'aggregate';
  data: unknown[];
  options?: {
    filterFn?: string;
    mapFn?: string;
    reduceFn?: string;
    sortKey?: string;
    sortOrder?: 'asc' | 'desc';
    aggregateField?: string;
    aggregateOperation?: 'sum' | 'avg' | 'min' | 'max' | 'count';
  };
}

export class DataTransformAgent extends Agent {
  constructor(id: string) {
    super({
      id,
      name: `Data Transform ${id}`,
      type: 'data-transformer',
      capabilities: ['data-filtering', 'data-mapping', 'data-aggregation'],
      maxConcurrentTasks: 5,
    });
  }

  protected async onInitialize(): Promise<void> {
    this.log('info', 'Data transform agent initialized');
  }

  protected async onTerminate(): Promise<void> {
    this.log('info', 'Data transform agent terminated');
  }

  protected async onExecute(task: Task): Promise<unknown> {
    const transformTask = task.payload as DataTransformTask;
    
    switch (transformTask.action) {
      case 'filter':
        return this.filterData(transformTask.data, transformTask.options?.filterFn);
      case 'map':
        return this.mapData(transformTask.data, transformTask.options?.mapFn);
      case 'sort':
        return this.sortData(
          transformTask.data,
          transformTask.options?.sortKey,
          transformTask.options?.sortOrder
        );
      case 'aggregate':
        return this.aggregateData(
          transformTask.data,
          transformTask.options?.aggregateField,
          transformTask.options?.aggregateOperation
        );
      default:
        throw new Error(`Unknown transform action: ${transformTask.action}`);
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

  private async filterData(data: unknown[], filterFn?: string): Promise<{ filtered: unknown[] }> {
    await this.simulateProcessing(50);
    
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }
    
    if (!filterFn) {
      return { filtered: data };
    }
    
    try {
      const fn = new Function('item', `return ${filterFn}`);
      const filtered = data.filter(item => fn(item));
      return { filtered };
    } catch (error) {
      throw new Error(`Invalid filter function: ${error}`);
    }
  }

  private async mapData(data: unknown[], mapFn?: string): Promise<{ mapped: unknown[] }> {
    await this.simulateProcessing(75);
    
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }
    
    if (!mapFn) {
      return { mapped: data };
    }
    
    try {
      const fn = new Function('item', `return ${mapFn}`);
      const mapped = data.map(item => fn(item));
      return { mapped };
    } catch (error) {
      throw new Error(`Invalid map function: ${error}`);
    }
  }

  private async sortData(
    data: unknown[],
    sortKey?: string,
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Promise<{ sorted: unknown[] }> {
    await this.simulateProcessing(100);
    
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }
    
    const sorted = [...data];
    
    if (sortKey) {
      sorted.sort((a: any, b: any) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        
        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return { sorted };
  }

  private async aggregateData(
    data: unknown[],
    field?: string,
    operation: 'sum' | 'avg' | 'min' | 'max' | 'count' = 'count'
  ): Promise<{ result: number }> {
    await this.simulateProcessing(150);
    
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }
    
    if (operation === 'count') {
      return { result: data.length };
    }
    
    if (!field) {
      throw new Error('Field is required for aggregation operations other than count');
    }
    
    const values = data.map((item: any) => Number(item[field])).filter(v => !isNaN(v));
    
    switch (operation) {
      case 'sum':
        return { result: values.reduce((a, b) => a + b, 0) };
      case 'avg':
        return { result: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0 };
      case 'min':
        return { result: Math.min(...values) };
      case 'max':
        return { result: Math.max(...values) };
      default:
        throw new Error(`Unknown aggregation operation: ${operation}`);
    }
  }

  private async simulateProcessing(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}