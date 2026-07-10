import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

export default function PublicStorageBanner({ visible, message, type = 'warning', colors, onAction }) {
  if (!visible) return null;

  return (
    <View 
      style={[
        styles.container, 
        { 
          backgroundColor: type === 'warning' ? 'rgba(255, 149, 0, 0.12)' : 'rgba(255, 59, 48, 0.12)',
          borderColor: type === 'warning' ? colors.warning : colors.primary
        }
      ]}
    >
      <Text style={[styles.message, { color: type === 'warning' ? colors.warning : colors.primary }]}>
        {type === 'warning' ? '⚠️' : '🚨'} {message}
      </Text>
      {onAction && (
        <TouchableOpacity 
          style={[
            styles.actionButton, 
            { backgroundColor: type === 'warning' ? colors.warning : colors.primary }
          ]}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <Text style={styles.actionText}>Link</Text>
        </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  message: {
    fontSize: 11.5,
    fontWeight: '700',
    flex: 1,
    marginRight: 10,
    lineHeight: 16,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionText: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '800',
  },
});
