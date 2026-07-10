import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';

export default function RegisterScreen({ onRegister, onBack, backendUrl, colors }) {
  const [role, setRole] = useState('user'); // 'user' | 'hospital'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      Alert.alert('Validation', 'Name, email, phone, and password are required.');
      return;
    }
    if (role === 'hospital' && (!latitude.trim() || !longitude.trim())) {
      Alert.alert('Validation', 'Hospital registration requires latitude and longitude.');
      return;
    }

    setLoading(true);
    try {
      const body = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        role,
        ...(role === 'hospital' && {
          address: address.trim(),
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        }),
      };

      const res = await fetch(`${backendUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert('Registration Failed', data.message || 'Could not create account.');
        return;
      }

      onRegister(data.token, data.user);
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

        <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          Join RoadSOS to access emergency services
        </Text>

        {/* Role Selector */}
        <View style={[styles.roleRow, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.roleBtn, role === 'user' && { backgroundColor: colors.primary }]}
            onPress={() => setRole('user')}
          >
            <Text style={[styles.roleBtnText, { color: role === 'user' ? '#fff' : colors.textSecondary }]}>
              👤 User
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleBtn, role === 'hospital' && { backgroundColor: colors.primary }]}
            onPress={() => setRole('hospital')}
          >
            <Text style={[styles.roleBtnText, { color: role === 'hospital' ? '#fff' : colors.textSecondary }]}>
              🏥 Hospital
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {role === 'hospital' ? 'Hospital Name' : 'Full Name'}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceHighlight, color: colors.text, borderColor: colors.border }]}
            placeholder={role === 'hospital' ? 'City General Hospital' : 'Your full name'}
            placeholderTextColor={colors.textTertiary}
            value={name}
            onChangeText={setName}
          />

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

          <Text style={[styles.label, { color: colors.textSecondary }]}>Phone Number</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceHighlight, color: colors.text, borderColor: colors.border }]}
            placeholder="+1 555 000 0000"
            placeholderTextColor={colors.textTertiary}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceHighlight, color: colors.text, borderColor: colors.border }]}
            placeholder="Create a strong password"
            placeholderTextColor={colors.textTertiary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {/* Hospital-only fields */}
          {role === 'hospital' && (
            <>
              <Text style={[styles.sectionHeader, { color: colors.warning }]}>
                🏥 Hospital Location (required for SOS alerts)
              </Text>

              <Text style={[styles.label, { color: colors.textSecondary }]}>Address</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceHighlight, color: colors.text, borderColor: colors.border }]}
                placeholder="123 Medical Drive, City"
                placeholderTextColor={colors.textTertiary}
                value={address}
                onChangeText={setAddress}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Latitude</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceHighlight, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. 10.8279"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
                value={latitude}
                onChangeText={setLatitude}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Longitude</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceHighlight, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. 77.0611"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
                value={longitude}
                onChangeText={setLongitude}
              />

              <Text style={[styles.hint, { color: colors.textTertiary }]}>
                💡 Tip: Open Google Maps, long-press your hospital location to get coordinates.
              </Text>
            </>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitText}>
                  {role === 'hospital' ? 'Register Hospital' : 'Create Account'}
                </Text>
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
  sub: { fontSize: 14, marginBottom: 24 },
  roleRow: {
    flexDirection: 'row', borderRadius: 12, borderWidth: 1,
    overflow: 'hidden', marginBottom: 20,
  },
  roleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  roleBtnText: { fontSize: 14, fontWeight: '700' },
  form: { gap: 4 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 4, marginTop: 10 },
  input: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15,
  },
  sectionHeader: { fontSize: 13, fontWeight: '700', marginTop: 20, marginBottom: 4 },
  hint: { fontSize: 12, marginTop: 6, lineHeight: 18 },
  submitBtn: {
    paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 24,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
