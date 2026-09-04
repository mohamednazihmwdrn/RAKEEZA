import React, { useState } from 'react';
import { AppData, User } from '../types';
import { Modal } from './Modal';
import { openUnifiedPrintWindow } from '../utils/printUnified';
import { exportToExcel } from '../utils/excelExport';

interface UsersViewProps {
  appData: AppData;
  onUpdateData: (newData: AppData) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const UsersView: React.FC<UsersViewProps> = ({ appData, onUpdateData, showToast }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');

  const handlePrintUsers = () => {
    openUnifiedPrintWindow(
      {
        reportTitle: 'دليل وحسابات مستخدمي النظام والصلاحيات',
        subTitle: 'سجل موظفي ومستخدمي المنظومة المحاسبية',
        serial: 'USERS-REP',
        branch: 'إدارة أمن المعلومات',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        kpis: [
          { title: 'إجمالي المستخدمين', value: `${appData.users.length} مستخدم` },
          { title: 'المدراء / الأدمن', value: `${appData.users.filter(u => u.role === 'admin').length} مدير` },
          { title: 'المستخدمون العاديون', value: `${appData.users.filter(u => u.role === 'user').length} مستخدم` },
        ],
        columns: ['#', 'الاسم بالكامل', 'اسم المستخدم للدخول', 'الصلاحية / الدور'],
        rows: appData.users.map((u, idx) => [
          idx + 1,
          u.name,
          u.username,
          u.role === 'admin' ? 'مدير نظام (Admin)' : 'مستخدم عادي (User)',
        ]),
        footerNote: 'تم استخراج هذا التقرير من النظام المحاسبي المعتمد',
      },
      appData.settings,
      showToast
    );
  };

  const handleExportUsersExcel = () => {
    exportToExcel({
      filename: `دليل_مستخدمي_النظام_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'المستخدمين',
      data: appData.users,
      columns: [
        { header: 'كود المستخدم', key: 'id', width: 14 },
        { header: 'الاسم بالكامل', key: 'name', width: 25 },
        { header: 'اسم الدخول', key: 'username', width: 20 },
        {
          header: 'نوع الصلاحية',
          getValue: (u: any) => (u.role === 'admin' ? 'مدير عام (Admin)' : 'مستخدم عادي (User)'),
          width: 18,
        },
      ],
      companyName: appData.settings?.companyName || 'المنظومة المحاسبية المعتمدة',
      reportTitle: 'دليل وسجل حسابات مستخدمي النظام والصلاحيات',
    });
    showToast('تم تصدير دليل المستخدمين إلى Excel بنجاح', 'success');
  };

  const handleAddUser = () => {
    if (!name.trim() || !username.trim() || !password.trim()) {
      showToast('يرجى ملء جميع الحقول المفروضة', 'warning');
      return;
    }

    const newUser: User = {
      id: 'u' + Date.now(),
      name: name.trim(),
      username: username.trim(),
      password: password.trim(),
      role,
      permissions: {},
    };

    const updatedData = { ...appData, users: [...appData.users, newUser] };
    onUpdateData(updatedData);
    setIsModalOpen(false);
    showToast('تم إضافة المستخدم بنجاح', 'success');
  };

  const handleDeleteUser = (id: string) => {
    if (appData.users.length <= 1) {
      showToast('لا يمكن حذف المستخدم الوحيد بالنظام', 'error');
      return;
    }
    if (!confirm('حذف هذا المستخدم؟')) return;
    const updatedData = { ...appData, users: appData.users.filter((u) => u.id !== id) };
    onUpdateData(updatedData);
    showToast('تم حذف المستخدم بنجاح');
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-2xl shadow-sm flex flex-wrap justify-between items-center gap-3">
        <h4 className="text-[#1a237e] font-bold text-base flex items-center gap-1">
          <span>👥</span> إدارة حسابات مستخدمي النظام ({appData.users.length})
        </h4>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintUsers}
            className="bg-slate-700 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold cursor-pointer flex items-center gap-1 shadow-xs"
            title="طباعة دليل المستخدمين"
          >
            <span>🖨️ طباعة</span>
          </button>
          <button
            onClick={handleExportUsersExcel}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold cursor-pointer flex items-center gap-1 shadow-xs"
            title="تصدير إلى Excel"
          >
            <span>📊 تصدير Excel</span>
          </button>
          <button
            onClick={() => {
              setName('');
              setUsername('');
              setPassword('');
              setRole('user');
              setIsModalOpen(true);
            }}
            className="bg-[#2e7d32] hover:bg-[#1b5e20] text-white px-4 py-2 rounded-xl text-xs md:text-sm font-semibold cursor-pointer flex items-center gap-1 shadow-xs"
          >
            <span>➕ إضافة مستخدم</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm overflow-x-auto">
        <table className="w-full text-right text-xs md:text-sm">
          <thead>
            <tr className="bg-[#1a237e] text-white">
              <th className="p-3 rounded-r-lg">الاسم</th>
              <th className="p-3">اسم المستخدم</th>
              <th className="p-3">الصلاحية</th>
              <th className="p-3 rounded-l-lg">حذف</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {appData.users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="p-3 font-bold">{u.name}</td>
                <td className="p-3 text-gray-500">{u.username}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {u.role === 'admin' ? 'مدير عام' : 'مستخدم'}
                  </span>
                </td>
                <td className="p-3">
                  <button
                    onClick={() => handleDeleteUser(u.id)}
                    className="bg-red-500 text-white p-1 rounded text-xs hover:bg-red-600"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} title="👥 إضافة مستخدم جديد" onClose={() => setIsModalOpen(false)}>
        <div className="space-y-4 text-xs md:text-sm">
          <div>
            <label className="block font-bold mb-1">الاسم الكامل</label>
            <input
              type="text"
              placeholder="اسم المستخدم..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 border-2 border-gray-200 rounded-xl focus:border-[#1a237e] focus:outline-none"
            />
          </div>
          <div>
            <label className="block font-bold mb-1">اسم الدخول (Username)</label>
            <input
              type="text"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2.5 border-2 border-gray-200 rounded-xl focus:border-[#1a237e] focus:outline-none"
            />
          </div>
          <div>
            <label className="block font-bold mb-1">كلمة المرور</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2.5 border-2 border-gray-200 rounded-xl focus:border-[#1a237e] focus:outline-none"
            />
          </div>
          <div>
            <label className="block font-bold mb-1">الصلاحيات</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full p-2.5 border-2 border-gray-200 rounded-xl focus:border-[#1a237e] focus:outline-none"
            >
              <option value="user">مستخدم عادي</option>
              <option value="admin">مدير النظام</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddUser}
              className="bg-[#2e7d32] hover:bg-[#1b5e20] text-white px-6 py-2 rounded-xl font-bold cursor-pointer"
            >
              💾 حفظ
            </button>
            <button
              onClick={() => setIsModalOpen(false)}
              className="bg-gray-400 hover:bg-gray-500 text-white px-6 py-2 rounded-xl font-bold cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
