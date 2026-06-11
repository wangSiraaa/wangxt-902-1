import { useMemo } from 'react';
import { useAppStore } from '../../store';
import Modal from '../common/Modal';
import { Printer, X, Trash2, ListChecks, MapPin, Clock, Users, AlertTriangle, Zap } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { formatDateTime } from '../../utils/time';

export default function PrintPreview() {
  const { showPrintPreview, printList } = useAppStore(s => s.ui);
  const closePrintPreview = useAppStore(s => s.closePrintPreview);
  const removeFromPrintList = useAppStore(s => s.removeFromPrintList);
  const clearPrintList = useAppStore(s => s.clearPrintList);

  const { machines, floors, buildings, queues, users } = useAppStore(
    useShallow(s => ({
      machines: s.machines,
      floors: s.floors,
      buildings: s.buildings,
      queues: s.queues,
      users: s.users,
    }))
  );

  const printItems = useMemo(() => {
    return printList.map(item => {
      const machine = machines.find(m => m.id === item.machineId);
      const floor = machine ? floors.find(f => f.id === machine.floorId) : undefined;
      const building = floor ? buildings.find(b => b.id === floor.buildingId) : undefined;
      const queue = queues[item.machineId] ?? [];
      const currentUser = machine?.currentUserId ? users.find(u => u.id === machine.currentUserId) : undefined;
      return {
        ...item,
        machine,
        floor,
        building,
        queue,
        currentUser,
      };
    }).filter(item => item.machine);
  }, [printList, machines, floors, buildings, queues, users]);

  const statusLabel = (status: string) => {
    switch (status) {
      case 'IDLE': return { text: '空闲', cls: 'text-emerald-700 bg-emerald-100 border-emerald-200' };
      case 'IN_USE': return { text: '使用中', cls: 'text-amber-700 bg-amber-100 border-amber-200' };
      case 'FAULT': return { text: '故障', cls: 'text-red-700 bg-red-100 border-red-200' };
      default: return { text: status, cls: 'text-slate-700 bg-slate-100 border-slate-200' };
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Modal
        open={showPrintPreview}
        onClose={closePrintPreview}
        maxWidth="max-w-3xl"
        title={
          <div className="flex items-center gap-2">
            <ListChecks size={18} className="text-teal-400" />
            <span>打印清单预览</span>
            <span className="ml-2 text-sm font-normal text-slate-400">共 {printItems.length} 台机器</span>
          </div>
        }
      >
        <div className="space-y-4 print:space-y-2">
          <div className="hidden print:block text-center mb-6">
            <h1 className="font-display font-bold text-2xl text-slate-900">自助洗衣机占用清单</h1>
            <p className="text-sm text-slate-600 mt-1">打印时间：{formatDateTime(new Date().toISOString())}</p>
          </div>

          <div className="hidden print:block">
            <div className="text-sm text-slate-600 mb-3">
              共 <span className="font-semibold text-slate-900">{printItems.length}</span> 台机器待处理
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden pb-3 border-b border-slate-700/30">
            <button
              onClick={handlePrint}
              disabled={printItems.length === 0}
              className="btn btn-primary !py-2 text-xs flex items-center gap-1.5"
            >
              <Printer size={14} />
              打印清单
            </button>
            <button
              onClick={clearPrintList}
              disabled={printItems.length === 0}
              className="btn btn-secondary !py-2 text-xs flex items-center gap-1.5"
            >
              <Trash2 size={14} />
              清空
            </button>
            <span className="ml-auto text-xs text-slate-400">
              点击 × 可从清单中移除单台机器
            </span>
          </div>

          {printItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              打印清单为空，请先从洗衣机列表中选择需要打印的机器
            </div>
          ) : (
            <div className="print:divide-y print:divide-slate-200 divide-y divide-slate-700/30">
              {printItems.map(item => {
                const m = item.machine!;
                const sl = statusLabel(m.status);
                return (
                  <div
                    key={item.machineId}
                    className="py-3 flex items-start gap-4 print:py-2 print:gap-3 first:pt-0 last:pb-0"
                  >
                    <div className="shrink-0 w-20">
                      <div className="font-display font-bold text-lg text-slate-100 print:text-slate-900">{m.code}</div>
                      <div className={`inline-block mt-1 px-2 py-0.5 rounded border text-[11px] font-medium ${sl.cls} print:!bg-transparent print:border-slate-400`}>
                        {sl.text}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-slate-400 print:text-slate-600 mb-1.5">
                        <MapPin size={12} />
                        <span>{item.building?.name ?? ''} · {item.floor ? item.floor.floorNumber + '楼' : ''}</span>
                      </div>

                      {m.status === 'IN_USE' && item.currentUser && (
                        <div className="flex items-center gap-2 text-xs print:text-slate-700 text-slate-300">
                          <Clock size={12} className="text-amber-400" />
                          <span>使用人：<span className="font-medium">{item.currentUser.name}</span> · {item.currentUser.roomNumber}</span>
                        </div>
                      )}

                      {m.status === 'IDLE' && (
                        <div className="flex items-center gap-2 text-xs text-emerald-400 print:text-emerald-700">
                          <Zap size={12} />
                          <span>空闲可用</span>
                        </div>
                      )}

                      {m.status === 'FAULT' && (
                        <div className="flex items-center gap-2 text-xs text-red-400 print:text-red-700">
                          <AlertTriangle size={12} />
                          <span>故障维修中</span>
                        </div>
                      )}

                      {item.queue.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-slate-400 print:text-slate-600 mt-1">
                          <Users size={12} />
                          <span>排队 {item.queue.length} 人</span>
                        </div>
                      )}

                      <div className="text-[10px] text-slate-500 print:text-slate-500 mt-1">
                        加入时间：{formatDateTime(item.addedAt)}
                      </div>
                    </div>

                    <button
                      onClick={() => removeFromPrintList(item.machineId)}
                      className="shrink-0 btn-ghost btn !px-2 !py-1 print:hidden"
                      title="从打印清单移除"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {printItems.length > 0 && (
            <div className="hidden print:block mt-6 pt-4 border-t border-slate-300 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>管理员签字：_______________</span>
                <span>日期：{new Date().toLocaleDateString('zh-CN')}</span>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <style>{`
        @media print {
          body {
            background: white !important;
            color: #1e293b !important;
          }
          body > *:not(.print-only) {
            display: none !important;
          }
          .print-only, .print-only * {
            visibility: visible !important;
          }
        }
      `}</style>
    </>
  );
}
