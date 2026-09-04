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
    <div className="space-y-3 sm:space-y-5">
      {/* Enterprise Status Banner - Mobile Optimized */}
      <div className="bg-gradient-to-r from-[#1a237e] via-[#283593] to-[#0d47a1] text-white p-3.5 sm:p-5 rounded-2xl shadow-md flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl bg-white/10 p-2 rounded-xl">🏢</span>
            <div>
              <h3 className="font-black text-sm sm:text-base md:text-xl text-[#ffd54f]">
                {appData.settings.companyName || 'منظومة ركيزة RAKEEZA ERP'}
              </h3>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs text-blue-100 opacity-90 mt-0.5">
                <span>الفرع: <strong className="text-amber-300 font-bold">{activeBranch?.name || 'الفرع الرئيسي'}</strong></span>
                <span className="text-blue-300">•</span>
                <span>ضريبي: <strong className="font-mono">{appData.settings.taxNumber || '123-456-789'}</strong></span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('pos')}
            className="min-h-[42px] bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 font-black px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 flex-1 sm:flex-initial"
          >
            <span>⚡</span>
            <span>كاشير POS السريع</span>
          </button>
          <button
            onClick={() => onNavigate('bi_analytics')}
            className="min-h-[42px] bg-white/15 hover:bg-white/25 active:bg-white/30 text-white font-bold px-3 py-2 rounded-xl text-xs sm:text-sm border border-white/20 transition cursor-pointer flex items-center justify-center gap-1 flex-1 sm:flex-initial"
          >
            <span>📊</span>
            <span>ذكاء الأعمال</span>
          </button>
        </div>
      </div>

      {/* Mobile-First Fast Action Buttons (1-Tap ERP Quick Shortcuts) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={() => onNavigate('sales')}
          className="min-h-[44px] bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-200 text-emerald-900 rounded-xl p-2.5 flex items-center justify-center gap-2 text-xs font-bold transition shadow-2xs"
        >
          <span className="text-base">➕</span>
          <span>فاتورة بيع جديدة</span>
        </button>
        <button
          onClick={() => onNavigate('purchases')}
          className="min-h-[44px] bg-blue-50 hover:bg-blue-100 active:bg-blue-200 border border-blue-200 text-blue-900 rounded-xl p-2.5 flex items-center justify-center gap-2 text-xs font-bold transition shadow-2xs"
        >
          <span className="text-base">🛒</span>
          <span>فاتورة شراء جديدة</span>
        </button>
        <button
          onClick={() => onNavigate('cash')}
          className="min-h-[44px] bg-amber-50 hover:bg-amber-100 active:bg-amber-200 border border-amber-200 text-amber-900 rounded-xl p-2.5 flex items-center justify-center gap-2 text-xs font-bold transition shadow-2xs"
        >
          <span className="text-base">💵</span>
          <span>سند قبض / صرف</span>
        </button>
        <button
          onClick={() => onNavigate('items')}
          className="min-h-[44px] bg-purple-50 hover:bg-purple-100 active:bg-purple-200 border border-purple-200 text-purple-900 rounded-xl p-2.5 flex items-center justify-center gap-2 text-xs font-bold transition shadow-2xs"
        >
          <span className="text-base">📦</span>
          <span>المخزون والأصناف</span>
        </button>
      </div>

      {/* Main Core Cards Grid - 2 columns on mobile for instant visibility */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Sales Card */}
        <div
          onClick={() => onNavigate('sales')}
          className="bg-white rounded-2xl p-3 sm:p-5 shadow-xs border-r-4 border-[#1a237e] hover:-translate-y-0.5 active:scale-[0.98] transition cursor-pointer relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-1">
            <div className="text-2xl sm:text-3xl">💰</div>
            <span className="bg-[#1a237e] text-white rounded-full min-w-[24px] h-6 px-1.5 flex items-center justify-center text-[11px] sm:text-xs font-bold font-mono">
              {appData.salesInvoices.length}
            </span>
          </div>
          <h3 className="text-[#1a237e] font-bold text-xs sm:text-base mb-0.5">المبيعات والفواتير</h3>
          <p className="text-slate-500 text-[11px] hidden sm:block">نقدي / آجل / مرتجعات / إلكتروني</p>
        </div>

        {/* Purchases Card */}
        <div
          onClick={() => onNavigate('purchases')}
          className="bg-white rounded-2xl p-3 sm:p-5 shadow-xs border-r-4 border-indigo-600 hover:-translate-y-0.5 active:scale-[0.98] transition cursor-pointer relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-1">
            <div className="text-2xl sm:text-3xl">🛒</div>
            <span className="bg-indigo-600 text-white rounded-full min-w-[24px] h-6 px-1.5 flex items-center justify-center text-[11px] sm:text-xs font-bold font-mono">
              {appData.purchaseInvoices.length}
            </span>
          </div>
          <h3 className="text-[#1a237e] font-bold text-xs sm:text-base mb-0.5">المشتريات والتوريد</h3>
          <p className="text-slate-500 text-[11px] hidden sm:block">شراء / مرتجعات / خصم منبع</p>
        </div>

        {/* Cash Card */}
        <div
          onClick={() => onNavigate('cash')}
          className="bg-white rounded-2xl p-3 sm:p-5 shadow-xs border-r-4 border-emerald-600 hover:-translate-y-0.5 active:scale-[0.98] transition cursor-pointer relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-1">
            <div className="text-2xl sm:text-3xl">💵</div>
            <span className="bg-emerald-600 text-white rounded-full min-w-[24px] h-6 px-1.5 flex items-center justify-center text-[11px] sm:text-xs font-bold font-mono">
              {appData.cashTransactions.length}
            </span>
          </div>
          <h3 className="text-[#1a237e] font-bold text-xs sm:text-base mb-0.5">الخزينة والسيولة</h3>
          <p className="text-slate-500 text-[11px] hidden sm:block">سندات القبض والصرف الفورية</p>
        </div>

        {/* Accounts Card */}
        <div
          onClick={() => onNavigate('accounts')}
          className="bg-white rounded-2xl p-3 sm:p-5 shadow-xs border-r-4 border-purple-600 hover:-translate-y-0.5 active:scale-[0.98] transition cursor-pointer relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-1">
            <div className="text-2xl sm:text-3xl">📋</div>
            <span className="bg-purple-600 text-white rounded-full min-w-[24px] h-6 px-1.5 flex items-center justify-center text-[11px] sm:text-xs font-bold font-mono">
              {appData.customers.length + appData.suppliers.length}
            </span>
          </div>
          <h3 className="text-[#1a237e] font-bold text-xs sm:text-base mb-0.5">العملاء والموردين</h3>
          <p className="text-slate-500 text-[11px] hidden sm:block">كشوف الحسابات ومتابعة الأرصدة</p>
        </div>
      </div>

      {/* Enterprise Modules Quick Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3">
        <button
          onClick={() => onNavigate('price_management')}
          className="min-h-[64px] sm:min-h-[72px] bg-white hover:bg-amber-50/50 active:bg-amber-100 p-2.5 sm:p-3 rounded-2xl border border-amber-200 text-center transition cursor-pointer flex flex-col items-center justify-center space-y-0.5 shadow-2xs"
        >
          <span className="text-lg sm:text-xl block">🏷️</span>
          <span className="text-[11px] sm:text-xs font-bold text-amber-900 block truncate w-full">إدارة الأسعار</span>
          <span className="text-[9px] sm:text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-full font-bold">
            {(appData.items || []).length} صنف مسعر
          </span>
        </button>

        <button
          onClick={() => onNavigate('cheques')}
          className="min-h-[64px] sm:min-h-[72px] bg-white hover:bg-emerald-50/50 active:bg-emerald-100 p-2.5 sm:p-3 rounded-2xl border border-slate-200 text-center transition cursor-pointer flex flex-col items-center justify-center space-y-0.5 shadow-2xs"
        >
          <span className="text-lg sm:text-xl block">💳</span>
          <span className="text-[11px] sm:text-xs font-bold text-slate-800 block truncate w-full">شيكات وأوراق قبض</span>
          <span className="text-[9px] sm:text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full font-bold">
            {(appData.cheques || []).filter((c) => c.status === 'received').length} تحت التحصيل
          </span>
        </button>

        <button
          onClick={() => onNavigate('sales_reps')}
          className="min-h-[64px] sm:min-h-[72px] bg-white hover:bg-indigo-50/50 active:bg-indigo-100 p-2.5 sm:p-3 rounded-2xl border border-slate-200 text-center transition cursor-pointer flex flex-col items-center justify-center space-y-0.5 shadow-2xs"
        >
          <span className="text-lg sm:text-xl block">🎯</span>
          <span className="text-[11px] sm:text-xs font-bold text-slate-800 block truncate w-full">المندوبين والعمولات</span>
          <span className="text-[9px] sm:text-[10px] text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded-full font-bold">
            {(appData.salesReps || []).length} مندوب نشط
          </span>
        </button>

        <button
          onClick={() => onNavigate('hr_payroll')}
          className="min-h-[64px] sm:min-h-[72px] bg-white hover:bg-blue-50/50 active:bg-blue-100 p-2.5 sm:p-3 rounded-2xl border border-slate-200 text-center transition cursor-pointer flex flex-col items-center justify-center space-y-0.5 shadow-2xs"
        >
          <span className="text-lg sm:text-xl block">👥</span>
          <span className="text-[11px] sm:text-xs font-bold text-slate-800 block truncate w-full">الموارد والرواتب</span>
          <span className="text-[9px] sm:text-[10px] text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded-full font-bold">
            {(appData.employees || []).length} موظف
          </span>
        </button>

        <button
          onClick={() => onNavigate('fixed_assets')}
          className="min-h-[64px] sm:min-h-[72px] bg-white hover:bg-purple-50/50 active:bg-purple-100 p-2.5 sm:p-3 rounded-2xl border border-slate-200 text-center transition cursor-pointer flex flex-col items-center justify-center space-y-0.5 shadow-2xs"
        >
          <span className="text-lg sm:text-xl block">🏢</span>
          <span className="text-[11px] sm:text-xs font-bold text-slate-800 block truncate w-full">الأصول والإهلاك</span>
          <span className="text-[9px] sm:text-[10px] text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded-full font-bold">
            {(appData.fixedAssets || []).length} أصل
          </span>
        </button>

        <button
          onClick={() => onNavigate('manufacturing')}
          className="min-h-[64px] sm:min-h-[72px] bg-white hover:bg-amber-50/50 active:bg-amber-100 p-2.5 sm:p-3 rounded-2xl border border-slate-200 text-center transition cursor-pointer flex flex-col items-center justify-center space-y-0.5 shadow-2xs"
        >
          <span className="text-lg sm:text-xl block">⚙️</span>
          <span className="text-[11px] sm:text-xs font-bold text-slate-800 block truncate w-full">التصنيع و BOM</span>
          <span className="text-[9px] sm:text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded-full font-bold">
            {(appData.workOrders || []).filter((w) => w.status === 'in_progress').length} أمر إنتاج
          </span>
        </button>

        <button
          onClick={() => onNavigate('bank_reconciliation')}
          className="min-h-[64px] sm:min-h-[72px] bg-white hover:bg-teal-50/50 active:bg-teal-100 p-2.5 sm:p-3 rounded-2xl border border-slate-200 text-center transition cursor-pointer flex flex-col items-center justify-center space-y-0.5 shadow-2xs"
        >
          <span className="text-lg sm:text-xl block">🏦</span>
          <span className="text-[11px] sm:text-xs font-bold text-slate-800 block truncate w-full">المطابقة البنكية</span>
          <span className="text-[9px] sm:text-[10px] text-teal-700 bg-teal-100 px-1.5 py-0.2 rounded-full font-bold">
            {(appData.approvalRequests || []).filter((a) => a.status === 'pending').length} معلق
          </span>
        </button>
      </div>

      {/* Quick Summary Section */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200">
        <h4 className="text-[#1a237e] font-bold text-xs sm:text-base mb-2.5 sm:mb-4 flex items-center gap-2">
          <span>📈</span> ملخص المؤشرات المالية والتشغيلية
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3.5 text-xs">
          <div className="bg-slate-50 p-2.5 sm:p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-500 block mb-0.5 text-[11px]">إجمالي المبيعات</span>
            <strong className="text-[#2e7d32] text-sm sm:text-base md:text-lg font-bold font-mono">
              {totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
            </strong>
          </div>
          <div className="bg-slate-50 p-2.5 sm:p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-500 block mb-0.5 text-[11px]">إجمالي المشتريات</span>
            <strong className="text-[#c62828] text-sm sm:text-base md:text-lg font-bold font-mono">
              {totalPurchases.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
            </strong>
          </div>
          <div className="bg-slate-50 p-2.5 sm:p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-500 block mb-0.5 text-[11px]">عدد العملاء</span>
            <strong className="text-[#1a237e] text-sm sm:text-base md:text-lg font-bold font-mono">{appData.customers.length}</strong>
          </div>
          <div className="bg-slate-50 p-2.5 sm:p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-500 block mb-0.5 text-[11px]">عدد الموردين</span>
            <strong className="text-[#1a237e] text-sm sm:text-base md:text-lg font-bold font-mono">{appData.suppliers.length}</strong>
          </div>
          <div className="bg-slate-50 p-2.5 sm:p-3.5 rounded-xl border border-slate-200/80 col-span-2 sm:col-span-1">
            <span className="text-slate-500 block mb-0.5 text-[11px]">قيمة المخزون الكلي</span>
            <strong className="text-[#f57f17] text-sm sm:text-base md:text-lg font-bold font-mono">
              {stockValue.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
};
