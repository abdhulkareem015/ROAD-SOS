import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import tileCacheService from '../../services/TileCacheService';
import offlineMapService from '../../services/OfflineMapService';
import PublicStorageStatusCard from '../publicStorage/PublicStorageStatusCard';

export default function CachedRegionManager({ currentCoordinates, colors }) {
  const [cacheStats, setCacheStats] = useState({ fileCount: 0, sizeBytes: 0 });
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadRadius, setDownloadRadius] = useState(5); // 5km default

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const stats = await tileCacheService.getCacheStats();
    setCacheStats(stats);
  };

  const handleDownload = async () => {
    if (!currentCoordinates) {
      Alert.alert('GPS Lock Required', 'Please acquire a GPS lock or center the map on the region you wish to download.');
      return;
    }

    const { latitude, longitude } = currentCoordinates;
    setIsDownloading(true);
    setDownloadProgress({ completed: 0, total: 0, success: 0, error: 0 });

    try {
      const results = await offlineMapService.downloadOfflinePack(
        latitude,
        longitude,
        downloadRadius,
        (progress) => {
          setDownloadProgress(progress);
        }
      );

      Alert.alert(
        'Download Complete',
        `Successfully downloaded and cached ${results.success} map tiles and scanned local emergency services inside a ${downloadRadius}km radius.`
      );
    } catch (error) {
      Alert.alert('Download Failed', error.message || 'Failed to complete offline pack download.');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
      loadStats();
    }
  };

  const handleCancel = () => {
    tileCacheService.cancelDownload();
    setIsDownloading(false);
    setDownloadProgress(null);
    loadStats();
  };

  const handleClearCache = () => {
    Alert.alert(
      'Purge Map Cache',
      'Are you sure you want to delete all offline map tiles and cached database files?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await tileCacheService.clearCache();
            await loadStats();
            Alert.alert('Purge Successful', 'Offline cache directory wiped.');
          }
        }
      ]
    );
  };

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>OFFLINE MAP CACHE MANAGER</Text>
        
        {/* Cache Status Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.text }]}>{cacheStats.fileCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Cached Tiles</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {offlineMapService.formatBytes(cacheStats.sizeBytes)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Disk Size</Text>
          </View>
        </View>

        {/* Radius Selector */}
        {!isDownloading && (
          <View style={styles.radiusSelector}>
            <Text style={[styles.radiusLabel, { color: colors.textSecondary }]}>Emergency Download Radius:</Text>
            <View style={styles.radiusButtons}>
              {[3, 5, 10].map((radius) => (
                <TouchableOpacity
                  key={radius}
                  style={[
                    styles.radiusBtn,
                    {
                      backgroundColor: downloadRadius === radius ? colors.primary : colors.surfaceHighlight,
                      borderColor: colors.border,
                    }
                  ]}
                  onPress={() => setDownloadRadius(radius)}
                >
                  <Text style={[styles.radiusBtnText, { color: downloadRadius === radius ? '#ffffff' : colors.text }]}>
                    {radius} km
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Progress display */}
        {isDownloading && downloadProgress && (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="small" color={colors.primary} style={{ marginBottom: 8 }} />
            <Text style={[styles.progressText, { color: colors.text }]}>
              Downloading Map Corridor: {downloadProgress.completed} / {downloadProgress.total} tiles
            </Text>
            <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceHighlight }]}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { 
                    backgroundColor: colors.primary,
                    width: `${(downloadProgress.completed / (downloadProgress.total || 1)) * 100}%` 
                  }
                ]} 
              />
            </View>
            <Text style={[styles.progressDetail, { color: colors.textSecondary }]}>
              Success: {downloadProgress.success} | Errors: {downloadProgress.error}
            </Text>
          </View>
        )}

        {/* Control Buttons */}
        <View style={styles.actionsContainer}>
          {!isDownloading ? (
            <>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.downloadBtn, { backgroundColor: colors.primary }]}
                onPress={handleDownload}
              >
                <Text style={styles.btnText}>💾 DOWNLOAD CURRENT AREA</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionBtn, styles.clearBtn, { borderColor: colors.border }]}
                onPress={handleClearCache}
              >
                <Text style={[styles.btnTextSecondary, { color: colors.textSecondary }]}>🗑️ PURGE CACHE</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity 
              style={[styles.actionBtn, styles.cancelBtn, { backgroundColor: colors.surfaceHighlight }]}
              onPress={handleCancel}
            >
              <Text style={[styles.btnText, { color: colors.text }]}>🛑 CANCEL DOWNLOAD</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <PublicStorageStatusCard colors={colors} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 20,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statBox: {
    flex: 0.48,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 4,
  },
  radiusSelector: {
    marginBottom: 16,
  },
  radiusLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    marginBottom: 8,
  },
  radiusButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  radiusBtn: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  radiusBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
  },
  progressDetail: {
    fontSize: 10,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  actionBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  downloadBtn: {
    flex: 0.58,
  },
  clearBtn: {
    flex: 0.38,
    borderWidth: 1.5,
  },
  cancelBtn: {
    width: '100%',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  btnTextSecondary: {
    fontSize: 12,
    fontWeight: '700',
  }
});
