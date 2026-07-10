import * as FileSystem from 'expo-file-system';
import tileCacheService from './TileCacheService';
import emergencyCacheService from './EmergencyCacheService';

const CACHE_DIR = FileSystem.documentDirectory + 'offline_tiles/';

class OfflineMapService {
  /**
   * Helper to format bytes to human readable format (MB, KB)
   */
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Downloads map tiles AND emergency facility database for a selected coordinate sector
   * @param {number} lat - Target center latitude
   * @param {number} lon - Target center longitude
   * @param {number} radiusKm - Cache radius (e.g. 5km or 10km)
   * @param {Function} onProgress - Callback mapping progress updates
   */
  async downloadOfflinePack(lat, lon, radiusKm = 5, onProgress = null) {
    // 0. Resolve sanitized region name for the public storage output
    let regionName = `Region_${lat.toFixed(4)}_${lon.toFixed(4)}`;
    try {
      const { reverseGeocodeAsync } = require('expo-location');
      const addresses = await reverseGeocodeAsync({ latitude: lat, longitude: lon });
      if (addresses && addresses.length > 0) {
        const item = addresses[0];
        const rawName = item.city || item.district || item.subregion || item.name;
        if (rawName) {
          regionName = rawName.trim().replace(/[^a-zA-Z0-9_]/g, '_');
        }
      }
    } catch (e) {
      console.log('[OfflineMapService] Geocoding region name failed:', e.message);
    }

    // 1. Trigger OSM Facility scan and cache it
    console.log('[Offline Pack Download] Fetching safety facilities data...');
    try {
      const rangeMeters = radiusKm * 1000;
      
      const queries = [
        `node(around:${rangeMeters},${lat},${lon})[amenity=hospital];way(around:${rangeMeters},${lat},${lon})[amenity=hospital];node(around:${rangeMeters},${lat},${lon})[amenity=clinic];`,
        `node(around:${rangeMeters},${lat},${lon})[amenity=police];way(around:${rangeMeters},${lat},${lon})[amenity=police];`,
        `node(around:${rangeMeters},${lat},${lon})[emergency=ambulance_station];way(around:${rangeMeters},${lat},${lon})[emergency=ambulance_station];`,
        `node(around:${rangeMeters},${lat},${lon})[amenity=car_repair][service=towing];node(around:${rangeMeters},${lat},${lon})[service=towing];`,
        `node(around:${rangeMeters},${lat},${lon})[craft=tyres];node(around:${rangeMeters},${lat},${lon})[amenity=car_repair];`
      ];

      const combinedQueries = queries.join('');
      const fullQuery = `[out:json][timeout:15];(${combinedQueries});out center;`;
      const encodedUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(fullQuery)}`;

      const res = await fetch(encodedUrl, {
        headers: {
          'User-Agent': 'RoadSOS-Offline-Security/1.0',
          'Accept': 'application/json',
        }
      });

      if (res.ok) {
        const data = await res.json();
        const results = (data.elements || []).map((element) => {
          const placeLat = element.center ? element.center.lat : element.lat;
          const placeLon = element.center ? element.center.lon : element.lon;
          
          let category = 'Facility';
          if (element.tags.amenity === 'hospital' || element.tags.amenity === 'clinic') category = 'Hospital';
          else if (element.tags.amenity === 'police') category = 'Police';
          else if (element.tags.emergency === 'ambulance_station') category = 'Ambulance';
          else if (element.tags.service === 'towing' || (element.tags.amenity === 'car_repair' && element.tags.service === 'towing')) category = 'Towing';
          else if (element.tags.craft === 'tyres' || element.tags.amenity === 'car_repair') category = 'Puncture Shop';

          return {
            id: element.id.toString(),
            latitude: placeLat,
            longitude: placeLon,
            category,
            name: element.tags.name || element.tags.operator || `Unnamed ${category}`,
            address: element.tags['addr:street'] 
              ? `${element.tags['addr:housenumber'] || ''} ${element.tags['addr:street']}`.trim()
              : element.tags['addr:city'] || element.tags.suburb || 'Coordinates locked in offline zone',
            phone: element.tags.phone || element.tags['contact:phone'] || '911',
            distance: 0 // Will be recalculated dynamically from current position
          };
        });

        await emergencyCacheService.cacheNearbyFacilities(results);
        console.log(`[Offline Pack Download] Cached ${results.length} emergency locations.`);

        // Save geocoded safety JSON list publicly in Scoped Storage if active
        const publicStorageService = require('./PublicStorageService').default;
        if (publicStorageService.isEnabled) {
          await publicStorageService.saveEmergencyDataPublicly(regionName, results);
        }
      }
    } catch (err) {
      console.warn('[Offline Pack Download] Facilities cache failed, proceeding with map tiles:', err.message);
    }

    // 2. Download map tiles (and background-copy them to public storage)
    return await tileCacheService.downloadRegion(lat, lon, radiusKm, 12, 15, onProgress, regionName);
  }

  /**
   * Scans and cleans tile files that haven't been modified in a certain threshold (e.g. 7 days)
   * @param {number} maxAgeDays - Expiry limit in days
   */
  async pruneOldTiles(maxAgeDays = 7) {
    try {
      const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
      if (!dirInfo.exists) return;

      const now = Date.now();
      const expirationMs = maxAgeDays * 24 * 60 * 60 * 1000;
      let prunedCount = 0;

      const pruneRecursive = async (pathStr) => {
        const files = await FileSystem.readDirectoryAsync(pathStr);
        for (const file of files) {
          const itemPath = `${pathStr}${file}`;
          const itemInfo = await FileSystem.getInfoAsync(itemPath);

          if (itemInfo.isDirectory) {
            await pruneRecursive(itemPath + '/');
            // Clean empty directories Y/X/Z
            const subFiles = await FileSystem.readDirectoryAsync(itemPath);
            if (subFiles.length === 0) {
              await FileSystem.deleteAsync(itemPath);
            }
          } else {
            const age = now - (itemInfo.modificationTime * 1000 || now);
            if (age > expirationMs) {
              await FileSystem.deleteAsync(itemPath);
              prunedCount++;
            }
          }
        }
      };

      await pruneRecursive(CACHE_DIR);
      console.log(`[Cache Pruning complete] Cleared ${prunedCount} expired map tiles.`);
      return prunedCount;
    } catch (e) {
      console.error('[Tile Pruning Error]', e);
      return 0;
    }
  }
}

const offlineMapServiceInstance = new OfflineMapService();
export default offlineMapServiceInstance;
