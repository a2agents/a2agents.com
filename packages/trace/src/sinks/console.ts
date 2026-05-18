import type { TraceEvent, TraceSink } from '../types.js';

export interface ConsoleSinkOptions {
  prefix?: string;
  json?: boolean;
}

export function createConsoleSink(options: ConsoleSinkOptions = {}): TraceSink {
  const { prefix = '[trace]', json = false } = options;

  return {
    async emit(event: TraceEvent) {
      if (json) {
        console.log(JSON.stringify(event));
      } else {
        const duration = event.durationMs ? ` (${event.durationMs}ms)` : '';
        const outcome = event.outcome && event.outcome !== 'ok' ? ` [${event.outcome}]` : '';
        console.log(`${prefix} ${event.ctx.env}/${event.name}${duration}${outcome}`);
      }
    },
  };
}
