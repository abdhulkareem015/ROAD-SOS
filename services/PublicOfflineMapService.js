import * as FileSystem from 'expo-file-system';
import publicFolderManager from './PublicFolderManager';

class PublicOfflineMapService {
  constructor() {
    this.directoryUriCache = {}; // Cache directory SAF URIs in memory during downloads
  }

  /**
   * Cleans the active memory folder cache
   */
  clearDirectoryCache() {
    this.directoryUriCache = {};
  }

  /**
   * Copies a single map tile from internal app cache to SAF public local storage
   * Path output: OfflineMaps/<RegionName>/<zoom>/<x>/<y>.png
   */
  async saveTilePublicly(offlineMapsFolderUri, regionName, z, x, y, localPath) {
    try {
      // 1. Resolve Region Subfolder under OfflineMaps
      const regionKey = `region_${regionName}`;
      let regionUri = this.directoryUriCache[regionKey];
      if (!regionUri) {
        regionUri = await publicFolderManager.getOrCreateSubfolder(offlineMapsFolderUri, regionName);
        this.directoryUriCache[regionKey] = regionUri;
      }

      // 2. Resolve Zoom (Z) subfolder
      const zKey = `${regionKey}_z_${z}`;
      let zUri = this.directoryUriCache[zKey];
      if (!zUri) {
        zUri = await publicFolderManager.getOrCreateSubfolder(regionUri, z.toString());
        this.directoryUriCache[zKey] = zUri;
      }

      // 3. Resolve coordinate X subfolder
      const xKey = `${zKey}_x_${x}`;
      let xUri = this.directoryUriCache[xKey];
      if (!xUri) {
        xUri = await publicFolderManager.getOrCreateSubfolder(zUri, x.toString());
        this.directoryUriCache[xKey] = xUri;
      }

      // 4. Check if file already exists in SAF coordinate folder
      const fileName = `${y}.png`;
      const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(xUri);
      let fileUri = files.find(uri => {
        const decoded = decodeURIComponent(uri);
        return decoded.endsWith(`/${fileName}`);
      });

      if (!fileUri) {
        // Create file placeholder inside SAF directory
        fileUri = await FileSystem.StorageAccessFramework.createFileAsync(xUri, fileName, 'image/png');
      }

      // 5. Stream base64 binary blocks to public file system
      const base64Data = await FileSystem.readAsStringAsync(localPath, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await FileSystem.StorageAccessFramework.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return true;
    } catch (e) {
      console.warn(`[PublicOfflineMapService] Failed saving tile publicly [z:${z}, x:${x}, y:${y}]:`, e.message);
      return false;
    }
  }
}

const publicOfflineMapServiceInstance = new PublicOfflineMapService();
export default publicOfflineMapServiceInstance;
