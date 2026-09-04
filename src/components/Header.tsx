import React, { useState, useRef } from 'react';
import { User } from '../types';

interface HeaderProps {
  currentUser: User | undefined;
  onToggleSidebar: () => void;
  onLogout: () => void;
  autoBackupActive?: boolean;
  onNavigateBackup?: () => void;
  onNavigateOwner?: () => void;
  onShareCatalog?: () => void;
  onOpenCatalog?: () => void;
  pendingWebOrdersCount?: number;
  onNavigateWebOrders?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onToggleSidebar,
  onLogout,
  autoBackupActive = true,
  onNavigateBackup,
  onNavigateOwner,
  onShareCatalog,
  onOpenCatalog,
  pendingWebOrdersCount = 0,
  onNavigateWebOrders,
}) => {
  const [clickCount, setClickCount] = useState(0);
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [ownerPin, setOwnerPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSystemNameClick = () => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }

    const nextCount = clickCount + 1;
    setClickCount(nextCount);

    if (nextCount >= 5) {
      setClickCount(0);
      setShowOwnerModal(true);
      setOwnerPin('');
      setErrorMessage('');
    } else {
      clickTimerRef.current = setTimeout(() => {
        setClickCount(0);
      }, 3500);
    }
  };

  const handleOwnerLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ownerPin.trim() === '29190615') {
      setShowOwnerModal(false);
      setOwnerPin('');
      setErrorMessage('');
      if (onNavigateOwner) {
        onNavigateOwner();
      }
    } else {
      setErrorMessage('رمز المرور السري غير صحيح! يرجى التأكد وإعادة المحاولة.');
    }
  };

  return (
    <>
      <header className="fixed top-0 right-0 left-0 h-[60px] bg-gradient-to-r from-[#1a237e] to-[#0d47a1] text-white px-3 sm:px-5 flex items-center justify-between z-50 shadow-md no-print" dir="rtl">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onToggleSidebar}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-white/15 hover:bg-white/25 active:bg-white/30 text-white text-xl rounded-xl transition cursor-pointer"
            title="القائمة الرئيسية"
            aria-label="تبديل القائمة الجانبية"
          >
            ☰
          </button>
          <div
            className="text-base sm:text-lg md:text-xl font-black tracking-wide flex items-center gap-1.5 cursor-pointer select-none py-1 px-1.5 rounded-lg hover:bg-white/10 active:scale-95 transition"
            onClick={handleSystemNameClick}
            title="النزيه للمحاسبة السحابية"
          >
            <span>📊</span>
            <span className="text-[#ffd54f]">النزيه</span>
            <span className="hidden xs:inline text-xs sm:text-base font-bold text-white/90">للمحاسبة</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs sm:text-sm">
          {/* Incoming Web Orders Button */}
          {onNavigateWebOrders && (
            <button
              type="button"
              onClick={onNavigateWebOrders}
              className={`min-h-[38px] flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition cursor-pointer shadow-xs active:scale-95 ${
                pendingWebOrdersCount > 0
                  ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse'
                  : 'bg-white/15 hover:bg-white/25 text-white'
              }`}
              title="صندوق طلبات الويب سايت والكتالوج الإلكتروني"
            >
              <span>📥</span>
              <span className="hidden sm:inline">طلبات الويب سايت</span>
              {pendingWebOrdersCount > 0 ? (
                <span className="bg-white text-rose-700 text-[11px] font-black px-1.5 py-0.2 rounded-full">
                  {pendingWebOrdersCount}
                </span>
              ) : (
                <span className="text-[10px] text-slate-300">وارد</span>
              )}
            </button>
          )}

          {/* Share Catalog Button */}
          {onShareCatalog && (
            <button
              type="button"
              onClick={onShareCatalog}
              className="min-h-[38px] flex items-center gap-1.5 px-3 py-1 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 font-black rounded-full text-xs transition cursor-pointer shadow-xs active:scale-95"
              title="مشاركة كتالوج المنتجات والمتجر الإلكتروني للعملاء وتوليد QR Code"
            >
              <span>🛍️</span>
              <span className="hidden sm:inline">مشاركة الكتالوج</span>
              <span className="text-[10px] bg-slate-900 text-amber-300 px-1.5 py-0.5 rounded-full font-mono font-bold">
                QR
              </span>
            </button>
          )}

          {/* Auto-Backup Status Indicator */}
          <button
            onClick={() => onNavigateBackup && onNavigateBackup()}
            className={`min-h-[38px] flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
              autoBackupActive
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 hover:bg-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-400/30 hover:bg-amber-500/30'
            }`}
            title="حالة النسخ الاحتياطي التلقائي - اضغط لفتح مركز النسخ والاستعادة"
          >
            <span className={`w-2.5 h-2.5 rounded-full ${autoBackupActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            <span className="hidden sm:inline">{autoBackupActive ? '🛡️ النسخ التلقائي نشط' : '⚠️ النسخ متوقف'}</span>
            <span className="sm:hidden text-[11px]">{autoBackupActive ? 'محمي' : 'تنبيه'}</span>
          </button>

          <span className="hidden md:inline-flex items-center bg-white/15 px-3 py-1.5 rounded-full text-white font-medium text-xs">
            👤 {currentUser?.name || 'مدير النظام'}
          </span>

          <button
            onClick={onLogout}
            className="min-h-[40px] min-w-[44px] flex items-center justify-center bg-white/15 hover:bg-red-600 active:bg-red-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
            title="تسجيل الخروج"
          >
            خروج
          </button>
        </div>
      </header>

      {/* Secret Owner Login Modal */}
      {showOwnerModal && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in"
          dir="rtl"
          onClick={() => setShowOwnerModal(false)}
        >
          <div
            className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 w-full max-w-md shadow-2xl relative text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/60 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👑</span>
                <h3 className="text-base sm:text-lg font-bold text-amber-400">
                  تسجيل دخول مالك المنظومة السحابية
                </h3>
              </div>
              <button
                onClick={() => setShowOwnerModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 mb-4 leading-relaxed">
              يرجى إدخال الرقم السري الخاص بمالك النظام للوصول إلى لوحة المالك المركزية وإدارة اشتراكات الشركات والمستأجرين (SaaS).
            </p>

            <form onSubmit={handleOwnerLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  الرقم السري للمالك (Owner PIN):
                </label>
                <input
                  type="password"
                  autoFocus
                  value={ownerPin}
                  onChange={(e) => {
                    setOwnerPin(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="أدخل الرقم السري..."
                  className="w-full bg-slate-800 border border-slate-600 focus:border-amber-400 rounded-xl px-4 py-2.5 text-center text-lg tracking-widest text-white outline-none font-mono transition"
                />
                {errorMessage && (
                  <p className="text-xs text-red-400 mt-2 font-bold flex items-center gap-1">
                    <span>⚠️</span> {errorMessage}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-[0.98] text-slate-950 font-black py-2.5 px-4 rounded-xl text-sm transition shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>👑</span>
                  <span>دخول لوحة المالك</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowOwnerModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 px-4 rounded-xl text-sm transition cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

