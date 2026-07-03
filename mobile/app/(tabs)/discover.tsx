import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';
import { Avatar } from '../../src/components/ui/Avatar';
import { GradeBadge } from '../../src/components/ui/Badge';
import { api } from '../../src/services/api';

export default function DiscoverScreen() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'routes' | 'climbers' | 'gyms'>('routes');

  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['search', q, tab],
    queryFn: () => api.search.search(q, tab),
    enabled: q.length >= 2,
  });

  const { data: challenges = [] } = useQuery({
    queryKey: ['challenges'],
    queryFn: () => api.challenges.getActive(),
  });

  const hasSearch = q.length >= 2;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search routes, gyms, climbers..."
          placeholderTextColor={Colors.textTertiary}
          value={q}
          onChangeText={setQ}
        />
        {q.length > 0 && (
          <TouchableOpacity onPress={() => setQ('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {hasSearch && (
        <View style={styles.tabRow}>
          {(['routes', 'climbers', 'gyms'] as const).map((t) => (
            <TouchableOpacity key={t} style={[styles.filterTab, tab === t && styles.filterTabActive]} onPress={() => setTab(t)}>
              <Text style={[styles.filterTabText, tab === t && styles.filterTabTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {hasSearch ? (
          searching ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <>
              {tab === 'climbers' && ((searchResults?.users ?? []) as { id: string; displayName: string; username: string; profileImageUrl?: string | null; climberRating?: number; hardestSend?: string | null }[]).map((user) => (
                <TouchableOpacity key={user.id} style={styles.userRow} onPress={() => router.push(`/profile/${user.id}`)}>
                  <Avatar uri={user.profileImageUrl} name={user.displayName} size={44} />
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.displayName}</Text>
                    <Text style={styles.userHandle}>@{user.username}</Text>
                  </View>
                  {user.hardestSend && <GradeBadge grade={user.hardestSend} size="sm" />}
                </TouchableOpacity>
              ))}

              {tab === 'gyms' && ((searchResults?.gyms ?? []) as { id: string; name: string; city: string; state?: string | null; isVerified?: boolean }[]).map((gym) => (
                <TouchableOpacity key={gym.id} style={styles.gymRow} onPress={() => router.push(`/gym/${gym.id}`)}>
                  <Ionicons name="location-outline" size={24} color={Colors.primary} />
                  <View style={styles.gymInfo}>
                    <Text style={styles.gymName}>{gym.name}</Text>
                    <Text style={styles.gymLocation}>{gym.city}{gym.state ? `, ${gym.state}` : ''}</Text>
                  </View>
                  {gym.isVerified && <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />}
                </TouchableOpacity>
              ))}

              {tab === 'routes' && ((searchResults?.routes ?? []) as { id: string; grade: string; color: string; name?: string | null; gym?: { name: string } }[]).map((route) => (
                <TouchableOpacity key={route.id} style={styles.routeRow} onPress={() => router.push(`/route/${route.id}`)}>
                  <View style={[styles.colorDot, { backgroundColor: route.color.toLowerCase() }]} />
                  <View style={styles.routeInfo}>
                    <Text style={styles.routeName}>{route.name ?? `${route.grade} ${route.color}`}</Text>
                    <Text style={styles.routeGym}>{route.gym?.name}</Text>
                  </View>
                  <GradeBadge grade={route.grade} size="sm" />
                </TouchableOpacity>
              ))}
            </>
          )
        ) : (
          <>
            {/* Active Challenges */}
            {challenges.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Active Challenges</Text>
                {challenges.slice(0, 3).map((c) => (
                  <TouchableOpacity key={c.id} style={styles.challengeCard} onPress={() => router.push(`/challenges/${c.id}`)}>
                    <View style={styles.challengeLeft}>
                      <Text style={styles.challengeName}>{c.name}</Text>
                      <Text style={styles.challengeDesc}>{c.description}</Text>
                    </View>
                    <View style={styles.xpBadge}>
                      <Text style={styles.xpText}>+{c.xpReward} XP</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.emptySearch}>
              <Ionicons name="search" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptySearchText}>Search for routes, gyms, and climbers</Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.heavy, color: Colors.text },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: BorderRadius.md, margin: Spacing.md, padding: Spacing.sm, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.md },
  tabRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.sm },
  filterTab: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border },
  filterTabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterTabText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  filterTabTextActive: { color: Colors.text, fontWeight: FontWeight.semibold },
  content: { paddingHorizontal: Spacing.md, paddingBottom: 80 },
  userRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.sm },
  userInfo: { flex: 1 },
  userName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  userHandle: { color: Colors.textSecondary, fontSize: FontSize.sm },
  gymRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.md },
  gymInfo: { flex: 1 },
  gymName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  gymLocation: { color: Colors.textSecondary, fontSize: FontSize.sm },
  routeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.sm },
  colorDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  routeInfo: { flex: 1 },
  routeName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  routeGym: { color: Colors.textSecondary, fontSize: FontSize.sm },
  section: { marginBottom: Spacing.xl },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.md },
  challengeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  challengeLeft: { flex: 1 },
  challengeName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  challengeDesc: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 2 },
  xpBadge: { backgroundColor: Colors.primary + '22', borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderWidth: 1, borderColor: Colors.primary + '44' },
  xpText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  emptySearch: { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
  emptySearchText: { color: Colors.textSecondary, fontSize: FontSize.md, textAlign: 'center' },
});
