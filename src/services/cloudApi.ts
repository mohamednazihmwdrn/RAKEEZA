import { AppData, TenantCompany, User } from '../types';

const TOKEN_KEY = 'rakeeza_cloud_session_token';

export interface AuthSessionResponse {
  valid: boolean;
  user?: User;
  company?: TenantCompany;
  subscription?: {
    status: string;
    planName: string;
    daysRemaining: number;
    isExpired: boolean;
    expiresAt?: string;
  };
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {}
}

export function removeStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export async function loginToCloud(
  companyId: string,
  username: string,
  password: string
): Promise<{
  success: boolean;
  token?: string;
  user?: User;
  company?: TenantCompany;
  subscription?: any;
  error?: string;
}> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, username, password }),
    });

    const data = await res.json();
    if (res.ok && data.success && data.token) {
      setStoredToken(data.token);
    }
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: 'تعذر الاتصال بخادم السحابة. يرجى التحقق من اتصال الإنترنت أو المحاولة مجدداً.',
    };
  }
}

export async function loginWithGoogle(
  email: string,
  companyName?: string,
  phone?: string,
  adminName?: string
): Promise<{
  success: boolean;
  isNewCompany?: boolean;
  token?: string;
  user?: User;
  company?: TenantCompany;
  subscription?: any;
  error?: string;
  needsRegistration?: boolean;
}> {
  try {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, companyName, phone, adminName }),
    });

    const data = await res.json();
    if (res.ok && data.success && data.token) {
      setStoredToken(data.token);
    }
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: 'تعذر الاتصال بالخادم السحابي. يرجى المحاولة مرة أخرى.',
    };
  }
}

export async function verifyOwnerSecretApi(secret: string): Promise<{
  success: boolean;
  token?: string;
  user?: User;
  company?: TenantCompany;
  subscription?: any;
  error?: string;
}> {
  try {
    const res = await fetch('/api/auth/owner-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret }),
    });

    const data = await res.json();
    if (res.ok && data.success && data.token) {
      setStoredToken(data.token);
    }
    return data;
  } catch {
    return {
      success: false,
      error: 'فشل الاتصال بالخادم السحابي للتحقق.',
    };
  }
}

export async function fetchCurrentSession(): Promise<AuthSessionResponse> {
  const token = getStoredToken();
  if (!token) return { valid: false };

  try {
    const res = await fetch('/api/auth/session', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      removeStoredToken();
      return { valid: false };
    }

    const data = await res.json();
    return data;
  } catch {
    return { valid: false };
  }
}

export async function logoutFromCloud(): Promise<void> {
  const token = getStoredToken();
  if (token) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token }),
      });
    } catch {}
    removeStoredToken();
  }
}

export async function fetchTenantDataCloud(companyId?: string): Promise<{
  success: boolean;
  data?: AppData;
  company?: TenantCompany;
  subscription?: any;
  error?: string;
}> {
  const token = getStoredToken();
  if (!token) return { success: false, error: 'غير مسجل الدخول' };

  try {
    const url = companyId ? `/api/tenant/data?companyId=${encodeURIComponent(companyId)}` : '/api/tenant/data';
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.json();
      return { success: false, error: err.error || 'فشل جلب بيانات الشركة' };
    }

    const json = await res.json();
    return json;
  } catch (err: any) {
    return { success: false, error: 'تعذر الاتصال بالسيرفر' };
  }
}

export async function saveTenantDataCloud(
  data: Partial<AppData>,
  companyId?: string
): Promise<{ success: boolean; data?: AppData; error?: string }> {
  const token = getStoredToken();
  if (!token) return { success: false, error: 'غير مسجل الدخول' };

  try {
    const res = await fetch('/api/tenant/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ data, companyId }),
    });

    if (!res.ok) {
      const err = await res.json();
      return { success: false, error: err.error || 'فشل حفظ البيانات على السحابة' };
    }

    const json = await res.json();
    return json;
  } catch (err: any) {
    return { success: false, error: 'تعذر حفظ البيانات على السيرفر السحابي' };
  }
}

export async function activateTenantLicenseCloud(
  code: string
): Promise<{ success: boolean; message: string; company?: TenantCompany }> {
  const token = getStoredToken();
  if (!token) return { success: false, message: 'غير مسجل الدخول' };

  try {
    const res = await fetch('/api/tenant/activate-license', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code }),
    });

    const json = await res.json();
    return json;
  } catch {
    return { success: false, message: 'فشل الاتصال بخادم التراخيص' };
  }
}
