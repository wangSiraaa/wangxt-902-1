export type MachineStatus = 'IDLE' | 'IN_USE' | 'FAULT';

export type UserRole = 'RESIDENT' | 'ADMIN';

export type RepairStatus = 'PENDING' | 'CONFIRMED' | 'FIXED';

export type OperationAction =
  | 'RESERVE'
  | 'CANCEL_RESERVE'
  | 'START'
  | 'END'
  | 'REPORT_REPAIR'
  | 'MARK_FAULT'
  | 'FIX_MACHINE'
  | 'TIMEOUT_SHIFT'
  | 'AUTO_END';

export type OperationResult = 'SUCCESS' | 'FAILED' | 'BLOCKED';

export interface Building {
  id: string;
  name: string;
}

export interface Floor {
  id: string;
  buildingId: string;
  floorNumber: number;
}

export interface Machine {
  id: string;
  floorId: string;
  code: string;
  status: MachineStatus;
  currentUserId: string | null;
  startTime: string | null;
  durationMinutes: number;
}

export interface User {
  id: string;
  name: string;
  roomNumber: string;
  role: UserRole;
  avatar: string;
}

export interface QueueEntry {
  id: string;
  machineId: string;
  userId: string;
  position: number;
  joinTime: string;
  confirmTimeoutSeconds: number;
  confirmStartAt: string | null;
  confirmed: boolean;
  skippedByTimeout?: boolean;
}

export interface RepairRecord {
  id: string;
  machineId: string;
  reporterId: string;
  description: string;
  status: RepairStatus;
  reportTime: string;
  handleTime: string | null;
  handlerId: string | null;
}

export interface UsageLog {
  id: string;
  machineId: string;
  userId: string;
  startTime: string;
  endTime: string | null;
  actualMinutes: number | null;
}

export interface OperationLog {
  id: string;
  operatorId: string;
  action: OperationAction;
  targetMachineId: string;
  detail: string;
  timestamp: string;
  result: OperationResult;
}

export interface ReminderSettings {
  userId: string;
  remindOnTurn: boolean;
  remindOnFree: boolean;
  advanceMinutes: number;
}

export interface PrintListItem {
  machineId: string;
  addedAt: string;
}

export interface UIState {
  selectedBuildingId: string | null;
  selectedFloorId: string | null;
  selectedStatusFilter: MachineStatus | 'ALL';
  selectedMachineId: string | null;
  showDetailDrawer: boolean;
  showReminderModal: boolean;
  showRepairModal: boolean;
  showPrintPreview: boolean;
  printList: PrintListItem[];
  toasts: Array<{ id: string; type: 'success' | 'error' | 'info'; message: string }>;
}
