import type { TraceEvent, TraceSink } from '../types.js';

export interface D1SinkOptions {
  db: D1Database;
  tableName?: string;
}

export function createD1Sink(options: D1SinkOptions): TraceSink {
  const { db, tableName = 'traces' } = options;

  return {
    async emit(event: TraceEvent) {
      await db
        .prepare(
          `INSERT INTO ${tableName} (id, ts, name, env, session_id, agent_id, parent_trace_id, tags_json, payload_json, duration_ms, outcome, error)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          event.id,
          event.ts,
          event.name,
          event.ctx.env,
          event.ctx.sessionId,
          event.ctx.agentId ?? null,
          event.ctx.parentTraceId ?? null,
          event.ctx.tags ? JSON.stringify(event.ctx.tags) : null,
          JSON.stringify(event.payload),
          event.durationMs ?? null,
          event.outcome ?? null,
          event.error ?? null
        )
        .run();
    },
  };
}
