import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';

export default function LoginScreen({ onLogin, onBack, backendUrl, colors }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Validation', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert('Login Failed', data.message || 'Invalid credentials.');
        return;
      }

      onLogin(data.token, data.user);
    } catch (err) {
      Alert.alert('Connection Error', 'Could not reach the server. Check your backend URL in settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.textSecondary }]}>← Back</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          Sign in to your RoadSOS account
        </Text>

        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceHighlight, color: colors.text, borderColor: colors.border }]}
            placeholder="you@example.com"
            placeholderTextColor={colors.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceHighlight, color: colors.text, borderColor: colors.border }]}
            placeholder="Your password"
            placeholderTextColor={colors.textTertiary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitText}>Sign In</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40 },
  backBtn: { marginBottom: 24 },
  backText: { fontSize: 15 },
  title: { fontSize: 30, fontWeight: '800', marginBottom: 6 },
  sub: { fontSize: 14, marginBottom: 32 },
  form: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 4, marginTop: 8 },
  input: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, marginBottom: 4,
  },
  submitBtn: {
    paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 20,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
