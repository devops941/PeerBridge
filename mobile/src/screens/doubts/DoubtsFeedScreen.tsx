import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  StatusBar,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DoubtItem } from '../../types';
import { api } from '../../services/api';
import { DoubtCard } from './DoubtCard';
import { CreateDoubtModal } from './CreateDoubtModal';
import { DoubtDetailModal } from './DoubtDetailModal';
import { VolunteerModal } from './VolunteerModal';
import { getSocket } from '../../services/socket';

interface Props {
  user?: any;
  token?: string | null;
  onOpenProfile?: () => void;
  onVolunteerPress?: (doubt: DoubtItem) => void;
  onOpenChat?: (partner: any, doubtContext?: any) => void;
}

export const DoubtsFeedScreen: React.FC<Props> = ({
  user,
  token,
  onOpenProfile,
  onVolunteerPress,
  onOpenChat
}) => {
  const [doubts, setDoubts] = useState<DoubtItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Scope: 'mine' is default per user request ("naan ketta doubts mattum thaan intha page la irukkanum")
  const [feedScope, setFeedScope] = useState<'mine' | 'all'>('mine');

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedSort, setSelectedSort] = useState<string>('newest');

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [myDoubtsCount, setMyDoubtsCount] = useState<number>(0);
  const LIMIT = 10;

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDoubt, setSelectedDoubt] = useState<DoubtItem | null>(null);
  const [volunteerDoubt, setVolunteerDoubt] = useState<DoubtItem | null>(null);

  useEffect(() => {
    fetchDoubts(false, 1);
  }, [feedScope, selectedStatus, selectedSort, user?.id]);

  // Real-time Socket.IO synchronization for DoubtsFeedScreen
  useEffect(() => {
    const socket = getSocket();
    const currentUserId = user?.id || user?._id;

    const handleRealtimeNewDoubt = (newDoubt: DoubtItem) => {
      const isMine =
        currentUserId &&
        (String(newDoubt.author?._id) === String(currentUserId) ||
          String(newDoubt.author) === String(currentUserId));

      if (feedScope === 'mine' && !isMine) return;

      setDoubts((prev) => {
        if (prev.some((d) => d._id === newDoubt._id)) return prev;
        return [newDoubt, ...prev];
      });
      setTotalItems((prev) => prev + 1);
      if (isMine) {
        setMyDoubtsCount((prev) => prev + 1);
      }
    };

    const handleRealtimeUpvote = (data: { doubtId: string; upvoteCount: number }) => {
      setDoubts((prev) =>
        prev.map((d) => (d._id === data.doubtId ? { ...d, upvoteCount: data.upvoteCount } : d))
      );
    };

    const handleRealtimeComment = (data: { doubtId: string; answerCount: number }) => {
      setDoubts((prev) =>
        prev.map((d) => (d._id === data.doubtId ? { ...d, answerCount: data.answerCount } : d))
      );
    };

    const handleRealtimeResolved = (data: { doubtId: string }) => {
      setDoubts((prev) =>
        prev.map((d) => (d._id === data.doubtId ? { ...d, status: 'RESOLVED' } : d))
      );
    };

    const handleRealtimeDeleted = (data: { doubtId: string }) => {
      setDoubts((prev) => prev.filter((d) => d._id !== data.doubtId));
    };

    const handleRealtimeVolunteer = (data: { doubtId: string; volunteerCount: number }) => {
      setDoubts((prev) =>
        prev.map((d) => (d._id === data.doubtId ? { ...d, volunteerCount: data.volunteerCount } : d))
      );
    };

    socket.on('doubt:new', handleRealtimeNewDoubt);
    socket.on('doubt:upvoted', handleRealtimeUpvote);
    socket.on('doubt:comment_added', handleRealtimeComment);
    socket.on('doubt:resolved', handleRealtimeResolved);
    socket.on('doubt:deleted', handleRealtimeDeleted);
    socket.on('doubt:volunteer_updated', handleRealtimeVolunteer);

    return () => {
      socket.off('doubt:new', handleRealtimeNewDoubt);
      socket.off('doubt:upvoted', handleRealtimeUpvote);
      socket.off('doubt:comment_added', handleRealtimeComment);
      socket.off('doubt:resolved', handleRealtimeResolved);
      socket.off('doubt:deleted', handleRealtimeDeleted);
      socket.off('doubt:volunteer_updated', handleRealtimeVolunteer);
    };
  }, [feedScope, user?.id]);

  const fetchDoubts = async (isRefresh = false, targetPage = page) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const params: any = {
        page: targetPage,
        limit: LIMIT
      };

      if (feedScope === 'mine') {
        if (user?.id) {
          params.authorId = user.id;
        } else {
          setDoubts([]);
          setTotalPages(1);
          setTotalItems(0);
          setLoading(false);
          setRefreshing(false);
          return;
        }
      }

      if (selectedStatus !== 'All') params.status = selectedStatus;
      if (search.trim()) params.search = search.trim();
      if (selectedSort !== 'newest') params.sort = selectedSort;

      const res = await api.getDoubts(params);
      if (res && res.success && Array.isArray(res.data)) {
        setDoubts(res.data);
        if (res.meta) {
          setTotalPages(res.meta.totalPages || 1);
          setTotalItems(res.meta.total || 0);
          if (feedScope === 'mine') {
            setMyDoubtsCount(res.meta.total || 0);
          }
        }
        setPage(targetPage);
      } else {
        setDoubts([]);
        setTotalPages(1);
        setTotalItems(0);
      }
    } catch (err) {
      console.warn('Failed to load doubts feed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearchSubmit = () => {
    setPage(1);
    fetchDoubts(false, 1);
  };

  const handleClearSearch = () => {
    setSearch('');
    setTimeout(() => {
      setPage(1);
      fetchDoubts(false, 1);
    }, 50);
  };

  const handleDoubtCreated = (newDoubt: DoubtItem) => {
    setDoubts((prev) => [newDoubt, ...prev]);
    setTotalItems((prev) => prev + 1);
    setMyDoubtsCount((prev) => prev + 1);
  };

  const handleDoubtUpdated = (updatedDoubt: DoubtItem) => {
    setDoubts((prev) =>
      prev.map((d) => (d._id === updatedDoubt._id ? { ...d, ...updatedDoubt } : d))
    );
    setSelectedDoubt(updatedDoubt);
  };

  const statusFilters = [
    { label: 'All Doubts', value: 'All' },
    { label: 'Open for Help', value: 'OPEN' },
    { label: 'Unanswered', value: 'UNANSWERED' },
    { label: 'Resolved', value: 'RESOLVED' }
  ];

  const renderPaginationFooter = () => {
    if (totalItems === 0) return null;
    return (
      <View style={styles.paginationCard}>
        <View style={styles.paginationSummary}>
          <Text style={styles.paginationSummaryText}>
            Page <Text style={styles.boldText}>{page}</Text> of{' '}
            <Text style={styles.boldText}>{totalPages}</Text> •{' '}
            <Text style={styles.boldText}>{totalItems}</Text> total doubts
          </Text>
        </View>

        {totalPages > 1 && (
          <View style={styles.paginationBtnsRow}>
            <TouchableOpacity
              style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
              onPress={() => {
                if (page > 1) {
                  const newPage = page - 1;
                  fetchDoubts(false, newPage);
                }
              }}
              disabled={page <= 1 || loading}
              activeOpacity={0.8}
            >
              <Ionicons
                name="chevron-back"
                size={16}
                color={page <= 1 ? '#94A3B8' : '#0F172A'}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.pageBtnText, page <= 1 && styles.pageBtnTextDisabled]}>
                Previous
              </Text>
            </TouchableOpacity>

            <View style={styles.pageIndicatorPill}>
              <Text style={styles.pageIndicatorText}>
                {page} / {totalPages}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
              onPress={() => {
                if (page < totalPages) {
                  const newPage = page + 1;
                  fetchDoubts(false, newPage);
                }
              }}
              disabled={page >= totalPages || loading}
              activeOpacity={0.8}
            >
              <Text style={[styles.pageBtnText, page >= totalPages && styles.pageBtnTextDisabled]}>
                Next
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={page >= totalPages ? '#94A3B8' : '#0F172A'}
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.brandRow}>
          <View style={styles.brandIconBox}>
            <Ionicons name="school" size={22} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.brandTitle}>PeerBridge</Text>
            <Text style={styles.brandTagline}>Academic Doubt Feed</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.askDoubtTopBtn}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.askDoubtTopBtnText}>Ask Doubt</Text>
        </TouchableOpacity>
      </View>

      {/* Scope Segment: My Doubts vs Community Doubts */}
      <View style={styles.scopeContainer}>
        <TouchableOpacity
          style={[styles.scopeTab, feedScope === 'mine' && styles.scopeTabActive]}
          onPress={() => {
            if (feedScope !== 'mine') {
              setFeedScope('mine');
              setPage(1);
            }
          }}
          activeOpacity={0.85}
        >
          <Ionicons
            name="person"
            size={14}
            color={feedScope === 'mine' ? '#FFFFFF' : '#64748B'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.scopeTabText, feedScope === 'mine' && styles.scopeTabTextActive]}>
            My Doubts
          </Text>
          {myDoubtsCount > 0 && (
            <View style={[styles.countBadge, feedScope === 'mine' && styles.countBadgeActive]}>
              <Text style={[styles.countBadgeText, feedScope === 'mine' && styles.countBadgeTextActive]}>
                {myDoubtsCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.scopeTab, feedScope === 'all' && styles.scopeTabActive]}
          onPress={() => {
            if (feedScope !== 'all') {
              setFeedScope('all');
              setPage(1);
            }
          }}
          activeOpacity={0.85}
        >
          <Ionicons
            name="globe-outline"
            size={14}
            color={feedScope === 'all' ? '#FFFFFF' : '#64748B'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.scopeTabText, feedScope === 'all' && styles.scopeTabTextActive]}>
            Community Doubts
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search doubts by topic, keyword, or tag..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={handleClearSearch} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Status & Sort Row */}
      <View style={styles.statusSortRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {statusFilters.map((sf) => {
            const isActive =
              sf.value === 'UNANSWERED'
                ? selectedSort === 'unanswered'
                : selectedStatus === sf.value && selectedSort !== 'unanswered';
            return (
              <TouchableOpacity
                key={sf.value}
                style={[styles.statusFilterChip, isActive && styles.statusFilterChipActive]}
                onPress={() => {
                  setPage(1);
                  if (sf.value === 'UNANSWERED') {
                    setSelectedSort('unanswered');
                    setSelectedStatus('OPEN');
                  } else {
                    setSelectedSort('newest');
                    setSelectedStatus(sf.value);
                  }
                }}
                activeOpacity={0.75}
              >
                <Text style={[styles.statusFilterText, isActive && styles.statusFilterTextActive]}>
                  {sf.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Doubts List Feed */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00C48C" />
          <Text style={styles.loadingText}>Loading doubts...</Text>
        </View>
      ) : (
        <FlatList
          data={doubts}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchDoubts(true, 1)}
              colors={['#00C48C']}
            />
          }
          ListFooterComponent={renderPaginationFooter}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons
                  name={feedScope === 'mine' ? 'help-circle-outline' : 'chatbubbles-outline'}
                  size={40}
                  color="#94A3B8"
                />
              </View>
              <Text style={styles.emptyTitle}>
                {feedScope === 'mine' ? 'You Haven’t Asked Any Doubts Yet' : 'No Doubts Found'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {feedScope === 'mine'
                  ? 'Have an academic doubt, homework problem, or code bug? Post it now and let peer learners help you!'
                  : search
                  ? 'No questions matched your search query. Try another keyword.'
                  : 'Be the first student to post an academic question!'}
              </Text>
              <TouchableOpacity
                style={styles.emptyCtaBtn}
                onPress={() => setShowCreateModal(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyCtaBtnText}>Ask an Academic Doubt</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <DoubtCard
              doubt={item}
              currentUserId={user?.id}
              onPress={(d) => setSelectedDoubt(d)}
              onVolunteerPress={(d) => setVolunteerDoubt(d)}
            />
          )}
        />
      )}

      {/* Create Doubt Modal (Supports image upload via Cloudinary) */}
      <CreateDoubtModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        token={token}
        onDoubtCreated={handleDoubtCreated}
      />

      {/* Doubt Detail Modal (Full question, attachments, peer repliers, answers) */}
      <DoubtDetailModal
        visible={Boolean(selectedDoubt)}
        doubt={selectedDoubt}
        onClose={() => setSelectedDoubt(null)}
        currentUserId={user?.id}
        token={token}
        onDoubtUpdated={handleDoubtUpdated}
        onVolunteerPress={(d) => setVolunteerDoubt(d)}
        onOpenChat={onOpenChat}
      />

      {/* Volunteer "I Can Help" Modal */}
      <VolunteerModal
        visible={Boolean(volunteerDoubt)}
        doubt={volunteerDoubt}
        onClose={() => setVolunteerDoubt(null)}
        token={token}
        onSuccess={(updated) => handleDoubtUpdated(updated)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  brandIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#00C48C',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    shadowColor: '#00C48C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3
  },
  brandTagline: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500'
  },
  askDoubtTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00C48C',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    shadowColor: '#00C48C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
    marginRight: 4
  },
  askDoubtTopBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13
  },
  scopeContainer: {
    flexDirection: 'row',
    backgroundColor: '#EEF2F6',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 4
  },
  scopeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 11
  },
  scopeTabActive: {
    backgroundColor: '#00C48C',
    shadowColor: '#00C48C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2
  },
  scopeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B'
  },
  scopeTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  countBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 6
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)'
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569'
  },
  countBadgeTextActive: {
    color: '#FFFFFF'
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 8
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0
  },
  statusSortRow: {
    marginBottom: 10
  },
  statusFilterChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  statusFilterChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A'
  },
  statusFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B'
  },
  statusFilterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500'
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center'
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 10
  },
  emptyCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00C48C',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#00C48C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3
  },
  emptyCtaBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  paginationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center'
  },
  paginationSummary: {
    marginBottom: 10
  },
  paginationSummaryText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500'
  },
  boldText: {
    color: '#0F172A',
    fontWeight: '700'
  },
  paginationBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  pageBtnDisabled: {
    opacity: 0.45,
    backgroundColor: '#F8FAFC'
  },
  pageBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A'
  },
  pageBtnTextDisabled: {
    color: '#94A3B8'
  },
  pageIndicatorPill: {
    backgroundColor: '#00C48C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10
  },
  pageIndicatorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700'
  }
});
