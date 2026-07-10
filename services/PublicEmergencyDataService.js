import * as FileSystem from 'expo-file-system';
import publicFolderManager from './PublicFolderManager';

class PublicEmergencyDataService {
  /**
   * Saves geocoded safety facilities list publicly in pretty-printed JSON
   * Path output: EmergencyData/<RegionName>_emergencyData.json
   */
  async saveEmergencyDataPublicly(emergencyFolderUri, regionName, data) {
    try {
      // 1. Validate data array
      if (!Array.isArray(data)) {
        throw new Error('Data validation failed: expected array of facilities.');
      }

      const fileName = `${regionName}_emergencyData.json`;
      const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(emergencyFolderUri);
      
      let fileUri = files.find(uri => {
        const decoded = decodeURIComponent(uri);
        return decoded.endsWith(`/${fileName}`);
      });

      if (!fileUri) {
        // Create public JSON file
        fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
          emergencyFolderUri,
          fileName,
          'application/json'
        );
      }

      // 2. Format and write JSON payload with spacing
      const formattedJson = JSON.stringify(data, null, 2);
      await FileSystem.StorageAccessFramework.writeAsStringAsync(fileUri, formattedJson, {
        encoding: FileSystem.EncodingType.UTF8
      });

      console.log(`[PublicEmergencyDataService] Saved public emergency JSON: ${fileName}`);
      return true;
    } catch (e) {
      console.warn('[PublicEmergencyDataService] Failed saving geocoded JSON publicly:', e.message);
      return false;
    }
  }
}

const publicEmergencyDataServiceInstance = new PublicEmergencyDataService();
export default publicEmergencyDataServiceInstance;
