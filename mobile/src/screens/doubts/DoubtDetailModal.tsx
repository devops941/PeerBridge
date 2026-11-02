import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  Share,
  Dimensions,
  Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { DoubtItem } from '../../types';
import { api } from '../../services/api';
import { getSocket, joinDoubtRoom, leaveDoubtRoom } from '../../services/socket';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  visible: boolean;
  doubt: DoubtItem | null;
  onClose: () => void;
  currentUserId?: string;
  token?: string | null;
  onDoubtUpdated?: (updated: DoubtItem) => void;
  onVolunteerPress?: (doubt: DoubtItem) => void;
  onOpenChat?: (partner: any, doubtContext?: any) => void;
  onOpenPeerProfile?: (userId: string) => void;
}

const defaultAvatar = require('../../../assets/user.png');

const CODE_LANGUAGES = ['python', 'javascript', 'java', 'c++', 'sql', 'html', 'text'];

interface AttachmentsCarouselProps {
  attachments: string[];
  onPreviewImage: (url: string) => void;
}

const AttachmentsCarousel: React.FC<AttachmentsCarouselProps> = ({
  attachments,
  onPreviewImage
}) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [containerWidth, setContainerWidth] = useState(SCREEN_WIDTH > 64 ? SCREEN_WIDTH - 64 : 320);
  const scrollRef = useRef<ScrollView>(null);

  if (!attachments || attachments.length === 0) return null;

  const isMulti = attachments.length > 1;

  const handleScroll = (event: any) => {
    if (containerWidth <= 0) return;
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIdx = Math.round(contentOffsetX / containerWidth);
    if (newIdx !== activeIdx && newIdx >= 0 && newIdx < attachments.length) {
      setActiveIdx(newIdx);
    }
  };

  const scrollToIndex = (index: number) => {
    if (index >= 0 && index < attachments.length && scrollRef.current && containerWidth > 0) {
      scrollRef.current.scrollTo({
        x: index * containerWidth,
        animated: true
      });
      setActiveIdx(index);
    }
  };

  const handlePrev = () => {
    if (activeIdx > 0) {
      scrollToIndex(activeIdx - 1);
    }
  };

  const handleNext = () => {
    if (activeIdx < attachments.length - 1) {
      scrollToIndex(activeIdx + 1);
    }
  };

  return (
    <View
      style={styles.carouselContainer}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - containerWidth) > 1) {
          setContainerWidth(w);
        }
      }}
    >
      {/* Carousel Main Viewport */}
      <View style={[styles.carouselViewport, { width: containerWidth }]}>
        {isMulti ? (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            scrollEventThrottle={16}
            style={{ width: containerWidth }}
          >
            {attachments.map((imgUrl, idx) => (
              <TouchableOpacity
                key={imgUrl + idx}
                style={[styles.carouselSlide, { width: containerWidth }]}
                activeOpacity={0.92}
                onPress={() => onPreviewImage(imgUrl)}
              >
                <Image
                  source={{ uri: imgUrl }}
                  style={styles.carouselImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <TouchableOpacity
            style={[styles.carouselSlide, { width: containerWidth }]}
            activeOpacity={0.92}
            onPress={() => onPreviewImage(attachments[0])}
          >
            <Image
              source={{ uri: attachments[0] }}
              style={styles.carouselImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}

        {/* Counter Badge (e.g. "1 / 3") */}
        {isMulti && (
          <View style={styles.carouselCounterBadge}>
            <Ionicons name="images" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.carouselCounterText}>
              {activeIdx + 1} / {attachments.length}
            </Text>
          </View>
        )}

        {/* Fullscreen Zoom Pill Button */}
        <TouchableOpacity
          style={styles.carouselZoomBtn}
          activeOpacity={0.8}
          onPress={() => onPreviewImage(attachments[activeIdx] || attachments[0])}
        >
          <Ionicons name="scan-outline" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.carouselZoomText}>Full Screen</Text>
        </TouchableOpacity>

        {/* Left Chevron Nav Button */}
        {isMulti && activeIdx > 0 && (
          <TouchableOpacity
            style={[styles.carouselArrowBtn, styles.carouselArrowLeft]}
            onPress={handlePrev}
            activeOpacity={0.75}
          >
            <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* Right Chevron Nav Button */}
        {isMulti && activeIdx < attachments.length - 1 && (
          <TouchableOpacity
            style={[styles.carouselArrowBtn, styles.carouselArrowRight]}
            onPress={handleNext}
            activeOpacity={0.75}
          >
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Pagination Dots Indicator */}
      {isMulti && (
        <View style={styles.carouselDotsRow}>
          {attachments.map((_, dotIdx) => (
            <TouchableOpacity
              key={`dot-${dotIdx}`}
              onPress={() => scrollToIndex(dotIdx)}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <View
                style={[
                  styles.carouselDot,
                  dotIdx === activeIdx ? styles.carouselDotActive : styles.carouselDotInactive
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Interactive Thumbnail Strip */}
      {isMulti && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbnailStripContent}
          style={styles.thumbnailStrip}
        >
          {attachments.map((imgUrl, thumbIdx) => {
            const isSelected = thumbIdx === activeIdx;
            return (
              <TouchableOpacity
                key={`thumb-${imgUrl}-${thumbIdx}`}
                style={[
                  styles.thumbnailBox,
                  isSelected && styles.thumbnailBoxSelected
                ]}
                onPress={() => scrollToIndex(thumbIdx)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: imgUrl }}
                  style={styles.thumbnailImage}
                  resizeMode="cover"
                />
                {isSelected && (
                  <View style={styles.thumbnailCheck}>
                    <Ionicons name="checkmark-circle" size={14} color="#00C48C" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

export const DoubtDetailModal: React.FC<Props> = ({
  visible,
  doubt,
  onClose,
  currentUserId,
  token,
  onDoubtUpdated,
  onVolunteerPress,
  onOpenChat,
  onOpenPeerProfile
}) => {
  const [resolving, setResolving] = useState(false);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [loadingVolunteers, setLoadingVolunteers] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  // Upvote / Like state
  const [isLiked, setIsLiked] = useState(false);
  const [upvotesCount, setUpvotesCount] = useState(0);

  // Fullscreen image preview modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Fullscreen video stream modal
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  // Answers & Discussion State
  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [answers, setAnswers] = useState<any[]>([]);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [answerContent, setAnswerContent] = useState('');
  const [answerCode, setAnswerCode] = useState('');
  const [answerLang, setAnswerLang] = useState('javascript');
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  // Dynamic Keyboard Listener to keep explanation box and submit button above keyboard
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setIsKeyboardVisible(true);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Follow State
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (visible && doubt) {
      loadAnswers();
      const votes = Array.isArray(doubt.upvotes) ? doubt.upvotes : [];
      setIsLiked(currentUserId ? votes.some((u: any) => String(u) === String(currentUserId)) : false);
      setUpvotesCount(doubt.upvoteCount ?? votes.length);

      if (token) {
        loadVolunteers();
        checkFollowStatus();
      }

      // Join doubt room for focused live events
      joinDoubtRoom(doubt._id);
      const socket = getSocket();

      const handleRealtimeUpvote = (data: { doubtId: string; upvoteCount: number; isLiked: boolean; userId?: string }) => {
        if (data.doubtId === doubt._id) {
          setUpvotesCount(data.upvoteCount);
          if (data.userId && currentUserId && String(data.userId) === String(currentUserId)) {
            setIsLiked(data.isLiked);
          }
        }
      };

      const handleRealtimeComment = (data: { doubtId: string; answer: any; answerCount: number }) => {
        if (data.doubtId === doubt._id && data.answer) {
          setAnswers((prev) => {
            if (prev.some((a) => a._id === data.answer._id)) return prev;
            return [data.answer, ...prev];
          });
          if (onDoubtUpdated) {
            onDoubtUpdated({ ...doubt, answerCount: data.answerCount });
          }
        }
      };

      const handleRealtimeVolunteer = (data: { doubtId: string; volunteerCount: number; volunteerReq?: any }) => {
        if (data.doubtId === doubt._id) {
          if (data.volunteerReq) {
            setVolunteers((prev) => {
              if (prev.some((v) => v._id === data.volunteerReq._id)) return prev;
              return [data.volunteerReq, ...prev];
            });
          }
          if (onDoubtUpdated) {
            onDoubtUpdated({ ...doubt, volunteerCount: data.volunteerCount });
          }
        }
      };

      const handleRealtimeResolved = (data: { doubtId: string }) => {
        if (data.doubtId === doubt._id) {
          if (onDoubtUpdated) {
            onDoubtUpdated({ ...doubt, status: 'RESOLVED' });
          }
        }
      };

      socket.on('doubt:upvoted', handleRealtimeUpvote);
      socket.on('doubt:comment_added', handleRealtimeComment);
      socket.on('doubt:volunteer_updated', handleRealtimeVolunteer);
      socket.on('doubt:resolved', handleRealtimeResolved);

      return () => {
        socket.off('doubt:upvoted', handleRealtimeUpvote);
        socket.off('doubt:comment_added', handleRealtimeComment);
        socket.off('doubt:volunteer_updated', handleRealtimeVolunteer);
        socket.off('doubt:resolved', handleRealtimeResolved);
        leaveDoubtRoom(doubt._id);
      };
    }
  }, [visible, doubt?._id]);

  const checkFollowStatus = async () => {
    if (!doubt?.author?._id || !currentUserId) return;
    try {
      const res = await api.getFollowStatus(doubt.author._id, currentUserId);
      if (res && res.success) {
        setIsFollowing(!!res.isFollowing);
      }
    } catch (e) {
      // silent
    }
  };

  const getActiveToken = async (): Promise<string | null> => {
    if (token) return token;
    try {
      return await AsyncStorage.getItem('@peerbridge_token');
    } catch (e) {
      return null;
    }
  };

  const handleToggleFollow = async () => {
    const activeToken = await getActiveToken();
    if (!activeToken) {
      Alert.alert('Sign In Required', 'Please sign in to follow students.');
      return;
    }
    if (!doubt?.author?._id) return;
    try {
      setFollowLoading(true);
      if (isFollowing) {
        const res = await api.unfollowUser(activeToken, doubt.author._id);
        if (res && res.success) {
          setIsFollowing(false);
        }
      } else {
        const res = await api.followUser(activeToken, doubt.author._id);
        if (res && res.success) {
          setIsFollowing(true);
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update follow status.');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleLikeToggle = async () => {
    const activeToken = await getActiveToken();
    if (!activeToken || !doubt) {
      Alert.alert('Sign In Required', 'Please sign in to upvote this doubt.');
      return;
    }
    const current = isLiked;
    const count = upvotesCount;
    setIsLiked(!current);
    setUpvotesCount(current ? Math.max(0, count - 1) : count + 1);

    try {
      const res = await api.upvoteDoubt(activeToken, doubt._id);
      if (res && res.success) {
        setIsLiked(res.isLiked);
        setUpvotesCount(res.upvoteCount);
        if (onDoubtUpdated) {
          onDoubtUpdated({ ...doubt, upvoteCount: res.upvoteCount });
        }
      }
    } catch (e) {
      setIsLiked(current);
      setUpvotesCount(count);
    }
  };

  const handleShare = async () => {
    if (!doubt) return;
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

  const getTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Just now';
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const loadAnswers = async () => {
    if (!doubt?._id) return;
    try {
      setLoadingAnswers(true);
      const res = await api.getAnswers(doubt._id);
      if (res && res.success && Array.isArray(res.data)) {
        setAnswers(res.data);
      }
    } catch (e) {
      console.warn('Failed to load answers:', e);
    } finally {
      setLoadingAnswers(false);
    }
  };

  const handlePostAnswer = async () => {
    const activeToken = await getActiveToken();
    if (!activeToken) {
      Alert.alert('Sign In Required', 'Please sign in to share an explanation.');
      return;
    }
    if (!answerContent.trim() || answerContent.trim().length < 5) {
      Alert.alert('Explanation Required', 'Please provide an explanation of at least 5 characters.');
      return;
    }
    try {
      setSubmittingAnswer(true);
      const payload: any = {
        content: answerContent.trim()
      };
      if (showCodeEditor && answerCode.trim()) {
        payload.codeSnippet = answerCode.trim();
        payload.codeLanguage = answerLang;
      }
      const res = await api.postAnswer(activeToken, doubt!._id, payload);
      if (res && res.success && res.data) {
        Keyboard.dismiss();
        Alert.alert('Answer Posted!', 'Thank you for helping your peer learner.');
        setAnswers((prev) => [res.data, ...prev]);
        setAnswerContent('');
        setAnswerCode('');
        setShowCodeEditor(false);
        if (onDoubtUpdated && doubt) {
          onDoubtUpdated({ ...doubt, answerCount: (doubt.answerCount || 0) + 1 });
        }
      } else {
        Alert.alert('Failed to Post', res?.message || 'Could not post answer.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Network error posting answer.');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleVoteHelpful = async (answerId: string) => {
    const activeToken = await getActiveToken();
    if (!activeToken) {
      Alert.alert('Sign In Required', 'Please sign in to upvote answers.');
      return;
    }
    try {
      setVotingId(answerId);
      const res = await api.voteAnswerHelpful(activeToken, answerId);
      if (res && res.success) {
        setAnswers((prev) =>
          prev.map((ans) => {
            if (ans._id === answerId) {
              const currentVotes = Array.isArray(ans.helpfulVotes) ? ans.helpfulVotes : [];
              const hasVoted = currentVotes.some((uid: any) => String(uid) === String(currentUserId));
              const updatedVotes = hasVoted
                ? currentVotes.filter((uid: any) => String(uid) !== String(currentUserId))
                : [...currentVotes, currentUserId];
              return {
                ...ans,
                helpfulVotes: updatedVotes,
                helpfulCount: res.data?.helpfulCount ?? (hasVoted ? ans.helpfulCount - 1 : ans.helpfulCount + 1)
              };
            }
            return ans;
          })
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not vote.');
    } finally {
      setVotingId(null);
    }
  };

  const handleAcceptAnswer = async (answerId: string) => {
    if (!token || !doubt) return;
    Alert.alert(
      'Accept as Solution?',
      'This will mark this peer explanation as the verified solution and resolve your doubt.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept Solution',
          style: 'default',
          onPress: async () => {
            try {
              setAcceptingId(answerId);
              const res = await api.acceptAnswer(token, answerId);
              if (res && res.success) {
                Alert.alert('Solution Accepted!', 'This answer is now marked as the accepted solution.');
                setAnswers((prev) =>
                  prev.map((a) => ({
                    ...a,
                    isAccepted: a._id === answerId
                  }))
                );
                if (onDoubtUpdated) {
                  onDoubtUpdated({ ...doubt, status: 'RESOLVED' });
                }
              } else {
                Alert.alert('Error', res?.message || 'Could not accept answer.');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to accept solution.');
            } finally {
              setAcceptingId(null);
            }
          }
        }
      ]
    );
  };

  const loadVolunteers = async () => {
    if (!token || !doubt?._id) return;
    try {
      setLoadingVolunteers(true);
      const res = await api.getDoubtVolunteers(token, doubt._id);
      if (res && res.success && Array.isArray(res.data)) {
        setVolunteers(res.data);
      }
    } catch (e) {
      console.warn('Failed to fetch volunteers:', e);
    } finally {
      setLoadingVolunteers(false);
    }
  };

  const handleUpdateVolunteerStatus = async (
    volunteerReqId: string,
    status: 'ACCEPTED' | 'DECLINED'
  ) => {
    if (!token) return;
    try {
      setRespondingId(volunteerReqId);
      const res = await api.updateVolunteerStatus(token, volunteerReqId, status);
      if (res && res.success) {
        Alert.alert(
          status === 'ACCEPTED' ? 'Helper Accepted! 🎉' : 'Declined',
          res.message || 'Updated volunteer status.'
        );
        setVolunteers((prev) =>
          prev.map((v) => (v._id === volunteerReqId ? { ...v, status } : v))
        );
        if (status === 'ACCEPTED' && onDoubtUpdated && doubt) {
          onDoubtUpdated({ ...doubt, status: 'IN_PROGRESS' });
        }
      } else {
        Alert.alert('Action Failed', res?.message || 'Could not update volunteer status.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Network error updating volunteer.');
    } finally {
      setRespondingId(null);
    }
  };

  if (!doubt) return null;

  const isAuthor = currentUserId && String(doubt.author?._id) === String(currentUserId);

  const handleResolve = () => {
    Alert.alert(
      'Mark as Resolved?',
      'Are you satisfied with the help and explanations you received for this doubt?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Resolved',
          style: 'default',
          onPress: async () => {
            const activeToken = await getActiveToken();
            if (!activeToken) return;
            try {
              setResolving(true);
              const res = await api.resolveDoubt(activeToken, doubt._id);
              if (res && res.success && res.data) {
                Alert.alert('Resolved!', 'Your academic doubt is now marked as resolved.');
                if (onDoubtUpdated) {
                  onDoubtUpdated({ ...doubt, status: 'RESOLVED' });
                }
                onClose();
              } else {
                Alert.alert('Error', res?.message || 'Could not resolve doubt.');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to resolve doubt.');
            } finally {
              setResolving(false);
            }
          }
        }
      ]
    );
  };

  const avatarUri =
    doubt.author?.avatar && doubt.author.avatar.startsWith('http')
      ? { uri: doubt.author.avatar }
      : defaultAvatar;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* Top Header Bar */}
          <View style={styles.headerBar}>
            <TouchableOpacity style={styles.backBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={20} color="#0F172A" />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                Question Discussion
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {doubt.subject || 'Academic Query'}{doubt.topic ? ` • ${doubt.topic}` : ''}
              </Text>
            </View>

            <View style={styles.headerRightActions}>
              <TouchableOpacity
                style={[styles.headerActionBtn, isLiked && styles.headerActionBtnLiked]}
                onPress={handleLikeToggle}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={19}
                  color={isLiked ? '#EF4444' : '#0F172A'}
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.headerActionBtn} onPress={handleShare} activeOpacity={0.7}>
                <Ionicons name="share-social-outline" size={19} color="#0F172A" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingBottom: isKeyboardVisible
                  ? keyboardHeight + 80
                  : (isAuthor ? doubt.status !== 'RESOLVED' : (doubt.status === 'OPEN' && !!onVolunteerPress))
                  ? 110
                  : 32
              }
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
          {/* Main Doubt Header Card */}
          <View style={styles.mainDoubtCard}>
            {/* Status & Subject Pill Row */}
            <View style={styles.metaRow}>
              <View
                style={[
                  styles.statusBadge,
                  doubt.status === 'RESOLVED'
                    ? styles.statusResolved
                    : doubt.status === 'IN_PROGRESS'
                    ? styles.statusProgress
                    : styles.statusOpen
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        doubt.status === 'RESOLVED'
                          ? '#047857'
                          : doubt.status === 'IN_PROGRESS'
                          ? '#2563EB'
                          : '#00C48C'
                    }
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    {
                      color:
                        doubt.status === 'RESOLVED'
                          ? '#047857'
                          : doubt.status === 'IN_PROGRESS'
                          ? '#1D4ED8'
                          : '#047857'
                    }
                  ]}
                >
                  {doubt.status === 'OPEN'
                    ? 'Open for Help'
                    : doubt.status === 'IN_PROGRESS'
                    ? 'Peer Helping'
                    : 'Resolved'}
                </Text>
              </View>

              <View style={styles.subjectChip}>
                <Ionicons name="book-outline" size={12} color="#00C48C" style={{ marginRight: 4 }} />
                <Text style={styles.subjectChipText}>{doubt.subject}</Text>
              </View>

              {doubt.topic ? (
                <View style={styles.topicChip}>
                  <Text style={styles.topicChipText}>#{doubt.topic}</Text>
                </View>
              ) : null}

              <Text style={styles.timeAgoText}>{getTimeAgo(doubt.createdAt)}</Text>
            </View>

            {/* Doubt Title */}
            <Text style={styles.doubtTitle}>{doubt.title}</Text>

            {/* Author Profile Strip */}
            <View style={styles.authorStrip}>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                activeOpacity={0.8}
                onPress={() => {
                  if (doubt.author?._id && onOpenPeerProfile) {
                    onClose();
                    onOpenPeerProfile(doubt.author._id);
                  }
                }}
              >
                <Image source={avatarUri} style={styles.authorAvatar} resizeMode="cover" />
                <View style={styles.authorMeta}>
                  <View style={styles.authorNameRow}>
                    <Text style={styles.authorName}>{doubt.author?.name || 'Student Peer'}</Text>
                    {isAuthor && <Text style={styles.youBadge}>(Author)</Text>}
                  </View>
                  <Text style={styles.authorCollege} numberOfLines={1}>
                    {doubt.author?.college || doubt.author?.department || 'PeerBridge Student'}
                  </Text>
                </View>
              </TouchableOpacity>

              {!isAuthor && (
                <View style={styles.authorActionsRow}>
                  <TouchableOpacity
                    style={styles.chatIconBtn}
                    onPress={() => {
                      onClose();
                      if (onOpenChat) {
                        onOpenChat(doubt.author, { title: doubt.title, subject: doubt.subject });
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={16} color="#00C48C" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.followBtn, isFollowing && styles.followingBtn]}
                    onPress={handleToggleFollow}
                    disabled={followLoading}
                    activeOpacity={0.7}
                  >
                    {followLoading ? (
                      <ActivityIndicator size="small" color={isFollowing ? '#64748B' : '#FFFFFF'} />
                    ) : (
                      <>
                        <Ionicons
                          name={isFollowing ? 'checkmark' : 'person-add'}
                          size={12}
                          color={isFollowing ? '#047857' : '#FFFFFF'}
                          style={{ marginRight: 4 }}
                        />
                        <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                          {isFollowing ? 'Following' : 'Follow'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Question & Context Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconBadge}>
                <Ionicons name="help-circle" size={16} color="#00C48C" />
              </View>
              <Text style={styles.sectionHeader}>Question & Academic Context</Text>
            </View>
            <Text style={styles.questionBody}>{doubt.question}</Text>
          </View>

          {/* Code Snippet Box (If present) */}
          {doubt.codeSnippet ? (
            <View style={styles.codeContainer}>
              <View style={styles.codeHeader}>
                <View style={styles.codeDotRow}>
                  <View style={[styles.codeDot, { backgroundColor: '#EF4444' }]} />
                  <View style={[styles.codeDot, { backgroundColor: '#F59E0B' }]} />
                  <View style={[styles.codeDot, { backgroundColor: '#10B981' }]} />
                </View>
                <Text style={styles.codeLangText}>{doubt.codeLanguage || 'code'}</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Text style={styles.codeText}>{doubt.codeSnippet}</Text>
              </ScrollView>
            </View>
          ) : null}

          {/* Attached Images / Diagrams Carousel Card */}
          {Array.isArray(doubt.attachments) && doubt.attachments.length > 0 ? (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.sectionIconBadge, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="images" size={16} color="#0284C7" />
                </View>
                <View style={styles.sectionHeaderFlex}>
                  <Text style={styles.sectionHeader}>
                    Attached Reference Diagrams ({doubt.attachments.length})
                  </Text>
                  <Text style={styles.zoomHintText}>Swipe or tap to view</Text>
                </View>
              </View>

              <AttachmentsCarousel
                attachments={doubt.attachments}
                onPreviewImage={(url) => setPreviewImage(url)}
              />
            </View>
          ) : null}

          {/* Attached Video Clip (Max 10MB) */}
          {doubt.videoUrl ? (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.sectionIconBadge, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="videocam" size={16} color="#DC2626" />
                </View>
                <View style={styles.sectionHeaderFlex}>
                  <Text style={styles.sectionHeader}>Attached Video Clip</Text>
                  <Text style={styles.zoomHintText}>Under 10MB explanation</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.detailVideoCard}
                activeOpacity={0.88}
                onPress={() => setPreviewVideoUrl(doubt.videoUrl || null)}
              >
                <View style={styles.detailVideoIconCircle}>
                  <Ionicons name="play" size={24} color="#FFFFFF" style={{ marginLeft: 3 }} />
                </View>
                <View style={styles.detailVideoMeta}>
                  <Text style={styles.detailVideoTitle}>Watch Academic Video Explanation</Text>
                  <Text style={styles.detailVideoSub}>
                    {doubt.videoDuration ? `${Math.round(doubt.videoDuration)}s • ` : ''}
                    Cloudinary streaming • Max 10MB clip
                  </Text>
                </View>
                <Ionicons name="open-outline" size={20} color="#00C48C" />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Tags */}
          {Array.isArray(doubt.tags) && doubt.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {doubt.tags.map((t) => (
                <View key={t} style={styles.tagBadge}>
                  <Text style={styles.tagText}>#{t}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Activity Metrics (Likes, Solutions, Helpers) */}
          <View style={styles.statsCard}>
            <TouchableOpacity style={styles.statCol} onPress={handleLikeToggle} activeOpacity={0.7}>
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={20}
                color={isLiked ? '#EF4444' : '#64748B'}
              />
              <Text style={[styles.statNumber, isLiked && { color: '#EF4444' }]}>{upvotesCount}</Text>
              <Text style={styles.statLabel}>Likes</Text>
            </TouchableOpacity>

            <View style={styles.statDivider} />

            <View style={styles.statCol}>
              <Ionicons name="chatbubbles-outline" size={20} color="#3B82F6" />
              <Text style={styles.statNumber}>{doubt.answerCount || answers.length}</Text>
              <Text style={styles.statLabel}>Solutions</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statCol}>
              <Ionicons name="people-outline" size={20} color="#00C48C" />
              <Text style={styles.statNumber}>{doubt.volunteerCount || volunteers.length}</Text>
              <Text style={styles.statLabel}>Helpers</Text>
            </View>
          </View>

          {/* Volunteer Review Section (For Doubt Author) */}
          {isAuthor && (
            <View style={styles.volunteersSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionIconBadge}>
                  <Ionicons name="hand-right" size={16} color="#00C48C" />
                </View>
                <Text style={styles.sectionHeader}>Interested Helpers ({volunteers.length})</Text>
              </View>

              {loadingVolunteers ? (
                <ActivityIndicator color="#00C48C" style={{ marginVertical: 14 }} />
              ) : volunteers.length === 0 ? (
                <View style={styles.emptyVolunteersBox}>
                  <Text style={styles.emptyVolunteersText}>
                    No peer volunteers yet. Students who can help will appear here for you to accept.
                  </Text>
                </View>
              ) : (
                volunteers.map((reqItem) => {
                  const volunteer = reqItem.volunteerId;
                  const vAvatar =
                    volunteer?.avatar && volunteer.avatar.startsWith('http')
                      ? { uri: volunteer.avatar }
                      : defaultAvatar;
                  return (
                    <View key={reqItem._id} style={styles.volunteerCard}>
                      <View style={styles.volunteerTopRow}>
                        <Image source={vAvatar} style={styles.volunteerAvatar} />
                        <View style={styles.volunteerMeta}>
                          <Text style={styles.volunteerName}>{volunteer?.name || 'Peer Helper'}</Text>
                          <Text style={styles.volunteerSub} numberOfLines={1}>
                            {volunteer?.college || volunteer?.department || 'PeerBridge Student'}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.vStatusBadge,
                            reqItem.status === 'ACCEPTED'
                              ? styles.vAccepted
                              : reqItem.status === 'DECLINED'
                              ? styles.vDeclined
                              : styles.vPending
                          ]}
                        >
                          <Text
                            style={[
                              styles.vStatusText,
                              reqItem.status === 'ACCEPTED'
                                ? { color: '#047857' }
                                : reqItem.status === 'DECLINED'
                                ? { color: '#64748B' }
                                : { color: '#D97706' }
                            ]}
                          >
                            {reqItem.status}
                          </Text>
                        </View>
                      </View>

                      {reqItem.introMessage ? (
                        <View style={styles.introMessageBox}>
                          <Text style={styles.introMessageText}>"{reqItem.introMessage}"</Text>
                        </View>
                      ) : null}

                      {reqItem.status === 'PENDING' && (
                        <View style={styles.volunteerActionsRow}>
                          <TouchableOpacity
                            style={styles.acceptBtn}
                            onPress={() => handleUpdateVolunteerStatus(reqItem._id, 'ACCEPTED')}
                            disabled={respondingId === reqItem._id}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="checkmark" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                            <Text style={styles.acceptBtnText}>Accept Helper</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.declineBtn}
                            onPress={() => handleUpdateVolunteerStatus(reqItem._id, 'DECLINED')}
                            disabled={respondingId === reqItem._id}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.declineBtnText}>Decline</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {reqItem.status === 'ACCEPTED' && (
                        <View style={styles.volunteerActionsRow}>
                          <TouchableOpacity
                            style={styles.chatHelperBtn}
                            onPress={() => {
                              onClose();
                              if (onOpenChat) {
                                onOpenChat(volunteer, { title: doubt.title, subject: doubt.subject });
                              }
                            }}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="chatbubbles-outline" size={14} color="#00C48C" style={{ marginRight: 6 }} />
                            <Text style={styles.chatHelperBtnText}>Message Helper</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* Solutions & Discussion Section */}
          <View style={styles.answersSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconBadge, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="chatbubbles" size={16} color="#3B82F6" />
              </View>
              <Text style={styles.sectionHeader}>Solutions & Explanations ({answers.length})</Text>
            </View>

            {loadingAnswers ? (
              <ActivityIndicator color="#3B82F6" style={{ marginVertical: 14 }} />
            ) : answers.length === 0 ? (
              <View style={styles.emptyAnswersBox}>
                <Ionicons name="bulb-outline" size={32} color="#00C48C" style={{ marginBottom: 6 }} />
                <Text style={styles.emptyAnswersTitle}>No solutions yet</Text>
                <Text style={styles.emptyAnswersSub}>
                  Be the first peer to provide a step-by-step explanation below!
                </Text>
              </View>
            ) : (
              answers.map((ans) => {
                const ansAvatar =
                  ans.author?.avatar && ans.author.avatar.startsWith('http')
                    ? { uri: ans.author.avatar }
                    : defaultAvatar;
                const hasVoted =
                  Array.isArray(ans.helpfulVotes) &&
                  ans.helpfulVotes.some((uid: any) => String(uid) === String(currentUserId));

                return (
                  <View
                    key={ans._id}
                    style={[styles.answerCard, ans.isAccepted && styles.acceptedAnswerCard]}
                  >
                    {/* Verified Solution Badge */}
                    {ans.isAccepted && (
                      <View style={styles.verifiedSolutionBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#047857" style={{ marginRight: 4 }} />
                        <Text style={styles.verifiedSolutionText}>Accepted Solution</Text>
                      </View>
                    )}

                    {/* Author Meta */}
                    <View style={styles.ansAuthorRow}>
                      <Image source={ansAvatar} style={styles.ansAuthorAvatar} />
                      <View style={styles.ansAuthorMeta}>
                        <Text style={styles.ansAuthorName}>{ans.author?.name || 'Peer Scholar'}</Text>
                        <Text style={styles.ansAuthorSub} numberOfLines={1}>
                          {ans.author?.college || ans.author?.department || 'PeerBridge Student'}
                        </Text>
                      </View>
                    </View>

                    {/* Content */}
                    <Text style={styles.ansContentText}>{ans.content}</Text>

                    {/* Code Snippet */}
                    {ans.codeSnippet ? (
                      <View style={styles.ansCodeContainer}>
                        <View style={styles.ansCodeHeader}>
                          <Text style={styles.ansCodeLang}>{ans.codeLanguage || 'code'}</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <Text style={styles.ansCodeText}>{ans.codeSnippet}</Text>
                        </ScrollView>
                      </View>
                    ) : null}

                    {/* Action Row */}
                    <View style={styles.ansActionRow}>
                      <TouchableOpacity
                        style={[styles.voteHelpfulBtn, hasVoted && styles.voteHelpfulActive]}
                        onPress={() => handleVoteHelpful(ans._id)}
                        disabled={votingId === ans._id}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={hasVoted ? 'thumbs-up' : 'thumbs-up-outline'}
                          size={14}
                          color={hasVoted ? '#00C48C' : '#64748B'}
                          style={{ marginRight: 5 }}
                        />
                        <Text style={[styles.voteHelpfulText, hasVoted && styles.voteHelpfulTextActive]}>
                          Helpful ({ans.helpfulCount || 0})
                        </Text>
                      </TouchableOpacity>

                      {/* If Current User is Doubt Author & Answer not yet accepted */}
                      {isAuthor && !ans.isAccepted && doubt.status !== 'RESOLVED' && (
                        <TouchableOpacity
                          style={styles.markSolutionBtn}
                          onPress={() => handleAcceptAnswer(ans._id)}
                          disabled={acceptingId === ans._id}
                          activeOpacity={0.8}
                        >
                          {acceptingId === ans._id ? (
                            <ActivityIndicator size="small" color="#047857" />
                          ) : (
                            <>
                              <Ionicons name="checkmark-done" size={14} color="#047857" style={{ marginRight: 4 }} />
                              <Text style={styles.markSolutionText}>Accept Solution</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}

            {/* Answer Input Box (If Doubt not closed) */}
            <View style={styles.addAnswerContainer}>
              <Text style={styles.addAnswerTitle}>Share an Explanation</Text>
              <TextInput
                style={styles.addAnswerInput}
                placeholder="Explain the solution step-by-step to help your peer..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
                value={answerContent}
                onChangeText={setAnswerContent}
                textAlignVertical="top"
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 150);
                }}
              />

              {/* Code Snippet Toggle */}
              <TouchableOpacity
                style={styles.toggleCodeBtn}
                onPress={() => setShowCodeEditor(!showCodeEditor)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showCodeEditor ? 'chevron-up' : 'code-slash'}
                  size={14}
                  color="#00C48C"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.toggleCodeText}>
                  {showCodeEditor ? 'Hide Code Snippet' : '+ Add Code Snippet'}
                </Text>
              </TouchableOpacity>

              {showCodeEditor && (
                <View style={styles.codeEditorBox}>
                  {/* Language chips */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.langScroll}>
                    {CODE_LANGUAGES.map((lang) => (
                      <TouchableOpacity
                        key={lang}
                        style={[styles.langChip, answerLang === lang && styles.langChipActive]}
                        onPress={() => setAnswerLang(lang)}
                      >
                        <Text style={[styles.langChipText, answerLang === lang && styles.langChipTextActive]}>
                          {lang}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <TextInput
                    style={styles.codeSnippetInput}
                    placeholder="// Paste or write solution code here..."
                    placeholderTextColor="#64748B"
                    multiline
                    numberOfLines={4}
                    value={answerCode}
                    onChangeText={setAnswerCode}
                    textAlignVertical="top"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onFocus={() => {
                      setTimeout(() => {
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                      }, 150);
                    }}
                  />
                </View>
              )}

              <TouchableOpacity
                style={styles.postAnswerBtn}
                onPress={handlePostAnswer}
                disabled={submittingAnswer}
                activeOpacity={0.85}
              >
                {submittingAnswer ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="send" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.postAnswerBtnText}>Post Solution</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Sticky Action Footer (Hidden during active typing to avoid blocking input or buttons) */}
        {!isKeyboardVisible && ((isAuthor && doubt.status !== 'RESOLVED') || (!isAuthor && doubt.status === 'OPEN' && !!onVolunteerPress)) && (
          <View style={styles.stickyFooter}>
            {isAuthor ? (
              <TouchableOpacity
                style={styles.resolveBtn}
                onPress={handleResolve}
                disabled={resolving}
                activeOpacity={0.85}
              >
                {resolving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.resolveBtnText}>Mark Question as Resolved</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.volunteerActionBtn}
                onPress={() => {
                  onClose();
                  if (onVolunteerPress) onVolunteerPress(doubt);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="hand-right" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.volunteerActionBtnText}>I Can Help With This Doubt</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Fullscreen Photo Zoom Viewer Modal */}
        <Modal
          visible={Boolean(previewImage)}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setPreviewImage(null)}
        >
          <View style={styles.fullscreenModal}>
            <TouchableOpacity
              style={styles.fullscreenCloseBtn}
              onPress={() => setPreviewImage(null)}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle" size={38} color="#FFFFFF" />
            </TouchableOpacity>
            {previewImage && (
              <Image source={{ uri: previewImage }} style={styles.fullscreenImage} resizeMode="contain" />
            )}
          </View>
        </Modal>

        {/* Fullscreen Video Stream Viewer Modal */}
        <Modal
          visible={Boolean(previewVideoUrl)}
          transparent={false}
          animationType="slide"
          onRequestClose={() => setPreviewVideoUrl(null)}
        >
          <View style={styles.videoPlayerModalContainer}>
            <View style={styles.videoPlayerModalHeader}>
              <TouchableOpacity
                style={styles.videoPlayerCloseBtn}
                onPress={() => setPreviewVideoUrl(null)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.videoPlayerTitle}>Doubt Video Explanation</Text>
              <View style={{ width: 36 }} />
            </View>

            <View style={styles.videoPlayerModalBody}>
              <View style={styles.videoPlayerCard}>
                <View style={styles.videoLargeCircle}>
                  <Ionicons name="play-circle" size={80} color="#00C48C" />
                </View>
                <Text style={styles.videoPlayerPromptTitle}>Stream Video Explanation</Text>
                <Text style={styles.videoPlayerPromptSub}>
                  Max 10MB High Quality Video Clip for Doubt Resolution
                </Text>

                <TouchableOpacity
                  style={styles.streamVideoNowBtn}
                  activeOpacity={0.85}
                  onPress={async () => {
                    if (previewVideoUrl) {
                      try {
                        await Linking.openURL(previewVideoUrl);
                      } catch (e) {
                        Alert.alert('Cannot Open', 'Unable to stream video link.');
                      }
                    }
                  }}
                >
                  <Ionicons name="play" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.streamVideoNowBtnText}>Stream Video Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'android' ? 24 : 0
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 1
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  headerActionBtnLiked: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA'
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110
  },
  mainDoubtCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5
  },
  statusOpen: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0'
  },
  statusProgress: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE'
  },
  statusResolved: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0'
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800'
  },
  subjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCFCE7'
  },
  subjectChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D'
  },
  topicChip: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  topicChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B'
  },
  timeAgoText: {
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 'auto'
  },
  doubtTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 27,
    letterSpacing: -0.4,
    marginBottom: 14
  },
  authorStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  authorAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: '#00C48C'
  },
  authorMeta: {
    marginLeft: 10,
    flex: 1
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  authorName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A'
  },
  youBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00C48C',
    marginLeft: 4
  },
  authorCollege: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },
  authorActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  chatIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center'
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00C48C',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10
  },
  followingBtn: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  followBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700'
  },
  followingBtnText: {
    color: '#047857',
    fontWeight: '700'
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionHeaderFlex: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  sectionIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2
  },
  zoomHintText: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600'
  },
  questionBody: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 23
  },
  codeContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingBottom: 6
  },
  codeDotRow: {
    flexDirection: 'row',
    gap: 5
  },
  codeDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  codeLangText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  codeText: {
    color: '#38BDF8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    lineHeight: 18
  },
  carouselContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 4
  },
  carouselViewport: {
    height: 270,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center'
  },
  carouselSlide: {
    height: 270,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A'
  },
  carouselImage: {
    width: '100%',
    height: '100%'
  },
  carouselCounterBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20
  },
  carouselCounterText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700'
  },
  carouselZoomBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20
  },
  carouselZoomText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700'
  },
  carouselArrowBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10
  },
  carouselArrowLeft: {
    left: 8
  },
  carouselArrowRight: {
    right: 8
  },
  carouselDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 6
  },
  carouselDot: {
    height: 6,
    borderRadius: 3
  },
  carouselDotActive: {
    width: 22,
    backgroundColor: '#00C48C'
  },
  carouselDotInactive: {
    width: 6,
    backgroundColor: '#CBD5E1'
  },
  thumbnailStrip: {
    marginTop: 10,
    width: '100%'
  },
  thumbnailStripContent: {
    paddingHorizontal: 2,
    gap: 8,
    alignItems: 'center'
  },
  thumbnailBox: {
    width: 52,
    height: 52,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    position: 'relative'
  },
  thumbnailBoxSelected: {
    borderColor: '#00C48C',
    borderWidth: 2
  },
  thumbnailImage: {
    width: '100%',
    height: '100%'
  },
  thumbnailCheck: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 8
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14
  },
  tagBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569'
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6
  },
  statCol: {
    alignItems: 'center',
    flex: 1
  },
  statNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#F1F5F9'
  },
  volunteersSection: {
    marginBottom: 16
  },
  emptyVolunteersBox: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center'
  },
  emptyVolunteersText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18
  },
  volunteerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  volunteerTopRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  volunteerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  volunteerMeta: {
    marginLeft: 10,
    flex: 1
  },
  volunteerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A'
  },
  volunteerSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1
  },
  vStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1
  },
  vPending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A'
  },
  vAccepted: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0'
  },
  vDeclined: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0'
  },
  vStatusText: {
    fontSize: 10,
    fontWeight: '800'
  },
  introMessageBox: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#00C48C'
  },
  introMessageText: {
    fontSize: 12,
    color: '#334155',
    fontStyle: 'italic',
    lineHeight: 17
  },
  volunteerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC'
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00C48C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginRight: 8
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700'
  },
  declineBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  declineBtnText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600'
  },
  chatHelperBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10
  },
  chatHelperBtnText: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '700'
  },
  answersSection: {
    marginBottom: 20
  },
  emptyAnswersBox: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    marginBottom: 16
  },
  emptyAnswersTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4
  },
  emptyAnswersSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18
  },
  answerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  acceptedAnswerCard: {
    borderColor: '#00C48C',
    borderWidth: 1.5,
    backgroundColor: '#F0FDF4'
  },
  verifiedSolutionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 10
  },
  verifiedSolutionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857'
  },
  ansAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  ansAuthorAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  ansAuthorMeta: {
    marginLeft: 10,
    flex: 1
  },
  ansAuthorName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A'
  },
  ansAuthorSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1
  },
  ansContentText: {
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 21,
    marginBottom: 10
  },
  ansCodeContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12
  },
  ansCodeHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingBottom: 4,
    marginBottom: 6
  },
  ansCodeLang: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  ansCodeText: {
    color: '#38BDF8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    lineHeight: 18
  },
  ansActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  voteHelpfulBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  voteHelpfulActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0'
  },
  voteHelpfulText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B'
  },
  voteHelpfulTextActive: {
    color: '#047857',
    fontWeight: '700'
  },
  markSolutionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  markSolutionText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '700'
  },
  addAnswerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginTop: 8
  },
  addAnswerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    letterSpacing: -0.2
  },
  addAnswerInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 80,
    marginBottom: 10
  },
  toggleCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 10
  },
  toggleCodeText: {
    color: '#00C48C',
    fontSize: 12,
    fontWeight: '700'
  },
  codeEditorBox: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12
  },
  langScroll: {
    marginBottom: 8
  },
  langChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#1E293B',
    marginRight: 6
  },
  langChipActive: {
    backgroundColor: '#00C48C'
  },
  langChipText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700'
  },
  langChipTextActive: {
    color: '#FFFFFF'
  },
  codeSnippetInput: {
    color: '#38BDF8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    minHeight: 80
  },
  postAnswerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00C48C',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4
  },
  postAnswerBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700'
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10
  },
  volunteerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00C48C',
    height: 50,
    borderRadius: 16,
    shadowColor: '#00C48C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4
  },
  volunteerActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  },
  resolveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#047857',
    height: 50,
    borderRadius: 16
  },
  resolveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  },
  alreadyResolvedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  alreadyResolvedText: {
    color: '#065F46',
    fontSize: 13,
    fontWeight: '700'
  },
  fullscreenModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  fullscreenCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    zIndex: 999
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8
  },
  detailVideoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8
  },
  detailVideoIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  detailVideoMeta: {
    flex: 1
  },
  detailVideoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A'
  },
  detailVideoSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2
  },
  videoPlayerModalContainer: {
    flex: 1,
    backgroundColor: '#0F172A'
  },
  videoPlayerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 36 : 54,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B'
  },
  videoPlayerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center'
  },
  videoPlayerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  videoPlayerModalBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  videoPlayerCard: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155'
  },
  videoLargeCircle: {
    marginBottom: 20
  },
  videoPlayerPromptTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center'
  },
  videoPlayerPromptSub: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 18
  },
  streamVideoNowBtn: {
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
  streamVideoNowBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF'
  }
});
