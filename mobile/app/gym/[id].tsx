import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';
import { GradeBadge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { api } from '../../src/services/api';

export default function GymScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'routes' | 'leaderboard'>('routes');

  const { data: gym, isLoading } = useQuery({
    queryKey: ['gym', id],
    queryFn: () => api.gyms.get(id),
  });

  const { data: routesData } = useQuery({
    queryKey: ['gym-routes', id],
    queryFn: () => api.gyms.getRoutes(id, { active: true, limit: 30 }),
    enabled: activeTab === 'routes',
  });

  const { data: leaderboard = [] } = useQuery({
    queryKey: ['gym-leaderboard', id],
    queryFn: () => api.gyms.getLeaderboard(id),
    enabled: activeTab === 'leaderboard',
  });

  const checkInMutation = useMutation({
    mutationFn: () => api.gyms.checkIn(id),
    onSuccess: () => Alert.alert('Checked In!', `Welcome to ${gym?.name}!`),
    onError: () => Alert.alert('Error', 'Failed to check in'),
  });

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }

  if (!gym) return null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{gym.name}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        {gym.imageUrl && (
          <Image source={{ uri: gym.imageUrl }} style={styles.heroImage} contentFit="cover" />
        )}

        {/* Info */}
        <View style={styles.infoSection}>
          <View style={styles.gymTitleRow}>
            <Text style={styles.gymName}>{gym.name}</Text>
            {gym.isVerified && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
          </View>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.location}>{gym.address}, {gym.city}{gym.state ? `, ${gym.state}` : ''}</Text>
          </View>
          {gym.description && <Text style={styles.description}>{gym.description}</Text>}

          {/* Quick stats */}
          <View style={styles.quickStats}>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatValue}>{gym.totalRoutes}</Text>
              <Text style={styles.quickStatLabel}>Routes</Text>
            </View>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatValue}>{gym.totalSends}</Text>
              <Text style={styles.quickStatLabel}>Total Sends</Text>
            </View>
          </View>

          {/* Links */}
          {gym.website && (
            <View style={styles.linkRow}>
              <Ionicons name="globe-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.linkText}>{gym.website}</Text>
            </View>
          )}
          {gym.phone && (
            <View style={styles.linkRow}>
              <Ionicons name="call-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.linkText}>{gym.phone}</Text>
            </View>
          )}

          <Button
            title="Check In"
            onPress={() => checkInMutation.mutate()}
            loading={checkInMutation.isPending}
            style={styles.checkInBtn}
          />
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['routes', 'leaderboard'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, activeTab === t && styles.tabActive]}
              onPress={() => setActiveTab(t)}
            >
              <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Routes */}
        {activeTab === 'routes' && (
          <View style={styles.routeList}>
            {routesData?.data.map((route) => (
              <TouchableOpacity key={route.id} style={styles.routeRow} onPress={() => router.push(`/route/${route.id}`)}>
                <View style={[styles.colorDot, { backgroundColor: route.color.toLowerCase() }]} />
                <View style={styles.routeInfo}>
                  <Text style={styles.routeName}>{route.name ?? `${route.grade} ${route.color}`}</Text>
                  <Text style={styles.routeStats}>{route.totalSends} sends · {route.flashCount} flashes</Text>
                </View>
                <GradeBadge grade={route.grade} size="sm" />
                <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Leaderboard */}
        {activeTab === 'leaderboard' && (
          <View style={styles.routeList}>
            {leaderboard.map((entry, idx) => (
              <TouchableOpacity key={entry.user.id} style={styles.lbRow} onPress={() => router.push(`/profile/${entry.user.id}`)}>
                <Text style={styles.lbRank}>#{idx + 1}</Text>
                <Text style={styles.lbName}>{entry.user.displayName}</Text>
                <Text style={styles.lbValue}>{typeof entry.value === 'number' ? entry.value : entry.value}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text, flex: 1, textAlign: 'center' },
  heroImage: { width: '100%', height: 200 },
  infoSection: { padding: Spacing.md },
  gymTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  gymName: { fontSize: FontSize.xxl, fontWeight: FontWeight.heavy, color: Colors.text, flex: 1 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.sm },
  location: { color: Colors.textSecondary, fontSize: FontSize.sm },
  description: { color: Colors.text, fontSize: FontSize.md, lineHeight: 22, marginBottom: Spacing.md },
  quickStats: { flexDirection: 'row', gap: Spacing.xl, marginBottom: Spacing.md },
  quickStat: { alignItems: 'center' },
  quickStatValue: { fontSize: FontSize.xl, fontWeight: FontWeight.heavy, color: Colors.text },
  quickStatLabel: { color: Colors.textSecondary, fontSize: FontSize.sm },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  linkText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  checkInBtn: { marginTop: Spacing.md },
  tabs: { flexDirection: 'row', backgroundColor: Colors.surface, marginHorizontal: Spacing.md, borderRadius: BorderRadius.md, padding: 4, marginBottom: Spacing.md },
  tab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: BorderRadius.sm },
  tabActive: { backgroundColor: Colors.card },
  tabText: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: FontWeight.medium },
  tabTextActive: { color: Colors.text, fontWeight: FontWeight.bold },
  routeList: { paddingHorizontal: Spacing.md },
  routeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm + 4, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.sm },
  colorDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  routeInfo: { flex: 1 },
  routeName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.medium },
  routeStats: { color: Colors.textSecondary, fontSize: FontSize.sm },
  lbRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm + 4, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.md },
  lbRank: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: FontWeight.bold, width: 32 },
  lbName: { flex: 1, color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.medium },
  lbValue: { color: Colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
});
