import type {
  Building, Floor, Machine, User, QueueEntry, RepairRecord, ReminderSettings } from '../types';
import { genId } from './time';

export const BUILDINGS: Building[] = [
  { id: 'bld_1', name: '1号楼' },
  { id: 'bld_2', name: '2号楼' },
  { id: 'bld_3', name: '3号楼' },
];

export const FLOORS: Floor[] = [
  { id: 'flr_1_1', buildingId: 'bld_1', floorNumber: 1 },
  { id: 'flr_1_2', buildingId: 'bld_1', floorNumber: 2 },
  { id: 'flr_1_3', buildingId: 'bld_1', floorNumber: 3 },
  { id: 'flr_2_1', buildingId: 'bld_2', floorNumber: 1 },
  { id: 'flr_2_2', buildingId: 'bld_2', floorNumber: 2 },
  { id: 'flr_3_1', buildingId: 'bld_3', floorNumber: 1 },
];

const now = Date.now();

export const MACHINES: Machine[] = [
  {
    id: 'mch_001', floorId: 'flr_1_1', code: '1F-A01', status: 'IDLE', currentUserId: null, startTime: null, durationMinutes: 45 },
  {
    id: 'mch_002', floorId: 'flr_1_1', code: '1F-A02', status: 'IN_USE',
    currentUserId: 'usr_001',
    startTime: new Date(now - 15 * 60 * 1000).toISOString(),
    durationMinutes: 45,
  },
  {
    id: 'mch_003', floorId: 'flr_1_2', code: '2F-B01', status: 'IDLE', currentUserId: null, startTime: null, durationMinutes: 45 },
  {
    id: 'mch_004', floorId: 'flr_1_2', code: '2F-B02', status: 'FAULT', currentUserId: null, startTime: null, durationMinutes: 45 },
  {
    id: 'mch_005', floorId: 'flr_1_3', code: '3F-C01', status: 'IN_USE',
    currentUserId: 'usr_002',
    startTime: new Date(now - 30 * 60 * 1000).toISOString(),
    durationMinutes: 60,
  },
  {
    id: 'mch_006', floorId: 'flr_2_1', code: '1F-D01', status: 'IDLE', currentUserId: null, startTime: null, durationMinutes: 45 },
  {
    id: 'mch_007', floorId: 'flr_2_1', code: '1F-D02', status: 'IDLE', currentUserId: null, startTime: null, durationMinutes: 45 },
  {
    id: 'mch_008', floorId: 'flr_2_2', code: '2F-E01', status: 'IN_USE',
    currentUserId: 'usr_003',
    startTime: new Date(now - 5 * 60 * 1000).toISOString(),
    durationMinutes: 45,
  },
  {
    id: 'mch_009', floorId: 'flr_3_1', code: '1F-F01', status: 'IDLE', currentUserId: null, startTime: null, durationMinutes: 45 },
];

export const USERS: User[] = [
  { id: 'usr_001', name: '张明', roomNumber: '101', role: 'RESIDENT', avatar: '张' },
  { id: 'usr_002', name: '李华', roomNumber: '302', role: 'RESIDENT', avatar: '李' },
  { id: 'usr_003', name: '王芳', roomNumber: '203', role: 'RESIDENT', avatar: '王' },
  { id: 'usr_004', name: '赵强', roomNumber: '105', role: 'RESIDENT', avatar: '赵' },
  { id: 'usr_005', name: '陈雪', roomNumber: '207', role: 'RESIDENT', avatar: '陈' },
  { id: 'usr_006', name: '刘佳', roomNumber: '308', role: 'RESIDENT', avatar: '刘' },
  { id: 'usr_admin', name: '宿舍管理员', roomNumber: '管理室', role: 'ADMIN', avatar: '管' },
];

export const QUEUE_ENTRIES: QueueEntry[] = [
  {
    id: genId(), machineId: 'mch_002', userId: 'usr_004', position: 1,
    joinTime: new Date(now - 10 * 60 * 1000).toISOString(),
    confirmTimeoutSeconds: 0, confirmStartAt: null, confirmed: true,
  },
  {
    id: genId(), machineId: 'mch_002', userId: 'usr_005', position: 2,
    joinTime: new Date(now - 5 * 60 * 1000).toISOString(),
    confirmTimeoutSeconds: 0, confirmStartAt: null, confirmed: false,
  },
];

export const REPAIR_RECORDS: RepairRecord[] = [
  {
    id: genId(), machineId: 'mch_004', reporterId: 'usr_001',
    description: '洗衣机不脱水，电机有异常响声',
    status: 'CONFIRMED',
    reportTime: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    handleTime: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
    handlerId: 'usr_admin',
  },
];

export const DEFAULT_REMINDER: ReminderSettings = {
  userId: 'usr_001',
  remindOnTurn: true,
  remindOnFree: true,
  advanceMinutes: 2,
};
