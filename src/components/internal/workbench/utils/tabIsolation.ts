export class TabIsolationManager {
  private static instance: TabIsolationManager | null = null;
  private tabId: string;
  private storagePrefix: string;
  private eventListeners: Map<string, EventListener[]> = new Map();

  private constructor() {

    this.tabId = this.generateTabId();
    this.storagePrefix = `tab_${this.tabId}`;

    window.addEventListener('beforeunload', this.cleanup.bind(this));

    window.addEventListener('storage', this.handleStorageChange.bind(this));
  }

  public static getInstance(): TabIsolationManager {
    if (!TabIsolationManager.instance) {
      TabIsolationManager.instance = new TabIsolationManager();
    }
    return TabIsolationManager.instance;
  }

  private generateTabId(): string {

    let tabId = sessionStorage.getItem('__tab_id');
    if (!tabId) {
      // Storage keys use `_` as the tab-id delimiter. Keep generated ids free
      // of that delimiter so active-tab discovery and stale-tab cleanup can
      // recover the complete id from `tab_<id>_<key>` keys.
      tabId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('__tab_id', tabId);
    }
    return tabId;
  }

  public getTabId(): string {
    return this.tabId;
  }

  public getStorageKey(key: string): string {
    return `${this.storagePrefix}_${key}`;
  }

  public setItem(key: string, value: string): void {
    try {
      localStorage.setItem(this.getStorageKey(key), value);
    } catch (error) {
      console.warn('Failed to set tab-isolated localStorage item:', error);
    }
  }

  public getItem(key: string): string | null {
    try {
      return localStorage.getItem(this.getStorageKey(key));
    } catch (error) {
      console.warn('Failed to get tab-isolated localStorage item:', error);
      return null;
    }
  }

  public removeItem(key: string): void {
    try {
      localStorage.removeItem(this.getStorageKey(key));
    } catch (error) {
      console.warn('Failed to remove tab-isolated localStorage item:', error);
    }
  }

  public clearTabStorage(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.storagePrefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear tab storage:', error);
    }
  }

  public dispatchTabEvent(eventType: string, detail?: any): void {
    const event = new CustomEvent(`tab_${this.tabId}_${eventType}`, { detail });
    window.dispatchEvent(event);
  }

  public addTabEventListener(eventType: string, listener: EventListener): void {
    const tabEventType = `tab_${this.tabId}_${eventType}`;
    window.addEventListener(tabEventType, listener);

    if (!this.eventListeners.has(tabEventType)) {
      this.eventListeners.set(tabEventType, []);
    }
    this.eventListeners.get(tabEventType)!.push(listener);
  }

  public removeTabEventListener(eventType: string, listener: EventListener): void {
    const tabEventType = `tab_${this.tabId}_${eventType}`;
    window.removeEventListener(tabEventType, listener);

    const listeners = this.eventListeners.get(tabEventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  public sendCrossTabMessage(type: string, data: any): void {
    const message = {
      type,
      data,
      fromTabId: this.tabId,
      timestamp: Date.now()
    };
    localStorage.setItem('__cross_tab_message', JSON.stringify(message));

    localStorage.removeItem('__cross_tab_message');
  }

  public onCrossTabMessage(callback: (message: { type: string; data: any; fromTabId: string; timestamp: number }) => void): void {
    const handleMessage = (event: StorageEvent) => {
      if (event.key === '__cross_tab_message' && event.newValue) {
        try {
          const message = JSON.parse(event.newValue);

          if (message.fromTabId !== this.tabId) {
            callback(message);
          }
        } catch (error) {
          console.warn('Failed to parse cross-tab message:', error);
        }
      }
    };

    window.addEventListener('storage', handleMessage);
  }

  private handleStorageChange(event: StorageEvent): void {
    const isSpaceSwitchKey = event.key === 'activeSpaceId';
    if (isSpaceSwitchKey && event.newValue !== event.oldValue) {

      this.clearWorkbenchRelatedStorage();

      this.dispatchTabEvent('space-switched', { 
        newSpaceId: event.newValue,
        oldSpaceId: event.oldValue 
      });
    }
  }

  private clearWorkbenchRelatedStorage(): void {
    const workbenchKeys = [
      'lastWorkbenchId',
      'workbench_sidebar_collapsed',
      'currentWorkbench'
    ];

    workbenchKeys.forEach(key => {
      this.removeItem(key);
    });

    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.storagePrefix) && 
          (key.includes('workbench-edit-mode-') || key.includes('workbench-') && key.includes('-expanded'))) {
        localStorage.removeItem(key);
      }
    });
  }

  private cleanup(): void {

    this.eventListeners.forEach((listeners, eventType) => {
      listeners.forEach(listener => {
        window.removeEventListener(eventType, listener);
      });
    });
    this.eventListeners.clear();

    // this.clearTabStorage();
  }

  public getActiveTabIds(): string[] {
    const keys = Object.keys(localStorage);
    const tabIds: string[] = [];

    keys.forEach(key => {
      const match = key.match(/^tab_([^_]+)_/);
      if (match && !tabIds.includes(match[1])) {
        tabIds.push(match[1]);
      }
    });

    return tabIds;
  }

  public cleanupClosedTabs(): void {

    const keys = Object.keys(localStorage);
    const currentTime = Date.now();

    keys.forEach(key => {
      const match = key.match(/^tab_([^_]+)_last_active$/);
      if (match) {
        const tabId = match[1];
        const lastActive = parseInt(localStorage.getItem(key) || '0');

        if (currentTime - lastActive > 5 * 60 * 1000) {
          this.cleanupTabData(tabId);
        }
      }
    });
  }

  private cleanupTabData(tabId: string): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(`tab_${tabId}_`)) {
        localStorage.removeItem(key);
      }
    });
  }

  public updateLastActive(): void {
    this.setItem('last_active', Date.now().toString());
  }

  public startHeartbeat(): void {

    setInterval(() => {
      this.updateLastActive();
    }, 30000);

    setInterval(() => {
      this.cleanupClosedTabs();
    }, 5 * 60 * 1000);
  }
}

export const tabIsolation = TabIsolationManager.getInstance();

tabIsolation.startHeartbeat();
