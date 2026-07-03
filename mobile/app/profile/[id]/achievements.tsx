import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../../src/constants/theme';
import { api } from '../../../src/services/api';
import type { Achievement } from '../../../src/types/api';

export default function AchievementsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['achievements', id],
    queryFn: () => api.achievements.getUserAchievements(id),
  });

  const renderItem = ({ item, isLocked }: { item: Achievement; isLocked?: boolean }) => (
    <View style={[styles.item, isLocked && styles.itemLocked]}>
      <Text style={[styles.icon, isLocked && { opacity: 0.3 }]}>{item.icon}</Text>
      <View style={styles.info}>
        <Text style={[styles.name, isLocked && styles.nameLocked]}>{item.name}</Text>
        <Text style={styles.desc}>{item.description}</Text>
        {!isLocked && item.unlockedAt && (
          <Text style={styles.date}>Unlocked {new Date(item.unlockedAt).toLocaleDateString()}</Text>
        )}
      </View>
      <View style={[styles.xpBadge, isLocked && { opacity: 0.4 }]}>
        <Text style={styles.xpText}>+{item.xpReward}</Text>
      </View>
    </View>
  );

  const allItems = [
    ...(data?.earned ?? []).map((a) => ({ ...a, locked: false })),
    ...(data?.locked ?? []).map((a) => ({ ...a, locked: true })),
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Achievements</Text>
        <Text style={styles.count}>{data?.earnedCount ?? 0}/{data?.total ?? 0}</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator color={Colors.primary} /></View>
      ) : (
        <FlatList
          data={allItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderItem({ item, isLocked: item.locked })}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  count: { color: Colors.textSecondary, fontSize: FontSize.md },
  list: { padding: Spacing.md },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border, gap: Spacing.md },
  itemLocked: { opacity: 0.6 },
  icon: { fontSize: 36 },
  info: { flex: 1 },
  name: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  nameLocked: { color: Colors.textSecondary },
  desc: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 2 },
  date: { color: Colors.success, fontSize: FontSize.xs, marginTop: 4 },
  xpBadge: { backgroundColor: Colors.primary + '22', borderRadius: BorderRadius.sm, padding: Spacing.xs },
  xpText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
});
