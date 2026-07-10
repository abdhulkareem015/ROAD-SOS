import React, { useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function WelcomeScreen({ onLogin, onRegister, colors }) {
  const pulse = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.top}>
        <Animated.View style={[styles.logoCircle, { transform: [{ scale: pulse }] }]}>
          <Text style={styles.logoEmoji}>🚨</Text>
        </Animated.View>
        <Text style={[styles.appName, { color: colors.text }]}>RoadSOS</Text>
        <Text style={[styles.tagline, { color: colors.textSecondary }]}>
          Emergency Tracker & Safety Dashboard
        </Text>
        <Text style={[styles.sub, { color: colors.textTertiary }]}>
          Connecting accident victims with{'\n'}nearby hospitals instantly.
        </Text>
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={onRegister}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Create Account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: colors.border }]}
          onPress={onLogin}
          activeOpacity={0.85}
        >
          <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Sign In</Text>
        </TouchableOpacity>

        <Text style={[styles.note, { color: colors.textTertiary }]}>
          Hospitals can register to receive emergency alerts
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 28, paddingVertical: 60 },
  top: { alignItems: 'center', marginTop: 40 },
  logoCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#FF3B30', alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#FF3B30', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 20,
    elevation: 12,
  },
  logoEmoji: { fontSize: 44 },
  appName: { fontSize: 36, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  tagline: { fontSize: 15, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  sub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  bottom: { gap: 14 },
  primaryBtn: {
    paddingVertical: 16, borderRadius: 14, alignItems: 'center',
    shadowColor: '#FF3B30', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10,
    elevation: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    paddingVertical: 16, borderRadius: 14, alignItems: 'center',
    borderWidth: 1.5,
  },
  secondaryBtnText: { fontSize: 16, fontWeight: '600' },
  note: { textAlign: 'center', fontSize: 12, marginTop: 4 },
});
