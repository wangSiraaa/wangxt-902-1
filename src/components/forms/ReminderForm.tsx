import { useEffect, useMemo, useState } from 'react';
import Modal from '../common/Modal';
import { useAppStore } from '../../store';
import { Bell, Clock, BellRing } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

export default function ReminderForm() {
  const { ui, users, currentUserId, reminders } = useAppStore(
    useShallow(s => ({
      ui: s.ui,
      users: s.users,
      currentUserId: s.currentUserId,
      reminders: s.reminders,
    }))
  );
  const close = useAppStore(s => s.closeReminderModal);
  const saveReminder = useAppStore(s => s.saveReminderSettings);

  const open = ui.showReminderModal;
  const currentUser = useMemo(
    () => users.find(u => u.id === currentUserId),
    [users, currentUserId]
  );
  const settings = useMemo(
    () => (currentUser ? reminders[currentUser.id] ?? {
      remindOnTurn: true,
      remindOnFree: true,
      advanceMinutes: 2,
    } : null),
    [currentUser, reminders]
  );

  const [remindOnTurn, setRemindOnTurn] = useState(settings?.remindOnTurn ?? true);
  const [remindOnFree, setRemindOnFree] = useState(settings?.remindOnFree ?? true);
  const [advanceMinutes, setAdvanceMinutes] = useState(settings?.advanceMinutes ?? 2);

  useEffect(() => {
    if (settings) {
      setRemindOnTurn(settings.remindOnTurn);
      setRemindOnFree(settings.remindOnFree);
      setAdvanceMinutes(settings.advanceMinutes);
    }
  }, [settings, open]);

  if (!currentUser || !settings) return null;

  const handleSave = () => {
    saveReminder(currentUser.id, { remindOnTurn, remindOnFree, advanceMinutes });
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={
        <span className="flex items-center gap-2">
          <Bell size={18} className="text-teal-300" /> 提醒设置
        </span>
      }
    >
      <div className="space-y-5">
        <div className="text-xs text-slate-400">
          为 <span className="text-slate-200 font-medium">{currentUser.name}</span> 配置提醒偏好，设置保存在本地浏览器中。
        </div>

        <ToggleRow
          icon={<BellRing size={18} />}
          title="轮到使用提醒"
          desc="当您在队列中的位置变为第1位，且机器即将可用时通知"
          checked={remindOnTurn}
          onChange={setRemindOnTurn}
        />

        <ToggleRow
          icon={<Bell size={18} />}
          title="机器空闲提醒"
          desc="当您关注的机器变为空闲状态时通知"
          checked={remindOnFree}
          onChange={setRemindOnFree}
        />

        <div className="grid grid-cols-2 items-center gap-3 p-4 rounded-xl bg-slate-900/40 border border-slate-700/30">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-300">
              <Clock size={17} />
            </div>
            <div>
              <div className="text-sm font-medium">提前提醒</div>
              <div className="text-[11px] text-slate-400">机器使用结束前</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={30}
              value={advanceMinutes}
              onChange={e => setAdvanceMinutes(Math.max(0, Math.min(30, Number(e.target.value))))}
              className="input !py-2 text-center"
            />
            <span className="text-sm text-slate-400">分钟</span>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={close} className="btn btn-secondary flex-1">取消</button>
          <button onClick={handleSave} className="btn btn-primary flex-1">保存设置</button>
        </div>
      </div>
    </Modal>
  );
}

function ToggleRow({
  icon, title, desc, checked, onChange,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all
        ${checked ? 'bg-teal-500/8 border-teal-400/30' : 'bg-slate-900/40 border-slate-700/30'}`}
    >
      <div className={`h-10 w-10 shrink-0 rounded-lg flex items-center justify-center
        ${checked ? 'bg-teal-500/20 text-teal-300' : 'bg-slate-800/60 text-slate-400'}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-[11px] text-slate-400">{desc}</div>
      </div>
      <div
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors
          ${checked ? 'bg-teal-500' : 'bg-slate-700'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform
            ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
        />
      </div>
    </label>
  );
}
