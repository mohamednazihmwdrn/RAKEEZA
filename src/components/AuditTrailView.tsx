import React, { useState } from 'react';
import { AppData, AuditLog } from '../types';
import { openUnifiedPrintWindow } from '../utils/printUnified';
import { exportToExcel } from '../utils/excelExport';

interface AuditTrailViewProps {
  appData: AppData;
  onUpdateData: (newData: AppData) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({
  appData,
  showToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedModule, setSelectedModule] = useState<string>('all');

  const logs: AuditLog[] = appData.auditLogs || [];

  const actions = ['all', 'create', 'update', 'delete', 'print', 'approval', 'login', 'transfer'];
  const modules = ['all', ...Array.from(new Set(logs.map((l) => l.module)))];

  const filteredLogs = logs.filter((log) => {
    const matchSearch =
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.module.toLowerCase().includes(searchTerm.toLowerCase());
    const matchAction = selectedAction === 'all' || log.action === selectedAction;
    const matchModule = selectedModule === 'all' || log.module === selectedModule;
    return matchSearch && matchAction && matchModule;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'create':
        return <span className="bg-emerald-100 text-emerald-800 text-[11px] px-2.5 py-0.5 rounded-full font-bold">➕ إضافة جديدة</span>;
      case 'update':
        return <span className="bg-blue-100 text-blue-800 text-[11px] px-2.5 py-0.5 rounded-full font-bold">✏️ تعديل بيانات</span>;
      case 'delete':
        return <span className="bg-rose-100 text-rose-800 text-[11px] px-2.5 py-0.5 rounded-full font-bold">🗑️ حذف</span>;
      case 'print':
        return <span className="bg-indigo-100 text-indigo-800 text-[11px] px-2.5 py-0.5 rounded-full font-bold">🖨️ طباعة</span>;
      case 'approval':
        return <span className="bg-purple-100 text-purple-800 text-[11px] px-2.5 py-0.5 rounded-full font-bold">🛡️ اعتماد</span>;
      case 'transfer':
        return <span className="bg-amber-100 text-amber-800 text-[11px] px-2.5 py-0.5 rounded-full font-bold">🚚 تحويل مخزني</span>;
      case 'login':
        return <span className="bg-teal-100 text-teal-800 text-[11px] px-2.5 py-0.5 rounded-full font-bold">🔑 تسجيل دخول</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-[11px] px-2.5 py-0.5 rounded-full font-bold">{action}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-[#263238] to-[#37474f] text-white p-5 rounded-2xl shadow-md flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🛡️</span>
            <h3 className="font-black text-lg md:text-xl text-[#ffd54f]">
              سجل التدقيق الرقابي والأمان (Audit Trail & Activity Log)
            </h3>
          </div>
          <p className="text-xs text-slate-200 mt-1 opacity-90">
            رصد زمني دقيق لكل العمليات والتعديلات والإضافات التي تمت داخل النظام لحماية البيانات من التلاعب
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-white/10 px-3 py-1.5 rounded-xl text-xs font-mono">
            إجمالي السجلات: <strong>{filteredLogs.length}</strong> حركة
          </div>
          <button
            onClick={() => {
              openUnifiedPrintWindow(
                {
                  title: 'تقرير سجل التدقيق الرقابي وحركات النظام (Audit Trail)',
                  partyLabel: 'إجمالي الحركات',
                  partyName: `${filteredLogs.length} سجل حركة`,
                  items: filteredLogs.map((l) => ({
                    name: l.details,
                    code: l.id,
                    unit: l.module,
                    qty: 1,
                    price: 0,
                    total: 0,
                    notes: `المستخدم: ${l.userName} | الإجراء: ${l.action} | التاريخ: ${l.timestamp}`,
                  })),
                  totals: [
                    {
                      label: 'عدد الحركات المطبوعة:',
                      value: filteredLogs.length,
                      isBold: true,
                    },
                  ],
                },
                appData.settings,
                showToast
              );
            }}
            className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-xs"
          >
            <span>🖨️ طباعة السجل</span>
          </button>
          <button
            onClick={() => {
              exportToExcel({
                filename: `سجل_التدقيق_الرقابي_${new Date().toISOString().split('T')[0]}`,
                sheetName: 'سجل التدقيق الرقابي',
                data: filteredLogs,
                columns: [
                  { header: 'كود السجل', key: 'id', width: 14 },
                  { header: 'التاريخ والوقت', key: 'timestamp', width: 22 },
                  { header: 'اسم المستخدم', key: 'userName', width: 20 },
                  { header: 'نوع الحركة', key: 'action', width: 16 },
                  { header: 'القسم / الوحدة', key: 'module', width: 18 },
                  { header: 'تفاصيل وبيان العملية', key: 'details', width: 45 },
                ],
                companyName: appData.settings?.companyName || 'المنظومة المحاسبية المعتمدة',
                reportTitle: 'سجل التدقيق الرقابي والأمان وحركات مستخدمي النظام',
              });
              showToast('تم تصدير سجل التدقيق إلى Excel بنجاح', 'success');
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-xs"
          >
            <span>📊 تصدير Excel</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">بحث في تفاصيل السجل</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="🔍 ابحث بالبيان أو اسم المستخدم..."
            className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold bg-slate-50"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">نوع الحركة</label>
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="w-full p-2 border border-slate-300 rounded-xl text-xs font-bold bg-slate-50"
          >
            <option value="all">🌟 جميع الحركات</option>
            {actions.filter((a) => a !== 'all').map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">الوحدة / القسم</label>
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="w-full p-2 border border-slate-300 rounded-xl text-xs font-bold bg-slate-50"
          >
            <option value="all">🌟 جميع الأقسام</option>
            {modules.filter((m) => m !== 'all').map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs md:text-sm">
            <thead className="bg-[#1a237e] text-white">
              <tr>
                <th className="p-3 rounded-r-lg">التوقيت والتاريخ</th>
                <th className="p-3">المستخدم</th>
                <th className="p-3">نوع الحركة</th>
                <th className="p-3">الوحدة / القسم</th>
                <th className="p-3 rounded-l-lg">تفاصيل الحدث والبيانات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    لا توجد سجلات تطابق معايير البحث.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono text-slate-600 whitespace-nowrap text-xs">
                      🕒 {log.timestamp}
                    </td>
                    <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                      👤 {log.userName}
                    </td>
                    <td className="p-3 whitespace-nowrap">{getActionBadge(log.action)}</td>
                    <td className="p-3 font-semibold text-indigo-900 whitespace-nowrap">
                      📂 {log.module}
                    </td>
                    <td className="p-3 text-slate-700 font-medium">{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
