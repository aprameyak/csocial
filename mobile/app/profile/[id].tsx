import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, GradeColors } from '../../src/constants/theme';
import { Avatar } from '../../src/components/ui/Avatar';
import { GradeBadge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { api } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { formatNumber } from '../../src/utils/format';

export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const { data: user, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['profile', id],
    queryFn: () => api.users.getProfile(id),
  });

  const { data: stats } = useQuery({
    queryKey: ['user-stats', id],
    queryFn: () => api.users.getStats(id),
    enabled: !!user,
  });

  const { data: pyramid = [] } = useQuery({
    queryKey: ['grade-pyramid', id],
    queryFn: () => api.users.getGradePyramid(id),
    enabled: !!user,
  });

  const { data: recentClimbs } = useQuery({
    queryKey: ['user-climbs', id],
    queryFn: () => api.users.getClimbs(id, { limit: 5 }),
    enabled: !!user,
  });

  const followMutation = useMutation({
    mutationFn: () => user?.isFollowing ? api.users.unfollow(id) : api.users.follow(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', id] }),
    onError: () => Alert.alert('Error', 'Action failed'),
  });

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }

  if (!user) return null;

  const isOwn = user.isOwnProfile || id === currentUser?.id;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>@{user.username}</Text>
        {isOwn ? (
          <TouchableOpacity onPress={() => router.push('/settings/index')}>
            <Ionicons name="settings-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
        ) : <View style={{ width: 24 }} />}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}>
        {/* Profile */}
        <View style={styles.profileSection}>
          <Avatar uri={user.profileImageUrl} name={user.displayName} size={80} />
          <View style={styles.profileInfo}>
            <Text style={styles.displayName}>{user.displayName}</Text>
            <Text style={styles.username}>@{user.username}</Text>
            {user.bio && <Text style={styles.bio}>{user.bio}</Text>}
          </View>
        </View>

        {/* Grades */}
        <View style={styles.gradeRow}>
          {user.hardestSend && <View style={styles.gradeItem}><Text style={styles.gradeLabel}>Hardest</Text><GradeBadge grade={user.hardestSend} size="lg" /></View>}
          {user.hardestFlash && <View style={styles.gradeItem}><Text style={styles.gradeLabel}>Flash</Text><GradeBadge grade={user.hardestFlash} size="lg" /></View>}
          <View style={styles.gradeItem}><Text style={styles.gradeLabel}>Rating</Text><Text style={styles.ratingValue}>{user.climberRating.toFixed(0)}</Text></View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Sends', value: formatNumber(user.totalSends) },
            { label: 'Flash %', value: stats ? `${Math.round(stats.flashRate * 100)}%` : '—' },
            { label: 'Sessions', value: formatNumber(user.totalSessions) },
            { label: 'Streak', value: `${user.consistencyStreak}d` },
          ].map(({ label, value }) => (
            <View key={label} style={styles.statItem}>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Follow counts */}
        <View style={styles.followRow}>
          <TouchableOpacity style={styles.followItem} onPress={() => router.push(`/profile/${id}/followers`)}>
            <Text style={styles.followCount}>{formatNumber(user._count?.followers ?? 0)}</Text>
            <Text style={styles.followLabel}>Followers</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.followItem} onPress={() => router.push(`/profile/${id}/following`)}>
            <Text style={styles.followCount}>{formatNumber(user._count?.following ?? 0)}</Text>
            <Text style={styles.followLabel}>Following</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.followItem} onPress={() => router.push(`/profile/${id}/achievements`)}>
            <Text style={styles.followCount}>{formatNumber(user._count?.achievements ?? 0)}</Text>
            <Text style={styles.followLabel}>Achievements</Text>
          </TouchableOpacity>
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          {!isOwn && (
            <Button
              title={user.isFollowing ? 'Following' : 'Follow'}
              onPress={() => followMutation.mutate()}
              loading={followMutation.isPending}
              variant={user.isFollowing ? 'outline' : 'primary'}
              style={{ flex: 1 }}
            />
          )}
          {isOwn && (
            <Button title="Edit Profile" onPress={() => router.push('/settings/edit-profile')} variant="outline" style={{ flex: 1 }} />
          )}
          {!isOwn && (
            <Button title="Compare" onPress={() => router.push(`/profile/${id}/compare/${currentUser?.id}`)} variant="secondary" style={{ flex: 1 }} />
          )}
        </View>

        {/* Grade Pyramid */}
        {pyramid.filter((p) => p.sends > 0).length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Grade Pyramid</Text>
              <TouchableOpacity onPress={() => router.push(`/profile/${id}/stats`)}>
                <Text style={styles.seeAll}>Full stats</Text>
              </TouchableOpacity>
            </View>
            {pyramid.filter((p) => p.sends > 0).slice(-8).reverse().map((item) => (
              <View key={item.grade} style={styles.pyramidRow}>
                <Text style={styles.pyramidGrade}>{item.grade}</Text>
                <View style={styles.pyramidBarBg}>
                  <View style={[styles.pyramidBar, {
                    width: `${Math.min(100, (item.sends / Math.max(...pyramid.map((p) => p.sends || 1))) * 100)}%`,
                    backgroundColor: (GradeColors[item.grade] ?? '#555') + '99',
                  }]} />
                </View>
                <Text style={styles.pyramidCount}>{item.sends}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recent climbs */}
        <View style={[styles.section, { marginBottom: 80 }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Climbs</Text>
            <TouchableOpacity onPress={() => router.push(`/profile/${id}/climbs`)}>
              <Text style={styles.seeAll}>View all</Text>
            </TouchableOpacity>
          </View>
          {recentClimbs?.data.map((climb) => (
            <TouchableOpacity key={climb.id} style={styles.climbRow} onPress={() => router.push(`/climb/${climb.id}`)}>
              <View style={[styles.colorDot, { backgroundColor: climb.route?.color?.toLowerCase() ?? '#888' }]} />
              <View style={styles.climbInfo}>
                <Text style={styles.climbName}>{climb.route?.name ?? `${climb.route?.grade} ${climb.route?.color}`}</Text>
                <Text style={styles.climbGym}>{climb.route?.gym?.name}</Text>
              </View>
              {climb.route?.grade && <GradeBadge grade={climb.route.grade} size="sm" />}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  profileSection: { flexDirection: 'row', padding: Spacing.md, gap: Spacing.md },
  profileInfo: { flex: 1 },
  displayName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  username: { color: Colors.textSecondary, fontSize: FontSize.md },
  bio: { color: Colors.text, fontSize: FontSize.sm, marginTop: Spacing.xs, lineHeight: 20 },
  gradeRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, gap: Spacing.lg },
  gradeItem: { alignItems: 'center', gap: 4 },
  gradeLabel: { color: Colors.textSecondary, fontSize: FontSize.xs },
  ratingValue: { fontSize: FontSize.xl, fontWeight: FontWeight.heavy, color: Colors.primary },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.border },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  statValue: { fontSize: FontSize.xl, fontWeight: FontWeight.heavy, color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  followRow: { flexDirection: 'row', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  followItem: { flex: 1, alignItems: 'center' },
  followCount: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  followLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  divider: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },
  actionRow: { flexDirection: 'row', padding: Spacing.md, gap: Spacing.sm },
  section: { padding: Spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  seeAll: { color: Colors.primary, fontSize: FontSize.sm },
  pyramidRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs, gap: Spacing.sm },
  pyramidGrade: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.bold, width: 30 },
  pyramidBarBg: { flex: 1, height: 20, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  pyramidBar: { height: '100%', borderRadius: 4 },
  pyramidCount: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.bold, width: 24, textAlign: 'right' },
  climbRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.sm },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  climbInfo: { flex: 1 },
  climbName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.medium },
  climbGym: { color: Colors.textSecondary, fontSize: FontSize.sm },
});
