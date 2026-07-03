import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, GradeColors } from '../../src/constants/theme';
import { Avatar } from '../../src/components/ui/Avatar';
import { GradeBadge } from '../../src/components/ui/Badge';
import { useAuthStore } from '../../src/store/authStore';
import { api } from '../../src/services/api';
import { formatNumber } from '../../src/utils/format';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const { data: stats, isLoading: statsLoading, refetch } = useQuery({
    queryKey: ['my-stats'],
    queryFn: () => api.users.getStats(user!.id),
    enabled: !!user,
  });

  const { data: pyramid = [] } = useQuery({
    queryKey: ['grade-pyramid', user?.id],
    queryFn: () => api.users.getGradePyramid(user!.id),
    enabled: !!user,
  });

  const { data: recentClimbs } = useQuery({
    queryKey: ['my-climbs'],
    queryFn: () => api.users.getClimbs(user!.id, { limit: 5 }),
    enabled: !!user,
  });

  const { data: achievements } = useQuery({
    queryKey: ['my-achievements', user?.id],
    queryFn: () => api.users.getAchievements(user!.id),
    enabled: !!user,
  });

  if (!user) return null;

  const StatItem = ({ label, value }: { label: string; value: string | number }) => (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.headerBtn}>
            <Ionicons name="notifications-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/settings/index')} style={styles.headerBtn}>
            <Ionicons name="settings-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={statsLoading} onRefresh={refetch} tintColor={Colors.primary} />}
      >
        {/* Profile info */}
        <View style={styles.profileSection}>
          <Avatar uri={user.profileImageUrl} name={user.displayName} size={80} />
          <View style={styles.profileInfo}>
            <Text style={styles.displayName}>{user.displayName}</Text>
            <Text style={styles.username}>@{user.username}</Text>
            {user.bio && <Text style={styles.bio}>{user.bio}</Text>}
            {user.homeGym && (
              <View style={styles.homeGym}>
                <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.homeGymText}>{user.homeGym.name}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Grade info */}
        <View style={styles.gradeRow}>
          {user.hardestSend && (
            <View style={styles.gradeItem}>
              <Text style={styles.gradeItemLabel}>Hardest Send</Text>
              <GradeBadge grade={user.hardestSend} size="lg" />
            </View>
          )}
          {user.hardestFlash && (
            <View style={styles.gradeItem}>
              <Text style={styles.gradeItemLabel}>Hardest Flash</Text>
              <GradeBadge grade={user.hardestFlash} size="lg" />
            </View>
          )}
          <View style={styles.gradeItem}>
            <Text style={styles.gradeItemLabel}>Rating</Text>
            <Text style={styles.ratingValue}>{user.climberRating.toFixed(0)}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatItem label="Sends" value={formatNumber(user.totalSends)} />
          <StatItem label="Flash %" value={stats ? `${Math.round(stats.flashRate * 100)}%` : '—'} />
          <StatItem label="Sessions" value={formatNumber(user.totalSessions)} />
          <StatItem label="Streak" value={`${user.consistencyStreak}d`} />
        </View>

        {/* Follow counts */}
        <View style={styles.followRow}>
          <TouchableOpacity onPress={() => router.push(`/profile/${user.id}/followers`)} style={styles.followItem}>
            <Text style={styles.followCount}>{formatNumber(user._count?.followers ?? 0)}</Text>
            <Text style={styles.followLabel}>Followers</Text>
          </TouchableOpacity>
          <View style={styles.followDivider} />
          <TouchableOpacity onPress={() => router.push(`/profile/${user.id}/following`)} style={styles.followItem}>
            <Text style={styles.followCount}>{formatNumber(user._count?.following ?? 0)}</Text>
            <Text style={styles.followLabel}>Following</Text>
          </TouchableOpacity>
          <View style={styles.followDivider} />
          <View style={styles.followItem}>
            <Text style={styles.followCount}>{formatNumber(user._count?.achievements ?? 0)}</Text>
            <Text style={styles.followLabel}>Achievements</Text>
          </View>
        </View>

        {/* Edit Profile */}
        <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/settings/edit-profile')}>
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </TouchableOpacity>

        {/* XP Bar */}
        <View style={styles.xpSection}>
          <View style={styles.xpHeader}>
            <Text style={styles.xpLabel}>Level {user.level}</Text>
            <Text style={styles.xpPoints}>{formatNumber(user.xpPoints)} XP</Text>
          </View>
          <View style={styles.xpBar}>
            <View style={[styles.xpFill, { width: `${((user.xpPoints % 100) / 100) * 100}%` }]} />
          </View>
        </View>

        {/* Grade Pyramid Preview */}
        {pyramid.filter((p) => p.sends > 0).length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Grade Pyramid</Text>
              <TouchableOpacity onPress={() => router.push(`/profile/${user.id}/stats`)}>
                <Text style={styles.seeAll}>See full stats</Text>
              </TouchableOpacity>
            </View>
            {pyramid.filter((p) => p.sends > 0).slice(-8).reverse().map((item) => (
              <View key={item.grade} style={styles.pyramidRow}>
                <Text style={styles.pyramidGrade}>{item.grade}</Text>
                <View style={styles.pyramidBarContainer}>
                  <View style={[styles.pyramidBar, {
                    width: `${Math.min(100, (item.sends / Math.max(...pyramid.map((p) => p.sends))) * 100)}%`,
                    backgroundColor: GradeColors[item.grade] + '88',
                  }]} />
                </View>
                <Text style={styles.pyramidCount}>{item.sends}</Text>
                {item.flashes > 0 && <Text style={styles.pyramidFlash}>⚡{item.flashes}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Achievements preview */}
        {achievements && achievements.earned.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Achievements</Text>
              <TouchableOpacity onPress={() => router.push(`/profile/${user.id}/achievements`)}>
                <Text style={styles.seeAll}>View all</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achievementsRow}>
              {achievements.earned.slice(0, 6).map((a) => (
                <View key={a.id} style={styles.achievementBadge}>
                  <Text style={styles.achievementIcon}>{a.icon}</Text>
                  <Text style={styles.achievementName} numberOfLines={1}>{a.name}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Recent Climbs */}
        <View style={[styles.section, { marginBottom: 80 }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Climbs</Text>
            <TouchableOpacity onPress={() => router.push(`/profile/${user.id}/climbs`)}>
              <Text style={styles.seeAll}>View all</Text>
            </TouchableOpacity>
          </View>
          {recentClimbs?.data.map((climb) => (
            <TouchableOpacity key={climb.id} style={styles.climbRow} onPress={() => router.push(`/climb/${climb.id}`)}>
              <View style={[styles.colorDot, { backgroundColor: climb.route?.color?.toLowerCase() ?? '#888' }]} />
              <View style={styles.climbInfo}>
                <Text style={styles.climbRouteName}>{climb.route?.name ?? `${climb.route?.grade} ${climb.route?.color}`}</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.heavy, color: Colors.text },
  headerRight: { flexDirection: 'row', gap: Spacing.sm },
  headerBtn: { padding: Spacing.xs },
  profileSection: { flexDirection: 'row', padding: Spacing.md, gap: Spacing.md, alignItems: 'flex-start' },
  profileInfo: { flex: 1 },
  displayName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  username: { color: Colors.textSecondary, fontSize: FontSize.md },
  bio: { color: Colors.text, fontSize: FontSize.sm, marginTop: Spacing.xs, lineHeight: 20 },
  homeGym: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xs, gap: 4 },
  homeGymText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  gradeRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, gap: Spacing.lg },
  gradeItem: { alignItems: 'center', gap: 4 },
  gradeItemLabel: { color: Colors.textSecondary, fontSize: FontSize.xs },
  ratingValue: { fontSize: FontSize.xl, fontWeight: FontWeight.heavy, color: Colors.primary },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.border },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  statValue: { fontSize: FontSize.xl, fontWeight: FontWeight.heavy, color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  followRow: { flexDirection: 'row', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  followItem: { flex: 1, alignItems: 'center' },
  followCount: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  followLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  followDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },
  editBtn: { margin: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border, paddingVertical: Spacing.sm, alignItems: 'center' },
  editBtnText: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  xpSection: { marginHorizontal: Spacing.md, marginBottom: Spacing.md },
  xpHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  xpLabel: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  xpPoints: { color: Colors.textSecondary, fontSize: FontSize.sm },
  xpBar: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  xpFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  section: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  seeAll: { color: Colors.primary, fontSize: FontSize.sm },
  pyramidRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs, gap: Spacing.sm },
  pyramidGrade: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.bold, width: 30 },
  pyramidBarContainer: { flex: 1, height: 20, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  pyramidBar: { height: '100%', borderRadius: 4 },
  pyramidCount: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.bold, width: 24, textAlign: 'right' },
  pyramidFlash: { color: Colors.warning, fontSize: FontSize.xs, width: 36 },
  achievementsRow: { gap: Spacing.sm, paddingBottom: Spacing.sm },
  achievementBadge: { alignItems: 'center', width: 72, backgroundColor: Colors.card, borderRadius: BorderRadius.md, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  achievementIcon: { fontSize: 28 },
  achievementName: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 4, textAlign: 'center' },
  climbRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.sm },
  colorDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  climbInfo: { flex: 1 },
  climbRouteName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.medium },
  climbGym: { color: Colors.textSecondary, fontSize: FontSize.sm },
});
