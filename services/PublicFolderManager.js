import * as FileSystem from 'expo-file-system';

class PublicFolderManager {
  /**
   * Bootstraps the required standard folder paths inside the SAF root
   * Returns a map of folder names to their active SAF URIs
   */
  async ensureFolderStructure(rootUri) {
    if (!rootUri) return null;
    
    const requiredFolders = [
      'OfflineMaps',
      'EmergencyData',
      'CachedReports',
      'Routes',
      'Backups'
    ];

    const folderUris = {};

    try {
      const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(rootUri);
      
      for (const folderName of requiredFolders) {
        // Look for existing folder URI in directory files list by checking URL endings
        let foundUri = files.find(uri => {
          const decoded = decodeURIComponent(uri);
          return decoded.endsWith(`/${folderName}`) || decoded.endsWith(`/${folderName}/`);
        });

        if (!foundUri) {
          console.log(`[PublicFolderManager] Bootstrapping missing directory: ${folderName}`);
          foundUri = await FileSystem.StorageAccessFramework.makeDirectoryAsync(rootUri, folderName);
        }

        folderUris[folderName] = foundUri;
      }

      return folderUris;
    } catch (e) {
      console.error('[PublicFolderManager] Folder structure bootstrapping failed:', e.message);
      throw e;
    }
  }

  /**
   * Utility helper to locate or safely create a custom subfolder inside a SAF folder URI
   */
  async getOrCreateSubfolder(parentUri, folderName) {
    try {
      const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(parentUri);
      let foundUri = files.find(uri => {
        const decoded = decodeURIComponent(uri);
        return decoded.endsWith(`/${folderName}`) || decoded.endsWith(`/${folderName}/`);
      });

      if (!foundUri) {
        foundUri = await FileSystem.StorageAccessFramework.makeDirectoryAsync(parentUri, folderName);
      }

      return foundUri;
    } catch (e) {
      console.error(`[PublicFolderManager] Custom subfolder resolve failed for ${folderName}:`, e.message);
      throw e;
    }
  }
}

const publicFolderManagerInstance = new PublicFolderManager();
export default publicFolderManagerInstance;
