import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

const CACHE_DIR = FileSystem.documentDirectory + 'offline_tiles/';
const TILE_URL_TEMPLATE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

// Conversion helpers: latitude/longitude to OpenStreetMap tile coords
export function lon2tile(lon, zoom) {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

export function lat2tile(lat, zoom) {
  return Math.floor(
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
      ) /
        Math.PI) /
      2) *
      Math.pow(2, zoom)
  );
}

// Bounding box from center and radius in km
export function getBoundingBox(lat, lon, radiusKm) {
  const kmPerDegreeLat = 111.1;
  const kmPerDegreeLon = 111.1 * Math.cos((lat * Math.PI) / 180);

  const deltaLat = radiusKm / kmPerDegreeLat;
  const deltaLon = radiusKm / kmPerDegreeLon;

  return {
    minLat: lat - deltaLat,
    maxLat: lat + deltaLat,
    minLon: lon - deltaLon,
    maxLon: lon + deltaLon
  };
}

class TileCacheService {
  constructor() {
    this.isDownloading = false;
    this.downloadProgressCallback = null;
  }

  /**
   * Safe initialization of tiles directory
   */
  async ensureCacheDirectory() {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    }
  }

  /**
   * Resolves the local file system path for a specific tile
   */
  getTileLocalPath(z, x, y) {
    return `${CACHE_DIR}${z}/${x}/${y}.png`;
  }

  /**
   * Resolves local file template for <LocalTile> pathTemplate configuration
   */
  getTilePathTemplate() {
    // iOS and Android require slightly different path formats for LocalTile overlay
    if (Platform.OS === 'ios') {
      return `${CACHE_DIR}{z}/{x}/{y}.png`;
    }
    // Android uses standard file paths
    return `${CACHE_DIR}{z}/{x}/{y}.png`;
  }

  /**
   * Calculates the total number of tiles to download for a region
   * @param {number} lat - Center latitude
   * @param {number} lon - Center longitude
   * @param {number} radiusKm - Cache radius (e.g. 5km to 10km)
   * @param {number} minZoom - Minimum zoom level (e.g. 12)
   * @param {number} maxZoom - Maximum zoom level (e.g. 15)
   */
  calculateTileList(lat, lon, radiusKm, minZoom = 12, maxZoom = 15) {
    const bbox = getBoundingBox(lat, lon, radiusKm);
    const tiles = [];

    for (let z = minZoom; z <= maxZoom; z++) {
      const minX = lon2tile(bbox.minLon, z);
      const maxX = lon2tile(bbox.maxLon, z);
      
      // Note: Y coordinates go from North to South, so maxLat maps to minY
      const minY = lat2tile(bbox.maxLat, z);
      const maxY = lat2tile(bbox.minLat, z);

      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          tiles.push({ x, y, z });
        }
      }
    }

    return tiles;
  }

  /**
   * Downloads a single tile to the cache directory
   */
  async downloadTile(z, x, y, overwrite = false, regionName = 'Default_Region') {
    const localDir = `${CACHE_DIR}${z}/${x}`;
    const localPath = this.getTileLocalPath(z, x, y);
    
    // Check if tile exists already
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    if (fileInfo.exists && !overwrite) {
      // Background copy to public storage if linked
      const publicStorageService = require('./PublicStorageService').default;
      if (publicStorageService.isEnabled) {
        publicStorageService.saveTilePublicly(regionName, z, x, y, localPath)
          .catch((err) => console.log('[TileCacheService] Public copy failure:', err.message));
      }
      return true; // Already cached internally
    }

    // Ensure directory z/x exists
    await FileSystem.makeDirectoryAsync(localDir, { intermediates: true });

    // Download from OSM
    const remoteUrl = TILE_URL_TEMPLATE.replace('{z}', z).replace('{x}', x).replace('{y}', y);
    
    try {
      await FileSystem.downloadAsync(remoteUrl, localPath);

      // Background copy newly downloaded tile to public storage if active
      const publicStorageService = require('./PublicStorageService').default;
      if (publicStorageService.isEnabled) {
        publicStorageService.saveTilePublicly(regionName, z, x, y, localPath)
          .catch((err) => console.log('[TileCacheService] Public copy failure:', err.message));
      }

      return true;
    } catch (error) {
      console.warn(`[Tile Download Failure] Tile z:${z} x:${x} y:${y} - ${error.message}`);
      return false;
    }
  }

  /**
   * Triggers a bulk download process for a specified region
   */
  async downloadRegion(lat, lon, radiusKm, minZoom = 12, maxZoom = 15, onProgress = null, regionName = 'Default_Region') {
    if (this.isDownloading) {
      throw new Error('Another download task is currently active.');
    }

    this.isDownloading = true;
    await this.ensureCacheDirectory();

    const publicStorageService = require('./PublicStorageService').default;
    if (publicStorageService.isEnabled) {
      publicStorageService.clearTileCache(); // Clear URI lookup cache before batch download starts
    }

    const tiles = this.calculateTileList(lat, lon, radiusKm, minZoom, maxZoom);
    const totalTiles = tiles.length;
    let completedCount = 0;
    let successCount = 0;
    let errorCount = 0;

    if (onProgress) {
      onProgress({ completed: 0, total: totalTiles, success: 0, error: 0 });
    }

    // Concurrency limit: Download up to 5 tiles simultaneously
    const CONCURRENCY_LIMIT = 5;
    const tileChunks = [];
    
    for (let i = 0; i < tiles.length; i += CONCURRENCY_LIMIT) {
      tileChunks.push(tiles.slice(i, i + CONCURRENCY_LIMIT));
    }

    try {
      for (const chunk of tileChunks) {
        if (!this.isDownloading) break; // Allow cancellation

        await Promise.all(
          chunk.map(async (tile) => {
            const success = await this.downloadTile(tile.z, tile.x, tile.y, false, regionName);
            completedCount++;
            if (success) {
              successCount++;
            } else {
              errorCount++;
            }
          })
        );

        if (onProgress) {
          onProgress({
            completed: completedCount,
            total: totalTiles,
            success: successCount,
            error: errorCount
          });
        }
      }
    } finally {
      if (publicStorageService.isEnabled) {
        publicStorageService.clearTileCache(); // Clean cache at end of batch download
      }
      this.isDownloading = false;
    }

    return { total: totalTiles, success: successCount, error: errorCount };
  }

  /**
   * Cancels any active download process
   */
  cancelDownload() {
    this.isDownloading = false;
  }

  /**
   * Gets cache size information
   */
  async getCacheStats() {
    await this.ensureCacheDirectory();
    try {
      const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
      if (!dirInfo.exists) {
        return { fileCount: 0, sizeBytes: 0 };
      }

      let sizeBytes = 0;
      let fileCount = 0;

      const readSizeRecursive = async (pathStr) => {
        const files = await FileSystem.readDirectoryAsync(pathStr);
        for (const file of files) {
          const itemPath = `${pathStr}${file}`;
          const itemInfo = await FileSystem.getInfoAsync(itemPath);
          if (itemInfo.isDirectory) {
            await readSizeRecursive(itemPath + '/');
          } else {
            sizeBytes += itemInfo.size || 0;
            fileCount++;
          }
        }
      };

      await readSizeRecursive(CACHE_DIR);
      return { fileCount, sizeBytes };
    } catch (e) {
      console.warn('Failed calculating cache stats:', e);
      return { fileCount: 0, sizeBytes: 0 };
    }
  }

  /**
   * Completely purges the tile cache directory
   */
  async clearCache() {
    try {
      const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(CACHE_DIR);
      }
      await this.ensureCacheDirectory();
      return true;
    } catch (e) {
      console.error('Failed clearing cache:', e);
      return false;
    }
  }
}

const tileCacheServiceInstance = new TileCacheService();
export default tileCacheServiceInstance;
