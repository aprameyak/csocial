import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';
import { GradeBadge } from '../../src/components/ui/Badge';
import { ClimbCard } from '../../src/components/ClimbCard';
import { api } from '../../src/services/api';
import { formatWallAngle } from '../../src/utils/format';

export default function RouteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: route, isLoading } = useQuery({
    queryKey: ['route', id],
    queryFn: () => api.routes.get(id),
  });

  const { data: feedData } = useQuery({
    queryKey: ['route-feed', id],
    queryFn: () => api.routes.getFeed(id, { page: 1 }),
    enabled: !!route,
  });

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }

  if (!route) return null;

  const flashRate = route.totalSends > 0 ? Math.round((route.flashCount / route.totalSends) * 100) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Route</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Route Header */}
        <View style={styles.routeHeader}>
          <View style={styles.routeTop}>
            <View style={[styles.colorDot, { backgroundColor: route.color.toLowerCase() }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.routeName}>{route.name ?? `${route.grade} ${route.color} Problem`}</Text>
              {route.gym && (
                <TouchableOpacity onPress={() => router.push(`/gym/${route.gymId}`)}>
                  <Text style={styles.gymName}>{route.gym.name} · {route.gym.city}</Text>
                </TouchableOpacity>
              )}
            </View>
            <GradeBadge grade={route.grade} size="lg" />
          </View>

          <View style={styles.tags}>
            {route.wallAngle && (
              <View style={styles.tag}><Text style={styles.tagText}>{formatWallAngle(route.wallAngle)}</Text></View>
            )}
            {route.holdStyle && (
              <View style={styles.tag}><Text style={styles.tagText}>{route.holdStyle}</Text></View>
            )}
            {route.isCompetition && (
              <View style={[styles.tag, { borderColor: Colors.warning }]}>
                <Text style={[styles.tagText, { color: Colors.warning }]}>Competition</Text>
              </View>
            )}
          </View>

          {route.setterName && (
            <Text style={styles.setter}>Set by {route.setterName}</Text>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Attempts', value: route.totalAttempts },
            { label: 'Sends', value: route.totalSends },
            { label: 'Flashes', value: route.flashCount },
            { label: 'Flash %', value: `${flashRate}%` },
          ].map(({ label, value }) => (
            <View key={label} style={styles.statItem}>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Ratings */}
        {(route.avgDifficulty || route.avgFun || route.avgRating) && (
          <View style={styles.ratingsSection}>
            <Text style={styles.sectionTitle}>Community Ratings</Text>
            <View style={styles.ratingsRow}>
              {route.avgDifficulty && <View style={styles.ratingItem}><Text style={styles.ratingValue}>{route.avgDifficulty.toFixed(1)}</Text><Text style={styles.ratingLabel}>Difficulty</Text></View>}
              {route.avgFun && <View style={styles.ratingItem}><Text style={styles.ratingValue}>{route.avgFun.toFixed(1)}</Text><Text style={styles.ratingLabel}>Fun</Text></View>}
              {route.avgRating && <View style={styles.ratingItem}><Text style={styles.ratingValue}>{route.avgRating.toFixed(1)}</Text><Text style={styles.ratingLabel}>Quality</Text></View>}
            </View>
          </View>
        )}

        {/* User's best */}
        {route.userBest && (
          <View style={styles.userBestSection}>
            <Text style={styles.sectionTitle}>Your Best</Text>
            <Text style={styles.userBestResult}>
              {route.userBest.result.charAt(0) + route.userBest.result.slice(1).toLowerCase().replace(/_/g, ' ')}
              {route.userBest.attempts > 1 ? ` (${route.userBest.attempts} attempts)` : ''}
            </Text>
          </View>
        )}

        {/* Recent sends */}
        {feedData && feedData.data.length > 0 && (
          <View style={styles.feedSection}>
            <Text style={styles.sectionTitle}>Recent Sends</Text>
            {feedData.data.slice(0, 5).map((climb) => (
              <ClimbCard key={climb.id} climb={climb} showUser />
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
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  routeHeader: { padding: Spacing.md },
  routeTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  colorDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  routeName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  gymName: { color: Colors.primary, fontSize: FontSize.sm, marginTop: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.sm },
  tag: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border },
  tagText: { color: Colors.textSecondary, fontSize: FontSize.xs },
  setter: { color: Colors.textSecondary, fontSize: FontSize.sm },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.border },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  statValue: { fontSize: FontSize.xl, fontWeight: FontWeight.heavy, color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  ratingsSection: { padding: Spacing.md },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.md },
  ratingsRow: { flexDirection: 'row', gap: Spacing.xl },
  ratingItem: { alignItems: 'center' },
  ratingValue: { fontSize: FontSize.xl, fontWeight: FontWeight.heavy, color: Colors.primary },
  ratingLabel: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 },
  userBestSection: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  userBestResult: { color: Colors.success, fontSize: FontSize.lg, fontWeight: FontWeight.semibold },
  feedSection: { paddingHorizontal: Spacing.md },
});
