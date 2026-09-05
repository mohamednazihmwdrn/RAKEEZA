import React, { useState, useRef } from 'react';
import {
  Building2,
  User,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  CheckCircle2,
  AlertCircle,
  Mail,
  Shield,
} from 'lucide-react';
import { loginToCloud, loginWithGoogle, verifyOwnerSecretApi } from '../services/cloudApi';
import { TenantCompany, User as AppUser } from '../types';

interface LoginViewProps {
  onLoginSuccess: (session: {
    user: AppUser;
    company: TenantCompany;
    subscription: any;
  }) => void;
  onOpenOwnerPanelDirectly?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onOpenOwnerPanelDirectly,
}) => {
  // Login Mode: 'gmail' or 'credentials'
  const [loginMode, setLoginMode] = useState<'gmail' | 'credentials'>('gmail');

  // Google / Gmail Login State
  const [gmailEmail, setGmailEmail] = useState<string>('');
  const [gmailCompanyName, setGmailCompanyName] = useState<string>('');
  const [gmailAdminName, setGmailAdminName] = useState<string>('');
  const [gmailPhone, setGmailPhone] = useState<string>('');
  const [isRegisterNewWithGmail, setIsRegisterNewWithGmail] = useState<boolean>(false);

  // Standard Company Login Form States
  const [companyId, setCompanyId] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Status & Feedback States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Secret Owner Access via Long-Press State
  const [isHoldingLogo, setIsHoldingLogo] = useState<boolean>(false);
  const [showSecretOwnerModal, setShowSecretOwnerModal] = useState<boolean>(false);
  const [secretOwnerPin, setSecretOwnerPin] = useState<string>('');
  const [ownerPinError, setOwnerPinError] = useState<string | null>(null);
  const [isVerifyingOwner, setIsVerifyingOwner] = useState<boolean>(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Long-press handler on system name (holding 1.5 seconds)
  const handleHoldStart = () => {
    setIsHoldingLogo(true);
    holdTimerRef.current = setTimeout(() => {
      setIsHoldingLogo(false);
      setShowSecretOwnerModal(true);
      setSecretOwnerPin('');
      setOwnerPinError(null);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(70);
      }
    }, 1500);
  };

  const handleHoldEnd = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setIsHoldingLogo(false);
  };

  // Secret Owner Verification
  const handleSecretOwnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = secretOwnerPin.trim();
    if (!clean) {
      setOwnerPinError('يرجى إدخال كلمة المرور السرية لمالك المنظومة');
      return;
    }

    setIsVerifyingOwner(true);
    setOwnerPinError(null);

    // Master PIN quick bypass
    if (clean === '29190615' || clean === '123' || clean.toLowerCase() === 'rakeeza') {
      setShowSecretOwnerModal(false);
      setIsVerifyingOwner(false);
      if (onOpenOwnerPanelDirectly) {
        onOpenOwnerPanelDirectly();
      }
      return;
    }

    try {
      const res = await verifyOwnerSecretApi(clean);
      if (res.success && res.user && res.company) {
        setShowSecretOwnerModal(false);
        onLoginSuccess({
          user: res.user,
          company: res.company,
          subscription: res.subscription,
        });
      } else {
        setOwnerPinError(res.error || 'رمز المرور السري غير صحيح.');
      }
    } catch {
      setOwnerPinError('فشل الاتصال بالخادم السحابي.');
    } finally {
      setIsVerifyingOwner(false);
    }
  };

  // Google / Gmail Login & Registration Handler
  const handleGmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const email = gmailEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setErrorMessage('يرجى إدخال بريد Gmail صالح (مثال: example@gmail.com)');
      return;
    }

    if (isRegisterNewWithGmail && !gmailCompanyName.trim()) {
      setErrorMessage('يرجى إدخال اسم المنشأة أو الشركة للتسجيل');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginWithGoogle(
        email,
        isRegisterNewWithGmail ? gmailCompanyName.trim() : undefined,
        gmailPhone.trim() || undefined,
        gmailAdminName.trim() || undefined
      );

      if (res.success && res.user && res.company) {
        setSuccessMessage(
          res.isNewCompany
            ? 'تم إنشاء حساب شركتك بنجاح! جاري الدخول للمنظومة...'
            : 'تم التحقق من حسابك بنجاح! جاري الدخول...'
        );
        setTimeout(() => {
          onLoginSuccess({
            user: res.user!,
            company: res.company!,
            subscription: res.subscription,
          });
        }, 600);
      } else if (res.needsRegistration) {
        setIsRegisterNewWithGmail(true);
        setErrorMessage(res.error || 'هذا البريد غير مسجل مسبقاً. يرجى إدخال اسم شركتك لتسجيلها فوراً مجاناً.');
      } else {
        setErrorMessage(res.error || 'تعذر تسجيل الدخول بواسطة Gmail.');
      }
    } catch {
      setErrorMessage('حدث خطأ أثناء الاتصال بالخادم السحابي.');
    } finally {
      setIsLoading(false);
    }
  };

  // Standard Company ID + Username + Password Login Handler
  const handleCompanyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!companyId.trim()) {
      setErrorMessage('يرجى إدخال كود الشركة (Company ID)');
      return;
    }
    if (!username.trim()) {
      setErrorMessage('يرجى إدخال اسم المستخدم');
      return;
    }
    if (!password) {
      setErrorMessage('يرجى إدخال كلمة المرور');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginToCloud(companyId.trim(), username.trim(), password);
      if (res.success && res.user && res.company) {
        onLoginSuccess({
          user: res.user,
          company: res.company,
          subscription: res.subscription,
        });
      } else {
        setErrorMessage(res.error || 'فشل تسجيل الدخول. يرجى التحقق من كود الشركة واسم المستخدم وكلمة المرور.');
      }
    } catch {
      setErrorMessage('حدث خطأ أثناء الاتصال بالخادم السحابي.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white flex flex-col justify-between selection:bg-blue-500 selection:text-white"
    >
      {/* Background Decorative Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 py-4 sm:py-6 flex items-center justify-between border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          {/* System Name / Logo with secret long-press action for owner */}
          <div
            className={`flex items-center gap-3 cursor-pointer select-none px-2 py-1 rounded-xl transition-all relative ${
              isHoldingLogo
                ? 'scale-105 bg-amber-400/20 ring-2 ring-amber-400 shadow-lg shadow-amber-400/30'
                : 'hover:bg-white/5 active:scale-95'
            }`}
            onMouseDown={handleHoldStart}
            onMouseUp={handleHoldEnd}
            onMouseLeave={handleHoldEnd}
            onTouchStart={handleHoldStart}
            onTouchEnd={handleHoldEnd}
            onTouchCancel={handleHoldEnd}
            title="منظومة ركيزة RAKEEZA Cloud ERP"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-400 p-0.5 shadow-lg shadow-blue-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-blue-400">
                  R
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl sm:text-2xl tracking-wider text-white">
                  RAKEEZA
                </span>
                <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Cloud ERP
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                المنظومة السحابية المتكاملة لإدارة المنشآت والشركات
              </p>
            </div>
            {isHoldingLogo && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-10 h-1 bg-amber-400 rounded-full animate-pulse" />
            )}
          </div>
        </div>

        {/* Top Status Badge */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-300 bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>السحابة متصلة وجاهزة</span>
        </div>
      </header>

      {/* Main Content Area: Centered, Clean Login Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md mx-auto">
          <div className="w-full bg-slate-800/95 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-slate-700 shadow-2xl shadow-black/50">
            
            {/* Login Method Toggle Tabs */}
            <div className="flex rounded-xl bg-slate-900/80 p-1 mb-6 border border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setLoginMode('gmail');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  loginMode === 'gmail'
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {/* Google / Gmail Icon */}
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
                </svg>
                <span>تسجيل عبر Gmail</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoginMode('credentials');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  loginMode === 'credentials'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>كود الشركة وحساب الموظف</span>
              </button>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                <div className="flex-1 leading-relaxed">{errorMessage}</div>
              </div>
            )}

            {/* Success Banner */}
            {successMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
                <div className="flex-1 leading-relaxed">{successMessage}</div>
              </div>
            )}

            {loginMode === 'gmail' ? (
              /* GMAIL LOGIN & REGISTRATION FORM */
              <form onSubmit={handleGmailLogin} className="space-y-4">
                <div className="text-center mb-4">
                  <div className="inline-flex p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 mb-2">
                    <Mail className="w-7 h-7" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">
                    {isRegisterNewWithGmail ? 'تسجيل منشأة جديدة بحساب Gmail' : 'الدخول السريع عبر Google (Gmail)'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {isRegisterNewWithGmail
                      ? 'أدخل اسم منشأتك لتفعيل الحساب السحابي فوراً'
                      : 'أدخل بريدك للدخول إلى حساب شركتك السحابي فوراً'}
                  </p>
                </div>

                {/* Gmail Input Field */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-200 mb-1.5 text-right">
                    بريد Gmail الخاص بك <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-5 h-5 text-red-400" />
                    </div>
                    <input
                      type="email"
                      autoFocus
                      value={gmailEmail}
                      onChange={(e) => setGmailEmail(e.target.value)}
                      placeholder="yourname@gmail.com"
                      dir="ltr"
                      className="w-full pl-3 pr-11 py-2.5 sm:py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-left font-sans"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                {/* If new company registration is activated */}
                {isRegisterNewWithGmail && (
                  <div className="space-y-3 pt-1 border-t border-slate-700/60 animate-in fade-in">
                    <div>
                      <label className="block text-xs font-semibold text-slate-200 mb-1 text-right">
                        اسم الشركة أو المنشأة <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                          <Building2 className="w-4 h-4 text-amber-400" />
                        </div>
                        <input
                          type="text"
                          value={gmailCompanyName}
                          onChange={(e) => setGmailCompanyName(e.target.value)}
                          placeholder="مثال: شركة النور للتجارة"
                          className="w-full pl-3 pr-10 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
                          disabled={isLoading}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1 text-right">
                          اسم المدير / المسؤول
                        </label>
                        <input
                          type="text"
                          value={gmailAdminName}
                          onChange={(e) => setGmailAdminName(e.target.value)}
                          placeholder="الاسم الشخصي"
                          className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
                          disabled={isLoading}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1 text-right">
                          رقم الهاتف للتواصل
                        </label>
                        <input
                          type="tel"
                          value={gmailPhone}
                          onChange={(e) => setGmailPhone(e.target.value)}
                          placeholder="010XXXXXXXX"
                          dir="ltr"
                          className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 text-left"
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Mode Toggle between login and registration */}
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegisterNewWithGmail(!isRegisterNewWithGmail);
                      setErrorMessage(null);
                    }}
                    className="text-xs text-amber-400 hover:text-amber-300 hover:underline font-semibold cursor-pointer"
                  >
                    {isRegisterNewWithGmail
                      ? '← لديك حساب بالفعل؟ تسجيل الدخول بالجيميل'
                      : '+ شركة جديدة؟ انقر هنا لتسجيل منشأتك عبر Gmail مجاناً'}
                  </button>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 sm:py-3.5 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-xl shadow-lg shadow-red-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>جاري التحقق والمصادقة السحابية...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
                        </svg>
                        <span>
                          {isRegisterNewWithGmail ? 'تأكيد تسجيل المنشأة والدخول' : 'متابعة الدخول عبر Gmail'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* COMPANY ID + USERNAME LOGIN FORM */
              <form onSubmit={handleCompanyLogin} className="space-y-4">
                <div className="text-center mb-4">
                  <div className="inline-flex p-3 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400 mb-2">
                    <Building2 className="w-7 h-7" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">
                    تسجيل الدخول بكود الشركة
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    أدخل كود الشركة وبيانات حساب الموظف أو المدير
                  </p>
                </div>

                {/* Field 1: Company ID */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-200 mb-1.5 text-right">
                    كود الشركة / Company ID <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      value={companyId}
                      onChange={(e) => setCompanyId(e.target.value.toUpperCase())}
                      placeholder="مثال: COMP-000001"
                      dir="ltr"
                      className="w-full pl-3 pr-11 py-2.5 sm:py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 font-mono text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-left uppercase"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                {/* Field 2: Username */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-200 mb-1.5 text-right">
                    اسم المستخدم (Username) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="أدخل اسم المستخدم"
                      dir="ltr"
                      className="w-full pl-3 pr-11 py-2.5 sm:py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-left"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                {/* Field 3: Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-400">حساس لحالة الأحرف</span>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-200 text-right">
                      كلمة المرور (Password) <span className="text-rose-400">*</span>
                    </label>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      dir="ltr"
                      className="w-full pl-11 pr-11 py-2.5 sm:py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-left font-mono"
                      disabled={isLoading}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded-sm bg-slate-900 border-slate-700 text-blue-600 focus:ring-blue-500"
                    />
                    <span>تذكر بيانات الدخول</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => alert('لإعادة تعيين كلمة المرور أو الاستفسار عن كود الشركة، يرجى التواصل مع الدعم الفني المعتمد لمنظومة ركيزة: 01029190615')}
                    className="text-xs text-blue-400 hover:underline cursor-pointer"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 sm:py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>جاري التحقق والمصادقة...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-5 h-5" />
                        <span>تسجيل الدخول إلى المنظومة</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Footer Status */}
            <div className="mt-6 pt-4 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>تشفير بيانات سحابي 256-bit</span>
              </span>
              <span>الإصدار 8.4 Enterprise</span>
            </div>
          </div>
        </div>
      </main>

      {/* Secret Owner Access Modal (Accessible only by long-press on RAKEEZA system name) */}
      {showSecretOwnerModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[120] flex items-center justify-center p-4 animate-fade-in"
          dir="rtl"
          onClick={() => setShowSecretOwnerModal(false)}
        >
          <div
            className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 w-full max-w-sm shadow-2xl shadow-amber-500/20 text-white relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    المنفذ السري لمالك المنظومة (Root Owner)
                  </h3>
                  <p className="text-[11px] text-amber-300">
                    التحكم المركزي في الشركات والتراخيص
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSecretOwnerModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {ownerPinError && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                {ownerPinError}
              </div>
            )}

            <form onSubmit={handleSecretOwnerSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  أدخل رمز المرور السري الخاص بالمالك (Master PIN):
                </label>
                <input
                  type="password"
                  autoFocus
                  value={secretOwnerPin}
                  onChange={(e) => setSecretOwnerPin(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-2.5 text-center text-base font-mono tracking-widest text-amber-300 outline-none"
                  disabled={isVerifyingOwner}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isVerifyingOwner}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs sm:text-sm transition cursor-pointer disabled:opacity-50"
                >
                  {isVerifyingOwner ? 'جاري التحقق...' : 'تأكيد الدخول السري'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSecretOwnerModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 px-3 rounded-xl text-xs sm:text-sm transition cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer Branding */}
      <footer className="relative z-10 w-full text-center py-4 border-t border-slate-800 text-xs text-slate-400">
        <p>
          جميع الحقوق محفوظة لمنظومة <span className="text-white font-semibold">RAKEEZA | ركيزة</span> © {new Date().getFullYear()} • حلول الإدارة السحابية المتقدمة
        </p>
      </footer>
    </div>
  );
};
