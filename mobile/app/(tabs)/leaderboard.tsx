import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';
import { Avatar } from '../../src/components/ui/Avatar';
import { api } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import type { LeaderboardEntry } from '../../src/types/api';

type Tab = 'friends' | 'global';
type Metric = 'sends_week' | 'hardest_send' | 'flash_rate' | 'streak' | 'climber_rating';
type Period = 'week' | 'month' | 'all_time';

const METRICS: { key: Metric; label: string }[] = [
  { key: 'sends_week', label: 'Sends' },
  { key: 'hardest_send', label: 'Hardest' },
  { key: 'flash_rate', label: 'Flash %' },
  { key: 'streak', label: 'Streak' },
  { key: 'climber_rating', label: 'Rating' },
];

const PERIODS: { key: Period; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'all_time', label: 'All Time' },
];

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Text style={{ fontSize: 24 }}>🥇</Text>;
  if (rank === 2) return <Text style={{ fontSize: 24 }}>🥈</Text>;
  if (rank === 3) return <Text style={{ fontSize: 24 }}>🥉</Text>;
  return <Text style={styles.rankNum}>#{rank}</Text>;
}

function LeaderboardRow({ entry, isMe }: { entry: LeaderboardEntry; isMe?: boolean }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={[styles.row, isMe && styles.rowHighlight]}
      onPress={() => router.push(`/profile/${entry.user.id}`)}
    >
      <View style={styles.rankCol}>
        <RankBadge rank={entry.rank} />
      </View>
      <Avatar uri={entry.user.profileImageUrl} name={entry.user.displayName} size={40} />
      <View style={styles.rowContent}>
        <Text style={[styles.rowName, isMe && styles.rowNameMe]}>{entry.user.displayName}</Text>
        <Text style={styles.rowUsername}>@{entry.user.username}</Text>
      </View>
      <Text style={styles.rowValue}>
        {typeof entry.value === 'number' ? entry.value.toFixed(entry.metric === 'flash_rate_%' ? 1 : 0) : entry.value}
        {entry.metric === 'flash_rate_%' && '%'}
        {entry.metric === 'streak_days' && ' days'}
      </Text>
    </TouchableOpacity>
  );
}

export default function LeaderboardScreen() {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>('friends');
  const [metric, setMetric] = useState<Metric>('sends_week');
  const [period, setPeriod] = useState<Period>('week');

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['leaderboard', tab, metric, period],
    queryFn: () =>
      tab === 'friends'
        ? api.leaderboards.getFriends(metric, period)
        : api.leaderboards.getGlobal(metric, period),
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Leaderboards</Text>
      </View>

      {/* Tab */}
      <View style={styles.tabs}>
        {(['friends', 'global'] as Tab[]).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'friends' ? '👥 Friends' : '🌍 Global'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Metric selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metricScroll} contentContainerStyle={styles.metricScrollContent}>
        {METRICS.map((m) => (
          <TouchableOpacity
            key={m.key}
            style={[styles.metricBtn, metric === m.key && styles.metricBtnActive]}
            onPress={() => setMetric(m.key)}
          >
            <Text style={[styles.metricBtnText, metric === m.key && styles.metricBtnTextActive]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Period */}
      <View style={styles.periodRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity key={p.key} style={[styles.periodBtn, period === p.key && styles.periodBtnActive]} onPress={() => setPeriod(p.key)}>
            <Text style={[styles.periodBtnText, period === p.key && styles.periodBtnTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator color={Colors.primary} size="large" /></View>
      ) : entries.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="trophy-outline" size={64} color={Colors.textTertiary} />
          <Text style={styles.emptyText}>{tab === 'friends' ? 'Follow friends to compete with them!' : 'No data yet'}</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.user.id}
          renderItem={({ item }) => <LeaderboardRow entry={item} isMe={item.user.id === user?.id} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.heavy, color: Colors.text },
  tabs: { flexDirection: 'row', margin: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: 4 },
  tab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: BorderRadius.sm },
  tabActive: { backgroundColor: Colors.card },
  tabText: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: FontWeight.medium },
  tabTextActive: { color: Colors.text, fontWeight: FontWeight.bold },
  metricScroll: { maxHeight: 48 },
  metricScrollContent: { paddingHorizontal: Spacing.md, gap: 8, alignItems: 'center' },
  metricBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border },
  metricBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  metricBtnText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  metricBtnTextActive: { color: Colors.text },
  periodRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm },
  periodBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border },
  periodBtnActive: { borderColor: Colors.primary },
  periodBtnText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  periodBtnTextActive: { color: Colors.primary, fontWeight: FontWeight.semibold },
  list: { paddingHorizontal: Spacing.md, paddingBottom: 80 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm + 4, gap: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowHighlight: { backgroundColor: Colors.primary + '11', marginHorizontal: -Spacing.md, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.md },
  rankCol: { width: 36, alignItems: 'center' },
  rankNum: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  rowContent: { flex: 1 },
  rowName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  rowNameMe: { color: Colors.primary },
  rowUsername: { color: Colors.textSecondary, fontSize: FontSize.sm },
  rowValue: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.md, textAlign: 'center', paddingHorizontal: Spacing.xl },
});
