import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAppStore } from '../../src/store';
import type { QueueEntry } from '../../src/types';

const PERSIST_KEY = 'laundry-store-v1';

describe('Smoke 1: 刷新页面后预约队列仍保留', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAppStore.setState(useAppStore.getInitialState(), true);
  });

  it('将队列写入 localStorage 后重新 hydrate 仍能读取', () => {
    const initial = useAppStore.getState();
    const machineId = 'mch_003';
    const userId = 'usr_002';

    useAppStore.getState().setCurrentUser(userId);
    const reserveResult = useAppStore.getState().reserveMachine(machineId, userId);
    expect(reserveResult.ok).toBe(true);

    const queueBefore: QueueEntry[] = useAppStore.getState().getQueueForMachine(machineId);
    expect(queueBefore.length).toBeGreaterThan(0);
    expect(queueBefore[0].userId).toBe(userId);
    expect(queueBefore[0].position).toBe(1);

    const persisted = window.localStorage.getItem(PERSIST_KEY);
    expect(persisted).not.toBeNull();
    const parsed = JSON.parse(persisted!);
    expect(parsed.state.queues).toBeDefined();
    expect(parsed.state.queues[machineId]).toBeDefined();
    expect(parsed.state.queues[machineId].length).toBe(queueBefore.length);

    useAppStore.setState(useAppStore.getInitialState(), true);
    expect(useAppStore.getState().getQueueForMachine(machineId)).toHaveLength(0);

    window.localStorage.setItem(PERSIST_KEY, persisted!);
    useAppStore.persist.rehydrate();

    const queueAfter: QueueEntry[] = useAppStore.getState().getQueueForMachine(machineId);
    expect(queueAfter.length).toBe(queueBefore.length);
    expect(queueAfter[0].userId).toBe(userId);
    expect(queueAfter[0].position).toBe(1);
    expect(queueAfter[0].id).toBe(queueBefore[0].id);
    expect(useAppStore.getState().currentUserId).toBe(userId);
  });
});
