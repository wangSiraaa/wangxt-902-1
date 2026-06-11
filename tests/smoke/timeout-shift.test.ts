import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../src/store';
import { MACHINES, USERS, QUEUE_ENTRIES } from '../../src/utils/mockData';
import { genId } from '../../src/utils/time';
import type { QueueEntry } from '../../src/types';

describe('Smoke 4: 释放后队首超时顺延 + 持久化', () => {
  beforeEach(() => {
    window.localStorage.removeItem('laundry-store-v1');
  });

  const buildQueue = (machineId: string, userIds: string[]): QueueEntry[] =>
    userIds.map((uid, i) => ({
      id: genId(),
      machineId,
      userId: uid,
      position: i + 1,
      joinTime: new Date(Date.now() - (i + 1) * 60 * 1000).toISOString(),
      confirmTimeoutSeconds: 0,
      confirmStartAt: null,
      confirmed: false,
    }));

  it('释放机器后，队首获得 60 秒确认倒计时并持久化', () => {
    const st = () => useAppStore.getState();
    const machineId = 'mch_009';
    const qUsers = ['usr_001', 'usr_002', 'usr_003'];
    const queues = { [machineId]: buildQueue(machineId, qUsers) };
    const machinesWithInUse = MACHINES.map(m =>
      m.id === machineId
        ? { ...m, status: 'IN_USE' as const, currentUserId: 'usr_004', startTime: new Date(Date.now() - 5 * 60 * 1000).toISOString(), durationMinutes: 45 }
        : m
    );

    useAppStore.setState({
      machines: machinesWithInUse,
      queues,
      operationLogs: [],
      usageLogs: [],
      repairs: [],
      currentUserId: 'usr_004',
    });

    st().setCurrentUser('usr_004');
    expect(st().machines.find(m => m.id === machineId)?.status).toBe('IN_USE');

    const endRes = st().endMachine(machineId, 'usr_004');
    expect(endRes.ok).toBe(true);

    const m = st().machines.find(x => x.id === machineId);
    expect(m?.status).toBe('IDLE');

    const q = st().getQueueForMachine(machineId);
    expect(q.length).toBe(3);
    expect(q[0].userId).toBe('usr_001');
    expect(q[0].position).toBe(1);
    expect(q[0].confirmTimeoutSeconds).toBe(60);
    expect(q[0].confirmStartAt).not.toBeNull();
    expect(typeof q[0].confirmStartAt).toBe('string');

    expect(q[1].userId).toBe('usr_002');
    expect(q[1].confirmTimeoutSeconds).toBe(0);
    expect(q[1].confirmStartAt).toBeNull();

    expect(q[2].userId).toBe('usr_003');
    expect(q[2].confirmTimeoutSeconds).toBe(0);

    const persisted = JSON.parse(window.localStorage.getItem('laundry-store-v1') || '{}');
    expect(persisted.state?.queues?.[machineId]?.[0]?.confirmTimeoutSeconds).toBe(60);
    expect(persisted.state?.queues?.[machineId]?.[0]?.confirmStartAt).toBeTruthy();
    expect(persisted.state?.queues?.[machineId]?.length).toBe(3);
  });

  it('队首超时未确认，系统自动顺延，新队首获得倒计时', () => {
    const st = () => useAppStore.getState();
    const machineId = 'mch_001';
    const qUsers = ['usr_001', 'usr_002', 'usr_003'];

    const queues = {
      [machineId]: buildQueue(machineId, qUsers).map((e, i) => i === 0
        ? {
          ...e,
          confirmTimeoutSeconds: 60,
          confirmStartAt: new Date(Date.now() - 61 * 1000).toISOString(),
          confirmed: false,
        }
        : e
      ),
    };
    const freshMachines = MACHINES.map(m => ({
      ...m,
      status: (m.id === machineId ? 'IDLE' : m.status) as 'IDLE' | 'IN_USE' | 'FAULT',
      currentUserId: null,
      startTime: null,
    }));

    useAppStore.setState({
      machines: freshMachines,
      queues,
      operationLogs: [],
      usageLogs: [],
      repairs: [],
      currentUserId: 'usr_002',
    });

    expect(st().machines.find(m => m.id === machineId)?.status).toBe('IDLE');
    const qBefore = st().getQueueForMachine(machineId);
    expect(qBefore.length).toBe(3);
    expect(qBefore[0].userId).toBe('usr_001');

    st().shiftTimedOutQueue();

    const qAfter = st().getQueueForMachine(machineId);
    expect(qAfter.length).toBe(2);
    expect(qAfter[0].userId).toBe('usr_002');
    expect(qAfter[0].position).toBe(1);
    expect(qAfter[0].confirmTimeoutSeconds).toBe(60);
    expect(qAfter[0].confirmStartAt).not.toBeNull();
    expect(new Date(qAfter[0].confirmStartAt!).getTime()).toBeGreaterThan(Date.now() - 5000);

    expect(qAfter[1].userId).toBe('usr_003');
    expect(qAfter[1].position).toBe(2);
    expect(qAfter[1].confirmTimeoutSeconds).toBe(0);

    const shiftLogs = st().operationLogs.filter(l => l.action === 'TIMEOUT_SHIFT');
    expect(shiftLogs.length).toBeGreaterThanOrEqual(1);
    expect(shiftLogs[0]?.operatorId).toBe('usr_001');
    expect(shiftLogs[0]?.targetMachineId).toBe(machineId);
    expect(shiftLogs[0]?.result).toBe('BLOCKED');

    const persisted = JSON.parse(window.localStorage.getItem('laundry-store-v1') || '{}');
    const pq = persisted.state?.queues?.[machineId];
    expect(pq?.length).toBe(2);
    expect(pq?.[0]?.userId).toBe('usr_002');
    expect(pq?.[0]?.confirmTimeoutSeconds).toBe(60);
    expect(pq?.[0]?.confirmStartAt).toBeTruthy();
    expect(pq?.[1]?.userId).toBe('usr_003');
  });

  it('刷新页面（rehydrate）后，顺延结果 + 新队首倒计时仍然保留', () => {
    const st = () => useAppStore.getState();
    const machineId = 'mch_006';
    const qUsers = ['usr_001', 'usr_002', 'usr_003'];
    const queues = {
      [machineId]: buildQueue(machineId, qUsers).map((e, i) => i === 0
        ? {
          ...e,
          confirmTimeoutSeconds: 60,
          confirmStartAt: new Date(Date.now() - 61 * 1000).toISOString(),
          confirmed: false,
        }
        : e
      ),
    };
    const freshMachines = MACHINES.map(m => ({
      ...m,
      status: (m.id === machineId ? 'IDLE' : m.status) as 'IDLE' | 'IN_USE' | 'FAULT',
      currentUserId: null,
      startTime: null,
    }));

    useAppStore.setState({
      machines: freshMachines,
      queues,
      operationLogs: [],
      usageLogs: [],
      repairs: [],
      currentUserId: 'usr_003',
    });

    st().shiftTimedOutQueue();

    const qShifted = st().getQueueForMachine(machineId);
    expect(qShifted.length).toBe(2);
    expect(qShifted[0].userId).toBe('usr_002');

    const savedQueues = JSON.parse(JSON.stringify(st().queues));
    const savedMachines = JSON.parse(JSON.stringify(st().machines));
    const savedLogs = JSON.parse(JSON.stringify(st().operationLogs));
    const savedCurrentUserId = st().currentUserId;
    const savedReminders = JSON.parse(JSON.stringify(st().reminders));
    const savedUsageLogs = JSON.parse(JSON.stringify(st().usageLogs));
    const savedRepairs = JSON.parse(JSON.stringify(st().repairs));

    window.localStorage.removeItem('laundry-store-v1');
    window.localStorage.setItem(
      'laundry-store-v1',
      JSON.stringify({
        state: {
          machines: savedMachines,
          queues: savedQueues,
          repairs: savedRepairs,
          usageLogs: savedUsageLogs,
          operationLogs: savedLogs,
          reminders: savedReminders,
          currentUserId: savedCurrentUserId,
        },
        version: 0,
      })
    );

    useAppStore.setState(useAppStore.getInitialState(), true);
    expect((useAppStore.getState().queues[machineId] ?? []).length).toBe(0);

    window.localStorage.setItem(
      'laundry-store-v1',
      JSON.stringify({
        state: {
          machines: savedMachines,
          queues: savedQueues,
          repairs: savedRepairs,
          usageLogs: savedUsageLogs,
          operationLogs: savedLogs,
          reminders: savedReminders,
          currentUserId: savedCurrentUserId,
        },
        version: 0,
      })
    );

    useAppStore.persist.rehydrate();

    const restored = () => useAppStore.getState();
    const q = restored().queues[machineId] ?? [];
    expect(q.length).toBe(2);
    expect(q[0].userId).toBe('usr_002');
    expect(q[0].position).toBe(1);
    expect(q[0].confirmTimeoutSeconds).toBe(60);
    expect(q[0].confirmStartAt).toBeTruthy();
    expect(q[1].userId).toBe('usr_003');
    expect(q[1].position).toBe(2);
    expect(q[1].confirmStartAt).toBeNull();
    expect(restored().currentUserId).toBe(savedCurrentUserId);

    const shiftLogs = restored().operationLogs.filter(l => l.action === 'TIMEOUT_SHIFT');
    expect(shiftLogs.length).toBeGreaterThanOrEqual(1);
    expect(shiftLogs[0]?.operatorId).toBe('usr_001');
  });
});
