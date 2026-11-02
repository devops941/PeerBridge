import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Platform,
  StatusBar,
  ScrollView,
  Dimensions,
  Share,
  Alert,
  Modal,
  Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { DoubtItem, StoryGroup } from '../types';
import { api } from '../services/api';
import { CreateDoubtModal } from './doubts/CreateDoubtModal';
import { DoubtDetailModal } from './doubts/DoubtDetailModal';
import { VolunteerModal } from './doubts/VolunteerModal';
import { CommentsModal } from './doubts/CommentsModal';
import { getSocket } from '../services/socket';
import { PeerProfileModal } from '../components/PeerProfileModal';
import { InAppNotificationBanner, PushNotificationPayload } from '../components/InAppNotificationBanner';
import { FollowRequestsModal } from '../components/FollowRequestsModal';
import { NotificationCenterModal } from '../components/NotificationCenterModal';
import { StoryUploadModal } from '../components/stories/StoryUploadModal';
import { StoryViewerModal } from '../components/stories/StoryViewerModal';

interface Props {
  user?: any;
  token?: string | null;
  onOpenProfile?: () => void;
  onOpenPeerProfile?: (peerUser: any) => void;
  onNavigateTab?: (tab: string) => void;
  onOpenChat?: (partner: any, doubtContext?: any) => void;
  onLogout?: () => void;
}

const defaultAvatar = require('../../assets/user.png');

// Fisher-Yates array shuffler for dynamic randomized discovery
const shuffleArray = <T,>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

interface FeedPostCarouselProps {
  attachments: string[];
  screenWidth: number;
  onPress: () => void;
}

