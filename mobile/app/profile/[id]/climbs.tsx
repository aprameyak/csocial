import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Colors, FontSize, FontWeight, Spacing } from '../../../src/constants/theme';
import { ClimbCard } from '../../../src/components/ClimbCard';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { api } from '../../../src/services/api';
import type { Climb } from '../../../src/types/api';

export default function UserClimbsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch, isRefetching } = useInfiniteQuery({
    queryKey: ['user-climbs-all', id],
    queryFn: ({ pageParam = 1 }) => api.users.getClimbs(id, { page: pageParam, limit: 20 }),
    getNextPageParam: (last) => last.pagination.hasNext ? last.pagination.page + 1 : undefined,
    initialPageParam: 1,
  });

  const climbs: Climb[] = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Climb History</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={climbs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ClimbCard climb={item} showUser={false} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
        onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={isLoading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} /> : <EmptyState icon="barbell-outline" title="No climbs yet" />}
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={Colors.primary} style={{ padding: 20 }} /> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  list: { padding: Spacing.md },
});
