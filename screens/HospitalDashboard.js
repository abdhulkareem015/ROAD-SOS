import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, Linking, Alert,
} from 'react-native';

const POLL_INTERVAL_MS = 10000; // 10 seconds

export default function HospitalDashboard({ user, token, backendUrl, onLogout, colors }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dispatchingId, setDispatchingId] = useState(null);
  const pollRef = useRef(null);

  const fetchAlerts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/hospital/alerts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch (err) {
      console.log('[Hospital] Failed to fetch alerts:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [backendUrl, token]);

  useEffect(() => {
    fetchAlerts();
    // Poll every 10 seconds for new alerts
    pollRef.current = setInterval(() => fetchAlerts(true), POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [fetchAlerts]);

  const handleDispatch = async (alertId) => {
    Alert.alert(
      'Dispatch Ambulance',
      'Confirm ambulance dispatch to this emergency location?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dispatch',
          style: 'destructive',
          onPress: async () => {
            setDispatchingId(alertId);
            try {
              const res = await fetch(`${backendUrl}/api/hospital/alerts/${alertId}/dispatch`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                setAlerts((prev) =>
                  prev.map((a) =>
                    a.id === alertId
                      ? { ...a, status: 'dispatched', dispatchedAt: new Date().toISOString() }
                      : a
                  )
                );
              } else {
                Alert.alert('Error', 'Failed to update dispatch status.');
              }
            } catch (err) {
              Alert.alert('Error', 'Network error. Please try again.');
            } finally {
              setDispatchingId(null);
            }
          },
        },
      ]
    );
  };

  const openMaps = (lat, lon) => {
    Linking.openURL(`https://maps.google.com/?q=${lat},${lon}`).catch(() => {});
  };

  const pendingAlerts = alerts.filter((a) => a.status === 'pending');
  const dispatchedAlerts = alerts.filter((a) => a.status === 'dispatched');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>🏥 Hospital Dashboard</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>{user.name}</Text>
        </View>
        <TouchableOpacity onPress={onLogout} style={[styles.logoutBtn, { borderColor: colors.border }]}>
          <Text style={[styles.logoutText, { color: colors.textSecondary }]}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Bar */}
      <View style={[styles.statsBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{pendingAlerts.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.success }]}>{dispatchedAlerts.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Dispatched</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.info }]}>{alerts.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading alerts...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchAlerts(); }}
              tintColor={colors.primary}
            />
          }
        >
          {alerts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 48 }}>📡</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No SOS Alerts Yet</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                When a user triggers SOS near your hospital,{'\n'}the alert will appear here instantly.
              </Text>
              <Text style={[styles.pollNote, { color: colors.textTertiary }]}>
                Auto-refreshing every 10 seconds
              </Text>
            </View>
          ) : (
            <>
              {/* Pending alerts first */}
              {pendingAlerts.length > 0 && (
                <>
                  <Text style={[styles.sectionHeader, { color: colors.primary }]}>
                    🚨 PENDING ALERTS ({pendingAlerts.length})
                  </Text>
                  {pendingAlerts.map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      colors={colors}
                      onDispatch={handleDispatch}
                      onOpenMaps={openMaps}
                      isDispatching={dispatchingId === alert.id}
                    />
                  ))}
                </>
              )}

              {/* Dispatched alerts */}
              {dispatchedAlerts.length > 0 && (
                <>
                  <Text style={[styles.sectionHeader, { color: colors.success }]}>
                    ✅ DISPATCHED ({dispatchedAlerts.length})
                  </Text>
                  {dispatchedAlerts.map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      colors={colors}
                      onDispatch={handleDispatch}
                      onOpenMaps={openMaps}
                      isDispatching={false}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function AlertCard({ alert, colors, onDispatch, onOpenMaps, isDispatching }) {
  const isDispatched = alert.status === 'dispatched';
  const timeAgo = getTimeAgo(alert.timestamp);

  return (
    <View style={[
      styles.card,
      {
        backgroundColor: isDispatched ? colors.surfaceHighlight : colors.surface,
        borderColor: isDispatched ? colors.border : colors.primary,
        borderLeftColor: isDispatched ? colors.success : colors.primary,
        opacity: isDispatched ? 0.75 : 1,
      }
    ]}>
      {/* Status badge */}
      <View style={styles.cardHeader}>
        <View style={[
          styles.badge,
          { backgroundColor: isDispatched ? colors.success + '22' : colors.primary + '22' }
        ]}>
          <Text style={[styles.badgeText, { color: isDispatched ? colors.success : colors.primary }]}>
            {isDispatched ? '✅ DISPATCHED' : '🚨 EMERGENCY'}
          </Text>
        </View>
        <Text style={[styles.timeAgo, { color: colors.textTertiary }]}>{timeAgo}</Text>
      </View>

      {/* Patient info */}
      <Text style={[styles.patientName, { color: colors.text }]}>
        👤 {alert.userName || 'Anonymous'}
      </Text>

      {/* Location */}
      <Text style={[styles.address, { color: colors.textSecondary }]} numberOfLines={2}>
        📍 {alert.address || `${alert.latitude?.toFixed(5)}, ${alert.longitude?.toFixed(5)}`}
      </Text>

      <Text style={[styles.distance, { color: colors.warning }]}>
        📏 {alert.distanceKm} km from your hospital
      </Text>

      {alert.dispatchedAt && (
        <Text style={[styles.dispatchTime, { color: colors.success }]}>
          🚑 Dispatched at {new Date(alert.dispatchedAt).toLocaleTimeString()}
        </Text>
      )}

      {/* Action buttons */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.mapsBtn, { borderColor: colors.info }]}
          onPress={() => onOpenMaps(alert.latitude, alert.longitude)}
        >
          <Text style={[styles.mapsBtnText, { color: colors.info }]}>🗺️ Open Maps</Text>
        </TouchableOpacity>

        {!isDispatched && (
          <TouchableOpacity
            style={[styles.dispatchBtn, { backgroundColor: colors.primary, opacity: isDispatching ? 0.6 : 1 }]}
            onPress={() => onDispatch(alert.id)}
            disabled={isDispatching}
          >
            {isDispatching
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.dispatchBtnText}>🚑 Dispatch Ambulance</Text>
            }
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function getTimeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerSub: { fontSize: 12, marginTop: 2 },
  logoutBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  logoutText: { fontSize: 13 },
  statsBar: {
    flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, marginVertical: 4 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  loadingText: { marginTop: 12, fontSize: 14 },
  list: { padding: 16, paddingBottom: 40 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  pollNote: { fontSize: 12, marginTop: 8 },
  sectionHeader: { fontSize: 13, fontWeight: '800', marginBottom: 10, marginTop: 4, letterSpacing: 0.5 },
  card: {
    borderRadius: 14, padding: 16, marginBottom: 14,
    borderWidth: 1, borderLeftWidth: 4,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  timeAgo: { fontSize: 12 },
  patientName: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  address: { fontSize: 13, marginBottom: 4, lineHeight: 18 },
  distance: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  dispatchTime: { fontSize: 12, marginBottom: 4 },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  mapsBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5,
    alignItems: 'center',
  },
  mapsBtnText: { fontSize: 13, fontWeight: '600' },
  dispatchBtn: {
    flex: 2, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
  },
  dispatchBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
