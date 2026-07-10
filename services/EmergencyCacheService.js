import AsyncStorage from '@react-native-async-storage/async-storage';
import networkService from './NetworkService';

const PLACES_CACHE_KEY = '@roadsos_cached_places';
const PENDING_REPORTS_KEY = '@roadsos_pending_reports';
const LAST_DOWNLOAD_KEY = '@roadsos_last_download_time';

class EmergencyCacheService {
  constructor() {
    this.isSyncing = false;

    // Listen to network transitions to automatically trigger sync
    networkService.subscribe((state) => {
      if (!state.isOffline && !this.isSyncing) {
        this.syncPendingReports().catch((err) => {
          console.error('[Auto Sync Transition Failure]', err.message);
        });
      }
    });
  }

  /**
   * Saves scanned nearby facilities to local storage
   */
  async cacheNearbyFacilities(places) {
    try {
      const dataStr = JSON.stringify(places);
      await AsyncStorage.setItem(PLACES_CACHE_KEY, dataStr);
      await AsyncStorage.setItem(LAST_DOWNLOAD_KEY, new Date().toISOString());
      return true;
    } catch (e) {
      console.warn('[Cache Facilities Error]', e.message);
      return false;
    }
  }

  /**
   * Retrieves facilities from local storage
   */
  async getCachedFacilities() {
    try {
      const dataStr = await AsyncStorage.getItem(PLACES_CACHE_KEY);
      return dataStr ? JSON.parse(dataStr) : [];
    } catch (e) {
      console.warn('[Read Cached Facilities Error]', e.message);
      return [];
    }
  }

  /**
   * Gets the last cache download time
   */
  async getLastDownloadTime() {
    try {
      return await AsyncStorage.getItem(LAST_DOWNLOAD_KEY);
    } catch (e) {
      return null;
    }
  }

  /**
   * Adds an incident report to the offline queue
   * @param {Object} report - Incident report details
   */
  async queueOfflineReport(report) {
    try {
      const queueStr = await AsyncStorage.getItem(PENDING_REPORTS_KEY);
      const queue = queueStr ? JSON.parse(queueStr) : [];
      
      const offlineReport = {
        ...report,
        id: `offline-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: report.timestamp || new Date().toISOString(),
        isSynced: false
      };

      queue.push(offlineReport);
      await AsyncStorage.setItem(PENDING_REPORTS_KEY, JSON.stringify(queue));
      return offlineReport;
    } catch (e) {
      console.error('[Queue Offline Report Error]', e.message);
      throw e;
    }
  }

  /**
   * Fetches all pending offline reports
   */
  async getPendingReports() {
    try {
      const queueStr = await AsyncStorage.getItem(PENDING_REPORTS_KEY);
      return queueStr ? JSON.parse(queueStr) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Dispatches all queued pending reports to the Express backend
   * @param {string} backendUrl - Server endpoint base address
   */
  async syncPendingReports(backendUrl = null) {
    if (this.isSyncing) return;
    
    const pending = await this.getPendingReports();
    if (pending.length === 0) return;

    // Verify online status
    const netState = networkService.getState();
    if (netState.isOffline) {
      console.log('[Sync Pending Reports] Cancelled: client is offline.');
      return;
    }

    this.isSyncing = true;
    console.log(`[Sync Pending Reports] Started. Syncing ${pending.length} reports...`);

    // Retrieve active backend url from cache if not passed
    let resolvedUrl = backendUrl;
    if (!resolvedUrl) {
      try {
        // Fallback or read from standard server settings key
        // (App.js stores local ip or defaults. If missing, we'll try standard endpoints)
        const cachedUrl = await AsyncStorage.getItem('@roadsos_backend_url');
        resolvedUrl = cachedUrl || 'http://localhost:3000'; // Fallback default
      } catch (e) {
        resolvedUrl = 'http://localhost:3000';
      }
    }

    const failed = [];
    const succeededCount = 0;

    for (const report of pending) {
      try {
        const response = await fetch(`${resolvedUrl}/api/reports`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            category: report.category,
            description: `${report.description} (Filed offline)`,
            severity: report.severity,
            latitude: report.latitude,
            longitude: report.longitude
          })
        });

        if (response.ok) {
          console.log(`[Synced Report success] ID: ${report.id}`);
        } else {
          failed.push(report);
        }
      } catch (err) {
        console.warn(`[Sync Report failed] ID: ${report.id} - Network error: ${err.message}`);
        failed.push(report);
      }
    }

    // Save failed reports back to queue, clear completed
    try {
      await AsyncStorage.setItem(PENDING_REPORTS_KEY, JSON.stringify(failed));
    } catch (e) {
      console.error('[Update Pending Reports Queue Error]', e.message);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Resets all cached files and queues
   */
  async clearAll() {
    try {
      await AsyncStorage.removeItem(PLACES_CACHE_KEY);
      await AsyncStorage.removeItem(PENDING_REPORTS_KEY);
      await AsyncStorage.removeItem(LAST_DOWNLOAD_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }
}

const emergencyCacheServiceInstance = new EmergencyCacheService();
export default emergencyCacheServiceInstance;
