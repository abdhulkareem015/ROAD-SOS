import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import publicStorageService from '../../services/PublicStorageService';
import EnablePublicStorageButton from './EnablePublicStorageButton';
import DownloadLocationSelector from './DownloadLocationSelector';
import StoragePermissionModal from './StoragePermissionModal';

export default function PublicStorageStatusCard({ colors }) {
  const [storageState, setStorageState] = useState({
    isEnabled: false,
    rootDirectoryUri: null,
    folderUris: null,
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const unsubscribe = publicStorageService.subscribe((state) => {
      setStorageState(state);
    });
    return () => unsubscribe();
  }, []);

  const handleToggle = async () => {
    if (storageState.isEnabled) {
      Alert.alert(
        'Revoke Directory Link',
        'Are you sure you want to decouple the public storage directory? Future offline downloads will only save inside the internal app cache.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Revoke Link',
            style: 'destructive',
            onPress: async () => {
              await publicStorageService.revokeLink();
              Alert.alert('Link Revoked', 'Public local storage decoupled.');
            }
          }
        ]
      );
    } else {
      setModalVisible(true);
    }
  };

  const handlePermissionConfirm = async () => {
    setModalVisible(false);
    try {
      const linked = await publicStorageService.linkPublicStorage();
      if (linked) {
        Alert.alert(
          'Linking Successful',
          'RoadSOS has linked your selected folder. The standard structure is successfully bootstrapped!'
        );
      }
    } catch (e) {
      Alert.alert('Linking Error', e.message || 'Failed to establish storage directory permission.');
    }
  };

  const handleBackupExport = async () => {
    setIsExporting(true);
    try {
      await publicStorageService.exportBackup();
    } catch (e) {
      Alert.alert('Backup Error', e.message || 'An error occurred during zip compression.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>PUBLIC LOCAL STORAGE INTEGRATION</Text>

      <View style={styles.cardBody}>
        {/* Destination Path Preview */}
        <DownloadLocationSelector 
          isEnabled={storageState.isEnabled} 
          rootUri={storageState.rootDirectoryUri} 
          colors={colors} 
        />

        {/* Dynamic Action Button */}
        <EnablePublicStorageButton 
          isEnabled={storageState.isEnabled} 
          onPress={handleToggle} 
          colors={colors} 
        />

        {/* ZIP Export / Share region backup triggers */}
        {storageState.isEnabled && (
          <TouchableOpacity 
            style={[styles.exportBtn, { borderColor: colors.warning }]}
            onPress={handleBackupExport}
            disabled={isExporting}
            activeOpacity={0.8}
          >
            {isExporting ? (
              <View style={styles.loaderRow}>
                <ActivityIndicator size="small" color={colors.warning} style={{ marginRight: 8 }} />
                <Text style={[styles.exportBtnText, { color: colors.warning }]}>Zipping Region Cache...</Text>
              </View>
            ) : (
              <Text style={[styles.exportBtnText, { color: colors.warning }]}>📦 EXPORT & SHARE ACTIVE REGION</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Directory permission picker modal */}
      <StoragePermissionModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
        onConfirm={handlePermissionConfirm} 
        colors={colors} 
      />
    </View>
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
  cardBody: {
    width: '100%',
  },
  exportBtn: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  exportBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  loaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  }
});
