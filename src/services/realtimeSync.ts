import {
  doc,
  setDoc,
  onSnapshot,
  getDoc,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import { AppData } from '../types';
import { getStoredToken } from './cloudApi';

/**
 * ⚡ RealtimeSyncService: Hybrid Cloud Engine
 * 
 * Powered primarily by Google Cloud Firestore (Sub-second Real-time Listeners via onSnapshot)
 * with graceful fallback to server SSE & Polling.
 * 
 * Ensures manager, cashiers, storekeepers, and mobile phone users all see every
 * invoice, payment, stock update, and account movement instantaneously in real-time.
 */

export interface SyncActorUser {
  id: string;
  name: string;
  code: string | number;
  role: string;
}

export interface SyncActionInfo {
  action?: string;
  module?: string;
  details?: string;
  userCode?: string | number;
}

export interface RealtimeSyncEvent {
  type: 'REALTIME_SYNC' | 'CONNECTED' | 'DISCONNECTED';
  version?: number;
  data?: AppData;
  actorUser?: SyncActorUser;
  actionInfo?: SyncActionInfo;
  timestamp?: string;
}

export interface RealtimeSyncInitOptions {
  companyId: string;
  currentUserCode?: string | number;
  currentUserName?: string;
  currentUserId?: string;
  initialVersion?: number;
  onDataUpdated?: (
    data: AppData,
    meta?: {
      actorCode?: string | number;
      actorName?: string;
      actorRole?: string;
      actionInfo?: SyncActionInfo;
    }
  ) => void;
}

export class RealtimeSyncService {
  private firestoreUnsub: Unsubscribe | null = null;
  private eventSource: EventSource | null = null;
  private pollTimer: any = null;
  private currentVersion: number = 1;
  private companyId: string = 'COMP-000001';
  private currentUserId: string = '';
  private currentUserCode: string | number = 1;
  private currentUserName: string = 'مستخدم';
  private isConnected: boolean = false;
  private lastLocalPushTimestamp: number = 0;
  private listeners: Set<(event: RealtimeSyncEvent) => void> = new Set();
  private statusListeners: Set<(connected: boolean) => void> = new Set();
  private recentActivities: Array<{
    id: string;
    timestamp: string;
    actor: SyncActorUser;
    actionInfo: SyncActionInfo;
  }> = [];

  public init(
    optionsOrCompanyId: string | RealtimeSyncInitOptions,
    currentUserId?: string,
    initialVersion: number = 1
  ) {
    // 🛡️ Always destroy prior connections and intervals first to prevent memory leaks and duplicate timers
    this.destroy();

    if (typeof optionsOrCompanyId === 'object') {
      const opts = optionsOrCompanyId;
      this.companyId = opts.companyId || 'COMP-000001';
      this.currentUserId = opts.currentUserId || '';
      this.currentUserCode = opts.currentUserCode || 1;
      this.currentUserName = opts.currentUserName || 'مستخدم';
      this.currentVersion = opts.initialVersion || 1;
      if (opts.onDataUpdated) {
        this.subscribe((event) => {
          if (event.data) {
            opts.onDataUpdated!(event.data, {
              actorCode: event.actorUser?.code || event.actionInfo?.userCode,
              actorName: event.actorUser?.name,
              actorRole: event.actorUser?.role,
              actionInfo: event.actionInfo,
            });
          }
        });
      }
    } else {
      this.companyId = optionsOrCompanyId || 'COMP-000001';
      this.currentUserId = currentUserId || '';
      this.currentVersion = initialVersion;
    }

    // 1. First priority: Real-time Google Cloud Firestore Listener
    this.initFirestoreListener();

    // 2. Auxiliary server SSE / Polling fallback
    this.connectServerStream();
    this.startPollingFallback();
  }

  public stop() {
    this.destroy();
  }

  public subscribe(callback: (event: RealtimeSyncEvent) => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public onStatusChange(callback: (connected: boolean) => void) {
    this.statusListeners.add(callback);
    callback(this.isConnected);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  public setVersion(ver: number) {
    if (ver > this.currentVersion) {
      this.currentVersion = ver;
    }
  }

  public getRecentActivities() {
    return this.recentActivities;
  }

  public getConnectedStatus() {
    return this.isConnected;
  }

  /**
   * ⚡ Real-time Google Cloud Firestore Snapshot Listener
   * Receives changes within milliseconds across all connected tabs, mobiles, and PCs
   */
  private initFirestoreListener() {
    if (this.firestoreUnsub) {
      this.firestoreUnsub();
      this.firestoreUnsub = null;
    }

    const cleanId = (this.companyId || 'COMP-000001').trim();

    try {
      const docRef = doc(db, 'tenants', cleanId);
      this.firestoreUnsub = onSnapshot(
        docRef,
        (snapshot) => {
          this.setConnectedStatus(true);

          if (!snapshot.exists()) {
            return;
          }

          const rawData = snapshot.data() as any;
          if (!rawData) return;

          // Prevent infinite echo loop if this browser tab just emitted this exact change within 1.5s
          const myDeviceId = this.getDeviceId();
          const timeSinceOurPush = Date.now() - this.lastLocalPushTimestamp;
          if (rawData.lastModifiedDeviceId === myDeviceId && timeSinceOurPush < 1500) {
            return;
          }

          // Build valid AppData payload
          const remoteData: Partial<AppData> = {};
          if (Array.isArray(rawData.salesInvoices)) remoteData.salesInvoices = rawData.salesInvoices;
          if (Array.isArray(rawData.purchaseInvoices)) remoteData.purchaseInvoices = rawData.purchaseInvoices;
          if (Array.isArray(rawData.cashTransactions)) remoteData.cashTransactions = rawData.cashTransactions;
          if (Array.isArray(rawData.items)) remoteData.items = rawData.items;
          if (Array.isArray(rawData.customers)) remoteData.customers = rawData.customers;
          if (Array.isArray(rawData.suppliers)) remoteData.suppliers = rawData.suppliers;
          if (Array.isArray(rawData.accounts)) remoteData.accounts = rawData.accounts;
          if (rawData.cashBox) remoteData.cashBox = rawData.cashBox;
          if (Array.isArray(rawData.bankAccounts)) remoteData.bankAccounts = rawData.bankAccounts;
          if (Array.isArray(rawData.journalEntries)) remoteData.journalEntries = rawData.journalEntries;
          if (Array.isArray(rawData.cheques)) remoteData.cheques = rawData.cheques;
          if (Array.isArray(rawData.quotations)) remoteData.quotations = rawData.quotations;
          if (Array.isArray(rawData.auditLogs)) remoteData.auditLogs = rawData.auditLogs;
          if (typeof rawData.nextInvoiceNumber === 'number') remoteData.nextInvoiceNumber = rawData.nextInvoiceNumber;
          if (typeof rawData.nextPurchaseNumber === 'number') remoteData.nextPurchaseNumber = rawData.nextPurchaseNumber;
          if (rawData.settings) remoteData.settings = rawData.settings;

          const actorUser: SyncActorUser = {
            id: rawData.lastModifiedUserId || 'user',
            name: rawData.lastModifiedBy || 'مستخدم آخر',
            code: rawData.lastModifiedUserCode || 2,
            role: rawData.lastModifiedUserCode === 1 ? 'admin' : 'user',
          };

          const actionInfo: SyncActionInfo = {
            action: rawData.lastAction || 'تحديث البيانات',
            module: rawData.lastModule || 'المنظومة',
            details: rawData.lastActionDetails || 'تحديث لحظي عبر فايربيس السحابية',
            userCode: rawData.lastModifiedUserCode,
          };

          this.handleIncomingSync({
            type: 'REALTIME_SYNC',
            version: rawData.version || Date.now(),
            data: remoteData as AppData,
            actorUser,
            actionInfo,
            timestamp: rawData.updatedAt || new Date().toISOString(),
          });
        },
        (error) => {
          console.warn('[Firebase Realtime] Listener warning:', error);
          // Don't mark disconnected immediately; SSE and polling are active
        }
      );
    } catch (e) {
      console.warn('[Firebase Realtime] Setup catch:', e);
    }
  }

  /**
   * 🚀 Broadcast a local mutation instantaneously to all other connected devices via Firestore
   */
  public async broadcastChange(
    companyId: string,
    data: Partial<AppData>,
    actionInfo?: SyncActionInfo
  ): Promise<boolean> {
    const cleanId = (companyId || this.companyId || 'COMP-000001').trim();
    this.lastLocalPushTimestamp = Date.now();

    const payload: any = {
      companyId: cleanId,
      updatedAt: new Date().toISOString(),
      serverUpdatedAt: serverTimestamp(),
      lastModifiedDeviceId: this.getDeviceId(),
      lastModifiedUserId: this.currentUserId,
      lastModifiedUserCode: this.currentUserCode,
      lastModifiedBy: this.currentUserName,
      lastAction: actionInfo?.action || 'تحديث فوري',
      lastModule: actionInfo?.module || 'المنظومة',
      lastActionDetails: actionInfo?.details || 'عملية جديدة',
    };

    if (data.salesInvoices) payload.salesInvoices = data.salesInvoices;
    if (data.purchaseInvoices) payload.purchaseInvoices = data.purchaseInvoices;
    if (data.cashTransactions) payload.cashTransactions = data.cashTransactions;
    if (data.items) payload.items = data.items;
    if (data.customers) payload.customers = data.customers;
    if (data.suppliers) payload.suppliers = data.suppliers;
    if (data.accounts) payload.accounts = data.accounts;
    if (data.cashBox) payload.cashBox = data.cashBox;
    if (data.bankAccounts) payload.bankAccounts = data.bankAccounts;
    if (data.journalEntries) payload.journalEntries = data.journalEntries;
    if (data.cheques) payload.cheques = data.cheques;
    if (data.quotations) payload.quotations = data.quotations;
    if (data.auditLogs) payload.auditLogs = data.auditLogs;
    if (typeof data.nextInvoiceNumber === 'number') payload.nextInvoiceNumber = data.nextInvoiceNumber;
    if (typeof data.nextPurchaseNumber === 'number') payload.nextPurchaseNumber = data.nextPurchaseNumber;
    if (data.settings) payload.settings = data.settings;

    try {
      const docRef = doc(db, 'tenants', cleanId);
      await setDoc(docRef, payload, { merge: true });
      this.setConnectedStatus(true);
      return true;
    } catch (err) {
      console.warn('[Firebase Realtime] Broadcast error:', err);
      return false;
    }
  }

  private connectServerStream() {
    const token = getStoredToken();
    if (!token) return;

    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch {}
      this.eventSource = null;
    }

    try {
      const url = `/api/tenant/sync-stream?token=${encodeURIComponent(token)}`;
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        this.setConnectedStatus(true);
      };

      this.eventSource.onmessage = (e) => {
        try {
          const payload: RealtimeSyncEvent = JSON.parse(e.data);
          if (payload.type === 'CONNECTED') {
            this.setConnectedStatus(true);
            if (payload.version) this.currentVersion = payload.version;
            return;
          }

          if (payload.type === 'REALTIME_SYNC') {
            this.handleIncomingSync(payload);
          }
        } catch {}
      };

      this.eventSource.onerror = () => {
        // Handled silently - Firestore takes priority
      };
    } catch {}
  }

  private startPollingFallback() {
    if (this.pollTimer) clearInterval(this.pollTimer);

    // Dynamic, battery- and memory-friendly polling fallback
    this.pollTimer = setInterval(async () => {
      const token = getStoredToken();
      if (!token) return;

      // If already connected to Firestore real-time listener, keep polling very light (15s)
      if (this.isConnected && Date.now() % 15000 >= 5000) {
        return;
      }

      try {
        const res = await fetch(`/api/tenant/sync-check?version=${this.currentVersion}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const json = await res.json();
          if (json.hasUpdate && json.data) {
            this.handleIncomingSync({
              type: 'REALTIME_SYNC',
              version: json.version,
              data: json.data,
              actorUser: json.lastAction?.actorUser,
              actionInfo: json.lastAction?.actionInfo,
              timestamp: json.lastAction?.timestamp || new Date().toISOString(),
            });
          }
        }
      } catch {}
    }, 6000);
  }

  private handleIncomingSync(payload: RealtimeSyncEvent) {
    // 🛡️ Prevent infinite echo loop if this browser tab just emitted this exact change within 3s
    const myDeviceId = this.getDeviceId();
    const isSelfModified = (payload.data as any)?.lastModifiedDeviceId === myDeviceId;
    const timeSinceOurPush = Date.now() - this.lastLocalPushTimestamp;
    if (isSelfModified && timeSinceOurPush < 3000) {
      return;
    }

    if (payload.version && payload.version > this.currentVersion) {
      this.currentVersion = payload.version;
    }

    if (payload.actorUser && payload.actionInfo) {
      const activity = {
        id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp: payload.timestamp || new Date().toISOString(),
        actor: payload.actorUser,
        actionInfo: payload.actionInfo,
      };
      this.recentActivities = [activity, ...this.recentActivities].slice(0, 50);
    }

    // Notify all subscribers (App.tsx updates React state & components render instantly)
    this.listeners.forEach((listener) => {
      try {
        listener(payload);
      } catch {}
    });
  }

  private setConnectedStatus(status: boolean) {
    if (this.isConnected !== status) {
      this.isConnected = status;
      this.statusListeners.forEach((fn) => {
        try {
          fn(status);
        } catch {}
      });
    }
  }

  public getDeviceId(): string {
    let id = localStorage.getItem('rakeeza_device_uuid');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem('rakeeza_device_uuid', id);
    }
    return id;
  }

  public destroy() {
    if (this.firestoreUnsub) {
      this.firestoreUnsub();
      this.firestoreUnsub = null;
    }
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch {}
      this.eventSource = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.listeners.clear();
    this.statusListeners.clear();
    this.isConnected = false;
  }
}

export const realtimeSync = new RealtimeSyncService();
