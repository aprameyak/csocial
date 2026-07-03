import React, { useCallback } from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing } from '../../src/constants/theme';
import { ClimbCard } from '../../src/components/ClimbCard';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { api } from '../../src/services/api';
import type { Climb } from '../../src/types/api';

export default function FeedScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isRefetching,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam = 1 }) => api.feed.getFeed({ page: pageParam, limit: 15 }),
    getNextPageParam: (last) => last.pagination.hasNext ? last.pagination.page + 1 : undefined,
    initialPageParam: 1,
  });

  const likeMutation = useMutation({
    mutationFn: ({ climbId, isLiked }: { climbId: string; isLiked: boolean }) =>
      isLiked ? api.climbs.like(climbId) : api.climbs.unlike(climbId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feed'] }),
  });

  const climbs: Climb[] = data?.pages.flatMap((p) => p.data) ?? [];

  const renderItem = useCallback(({ item }: { item: Climb }) => (
    <ClimbCard
      climb={item}
      onLike={(id, liked) => likeMutation.mutate({ climbId: id, isLiked: liked })}
    />
  ), []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>cSocial</Text>
        <TouchableOpacity onPress={() => router.push('/notifications')}>
          <Ionicons name="notifications-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={climbs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.primary}
          />
        }
        onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={Colors.primary} size="large" />
            </View>
          ) : (
            <EmptyState
              icon="people-outline"
              title="Your feed is empty"
              subtitle="Follow other climbers to see their sends here, or log your first climb!"
              actionLabel="Log a Climb"
              onAction={() => router.push('/(tabs)/log')}
            />
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footer}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  logo: { fontSize: FontSize.xl, fontWeight: FontWeight.heavy, color: Colors.primary },
  list: { padding: Spacing.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  footer: { padding: Spacing.lg, alignItems: 'center' },
});
