import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  Animated,
  Easing
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StoryGroup, StoryItem } from '../../types';
import { api } from '../../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STORY_DURATION = 5000; // 5 seconds per story

interface Props {
  visible: boolean;
  storyGroups: StoryGroup[];
  initialGroupIndex: number;
  token: string | null;
  currentUserId?: string;
  onClose: () => void;
  onStoryDeleted?: (storyId: string) => void;
  onOpenPeerProfile?: (userId: string) => void;
}

export const StoryViewerModal: React.FC<Props> = ({
  visible,
  storyGroups,
  initialGroupIndex,
  token,
  currentUserId,
  onClose,
  onStoryDeleted,
  onOpenPeerProfile
}) => {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Optimistic like state mapped by storyId
  const [likedStories, setLikedStories] = useState<Record<string, boolean>>({});
  const [storyLikesCount, setStoryLikesCount] = useState<Record<string, number>>({});

  // Animation progress
  const progressAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<any>(null);

  const currentGroup = storyGroups[groupIndex];
  const stories = currentGroup?.stories || [];
  const currentStory = stories[storyIndex];

  // Reset indices when opening
  useEffect(() => {
    if (visible) {
      setGroupIndex(Math.min(initialGroupIndex, Math.max(0, storyGroups.length - 1)));
      setStoryIndex(0);
      setReplyText('');
    }
  }, [visible, initialGroupIndex]);

  // Mark story as viewed & initialize like state
  useEffect(() => {
    if (visible && currentStory) {
      const storyId = currentStory._id;
      if (likedStories[storyId] === undefined) {
        setLikedStories((prev) => ({
          ...prev,
          [storyId]: !!currentStory.isLiked || (Array.isArray(currentStory.likes) && currentStory.likes.includes(currentUserId as any))
        }));
        setStoryLikesCount((prev) => ({
          ...prev,
          [storyId]: currentStory.likesCount || currentStory.likes?.length || 0
        }));
      }

      // Mark view in backend
      api.viewStory(token, storyId).catch(() => {});
    }
  }, [visible, currentStory?._id]);

  // Progress Bar Animation
  useEffect(() => {
    if (!visible || !currentStory || isPaused) return;

    progressAnim.setValue(0);

    const anim = Animated.timing(progressAnim, {
      toValue: 1,
      duration: STORY_DURATION,
      easing: Easing.linear,
      useNativeDriver: false
    });

    anim.start(({ finished }) => {
      if (finished) {
        handleNextStory();
      }
    });

    return () => {
      anim.stop();
    };
  }, [visible, groupIndex, storyIndex, isPaused]);

  const handleNextStory = () => {
    if (storyIndex < stories.length - 1) {
      setStoryIndex((prev) => prev + 1);
    } else if (groupIndex < storyGroups.length - 1) {
      setGroupIndex((prev) => prev + 1);
      setStoryIndex(0);
    } else {
      // Reached end of all stories
      onClose();
    }
  };

  const handlePrevStory = () => {
    if (storyIndex > 0) {
      setStoryIndex((prev) => prev - 1);
    } else if (groupIndex > 0) {
      setGroupIndex((prev) => prev - 1);
      const prevGroupStories = storyGroups[groupIndex - 1]?.stories || [];
      setStoryIndex(Math.max(0, prevGroupStories.length - 1));
    }
  };

  const handleToggleLike = async () => {
    if (!currentStory) return;
    const storyId = currentStory._id;
    const isCurrentlyLiked = !!likedStories[storyId];
    const currentCount = storyLikesCount[storyId] || 0;

    // Optimistic toggle
    setLikedStories((prev) => ({ ...prev, [storyId]: !isCurrentlyLiked }));
    setStoryLikesCount((prev) => ({
      ...prev,
      [storyId]: isCurrentlyLiked ? Math.max(0, currentCount - 1) : currentCount + 1
    }));

    try {
      const res = await api.likeStory(token, storyId);
      if (res && res.success) {
        setLikedStories((prev) => ({ ...prev, [storyId]: res.isLiked }));
        setStoryLikesCount((prev) => ({ ...prev, [storyId]: res.likesCount }));
      }
    } catch (err) {
      // Revert on error
      setLikedStories((prev) => ({ ...prev, [storyId]: isCurrentlyLiked }));
      setStoryLikesCount((prev) => ({ ...prev, [storyId]: currentCount }));
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !currentStory) return;

    try {
      setSendingReply(true);
      const trimmed = replyText.trim();
      const storyId = currentStory._id;

      const res = await api.commentStory(token, storyId, trimmed);
      if (res && res.success) {
        setReplyText('');
        Alert.alert('💬 Reply Sent!', `Your reply was sent directly to ${currentGroup.user.name}'s peer inbox.`);
      } else {
        Alert.alert('Error', res?.message || 'Could not send reply.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send story reply.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleDeleteStory = () => {
    if (!currentStory) return;

    Alert.alert(
      'Delete Story',
      'Are you sure you want to delete this story? It will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.deleteStory(token, currentStory._id);
              if (res && res.success) {
                if (onStoryDeleted) {
                  onStoryDeleted(currentStory._id);
                }
                if (stories.length <= 1) {
                  onClose();
                } else {
                  handleNextStory();
                }
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to delete story.');
            }
          }
        }
      ]
    );
  };

  const getTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Just now';
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  if (!visible || !currentGroup || !currentStory) return null;

  const isLiked = !!likedStories[currentStory._id];
  const likesCount = storyLikesCount[currentStory._id] || 0;
  const isMine = currentGroup.isMine || String(currentGroup.user._id) === String(currentUserId);

  const authorAvatar =
    currentGroup.user.avatar && currentGroup.user.avatar.startsWith('http')
      ? { uri: currentGroup.user.avatar }
      : require('../../../assets/icon.png');

  return (
    <Modal visible={visible} transparent={false} animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Story Canvas Background */}
        <View style={styles.mediaContainer}>
          {currentStory.mediaType === 'image' || currentStory.mediaUrl?.startsWith('http') || currentStory.mediaUrl?.startsWith('data:image') ? (
            <Image
              source={{ uri: currentStory.mediaUrl }}
              style={styles.storyImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.textStoryCanvas, { backgroundColor: currentStory.background || '#00C48C' }]}>
              <Text style={styles.textStoryContent}>{currentStory.caption || 'Academic Thought'}</Text>
            </View>
          )}

          {/* Left / Right Tap zones for Navigation */}
          <View style={styles.touchNavigationLayer}>
            <TouchableOpacity
              style={styles.touchLeft}
              activeOpacity={1}
              onPress={handlePrevStory}
              onPressIn={() => setIsPaused(true)}
              onPressOut={() => setIsPaused(false)}
            />
            <TouchableOpacity
              style={styles.touchRight}
              activeOpacity={1}
              onPress={handleNextStory}
              onPressIn={() => setIsPaused(true)}
              onPressOut={() => setIsPaused(false)}
            />
          </View>
        </View>

        {/* Top Header Overlay: Segmented Progress & Author Info */}
        <View style={styles.headerOverlay}>
          {/* Segmented Progress Bars */}
          <View style={styles.progressRow}>
            {stories.map((st, idx) => {
              let fillWidth: any = '0%';
              if (idx < storyIndex) {
                fillWidth = '100%';
              } else if (idx === storyIndex) {
                fillWidth = progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%']
                });
              }

              return (
                <View key={st._id || idx} style={styles.progressTrack}>
                  <Animated.View style={[styles.progressBar, { width: fillWidth }]} />
                </View>
              );
            })}
          </View>

          {/* Author Strip */}
          <View style={styles.authorRow}>
            <TouchableOpacity
              style={styles.authorMeta}
              activeOpacity={0.8}
              onPress={() => {
                if (currentGroup.user._id && onOpenPeerProfile) {
                  onClose();
                  onOpenPeerProfile(currentGroup.user._id);
                }
              }}
            >
              <Image source={authorAvatar} style={styles.authorAvatar} />
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.authorName} numberOfLines={1}>
                    {currentGroup.user.name || 'Student Peer'}
                  </Text>
                  {isMine && <Text style={styles.youPill}>(You)</Text>}
                </View>
                <Text style={styles.authorTime}>
                  {getTimeAgo(currentStory.createdAt)} • 24h Story
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.headerRightActions}>
              {isMine && (
                <TouchableOpacity
                  style={styles.iconCircleBtn}
                  onPress={handleDeleteStory}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={19} color="#EF4444" />
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.iconCircleBtn} onPress={onClose} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Caption Overlay */}
        {currentStory.caption ? (
          <View style={styles.captionOverlay}>
            <Text style={styles.captionText}>{currentStory.caption}</Text>
          </View>
        ) : null}

        {/* Bottom Interaction Bar (Reply & Likes) */}
        <View style={styles.bottomBar}>
          {!isMine ? (
            <View style={styles.replyInputBox}>
              <TextInput
                style={styles.replyTextInput}
                placeholder={`Reply to ${currentGroup.user.name?.split(' ')[0] || 'peer'}...`}
                placeholderTextColor="rgba(255, 255, 255, 0.7)"
                value={replyText}
                onChangeText={setReplyText}
                onFocus={() => setIsPaused(true)}
                onBlur={() => setIsPaused(false)}
                maxLength={300}
                returnKeyType="send"
                onSubmitEditing={handleSendReply}
              />
              <TouchableOpacity
                style={[
                  styles.sendReplyBtn,
                  replyText.trim().length > 0 && styles.sendReplyBtnActive
                ]}
                onPress={handleSendReply}
                disabled={!replyText.trim() || sendingReply}
                activeOpacity={0.8}
              >
                {sendingReply ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons
                    name="paper-plane"
                    size={16}
                    color={replyText.trim().length > 0 ? '#FFFFFF' : '#94A3B8'}
                  />
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.myStoryStatsBox}>
              <Ionicons name="eye-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.viewsCountText}>
                {currentStory.views?.length || 1} views • {likesCount} likes
              </Text>
            </View>
          )}

          {/* Like Heart Button */}
          <TouchableOpacity
            style={styles.likeBtn}
            onPress={handleToggleLike}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={28}
              color={isLiked ? '#EF4444' : '#FFFFFF'}
            />
            {likesCount > 0 && (
              <Text style={styles.likeCountText}>{likesCount}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000'
  },
  mediaContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0F172A'
  },
  storyImage: {
    width: '100%',
    height: '100%'
  },
  textStoryCanvas: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32
  },
  textStoryContent: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 38,
    textAlign: 'center'
  },
  touchNavigationLayer: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row'
  },
  touchLeft: {
    width: '35%',
    height: '100%'
  },
  touchRight: {
    width: '65%',
    height: '100%'
  },
  headerOverlay: {
    paddingTop: Platform.OS === 'ios' ? 48 : 20,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.3)'
  },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 10
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 2,
    overflow: 'hidden'
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8
  },
  authorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  authorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#00C48C',
    marginRight: 10
  },
  authorName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800'
  },
  youPill: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6
  },
  authorTime: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    marginTop: 1
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  iconCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  captionOverlay: {
    position: 'absolute',
    bottom: 84,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16
  },
  captionText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500'
  },
  bottomBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 32 : 16,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  replyInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)'
  },
  replyTextInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14
  },
  sendReplyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6
  },
  sendReplyBtnActive: {
    backgroundColor: '#00C48C'
  },
  myStoryStatsBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  viewsCountText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700'
  },
  likeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8
  },
  likeCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1
  }
});
