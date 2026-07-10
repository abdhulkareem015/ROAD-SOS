import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function DownloadLocationSelector({ isEnabled, rootUri, colors }) {
  /**
   * Helper to decode native SAF content URIs into a human-readable folder path
   */
  const getReadablePath = (uri) => {
    if (!uri) return 'Internal App Storage (Hidden Files)';
    try {
      const decoded = decodeURIComponent(uri);
      // Example SAF Uri: content://com.android.externalstorage.documents/tree/primary%3ADownloads%2FRoadSOS
      if (decoded.includes(':')) {
        const parts = decoded.split(':');
        const path = parts[parts.length - 1];
        return `Shared Storage: ${path}`;
      }
      return 'Linked Public Directory';
    } catch (e) {
      return 'Linked Public Directory';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>ACTIVE DOWNLOAD DESTINATION</Text>
      <Text style={[styles.path, { color: isEnabled ? colors.success : colors.text }]}>
        📁 {getReadablePath(rootUri)}
      </Text>
      {!isEnabled && (
        <Text style={[styles.note, { color: colors.textTertiary }]}>
          Map tiles are currently stored inside app sandbox. Enable public storage to access them in File Manager.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginVertical: 6,
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.0,
    marginBottom: 4,
  },
  path: {
    fontSize: 12,
    fontWeight: '700',
  },
  note: {
    fontSize: 9.5,
    marginTop: 4,
    lineHeight: 13,
  },
});
