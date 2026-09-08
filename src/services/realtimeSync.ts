import { AppData, User } from '../types';
import { getStoredToken } from './cloudApi';

export interface SyncActorUser {
  id: string;
  name: string;
  code?: string | number;
  role?: string;
}

export interface SyncActionInfo {
  action?: string;
  module?: string;
  details?: string;
  userCode?: string | number;
}

export interface RealtimeSyncEvent {
  type: 'REALTIME_SYNC' | 'CONNECTED';
  companyId?: string;
  version: number;
  actorUser?: SyncActorUser;
  actionInfo?: SyncActionInfo;
  data?: AppData;
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
  private eventSource: EventSource | null = null;
  private pollTimer: any = null;
  private currentVersion: number = 1;
  private companyId: string = 'COMP-000001';
  private currentUserId: string = '';
  private isConnected: boolean = false;
  private listeners: Set<(event: RealtimeSyncEvent) => void> = new Set();
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
    if (typeof optionsOrCompanyId === 'object') {
      const opts = optionsOrCompanyId;
      this.companyId = opts.companyId || 'COMP-000001';
      this.currentUserId = opts.currentUserId || '';
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
    this.connect();
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

  private connect() {
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
        this.isConnected = true;
      };

      this.eventSource.onmessage = (e) => {
        try {
          const payload: RealtimeSyncEvent = JSON.parse(e.data);
          if (payload.type === 'CONNECTED') {
            this.isConnected = true;
            if (payload.version) this.currentVersion = payload.version;
            return;
          }

          if (payload.type === 'REALTIME_SYNC') {
            this.handleIncomingSync(payload);
          }
        } catch {}
      };

      this.eventSource.onerror = () => {
        this.isConnected = false;
        // The fallback poll will keep the sync going
      };
    } catch {
      this.isConnected = false;
    }
  }

  private startPollingFallback() {
    if (this.pollTimer) clearInterval(this.pollTimer);

    // Poll every 3 seconds for instant changes across devices/tabs
    this.pollTimer = setInterval(async () => {
      const token = getStoredToken();
      if (!token) return;

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
    }, 3000);
  }

  private handleIncomingSync(payload: RealtimeSyncEvent) {
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

    // Notify subscribers
    this.listeners.forEach((listener) => {
      try {
        listener(payload);
      } catch {}
    });
  }

  public destroy() {
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
  }
}

export const realtimeSync = new RealtimeSyncService();