const FeedPostCarousel: React.FC<FeedPostCarouselProps> = ({
  attachments,
  screenWidth,
  onPress
}) => {
  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <View style={styles.postImageContainer}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / (screenWidth || 1));
          if (idx >= 0 && idx < attachments.length) {
            setActiveIdx(idx);
          }
        }}
        scrollEventThrottle={16}
      >
        {attachments.map((imgUri, imgIdx) => (
          <TouchableOpacity
            key={imgUri + imgIdx}
            activeOpacity={0.95}
            onPress={onPress}
            style={{ width: screenWidth, height: 280 }}
          >
            <Image
              source={{ uri: imgUri }}
              style={styles.postMainImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Slide Counter Badge */}
      <View style={styles.photoCountBadge}>
        <Ionicons name="images" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
        <Text style={styles.photoCountText}>
          {activeIdx + 1}/{attachments.length}
        </Text>
      </View>

      {/* Pagination Dots Indicator */}
      <View style={styles.postCarouselDotsRow}>
        {attachments.map((_, dotIdx) => (
          <View
            key={`dot-${dotIdx}`}
            style={[
              styles.postCarouselDot,
              dotIdx === activeIdx
                ? styles.postCarouselDotActive
                : styles.postCarouselDotInactive
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const SUBJECT_STORIES = [
  { id: 'all', name: 'All Feed', icon: 'sparkles', color: '#00C48C' },
  { id: 'Data Structures', name: 'Data Structures', icon: 'code-slash', color: '#3B82F6' },
  { id: 'Algorithms', name: 'Algorithms', icon: 'git-branch', color: '#8B5CF6' },
  { id: 'AI & ML', name: 'AI & ML', icon: 'hardware-chip', color: '#EC4899' },
  { id: 'Web Development', name: 'Web Dev', icon: 'globe', color: '#F59E0B' },
  { id: 'Mathematics', name: 'Mathematics', icon: 'calculator', color: '#10B981' },
  { id: 'Electronics', name: 'Electronics', icon: 'flash', color: '#6366F1' },
  { id: 'Database Systems', name: 'DBMS', icon: 'server', color: '#06B6D4' }
];

export const HomeScreen: React.FC<Props> = ({
  user,
  token,
  onOpenProfile,
  onOpenPeerProfile,
  onNavigateTab,
  onOpenChat,
  onLogout
}) => {
  const [feed, setFeed] = useState<DoubtItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStory, setSelectedStory] = useState('all');
  const [feedSort, setFeedSort] = useState<'random' | 'newest'>('random');

  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Like / Upvote local tracking for instant optimistic UI
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDoubt, setSelectedDoubt] = useState<DoubtItem | null>(null);
  const [volunteerDoubt, setVolunteerDoubt] = useState<DoubtItem | null>(null);
  const [commentDoubt, setCommentDoubt] = useState<DoubtItem | null>(null);

  // Social & Follow Modals
  const [selectedPeerId, setSelectedPeerId] = useState<string | null>(null);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [activePushNotification, setActivePushNotification] = useState<PushNotificationPayload | null>(null);

  // Instagram 24-hour Stories State (Followed users only)
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [loadingStories, setLoadingStories] = useState(false);
  const [showStoryUploadModal, setShowStoryUploadModal] = useState(false);
  const [viewingStoryGroupIndex, setViewingStoryGroupIndex] = useState<number | null>(null);

  // Video Streaming / Lightbox
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);

  const currentUserId = user?._id || user?.id;

  const loadNotificationCount = async () => {
    try {
      const activeToken = token || (await AsyncStorage.getItem('@peerbridge_token'));
      if (!activeToken) return;
      const res = await api.getNotifications(activeToken);
      if (res && res.success) {
        setUnreadNotificationsCount(res.unreadCount || 0);
      }
    } catch (e) {
      // silent
    }
  };

  const loadStoriesFeed = async () => {
    try {
      setLoadingStories(true);
      const activeToken = token || (await AsyncStorage.getItem('@peerbridge_token'));
      if (!activeToken) return;
      const res = await api.getStoriesFeed(activeToken);
      if (res && res.success && Array.isArray(res.data)) {
        setStoryGroups(res.data);
      }
    } catch (e) {
      console.warn('Failed to load stories feed:', e);
    } finally {
      setLoadingStories(false);
    }
  };

  useEffect(() => {
    loadFeed(true, 1, selectedStory);
    loadStoriesFeed();
    loadNotificationCount();
  }, [selectedStory]);

  // Real-time Socket.IO synchronization for live doubts, likes, comments & notifications
  useEffect(() => {
    const socket = getSocket();

    // Register user room for targeted notifications
    if (currentUserId) {
      socket.emit('register_user', currentUserId);
    }

    const handleRealtimeNewDoubt = (newDoubt: DoubtItem) => {
      console.log('[Socket] New doubt published in real-time:', newDoubt._id);
      setFeed((prev) => {
        if (prev.some((d) => d._id === newDoubt._id)) return prev;
        if (selectedStory !== 'all' && newDoubt.subject !== selectedStory) return prev;
        return [newDoubt, ...prev];
      });
      setLikeCounts((prev) => ({
        ...prev,
        [newDoubt._id]: newDoubt.upvoteCount || (Array.isArray(newDoubt.upvotes) ? newDoubt.upvotes.length : 0)
      }));
    };

    const handleRealtimeUpvote = (data: { doubtId: string; upvoteCount: number; isLiked: boolean; userId?: string }) => {
      setLikeCounts((prev) => ({
        ...prev,
        [data.doubtId]: data.upvoteCount
      }));
      setFeed((prev) =>
        prev.map((d) => (d._id === data.doubtId ? { ...d, upvoteCount: data.upvoteCount } : d))
      );
      if (data.userId && currentUserId && String(data.userId) === String(currentUserId)) {
        setLikedPosts((prev) => ({ ...prev, [data.doubtId]: data.isLiked }));
      }
    };

    const handleRealtimeComment = (data: { doubtId: string; answerCount: number }) => {
      setFeed((prev) =>
        prev.map((d) => (d._id === data.doubtId ? { ...d, answerCount: data.answerCount } : d))
      );
    };

    const handleRealtimeResolved = (data: { doubtId: string }) => {
      setFeed((prev) =>
        prev.map((d) => (d._id === data.doubtId ? { ...d, status: 'RESOLVED' } : d))
      );
    };

    const handleRealtimeDeleted = (data: { doubtId: string }) => {
      setFeed((prev) => prev.filter((d) => d._id !== data.doubtId));
    };

    const handleRealtimeVolunteer = (data: { doubtId: string; volunteerCount: number }) => {
      setFeed((prev) =>
        prev.map((d) => (d._id === data.doubtId ? { ...d, volunteerCount: data.volunteerCount } : d))
      );
    };

    // Follow Request & Social Notifications
    const handleNotificationNew = (notif: PushNotificationPayload) => {
      console.log('[Socket] In-app notification received:', notif);
      setActivePushNotification(notif);
      loadNotificationCount();
    };

    const handleFollowRequestReceived = (reqData: PushNotificationPayload) => {
      console.log('[Socket] Follow request received:', reqData);
      setActivePushNotification(reqData);
      loadNotificationCount();
    };

    const handleFollowAccepted = (data: any) => {
      console.log('[Socket] Follow accepted:', data);
      setActivePushNotification({
        type: 'FOLLOW_ACCEPTED',
        title: 'Follow Request Accepted 🎉',
        message: `${data.user?.name || 'A peer'} accepted your follow request. You can now chat!`,
        sender: data.user
      });
      loadNotificationCount();
    };

    const handleStoryNew = () => {
      loadStoriesFeed();
    };

    const handleStoryLiked = (payload: { storyId: string; likesCount: number; isLiked: boolean; userId: string }) => {
      setStoryGroups((prev) =>
        prev.map((group) => ({
          ...group,
          stories: group.stories.map((st) =>
            st._id === payload.storyId
              ? {
                  ...st,
                  likesCount: payload.likesCount,
                  isLiked: payload.userId === currentUserId ? payload.isLiked : st.isLiked
                }
              : st
          )
        }))
      );
    };

    const handleStoryDeleted = (payload: { storyId: string }) => {
      setStoryGroups((prev) =>
        prev
          .map((group) => ({
            ...group,
            stories: group.stories.filter((st) => st._id !== payload.storyId)
          }))
          .filter((group) => group.stories.length > 0)
      );
    };

    socket.on('doubt:new', handleRealtimeNewDoubt);
    socket.on('doubt:upvoted', handleRealtimeUpvote);
    socket.on('doubt:comment_added', handleRealtimeComment);
    socket.on('doubt:resolved', handleRealtimeResolved);
    socket.on('doubt:deleted', handleRealtimeDeleted);
    socket.on('doubt:volunteer_updated', handleRealtimeVolunteer);
    socket.on('notification:new', handleNotificationNew);
    socket.on('follow:request_received', handleFollowRequestReceived);
    socket.on('follow:accepted', handleFollowAccepted);
    socket.on('story:new', handleStoryNew);
    socket.on('story:liked', handleStoryLiked);
    socket.on('story:deleted', handleStoryDeleted);

    return () => {
      socket.off('doubt:new', handleRealtimeNewDoubt);
      socket.off('doubt:upvoted', handleRealtimeUpvote);
      socket.off('doubt:comment_added', handleRealtimeComment);
      socket.off('doubt:resolved', handleRealtimeResolved);
      socket.off('doubt:deleted', handleRealtimeDeleted);
      socket.off('doubt:volunteer_updated', handleRealtimeVolunteer);
      socket.off('notification:new', handleNotificationNew);
      socket.off('follow:request_received', handleFollowRequestReceived);
      socket.off('follow:accepted', handleFollowAccepted);
      socket.off('story:new', handleStoryNew);
      socket.off('story:liked', handleStoryLiked);
      socket.off('story:deleted', handleStoryDeleted);
    };
  }, [selectedStory, currentUserId]);

  const loadFeed = async (
    isRefresh = false,
    targetPage = 1,
    subjectFilter = selectedStory,
    sortMode: 'random' | 'newest' = feedSort
  ) => {
    try {
      if (isRefresh) setRefreshing(true);
      else if (targetPage === 1) setLoading(true);
      else setLoadingMore(true);

      const params: any = {
        page: targetPage,
        limit: 10,
        sort: sortMode
      };

      if (subjectFilter !== 'all') {
        params.subject = subjectFilter;
      }

      // If random mode and loading subsequent pages, exclude currently displayed IDs to avoid duplicate posts
      if (targetPage > 1 && feed.length > 0 && sortMode === 'random') {
        params.excludeIds = feed.map((item) => item._id).join(',');
      }

      const res = await api.getDoubts(params);
      if (res && res.success && Array.isArray(res.data)) {
        // Randomize the incoming posts using Fisher-Yates shuffle if in random mode
        const incoming = sortMode === 'random' ? shuffleArray(res.data) : res.data;

        if (targetPage === 1) {
          setFeed(incoming);
        } else {
          setFeed((prev) => {
            const existingIds = new Set(prev.map((d) => d._id));
            const newPosts = incoming.filter((d: any) => !existingIds.has(d._id));
            return [...prev, ...newPosts];
          });
        }

        // Initialize optimistic likes
        const newLikes: Record<string, boolean> = {};
        const newCounts: Record<string, number> = {};
        res.data.forEach((item: any) => {
          const upvotes = Array.isArray(item.upvotes) ? item.upvotes : [];
          const isLiked = currentUserId && upvotes.some((u: any) => String(u) === String(currentUserId));
          newLikes[item._id] = !!isLiked;
          newCounts[item._id] = item.upvoteCount || upvotes.length || 0;
        });

        setLikedPosts((prev) => ({ ...prev, ...newLikes }));
        setLikeCounts((prev) => ({ ...prev, ...newCounts }));

        setHasMore(targetPage < (res.meta?.totalPages || 1));
        setPage(targetPage);
      } else {
        if (targetPage === 1) setFeed([]);
        setHasMore(false);
      }
    } catch (err) {
      console.warn('Failed to load feed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const handleShuffleFeed = () => {
    // Immediate optimistic shuffle for instant visual feedback
    setFeed((prev) => shuffleArray([...prev]));
    // Fetch a fresh randomized batch from server
    loadFeed(true, 1, selectedStory, 'random');
  };

  const handleLikeToggle = async (doubtId: string) => {
    let activeToken = token;
    if (!activeToken) {
      try {
        activeToken = await AsyncStorage.getItem('@peerbridge_token');
      } catch (e) {}
    }

    if (!activeToken) {
      Alert.alert('Sign In Required', 'Please sign in to upvote peer posts.');
      return;
    }

    const currentLiked = !!likedPosts[doubtId];
    const currentCount = likeCounts[doubtId] || 0;

    // Optimistic UI update
    setLikedPosts((prev) => ({ ...prev, [doubtId]: !currentLiked }));
    setLikeCounts((prev) => ({
      ...prev,
      [doubtId]: currentLiked ? Math.max(0, currentCount - 1) : currentCount + 1
    }));

    try {
      const res = await api.upvoteDoubt(activeToken, doubtId);
      if (res && res.success) {
        setLikedPosts((prev) => ({ ...prev, [doubtId]: res.isLiked }));
        setLikeCounts((prev) => ({ ...prev, [doubtId]: res.upvoteCount }));
      }
    } catch (e) {
      // Revert on error
      setLikedPosts((prev) => ({ ...prev, [doubtId]: currentLiked }));
      setLikeCounts((prev) => ({ ...prev, [doubtId]: currentCount }));
    }
  };

  const handleShareDoubt = async (doubt: DoubtItem) => {
    try {
      const shareText = `📚 PeerBridge Academic Doubt:\n\n*${doubt.title}*\nSubject: ${doubt.subject}${doubt.topic ? ` (${doubt.topic})` : ''}\n\n"${doubt.question}"\n\nCan you help solve or explain this? Connect on PeerBridge!`;

      await Share.share(
        {
          title: doubt.title,
          message: shareText
        },
        {
          dialogTitle: 'Share via WhatsApp, Telegram, etc.'
        }
      );
    } catch (err: any) {
      console.warn('Share error:', err);
    }
  };

  const handleDoubtCreated = (newDoubt: DoubtItem) => {
    setFeed((prev) => [newDoubt, ...prev]);
  };

  const handleDoubtUpdated = (updated: DoubtItem) => {
    setFeed((prev) =>
      prev.map((d) => (d._id === updated._id ? { ...d, ...updated } : d))
    );
    setSelectedDoubt(updated);
  };

  const getTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Just now';
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  const renderStoriesBar = () => {
    const userAvatarUri =
      user?.avatar && user.avatar.startsWith('http')
        ? { uri: user.avatar }
        : defaultAvatar;

    // Check if current user has active stories
    const myGroupIndex = storyGroups.findIndex(
      (g) => g.isMine || String(g.user?._id) === String(currentUserId)
    );
    const myStoryGroup = myGroupIndex !== -1 ? storyGroups[myGroupIndex] : null;
    const myStoriesCount = myStoryGroup?.stories?.length || 0;

    // Peer story groups (followed users only)
    const peerGroups = storyGroups.filter(
      (g) => !g.isMine && String(g.user?._id) !== String(currentUserId)
    );

    return (
      <View>
        <View style={styles.storiesContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.storiesContent}
          >
            {/* 1. Your Story Bubble */}
            <View style={styles.storyBubbleItem}>
              <TouchableOpacity
                style={[
                  styles.myStoryAvatarBox,
                  myStoriesCount > 0 && styles.myStoryHasActive
                ]}
                onPress={() => {
                  if (myStoriesCount > 0 && myGroupIndex !== -1) {
                    setViewingStoryGroupIndex(myGroupIndex);
                  } else {
                    setShowStoryUploadModal(true);
                  }
                }}
                activeOpacity={0.8}
              >
                <Image source={userAvatarUri} style={styles.myStoryAvatar} />
                <TouchableOpacity
                  style={styles.plusIconBadge}
                  activeOpacity={0.8}
                  onPress={() => setShowStoryUploadModal(true)}
                >
                  <Ionicons name="add" size={13} color="#FFFFFF" />
                </TouchableOpacity>
              </TouchableOpacity>
              <Text style={styles.storyLabel} numberOfLines={1}>
                {myStoriesCount > 0 ? 'Your Story' : 'Add Story'}
              </Text>
            </View>

            {/* 2. Followed Peers Stories (Follow-only visibility) */}
            {peerGroups.map((group) => {
              const peerAvatar =
                group.user?.avatar && group.user.avatar.startsWith('http')
                  ? { uri: group.user.avatar }
                  : defaultAvatar;

              const globalIndex = storyGroups.findIndex(
                (g) => String(g.user?._id) === String(group.user?._id)
              );

              return (
                <TouchableOpacity
                  key={group.user?._id}
                  style={styles.storyBubbleItem}
                  onPress={() => setViewingStoryGroupIndex(globalIndex !== -1 ? globalIndex : 0)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.storyRing,
                      group.hasUnseen ? styles.storyRingUnseen : styles.storyRingSeen
                    ]}
                  >
                    <Image source={peerAvatar} style={styles.peerStoryAvatar} />
                  </View>
                  <Text
                    style={[
                      styles.storyLabel,
                      group.hasUnseen && { color: '#0F172A', fontWeight: '700' }
                    ]}
                    numberOfLines={1}
                  >
                    {group.user?.name?.split(' ')[0] || 'Peer'}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* 3. Empty Peer Stories Hint if no followed peers have stories */}
            {peerGroups.length === 0 && (
              <View style={styles.emptyStoryHintBox}>
                <Ionicons name="people-outline" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
                <Text style={styles.emptyStoryHintText}>
                  Stories from followed peers appear here (24h)
                </Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Community Feed Banner */}
        <View style={styles.feedDiscoveryBanner}>
          <View style={styles.discoveryLeft}>
            <View style={styles.feedIconBox}>
              <Ionicons name="chatbubbles" size={15} color="#00C48C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.discoveryTitle}>Community Feed</Text>
              <Text style={styles.discoverySubtitle}>Recent doubts & discussions from peers</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderFeedPost = ({ item }: { item: DoubtItem }) => {
    const isMine = currentUserId && String(item.author?._id) === String(currentUserId);
    const authorAvatarUri =
      item.author?.avatar && item.author.avatar.startsWith('http')
        ? { uri: item.author.avatar }
        : defaultAvatar;
    const hasImage = Array.isArray(item.attachments) && item.attachments.length > 0 && item.attachments[0];
    const isLiked = !!likedPosts[item._id];
    const likesCount = likeCounts[item._id] || 0;

    return (
      <View style={styles.feedPostCard}>
        {/* Post Header (Instagram style) */}
        <View style={styles.postHeader}>
          <TouchableOpacity
            style={styles.authorMetaRow}
            onPress={() => {
              if (isMine && onOpenProfile) {
                onOpenProfile();
              } else if (item.author?._id) {
                setSelectedPeerId(item.author._id);
              }
            }}
            activeOpacity={0.8}
          >
            <View style={styles.avatarBorder}>
              <Image source={authorAvatarUri} style={styles.postAuthorAvatar} />
            </View>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <View style={styles.authorNameRow}>
                <Text style={styles.postAuthorName} numberOfLines={1}>
                  {item.author?.name || 'Student Peer'}
                </Text>
                {isMine && <Text style={styles.youBadge}>(You)</Text>}
              </View>
              <Text style={styles.postSubtitle} numberOfLines={1}>
                {item.author?.college || item.author?.department || 'PeerBridge Student'} • {getTimeAgo(item.createdAt)}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.subjectPill}>
            <Text style={styles.subjectPillText}>#{item.subject}</Text>
          </View>
        </View>

        {/* Post Main Image / Diagram (If attached - Instagram carousel style if multiple) */}
        {hasImage && item.attachments && item.attachments.length > 0 ? (
          item.attachments.length > 1 ? (
            <FeedPostCarousel
              attachments={item.attachments}
              screenWidth={SCREEN_WIDTH}
              onPress={() => setSelectedDoubt(item)}
            />
          ) : (
            <TouchableOpacity
              activeOpacity={0.95}
              onPress={() => setSelectedDoubt(item)}
              style={styles.postImageContainer}
            >
              <Image
                source={{ uri: item.attachments[0] }}
                style={styles.postMainImage}
                resizeMode="cover"
              />
              <View style={styles.photoCountBadge}>
                <Ionicons name="image" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.photoCountText}>Photo Attached</Text>
              </View>
            </TouchableOpacity>
          )
        ) : null}

        {/* Post Main Video (If attached - Max 10MB) */}
        {item.videoUrl ? (
          <TouchableOpacity
            style={styles.postVideoContainer}
            activeOpacity={0.92}
            onPress={() => setSelectedVideoUrl(item.videoUrl || null)}
          >
            <View style={styles.postVideoInner}>
              <View style={styles.postVideoPlayCircle}>
                <Ionicons name="play" size={32} color="#FFFFFF" style={{ marginLeft: 3 }} />
              </View>
              <View style={styles.postVideoTag}>
                <Ionicons name="videocam" size={13} color="#FFFFFF" style={{ marginRight: 5 }} />
                <Text style={styles.postVideoTagText}>Video Attached (Max 10MB)</Text>
              </View>
              {item.videoDuration ? (
                <View style={styles.postVideoDuration}>
                  <Text style={styles.postVideoDurationText}>{Math.round(item.videoDuration)}s</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.postVideoCaptionBar}>
              <Ionicons name="play-circle-outline" size={16} color="#00C48C" style={{ marginRight: 6 }} />
              <Text style={styles.postVideoCaptionText} numberOfLines={1}>
                Tap to watch or stream academic explanation
              </Text>
            </View>
          </TouchableOpacity>
        ) : null}

        {/* Post Question Title & Details */}
        <TouchableOpacity
          style={styles.postContentSection}
          onPress={() => setSelectedDoubt(item)}
          activeOpacity={0.85}
        >
          <Text style={styles.postTitle}>{item.title}</Text>
          <Text style={styles.postBody} numberOfLines={3}>
            {item.question}
          </Text>
        </TouchableOpacity>

        {/* Code Snippet Box (If attached) */}
        {item.codeSnippet ? (
          <TouchableOpacity
            style={styles.codeSnippetBox}
            onPress={() => setSelectedDoubt(item)}
            activeOpacity={0.9}
          >
            <View style={styles.codeHeader}>
              <View style={styles.codeDots}>
                <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
                <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
                <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
              </View>
              <Text style={styles.codeLang}>{item.codeLanguage || 'code'}</Text>
            </View>
            <Text style={styles.codeSnippetText} numberOfLines={4}>
              {item.codeSnippet}
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Action Row (Instagram like, comment, share, volunteer) */}
        <View style={styles.actionRow}>
          <View style={styles.leftActionIcons}>
            {/* Like / Upvote Button */}
            <TouchableOpacity
              style={styles.actionIconBtn}
              onPress={() => handleLikeToggle(item._id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={23}
                color={isLiked ? '#EF4444' : '#0F172A'}
              />
              <Text style={[styles.actionCountText, isLiked && styles.actionCountTextLiked]}>
                {likesCount}
              </Text>
            </TouchableOpacity>

            {/* Comment / Solutions Button */}
            <TouchableOpacity
              style={styles.actionIconBtn}
              onPress={() => setCommentDoubt(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-outline" size={21} color="#0F172A" />
              <Text style={styles.actionCountText}>
                {item.answerCount || 0}
              </Text>
            </TouchableOpacity>

            {/* Share to WhatsApp, Telegram, etc. */}
            <TouchableOpacity
              style={styles.actionIconBtn}
              onPress={() => handleShareDoubt(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="share-social-outline" size={21} color="#0F172A" />
            </TouchableOpacity>

            {/* Direct Message Author */}
            {!isMine && (
              <TouchableOpacity
                style={styles.actionIconBtn}
                onPress={() => {
                  if (onOpenChat) {
                    onOpenChat(item.author, { title: item.title, subject: item.subject });
                  } else if (onNavigateTab) {
                    onNavigateTab('chat');
                  }
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="paper-plane-outline" size={22} color="#0F172A" />
              </TouchableOpacity>
            )}
          </View>

          {/* Volunteer "I Can Help" Button */}
          {!isMine && item.status === 'OPEN' && (
            <TouchableOpacity
              style={styles.volunteerBtn}
              onPress={() => setVolunteerDoubt(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="hand-right" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.volunteerBtnText}>I Can Help</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Post Stats & Comment Teaser */}
        <View style={styles.postStatsSection}>
          <Text style={styles.likesCountText}>
            {likesCount} {likesCount === 1 ? 'like' : 'likes'}
          </Text>

          <TouchableOpacity
            onPress={() => setCommentDoubt(item)}
            activeOpacity={0.7}
            style={{ marginTop: 2 }}
          >
            <Text style={styles.viewAnswersText}>
              {item.answerCount && item.answerCount > 0
                ? `View all ${item.answerCount} comments & solutions`
                : 'Write a comment...'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Instagram-style Top Header */}
      <View style={styles.instaHeader}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../../assets/app_icon.png')}
            style={styles.headerBrandLogo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => setShowCreateModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={26} color="#0F172A" />
          </TouchableOpacity>

          {/* In-App Notifications Center (Activity, Requests, Messages) */}
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => setShowNotificationCenter(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={24} color="#0F172A" />
            {unreadNotificationsCount > 0 && (
              <View style={styles.headerNotificationBadge}>
                <Text style={styles.headerNotificationBadgeText}>
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => onNavigateTab && onNavigateTab('chat')}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubbles-outline" size={24} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Feed List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00C48C" />
          <Text style={styles.loadingText}>Loading community feed...</Text>
        </View>
      ) : (
        <FlatList
          data={feed}
          keyExtractor={(item) => item._id}
          renderItem={renderFeedPost}
          ListHeaderComponent={renderStoriesBar}
          contentContainerStyle={styles.feedContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                await Promise.all([
                  loadFeed(true, 1, selectedStory),
                  loadStoriesFeed(),
                  loadNotificationCount()
                ]);
              }}
              colors={['#00C48C']}
            />
          }
          onEndReached={() => {
            if (hasMore && !loadingMore && !loading) {
              loadFeed(false, page + 1, selectedStory);
            }
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#00C48C" />
              </View>
            ) : feed.length > 0 ? (
              <View style={styles.allCaughtUpBox}>
                <Ionicons name="checkmark-circle" size={20} color="#00C48C" style={{ marginRight: 6 }} />
                <Text style={styles.allCaughtUpText}>You're all caught up!</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="school-outline" size={42} color="#00C48C" />
              </View>
              <Text style={styles.emptyTitle}>Welcome to PeerBridge Feed</Text>
              <Text style={styles.emptySubtitle}>
                No academic questions found in this category yet. Post your homework question, diagram, or code bug!
              </Text>
              <TouchableOpacity
                style={styles.createDoubtCTA}
                onPress={() => setShowCreateModal(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.createDoubtCTAText}>Ask a Doubt Now</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Create Doubt Modal */}
      <CreateDoubtModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        token={token}
        onDoubtCreated={handleDoubtCreated}
      />

      {/* Doubt Detail Modal */}
      <DoubtDetailModal
        visible={Boolean(selectedDoubt)}
        doubt={selectedDoubt}
        onClose={() => setSelectedDoubt(null)}
        currentUserId={currentUserId}
        token={token}
        onDoubtUpdated={handleDoubtUpdated}
        onVolunteerPress={(d) => setVolunteerDoubt(d)}
        onOpenChat={onOpenChat}
        onOpenPeerProfile={(authorId) => setSelectedPeerId(authorId)}
      />

      {/* Volunteer Modal */}
      <VolunteerModal
        visible={Boolean(volunteerDoubt)}
        doubt={volunteerDoubt}
        onClose={() => setVolunteerDoubt(null)}
        token={token}
        onSuccess={(updated) => handleDoubtUpdated(updated)}
      />

      {/* Instagram-style Comments Modal */}
      <CommentsModal
        visible={Boolean(commentDoubt)}
        doubt={commentDoubt}
        currentUser={user}
        token={token}
        onClose={() => setCommentDoubt(null)}
        onCommentAdded={(doubtId, updatedCount) => {
          setFeed((prev) =>
            prev.map((d) => (d._id === doubtId ? { ...d, answerCount: updatedCount } : d))
          );
          if (selectedDoubt?._id === doubtId) {
            setSelectedDoubt((prev) => (prev ? { ...prev, answerCount: updatedCount } : null));
          }
        }}
        onOpenPeerProfile={(authorId) => {
          setCommentDoubt(null);
          setSelectedPeerId(authorId);
        }}
      />

      {/* Instagram Peer Profile Modal */}
      <PeerProfileModal
        visible={Boolean(selectedPeerId)}
        userId={selectedPeerId}
        currentUserId={currentUserId}
        token={token}
        onClose={() => setSelectedPeerId(null)}
        onOpenChatWithPeer={(peerUser) => {
          setSelectedPeerId(null);
          if (onOpenChat) {
            onOpenChat(peerUser);
          } else if (onNavigateTab) {
            onNavigateTab('chat');
          }
        }}
        onOpenFullProfile={(peerUser) => {
          setSelectedPeerId(null);
          if (onOpenPeerProfile) {
            onOpenPeerProfile(peerUser);
          }
        }}
      />

      {/* Follow Requests Management Modal */}
      <FollowRequestsModal
        visible={showRequestsModal}
        token={token}
        onClose={() => {
          setShowRequestsModal(false);
          loadNotificationCount();
        }}
        onOpenPeerProfile={(peerId) => {
          setShowRequestsModal(false);
          setSelectedPeerId(peerId);
        }}
        onRequestAccepted={() => {
          loadNotificationCount();
        }}
      />

      {/* Full In-App Notification Center */}
      <NotificationCenterModal
        visible={showNotificationCenter}
        token={token}
        onClose={() => {
          setShowNotificationCenter(false);
          loadNotificationCount();
        }}
        onNotificationsRead={() => {
          setUnreadNotificationsCount(0);
        }}
        onOpenPeerProfile={(peerId) => {
          setShowNotificationCenter(false);
          setSelectedPeerId(peerId);
        }}
        onOpenChatWithPartner={(partner) => {
          setShowNotificationCenter(false);
          if (onOpenChat) {
            onOpenChat(partner);
          } else if (onNavigateTab) {
            onNavigateTab('chat');
          }
        }}
        onOpenDoubt={(doubtId) => {
          setShowNotificationCenter(false);
          const found = feed.find((d) => d._id === doubtId);
          if (found) {
            setSelectedDoubt(found);
          }
        }}
      />

      {/* Real-time In-App Push Notification Floating Banner */}
      <InAppNotificationBanner
        notification={activePushNotification}
        onDismiss={() => setActivePushNotification(null)}
        onAcceptRequest={async (requestId) => {
          try {
            const activeToken = token || (await AsyncStorage.getItem('@peerbridge_token'));
            if (!activeToken) return;
            await api.acceptFollowRequest(activeToken, requestId);
            loadNotificationCount();
          } catch (e) {
            console.warn('Accept banner error:', e);
          }
        }}
        onDeclineRequest={async (requestId) => {
          try {
            const activeToken = token || (await AsyncStorage.getItem('@peerbridge_token'));
            if (!activeToken) return;
            await api.declineFollowRequest(activeToken, requestId);
            loadNotificationCount();
          } catch (e) {
            console.warn('Decline banner error:', e);
          }
        }}
        onPressBanner={(notif) => {
          setActivePushNotification(null);
          if (notif.type === 'MESSAGE' && (notif.data?.partnerId || notif.sender?._id)) {
            const partner = {
              _id: notif.data?.partnerId || notif.sender?._id,
              name: notif.data?.partnerName || notif.sender?.name,
              avatar: notif.data?.partnerAvatar || notif.sender?.avatar
            };
            if (onOpenChat) onOpenChat(partner);
            else if (onNavigateTab) onNavigateTab('chat');
          } else if (notif.type === 'FOLLOW_REQUEST') {
            setShowNotificationCenter(true);
          } else if (notif.data?.peerId) {
            setSelectedPeerId(notif.data.peerId);
          } else {
            setShowNotificationCenter(true);
          }
        }}
      />

      {/* Instagram 24h Story Upload Modal */}
      <StoryUploadModal
        visible={showStoryUploadModal}
        token={token || null}
        currentUser={user}
        onClose={() => setShowStoryUploadModal(false)}
        onStoryCreated={() => {
          loadStoriesFeed();
        }}
      />

      {/* Instagram Fullscreen Story Viewer with Likes & Replies */}
      <StoryViewerModal
        visible={viewingStoryGroupIndex !== null}
        storyGroups={storyGroups}
        initialGroupIndex={viewingStoryGroupIndex ?? 0}
        token={token || null}
        currentUserId={currentUserId}
        onClose={() => setViewingStoryGroupIndex(null)}
        onStoryDeleted={() => {
          loadStoriesFeed();
        }}
        onOpenPeerProfile={(peerId) => {
          setViewingStoryGroupIndex(null);
          setSelectedPeerId(peerId);
        }}
      />

      {/* Fullscreen Video Stream & Player Modal */}
      <Modal
        visible={Boolean(selectedVideoUrl)}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setSelectedVideoUrl(null)}
      >
        <View style={styles.videoModalContainer}>
          <View style={styles.videoModalHeader}>
            <TouchableOpacity
              style={styles.videoModalCloseBtn}
              onPress={() => setSelectedVideoUrl(null)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.videoModalTitle}>Academic Video Explanation</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.videoModalBody}>
            <View style={styles.videoModalPlayerCard}>
              <View style={styles.videoBigIconCircle}>
                <Ionicons name="videocam" size={54} color="#00C48C" />
              </View>
              <Text style={styles.videoModalPlayerTitle}>PeerBridge Video Player</Text>
              <Text style={styles.videoModalPlayerSub}>
                10MB Academic Demonstration Video
              </Text>

              <TouchableOpacity
                style={styles.videoLaunchBtn}
                activeOpacity={0.85}
                onPress={async () => {
                  if (selectedVideoUrl) {
                    try {
                      await Linking.openURL(selectedVideoUrl);
                    } catch (e) {
                      Alert.alert('Cannot Open', 'Unable to stream video link.');
                    }
                  }
                }}
              >
                <Ionicons name="play" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.videoLaunchBtnText}>Stream Video Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0
  },
  instaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF'
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerBrandLogo: {
    width: 140,
    height: 36
  },
  brandIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#00C48C',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8
  },
  instaBrandTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  headerActionBtn: {
    padding: 2,
    position: 'relative'
  },
  headerNotificationBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF'
  },
  headerNotificationBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  storiesContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF'
  },
  storiesContent: {
    paddingHorizontal: 14
  },
  storyBubbleItem: {
    alignItems: 'center',
    marginRight: 14,
    width: 68
  },
  myStoryAvatarBox: {
    position: 'relative',
    width: 58,
    height: 58,
    borderRadius: 29,
    padding: 2,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    marginBottom: 4
  },
  myStoryAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
    backgroundColor: '#F1F5F9'
  },
  plusIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#00C48C',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  storyRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4
  },
  storyRingUnseen: {
    borderWidth: 2.5,
    borderColor: '#E1306C'
  },
  storyRingSeen: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1'
  },
  peerStoryAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
    backgroundColor: '#F1F5F9'
  },
  myStoryHasActive: {
    borderWidth: 2.5,
    borderColor: '#00C48C'
  },
  emptyStoryHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignSelf: 'center'
  },
  emptyStoryHintText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500'
  },
  storyLabel: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2
  },
  feedDiscoveryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  discoveryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  feedIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E6FAF3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  discoveryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2
  },
  discoverySubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1
  },
  postCarouselDotsRow: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5
  },
  postCarouselDot: {
    height: 5,
    borderRadius: 2.5
  },
  postCarouselDotActive: {
    width: 16,
    backgroundColor: '#00C48C'
  },
  postCarouselDotInactive: {
    width: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.55)'
  },
  feedContent: {
    paddingBottom: 40
  },
  feedPostCard: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 16,
    marginBottom: 8
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  authorMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  avatarBorder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#00C48C',
    padding: 1.5
  },
  postAuthorAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    backgroundColor: '#F1F5F9'
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  postAuthorName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A'
  },
  youBadge: {
    fontSize: 11,
    color: '#00C48C',
    fontWeight: '700',
    marginLeft: 4
  },
  postSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1
  },
  subjectPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  subjectPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857'
  },
  postImageContainer: {
    width: '100%',
    height: 280,
    backgroundColor: '#0F172A',
    position: 'relative'
  },
  postMainImage: {
    width: '100%',
    height: '100%'
  },
  photoCountBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  photoCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600'
  },
  postContentSection: {
    paddingHorizontal: 14,
    paddingTop: 10
  },
  postTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 21,
    marginBottom: 4
  },
  postBody: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19
  },
  codeSnippetBox: {
    marginHorizontal: 14,
    marginTop: 8,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1E293B'
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingBottom: 4
  },
  codeDots: {
    flexDirection: 'row',
    gap: 4
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  codeLang: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  codeSnippetText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: '#38BDF8',
    lineHeight: 17
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6
  },
  leftActionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  actionIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 2
  },
  actionCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 6
  },
  actionCountTextLiked: {
    color: '#EF4444'
  },
  volunteerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00C48C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    shadowColor: '#00C48C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2
  },
  volunteerBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12
  },
  postStatsSection: {
    paddingHorizontal: 14,
    marginTop: 4
  },
  likesCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2
  },
  viewAnswersText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500'
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500'
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center'
  },
  allCaughtUpBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24
  },
  allCaughtUpText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600'
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 60
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center'
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20
  },
  createDoubtCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00C48C',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#00C48C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3
  },
  createDoubtCTAText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14
  },
  postVideoContainer: {
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155'
  },
  postVideoInner: {
    height: 180,
    backgroundColor: '#0B1120',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  postVideoPlayCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#00C48C',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00C48C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6
  },
  postVideoTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8
  },
  postVideoTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  postVideoDuration: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  postVideoDurationText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  postVideoCaptionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  postVideoCaptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E2E8F0',
    flex: 1
  },
  videoModalContainer: {
    flex: 1,
    backgroundColor: '#0F172A'
  },
  videoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 20) + 12 : 54,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B'
  },
  videoModalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center'
  },
  videoModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  videoModalBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  videoModalPlayerCard: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155'
  },
  videoBigIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20
  },
  videoModalPlayerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center'
  },
  videoModalPlayerSub: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 28
  },
  videoLaunchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00C48C',
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#00C48C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4
  },
  videoLaunchBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF'
  }
});
