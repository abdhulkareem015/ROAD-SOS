import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

const STORAGE_URI_KEY = '@roadsos_public_storage_uri';

class StoragePermissionService {
  constructor() {
    this.directoryUri = null;
  }

  /**
   * Retrieves permanently saved SAF directory URI from device storage
   */
  async getStoredDirectoryUri() {
    if (Platform.OS !== 'android') return null;
    if (this.directoryUri) return this.directoryUri;
    
    try {
      const uri = await AsyncStorage.getItem(STORAGE_URI_KEY);
      this.directoryUri = uri;
      return uri;
    } catch (e) {
      console.warn('[StoragePermissionService] Read storage URI failure:', e.message);
      return null;
    }
  }

  /**
   * Opens Android folder picker using SAF and saves selection
   */
  async requestDirectoryPermission() {
    if (Platform.OS !== 'android') {
      throw new Error('Public offline storage is only supported on Android devices.');
    }

    try {
      const { StorageAccessFramework } = FileSystem;
      const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
      
      if (permissions.granted) {
        this.directoryUri = permissions.directoryUri;
        await AsyncStorage.setItem(STORAGE_URI_KEY, permissions.directoryUri);
        return permissions.directoryUri;
      } else {
        throw new Error('Access permission to custom directory was denied.');
      }
    } catch (e) {
      console.error('[StoragePermissionService] Directory permission request failure:', e.message);
      throw e;
    }
  }

  /**
   * Proactively verifies if current directory URI still holds valid read/write permission
   */
  async hasDirectoryPermission(uri) {
    if (Platform.OS !== 'android') return false;
    const targetUri = uri || await this.getStoredDirectoryUri();
    if (!targetUri) return false;

    try {
      // Verify permissions actively by checking directory accessibility
      await FileSystem.StorageAccessFramework.readDirectoryAsync(targetUri);
      return true;
    } catch (e) {
      console.warn('[StoragePermissionService] Saved SAF permission has been revoked:', e.message);
      return false;
    }
  }

  /**
   * Revokes the SAF folder directory linkage
   */
  async revokePermission() {
    this.directoryUri = null;
    try {
      await AsyncStorage.removeItem(STORAGE_URI_KEY);
      return true;
    } catch (e) {
      console.warn('[StoragePermissionService] Revoking permission failure:', e.message);
      return false;
    }
  }
}

const storagePermissionServiceInstance = new StoragePermissionService();
export default storagePermissionServiceInstance;
