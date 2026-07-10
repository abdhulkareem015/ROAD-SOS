import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
} from 'react-native';

export default function StoragePermissionModal({ visible, onClose, onConfirm, colors }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.warning }]}>
          <Text style={[styles.title, { color: colors.warning }]}>📂 ENABLE PUBLIC OFFLINE STORAGE</Text>
          
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            By enabling public storage, RoadSOS will save an extra copy of downloaded maps and emergency resources in your device's public local folder.
          </Text>

          <View style={styles.featuresList}>
            <Text style={[styles.featureItem, { color: colors.text }]}>
              🔍 <Text style={{ fontWeight: '700' }}>Visible Files:</Text> View map tiles directly inside your Android File Manager.
            </Text>
            <Text style={[styles.featureItem, { color: colors.text }]}>
              💾 <Text style={{ fontWeight: '700' }}>SD Card Support:</Text> Move offline files to external SD cards to save phone space.
            </Text>
            <Text style={[styles.featureItem, { color: colors.text }]}>
              🔄 <Text style={{ fontWeight: '700' }}>Backups & Share:</Text> Export offline region ZIPs to share with other users.
            </Text>
          </View>

          <Text style={[styles.instruction, { color: colors.textTertiary }]}>
            In the next step, please select or create a folder (e.g. <Text style={{ color: colors.text, fontWeight: '700' }}>Downloads/RoadSOS</Text>) to grant permission.
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.btn, styles.cancelBtn, { backgroundColor: colors.surfaceHighlight }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={[styles.btnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.btn, styles.confirmBtn, { backgroundColor: colors.warning }]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={[styles.btnText, { color: '#ffffff' }]}>Proceed</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.0,
    marginBottom: 14,
  },
  description: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 16,
  },
  featuresList: {
    marginBottom: 16,
  },
  featureItem: {
    fontSize: 11.5,
    lineHeight: 17,
    marginVertical: 4,
  },
  instruction: {
    fontSize: 10.5,
    lineHeight: 15,
    fontStyle: 'italic',
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  btn: {
    flex: 0.48,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
});
