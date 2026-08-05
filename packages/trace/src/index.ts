import type { Environment, TraceContext, TraceEvent, TraceSink, TraceSpan } from './types.js';

export type { Environment, TraceContext, TraceEvent, TraceSink, TraceSpan };

let globalSinks: TraceSink[] = [];
let globalContext: Partial<TraceContext> = {};

function generateId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${ts}-${rand}`;
}

function detectEnv(): Environment {
  if (typeof process !== 'undefined') {
    if (process.env.CI) return 'ci';
    if (process.env.NODE_ENV === 'production') return 'production';
    if (process.env.NODE_ENV === 'staging') return 'staging';
  }
  return 'local';
}

export function configureSinks(sinks: TraceSink[]): void {
  globalSinks = sinks;
}

export function addSink(sink: TraceSink): void {
  globalSinks.push(sink);
}

export function setContext(ctx: Partial<TraceContext>): void {
  globalContext = { ...globalContext, ...ctx };
}

function buildContext(overrides?: Partial<TraceContext>): TraceContext {
  return {
    env: detectEnv(),
    sessionId: globalContext.sessionId || generateId(),
    ...globalContext,
    ...overrides,
  };
}

async function emitToSinks(event: TraceEvent): Promise<void> {
  await Promise.all(globalSinks.map((sink) => sink.emit(event).catch(() => {})));
}

export async function trace(
  name: string,
  payload: unknown,
  ctx?: Partial<TraceContext>
): Promise<string> {
  const event: TraceEvent = {
    id: generateId(),
    ts: Date.now(),
    name,
    ctx: buildContext(ctx),
    payload,
    outcome: 'ok',
  };
  await emitToSinks(event);
  return event.id;
}

export function span(name: string, payload?: unknown, ctx?: Partial<TraceContext>): TraceSpan {
  const id = generateId();
  const startTs = Date.now();
  const context = buildContext(ctx);

  const spanImpl: TraceSpan = {
    async end(outcome = 'ok', error?: string) {
      const event: TraceEvent = {
        id,
        ts: startTs,
        name,
        ctx: context,
        payload,
        durationMs: Date.now() - startTs,
        outcome,
        error,
      };
      await emitToSinks(event);
    },
    child(childName: string, childPayload?: unknown) {
      return span(childName, childPayload, { ...context, parentTraceId: id });
    },
  };

  return spanImpl;
}

export async function flush(): Promise<void> {
  await Promise.all(
    globalSinks.map((sink) => (sink.flush ? sink.flush() : Promise.resolve()))
  );
}
