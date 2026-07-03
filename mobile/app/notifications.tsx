import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../src/constants/theme';
import { api } from '../src/services/api';
import { timeAgo } from '../src/utils/format';
import type { Notification } from '../src/types/api';

const ICONS: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  LIKE: { name: 'heart', color: Colors.error },
  COMMENT: { name: 'chatbubble', color: Colors.info },
  FOLLOW: { name: 'person-add', color: Colors.primary },
  ACHIEVEMENT: { name: 'trophy', color: Colors.warning },
  FRIEND_CLIMB: { name: 'barbell', color: Colors.success },
  CONGRATULATION: { name: 'ribbon', color: Colors.warning },
};

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.notifications.getAll(),
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const renderItem = ({ item }: { item: Notification }) => {
    const icon = ICONS[item.type] ?? { name: 'notifications' as const, color: Colors.primary };
    return (
      <TouchableOpacity
        style={[styles.row, !item.isRead && styles.rowUnread]}
        onPress={() => {
          if (!item.isRead) markReadMutation.mutate(item.id);
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: icon.color + '22' }]}>
          <Ionicons name={icon.name} size={20} color={icon.color} />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
        </View>
        {!item.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={() => markAllMutation.mutate()} disabled={markAllMutation.isPending}>
          <Text style={styles.markAll}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator color={Colors.primary} size="large" /></View>
      ) : (
        <FlatList
          data={data?.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onRefresh={refetch}
          refreshing={false}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="notifications-outline" size={64} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  markAll: { color: Colors.primary, fontSize: FontSize.sm },
  row: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.md },
  rowUnread: { backgroundColor: Colors.primary + '08' },
  iconContainer: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  title: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  body: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 2 },
  time: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, paddingTop: 60 },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.md },
});
