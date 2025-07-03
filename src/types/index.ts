export interface AgentConfig {
  id: string;
  name: string;
  type: string;
  capabilities: string[];
  maxConcurrentTasks?: number;
  timeout?: number;
}

export type AgentStatus = 'idle' | 'busy' | 'error' | 'offline';

export interface AgentState {
  status: AgentStatus;
  currentTasks: string[];
  lastActivity: Date;
  errorCount: number;
}

export interface Message {
  id: string;
  from: string;
  to: string;
  type: MessageType;
  payload: unknown;
  timestamp: Date;
  correlationId?: string;
}

export type MessageType = 'request' | 'response' | 'event' | 'error';

export interface Task {
  id: string;
  type: string;
  priority: number;
  payload: unknown;
  dependencies: string[];
  assignedAgent?: string;
  status: TaskStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: unknown;
  error?: string;
}

export type TaskStatus = 'pending' | 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface TaskResult {
  taskId: string;
  agentId: string;
  success: boolean;
  data?: unknown;
  error?: Error;
  executionTime: number;
}

export interface AgentCapability {
  name: string;
  description: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
}

export interface SystemMetrics {
  totalAgents: number;
  activeAgents: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageExecutionTime: number;
  systemLoad: number;
}