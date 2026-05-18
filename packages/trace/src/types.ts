export type Environment = 'local' | 'ci' | 'staging' | 'production';

export interface TraceContext {
  env: Environment;
  sessionId: string;
  agentId?: string;
  parentTraceId?: string;
  tags?: Record<string, string>;
}

export interface TraceEvent {
  id: string;
  ts: number;
  name: string;
  ctx: TraceContext;
  payload: unknown;
  durationMs?: number;
  outcome?: 'ok' | 'error' | 'timeout';
  error?: string;
}

export interface TraceSink {
  emit(event: TraceEvent): Promise<void>;
  flush?(): Promise<void>;
}

export interface TraceSpan {
  end(outcome?: TraceEvent['outcome'], error?: string): Promise<void>;
  child(name: string, payload?: unknown): TraceSpan;
}
