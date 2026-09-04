import React from 'react';
import { AppData } from '../types';

interface HomeViewProps {
  appData: AppData;
  onNavigate: (page: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ appData, onNavigate }) => {
  const totalSales = appData.salesInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalPurchases = appData.purchaseInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const stockValue = appData.items.reduce((sum, item) => sum + (item.quantity || 0) * (item.purchasePrice || 0), 0);
  const activeBranch = appData.branches?.find((b) => b.id === appData.activeBranchId) || appData.branches?.[0];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Enterprise Status Banner */}
      <div className="bg-gradient-to-r from-[#1a237e] via-[#283593] to-[#0d47a1] text-white p-4 sm:p-5 rounded-2xl shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏢</span>
            <h3 className="font-black text-base sm:text-lg md:text-xl text-[#ffd54f]">
              {appData.settings.companyName || 'منظومة الإدارة والمحاسبة الذكية'}
            </h3>
          </div>
          <p className="text-xs text-blue-100 mt-1 opacity-90">
            الفرع النشط: <strong className="text-amber-300 font-bold">{activeBranch?.name || 'الفرع الرئيسي'}</strong> | الرقم الضريبي: {appData.settings.taxNumber || '123-456-789'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => onNavigate('pos')}
            className="min-h-[42px] bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 font-black px-4 py-2 rounded-xl text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 flex-1 sm:flex-initial"
          >
            ⚡ كاشير نقطة البيع السريع (POS)
          </button>
          <button
            onClick={() => onNavigate('bi_analytics')}
            className="min-h-[42px] bg-white/15 hover:bg-white/25 active:bg-white/30 text-white font-bold px-3.5 py-2 rounded-xl text-xs border border-white/20 transition cursor-pointer flex items-center justify-center gap-1 flex-1 sm:flex-initial"
          >
            📊 ذكاء الأعمال
          </button>
        </div>
      </div>

      {/* Main Core Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Sales Card */}
        <div
          onClick={() => onNavigate('sales')}
          className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border-r-4 border-[#1a237e] hover:-translate-y-0.5 active:scale-[0.99] transition cursor-pointer relative overflow-hidden"
        >
          <div className="text-3xl mb-1.5">💰</div>
          <h3 className="text-[#1a237e] font-bold text-sm sm:text-base mb-0.5">المبيعات والفواتير</h3>
          <p className="text-slate-500 text-xs">نقدي / آجل / مرتجعات / إلكتروني</p>
          <div className="absolute top-3 left-3 bg-[#1a237e] text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold font-mono">
            {appData.salesInvoices.length}
          </div>
        </div>

        {/* Purchases Card */}
        <div
          onClick={() => onNavigate('purchases')}
          className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border-r-4 border-[#1a237e] hover:-translate-y-0.5 active:scale-[0.99] transition cursor-pointer relative overflow-hidden"
        >
          <div className="text-3xl mb-1.5">🛒</div>
          <h3 className="text-[#1a237e] font-bold text-sm sm:text-base mb-0.5">المشتريات والتوريدات</h3>
          <p className="text-slate-500 text-xs">شراء / مرتجعات / خصم منبع</p>
          <div className="absolute top-3 left-3 bg-[#1a237e] text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold font-mono">
            {appData.purchaseInvoices.length}
          </div>
        </div>

        {/* Cash Card */}
        <div
          onClick={() => onNavigate('cash')}
          className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border-r-4 border-[#1a237e] hover:-translate-y-0.5 active:scale-[0.99] transition cursor-pointer relative overflow-hidden"
        >
          <div className="text-3xl mb-1.5">💵</div>
          <h3 className="text-[#1a237e] font-bold text-sm sm:text-base mb-0.5">الخزينة والسيولة</h3>
          <p className="text-slate-500 text-xs">سندات القبض والصرف الفورية</p>
          <div className="absolute top-3 left-3 bg-[#1a237e] text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold font-mono">
            {appData.cashTransactions.length}
          </div>
        </div>

        {/* Accounts Card */}
        <div
          onClick={() => onNavigate('accounts')}
          className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border-r-4 border-[#1a237e] hover:-translate-y-0.5 active:scale-[0.99] transition cursor-pointer relative overflow-hidden"
        >
          <div className="text-3xl mb-1.5">📋</div>
          <h3 className="text-[#1a237e] font-bold text-sm sm:text-base mb-0.5">العملاء والموردين</h3>
          <p className="text-slate-500 text-xs">كشوف الحسابات ومتابعة الأرصدة</p>
          <div className="absolute top-3 left-3 bg-[#1a237e] text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold font-mono">
            {appData.customers.length + appData.suppliers.length}
          </div>
        </div>
      </div>

      {/* Enterprise Modules Quick Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
        <button
          onClick={() => onNavigate('price_management')}
          className="min-h-[72px] bg-white hover:bg-amber-50/50 active:bg-amber-100 p-3 rounded-2xl border border-amber-200 text-center transition cursor-pointer flex flex-col items-center justify-center space-y-1 shadow-xs"
        >
          <span className="text-xl block">🏷️</span>
          <span className="text-xs font-bold text-amber-900 block">إدارة الأسعار</span>
          <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-full font-bold">
            {(appData.items || []).length} صنف مسعر
          </span>
        </button>

        <button
          onClick={() => onNavigate('cheques')}
          className="min-h-[72px] bg-white hover:bg-emerald-50/50 active:bg-emerald-100 p-3 rounded-2xl border border-slate-200 text-center transition cursor-pointer flex flex-col items-center justify-center space-y-1"
        >
          <span className="text-xl block">💳</span>
          <span className="text-xs font-bold text-slate-800 block">شيكات وأوراق قبض</span>
          <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full font-bold">
            {(appData.cheques || []).filter((c) => c.status === 'received').length} تحت التحصيل
          </span>
        </button>

        <button
          onClick={() => onNavigate('sales_reps')}
          className="min-h-[72px] bg-white hover:bg-indigo-50/50 active:bg-indigo-100 p-3 rounded-2xl border border-slate-200 text-center transition cursor-pointer flex flex-col items-center justify-center space-y-1"
        >
          <span className="text-xl block">🎯</span>
          <span className="text-xs font-bold text-slate-800 block">المندوبين والعمولات</span>
          <span className="text-[10px] text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded-full font-bold">
            {(appData.salesReps || []).length} مندوب نشط
          </span>
        </button>

        <button
          onClick={() => onNavigate('hr_payroll')}
          className="min-h-[72px] bg-white hover:bg-blue-50/50 active:bg-blue-100 p-3 rounded-2xl border border-slate-200 text-center transition cursor-pointer flex flex-col items-center justify-center space-y-1"
        >
          <span className="text-xl block">👥</span>
          <span className="text-xs font-bold text-slate-800 block">الموارد والرواتب</span>
          <span className="text-[10px] text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full font-bold">
            {(appData.employees || []).length} موظف
          </span>
        </button>

        <button
          onClick={() => onNavigate('fixed_assets')}
          className="min-h-[72px] bg-white hover:bg-purple-50/50 active:bg-purple-100 p-3 rounded-2xl border border-slate-200 text-center transition cursor-pointer flex flex-col items-center justify-center space-y-1"
        >
          <span className="text-xl block">🏢</span>
          <span className="text-xs font-bold text-slate-800 block">الأصول والإهلاك</span>
          <span className="text-[10px] text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full font-bold">
            {(appData.fixedAssets || []).length} أصل
          </span>
        </button>

        <button
          onClick={() => onNavigate('manufacturing')}
          className="min-h-[72px] bg-white hover:bg-amber-50/50 active:bg-amber-100 p-3 rounded-2xl border border-slate-200 text-center transition cursor-pointer flex flex-col items-center justify-center space-y-1"
        >
          <span className="text-xl block">⚙️</span>
          <span className="text-xs font-bold text-slate-800 block">التصنيع و BOM</span>
          <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full font-bold">
            {(appData.workOrders || []).filter((w) => w.status === 'in_progress').length} أمر إنتاج
          </span>
        </button>

        <button
          onClick={() => onNavigate('bank_reconciliation')}
          className="min-h-[72px] bg-white hover:bg-teal-50/50 active:bg-teal-100 p-3 rounded-2xl border border-slate-200 text-center transition cursor-pointer flex flex-col items-center justify-center space-y-1"
        >
          <span className="text-xl block">🏦</span>
          <span className="text-xs font-bold text-slate-800 block">المطابقة البنكية</span>
          <span className="text-[10px] text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded-full font-bold">
            {(appData.approvalRequests || []).filter((a) => a.status === 'pending').length} اعتماد معلق
          </span>
        </button>
      </div>

      {/* Quick Summary Section */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200">
        <h4 className="text-[#1a237e] font-bold text-sm sm:text-base mb-3 sm:mb-4 flex items-center gap-2">
          <span>📈</span> ملخص المؤشرات المالية والتشغيلية
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 text-xs md:text-sm">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-500 block mb-1 text-xs">إجمالي المبيعات</span>
            <strong className="text-[#2e7d32] text-base sm:text-lg font-bold font-mono">
              {totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
            </strong>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-500 block mb-1 text-xs">إجمالي المشتريات</span>
            <strong className="text-[#c62828] text-base sm:text-lg font-bold font-mono">
              {totalPurchases.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
            </strong>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-500 block mb-1 text-xs">عدد العملاء</span>
            <strong className="text-[#1a237e] text-base sm:text-lg font-bold font-mono">{appData.customers.length}</strong>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-500 block mb-1 text-xs">عدد الموردين</span>
            <strong className="text-[#1a237e] text-base sm:text-lg font-bold font-mono">{appData.suppliers.length}</strong>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 sm:col-span-2 md:col-span-1">
            <span className="text-slate-500 block mb-1 text-xs">قيمة المخزون الكلي</span>
            <strong className="text-[#f57f17] text-base sm:text-lg font-bold font-mono">
              {stockValue.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
};
