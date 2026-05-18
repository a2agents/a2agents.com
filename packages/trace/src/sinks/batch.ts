import type { TraceEvent, TraceSink } from '../types.js';

export interface BatchSinkOptions {
  sink: TraceSink;
  maxSize?: number;
  flushIntervalMs?: number;
}

export function createBatchSink(options: BatchSinkOptions): TraceSink {
  const { sink, maxSize = 100, flushIntervalMs = 5000 } = options;
  let buffer: TraceEvent[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function flushBuffer() {
    if (buffer.length === 0) return;
    const toFlush = buffer;
    buffer = [];
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    await Promise.all(toFlush.map((e) => sink.emit(e)));
    if (sink.flush) await sink.flush();
  }

  function scheduleFlush() {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      flushBuffer();
    }, flushIntervalMs);
  }

  return {
    async emit(event: TraceEvent) {
      buffer.push(event);
      if (buffer.length >= maxSize) {
        await flushBuffer();
      } else {
        scheduleFlush();
      }
    },
    async flush() {
      await flushBuffer();
    },
  };
}
