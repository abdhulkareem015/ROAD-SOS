import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';
import { Platform } from 'react-native';

const CACHE_DIR = FileSystem.documentDirectory + 'offline_tiles/';

class DownloadExportService {
  /**
   * Zips the entire internal map cache and geocoded emergency data.
   * Copies the result to SAF backups folder (if enabled) and triggers native Share Sheet.
   */
  async exportRegionBackup(backupsFolderUri = null) {
    try {
      const zip = new JSZip();
      
      // 1. Read all cached map tiles and add them to ZIP
      const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
      if (dirInfo.exists) {
        const zipTilesFolder = zip.folder('OfflineMaps');
        
        const addFilesToZipRecursive = async (pathStr, currentZipFolder) => {
          const files = await FileSystem.readDirectoryAsync(pathStr);
          for (const file of files) {
            const itemPath = `${pathStr}${file}`;
            const itemInfo = await FileSystem.getInfoAsync(itemPath);

            if (itemInfo.isDirectory) {
              const nextZipFolder = currentZipFolder.folder(file);
              await addFilesToZipRecursive(itemPath + '/', nextZipFolder);
            } else {
              // Read binary image file as base64 string
              const base64Data = await FileSystem.readAsStringAsync(itemPath, {
                encoding: FileSystem.EncodingType.Base64,
              });
              // Feed raw base64 data to JSZip
              currentZipFolder.file(file, base64Data, { base64: true });
            }
          }
        };

        await addFilesToZipRecursive(CACHE_DIR, zipTilesFolder);
      }

      // 2. Add geocoded emergency facilities local cache
      const emergencyCachePath = FileSystem.documentDirectory + 'cached_places.json';
      const emergencyInfo = await FileSystem.getInfoAsync(emergencyCachePath);
      if (emergencyInfo.exists) {
        const emergencyData = await FileSystem.readAsStringAsync(emergencyCachePath);
        zip.file('EmergencyData/cached_places.json', emergencyData);
      }

      // 3. Compile JSZip package
      console.log('[DownloadExportService] Generating zip compression stream...');
      const base64Content = await zip.generateAsync({ type: 'base64' });
      
      // 4. Save ZIP package into internal temp cache folder
      const tempZipName = `RoadSOS_Backup_${Date.now()}.zip`;
      const tempZipPath = `${FileSystem.cacheDirectory}${tempZipName}`;
      await FileSystem.writeAsStringAsync(tempZipPath, base64Content, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log(`[DownloadExportService] Temporary backup ZIP created: ${tempZipPath}`);

      // 5. If SAF backup directory link is active, save a backup copy there publicly
      if (backupsFolderUri) {
        try {
          const publicFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
            backupsFolderUri,
            tempZipName,
            'application/zip'
          );

          await FileSystem.StorageAccessFramework.writeAsStringAsync(publicFileUri, base64Content, {
            encoding: FileSystem.EncodingType.Base64,
          });
          console.log(`[DownloadExportService] Copied ZIP archive to public Storage backups folder: ${tempZipName}`);
        } catch (e) {
          console.warn('[DownloadExportService] SAF Public backup save failure:', e.message);
        }
      }

      // 6. Launch device Native share sheet dialog
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(tempZipPath, {
          mimeType: 'application/zip',
          dialogTitle: 'Export RoadSOS Offline Emergency Region Pack',
          UTI: 'public.archive',
        });
      } else {
        throw new Error('Native system file sharing sheet is unavailable on this device.');
      }

      return true;
    } catch (e) {
      console.error('[DownloadExportService] Packing region backup failed:', e.message);
      throw e;
    }
  }
}

const downloadExportServiceInstance = new DownloadExportService();
export default downloadExportServiceInstance;
