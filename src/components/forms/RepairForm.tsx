import { useMemo, useState } from 'react';
import Modal from '../common/Modal';
import { useAppStore } from '../../store';
import { Wrench, AlertTriangle } from 'lucide-react';
import { formatDateTime } from '../../utils/time';
import { useShallow } from 'zustand/react/shallow';

export default function RepairForm() {
  const { ui, machines, users, repairs, currentUserId } = useAppStore(
    useShallow(s => ({
      ui: s.ui,
      machines: s.machines,
      users: s.users,
      repairs: s.repairs,
      currentUserId: s.currentUserId,
    }))
  );
  const close = useAppStore(s => s.closeRepairModal);
  const submit = useAppStore(s => s.reportRepair);

  const open = ui.showRepairModal;
  const selected = ui.selectedMachineId;
  const machine = useMemo(
    () => machines.find(m => m.id === selected),
    [machines, selected]
  );
  const reports = useMemo(
    () => repairs.filter(r => r.machineId === selected),
    [repairs, selected]
  );
  const currentUser = useMemo(
    () => users.find(u => u.id === currentUserId),
    [users, currentUserId]
  );
  const getUser = (id: string) => users.find(u => u.id === id);

  const [desc, setDesc] = useState('');

  const handleSubmit = () => {
    if (!selected || !currentUser) return;
    const res = submit(selected, currentUser.id, desc);
    if (res.ok) {
      setDesc('');
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={
        <span className="flex items-center gap-2">
          <Wrench size={18} className="text-red-300" />
          报修记录 · {machine?.code}
        </span>
      }
    >
      <div className="space-y-5">
        {reports.length > 0 && (
          <section>
            <div className="text-xs text-slate-400 mb-2 font-medium">历史报修记录</div>
            <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin">
              {reports.map(r => {
                const reporter = getUser(r.reporterId);
                const handler = r.handlerId ? getUser(r.handlerId) : null;
                const statusCfg = {
                  PENDING: { cls: 'bg-amber-500/15 border-amber-400/30 text-amber-300', label: '待处理' },
                  CONFIRMED: { cls: 'bg-red-500/15 border-red-400/30 text-red-300', label: '已确认' },
                  FIXED: { cls: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300', label: '已修复' },
                } as const;
                const s = statusCfg[r.status];
                return (
                  <div key={r.id} className="p-3 rounded-xl bg-slate-900/40 border border-slate-700/30 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 shrink-0 rounded-md bg-gradient-to-br from-teal-500 to-cyan-400 flex items-center justify-center text-slate-950 text-[11px] font-bold">
                          {reporter?.avatar ?? '?'}
                        </div>
                        <div>
                          <div className="text-xs font-medium">{reporter?.name ?? '未知'}</div>
                          <div className="text-[10px] text-slate-500">{formatDateTime(r.reportTime)}</div>
                        </div>
                      </div>
                      <span className={`chip text-[10px] ${s.cls}`}>{s.label}</span>
                    </div>
                    <div className="text-xs text-slate-300 pl-9">{r.description}</div>
                    {handler && r.handleTime && (
                      <div className="text-[10px] text-slate-500 pl-9">
                        处理人：{handler.name} · {formatDateTime(r.handleTime)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {currentUser?.role !== 'ADMIN' && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle size={16} className="text-amber-300" />
              提交新报修
            </div>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={3}
              placeholder="请简要描述故障现象，例如：不脱水、通电无反应、门无法打开等"
              className="input resize-none"
            />
            <div className="flex gap-3">
              <button onClick={close} className="btn btn-secondary flex-1">取消</button>
              <button onClick={handleSubmit} disabled={!desc.trim()} className="btn btn-primary flex-1">
                提交报修
              </button>
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
}
