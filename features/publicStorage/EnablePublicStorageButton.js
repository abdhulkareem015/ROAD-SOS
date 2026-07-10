import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

export default function EnablePublicStorageButton({ isEnabled, onPress, colors }) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: isEnabled ? 'rgba(52, 199, 89, 0.12)' : colors.primary,
          borderColor: isEnabled ? colors.success : colors.primary,
          borderWidth: 1.5,
        }
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.text, { color: isEnabled ? colors.success : '#ffffff' }]}>
        {isEnabled ? '🟢 PUBLIC STORAGE LINKED' : '📂 ENABLE PUBLIC OFFLINE STORAGE'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
    elevation: 2,
  },
  text: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
