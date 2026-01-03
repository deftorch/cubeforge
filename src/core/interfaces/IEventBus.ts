import type { EventName, EventPayload } from '@/core/events/types';

export interface IEventBus {
    on<T extends EventName>(event: T, callback: (payload: EventPayload<T>) => void): () => void;
    once<T extends EventName>(event: T, callback: (payload: EventPayload<T>) => void): () => void;
    off<T extends EventName>(event: T, callback: (payload: EventPayload<T>) => void): void;
    emit<T extends EventName>(event: T, payload: EventPayload<T>): void;
    removeAllListeners(event?: EventName): void;
    listenerCount(event: EventName): number;
}
