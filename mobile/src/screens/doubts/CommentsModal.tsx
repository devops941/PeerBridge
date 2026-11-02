import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { DoubtItem } from '../../types';
import { api } from '../../services/api';
import { getSocket, joinDoubtRoom, leaveDoubtRoom } from '../../services/socket';

interface Props {
  visible: boolean;
  doubt: DoubtItem | null;
  currentUser?: any;
  token?: string | null;
  onClose: () => void;
  onCommentAdded?: (doubtId: string, updatedCount: number) => void;
  onOpenPeerProfile?: (userId: string) => void;
}

const defaultAvatar = require('../../../assets/user.png');

export const CommentsModal: React.FC<Props> = ({
  visible,
  doubt,
  currentUser,
  token,
  onClose,
  onCommentAdded,
  onOpenPeerProfile
}) => {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);

  // Auto-scroll to latest comment when keyboard pops up & track keyboard height
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (visible && doubt?._id) {
      loadComments(doubt._id);
      joinDoubtRoom(doubt._id);

      const socket = getSocket();
      const handleRealtimeComment = (data: { doubtId: string; answer: any; answerCount: number }) => {
        if (data.doubtId === doubt._id && data.answer) {
          setComments((prev) => {
            if (prev.some((c) => c._id === data.answer._id)) return prev;
            return [...prev, data.answer];
          });
          if (onCommentAdded) {
            onCommentAdded(doubt._id, data.answerCount);
          }
        }
      };

      socket.on('doubt:comment_added', handleRealtimeComment);

      return () => {
        socket.off('doubt:comment_added', handleRealtimeComment);
        leaveDoubtRoom(doubt._id);
      };
    } else {
      setComments([]);
      setCommentText('');
    }
  }, [visible, doubt?._id]);

  const loadComments = async (doubtId: string) => {
    try {
      setLoading(true);
      const res = await api.getAnswers(doubtId);
      if (res && res.success && Array.isArray(res.data)) {
        setComments(res.data);
      }
    } catch (err) {
      console.warn('Failed to load comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim()) return;

    let activeToken = token;
    if (!activeToken) {
      try {
        activeToken = await AsyncStorage.getItem('@peerbridge_token');
      } catch (e) {}
    }

    if (!activeToken) {
      Alert.alert('Sign In Required', 'Please sign in to write comments.');
      return;
    }
    if (!doubt?._id) return;

    const trimmed = commentText.trim();
    try {
      setSubmitting(true);
      const res = await api.postAnswer(activeToken, doubt._id, {
        content: trimmed
      });

      if (res && res.success && res.data) {
        Keyboard.dismiss();
        const newComment = res.data;
        const updated = [...comments, newComment];
        setCommentText('');
        if (onCommentAdded) {
          onCommentAdded(doubt._id, updated.length);
        }
      } else {
        Alert.alert('Error', res?.message || 'Failed to post comment.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Network error posting comment.');
    } finally {
      setSubmitting(false);
    }
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

  const myAvatarUri =
    currentUser?.avatar && currentUser.avatar.startsWith('http')
      ? { uri: currentUser.avatar }
      : defaultAvatar;

  if (!doubt) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        {/* Background Backdrop tap to close */}
        <TouchableOpacity
          style={styles.backdropTap}
          activeOpacity={1}
          onPress={onClose}
        />

        <View
          style={[
            styles.sheetContainer,
            Platform.OS === 'android' && keyboardHeight > 0 && {
              marginBottom: keyboardHeight
            }
          ]}
        >
          {/* Top Sheet Drag Indicator */}
          <View style={styles.sheetHandleBox}>
            <View style={styles.sheetHandle} />
          </View>

          {/* Sheet Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerTitleBox}>
              <Text style={styles.headerTitle}>Comments</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {doubt.title}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#0F172A" />
            </TouchableOpacity>
          </View>

          {/* Comments List */}
          {loading ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="small" color="#00C48C" />
              <Text style={styles.loadingText}>Loading comments...</Text>
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="chatbubbles-outline" size={32} color="#00C48C" />
              </View>
              <Text style={styles.emptyTitle}>No comments yet</Text>
              <Text style={styles.emptySub}>
                Start the academic conversation and share your explanation below!
              </Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={comments}
              keyExtractor={(item) => item._id || Math.random().toString()}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
              renderItem={({ item }) => {
                const avatar =
                  item.author?.avatar && item.author.avatar.startsWith('http')
                    ? { uri: item.author.avatar }
                    : defaultAvatar;

                return (
                  <View style={styles.commentItem}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        if (item.author?._id && onOpenPeerProfile) {
                          onOpenPeerProfile(item.author._id);
                        }
                      }}
                    >
                      <Image source={avatar} style={styles.commentAvatar} />
                    </TouchableOpacity>
                    <View style={styles.commentBody}>
                      <View style={styles.commentAuthorRow}>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => {
                            if (item.author?._id && onOpenPeerProfile) {
                              onOpenPeerProfile(item.author._id);
                            }
                          }}
                        >
                          <Text style={styles.commentAuthorName}>
                            {item.author?.name || 'Student Peer'}
                          </Text>
                        </TouchableOpacity>
                        <Text style={styles.commentTime}>{getTimeAgo(item.createdAt)}</Text>
                      </View>
                      <Text style={styles.commentText}>{item.content}</Text>
                    </View>
                  </View>
                );
              }}
            />
          )}

          {/* Bottom Pinned Input Bar */}
          <View style={styles.inputBar}>
            <Image source={myAvatarUri} style={styles.inputAvatar} />
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="Add a comment or solution..."
              placeholderTextColor="#94A3B8"
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                commentText.trim().length > 0 && styles.sendBtnActive,
                submitting && { opacity: 0.6 }
              ]}
              onPress={handlePostComment}
              disabled={submitting || commentText.trim().length === 0}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name="arrow-up"
                  size={18}
                  color={commentText.trim().length > 0 ? '#FFFFFF' : '#94A3B8'}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end'
  },
  backdropTap: {
    flex: 1
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '40%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10
  },
  sheetHandleBox: {
    alignItems: 'center',
    paddingVertical: 10
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1'
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  headerTitleBox: {
    flex: 1,
    marginRight: 10
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A'
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  loaderBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A'
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 16
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 18,
    alignItems: 'flex-start'
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    marginRight: 12
  },
  commentBody: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  commentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  commentAuthorName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A'
  },
  commentTime: {
    fontSize: 11,
    color: '#94A3B8'
  },
  commentText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF'
  },
  inputAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 10,
    backgroundColor: '#F1F5F9'
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    maxHeight: 100,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center'
  },
  sendBtnActive: {
    backgroundColor: '#00C48C'
  }
});
