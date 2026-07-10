import { Platform } from 'react-native';
import storagePermissionService from './StoragePermissionService';
import publicFolderManager from './PublicFolderManager';
import publicOfflineMapService from './PublicOfflineMapService';
import publicEmergencyDataService from './PublicEmergencyDataService';
import downloadExportService from './DownloadExportService';

class PublicStorageService {
  constructor() {
    this.isEnabled = false;
    this.rootDirectoryUri = null;
    this.folderUris = null; // Map of directories: { OfflineMaps, EmergencyData, CachedReports, Routes, Backups }
    this.listeners = new Set();
  }

  /**
   * Registers component subscriber triggers to react to storage configuration states
   */
  subscribe(callback) {
    this.listeners.add(callback);
    callback({
      isEnabled: this.isEnabled,
      rootDirectoryUri: this.rootDirectoryUri,
      folderUris: this.folderUris
    });
    return () => this.listeners.delete(callback);
  }

  _notifyListeners() {
    const state = {
      isEnabled: this.isEnabled,
      rootDirectoryUri: this.rootDirectoryUri,
      folderUris: this.folderUris
    };
    this.listeners.forEach(cb => cb(state));
  }

  /**
   * Checks for previously active folder links and restores permissions automatically on load
   */
  async initialize() {
    if (Platform.OS !== 'android') return;

    try {
      const storedUri = await storagePermissionService.getStoredDirectoryUri();
      if (storedUri) {
        const hasPermission = await storagePermissionService.hasDirectoryPermission(storedUri);
        if (hasPermission) {
          this.rootDirectoryUri = storedUri;
          this.folderUris = await publicFolderManager.ensureFolderStructure(storedUri);
          this.isEnabled = true;
          console.log('[PublicStorageService] Successfully restored public storage link permissions.');
        } else {
          console.warn('[PublicStorageService] Storage link was revoked. Revoking state flags.');
          await this.revokeLink();
        }
      }
    } catch (e) {
      console.warn('[PublicStorageService] Startup check failure:', e.message);
      await this.revokeLink();
    }
    this._notifyListeners();
  }

  /**
   * Prompts user with SAF picker, requests Downloads/custom subfolder link, and builds structure
   */
  async linkPublicStorage() {
    try {
      const rootUri = await storagePermissionService.requestDirectoryPermission();
      if (rootUri) {
        this.rootDirectoryUri = rootUri;
        this.folderUris = await publicFolderManager.ensureFolderStructure(rootUri);
        this.isEnabled = true;
        console.log('[PublicStorageService] Storage linked and bootstrapped.');
        this._notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      console.error('[PublicStorageService] Failed to establish SAF storage link:', e.message);
      this._notifyListeners();
      throw e;
    }
  }

  /**
   * Clears saved tokens and falls back safely to internal storage
   */
  async revokeLink() {
    await storagePermissionService.revokePermission();
    this.isEnabled = false;
    this.rootDirectoryUri = null;
    this.folderUris = null;
    publicOfflineMapService.clearDirectoryCache();
    this._notifyListeners();
  }

  /**
   * Dispatches asynchronous copy actions to write map tiles to public local storage folder
   */
  async saveTilePublicly(regionName, z, x, y, localPath) {
    if (!this.isEnabled || !this.folderUris || !this.folderUris.OfflineMaps) {
      return false;
    }
    
    return await publicOfflineMapService.saveTilePublicly(
      this.folderUris.OfflineMaps,
      regionName,
      z,
      x,
      y,
      localPath
    );
  }

  /**
   * Saves scanned nearby amenities geocoded list publicly
   */
  async saveEmergencyDataPublicly(regionName, data) {
    if (!this.isEnabled || !this.folderUris || !this.folderUris.EmergencyData) {
      return false;
    }

    return await publicEmergencyDataService.saveEmergencyDataPublicly(
      this.folderUris.EmergencyData,
      regionName,
      data
    );
  }

  /**
   * Zips the map tile cache and shares the package through system share drawers
   */
  async exportBackup() {
    const backupsUri = this.folderUris ? this.folderUris.Backups : null;
    return await downloadExportService.exportRegionBackup(backupsUri);
  }

  /**
   * Resets active directory links cache to maintain high-performance batch updates
   */
  clearTileCache() {
    publicOfflineMapService.clearDirectoryCache();
  }
}

const publicStorageServiceInstance = new PublicStorageService();
export default publicStorageServiceInstance;
