import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

const defaultAvatar = require('../../assets/user.png');

export interface NotificationItem {
  _id: string;
  sender?: {
    _id: string;
    name: string;
    avatar?: string;
    department?: string;
    college?: string;
  };
  type: 'FOLLOW_REQUEST' | 'FOLLOW_ACCEPTED' | 'MESSAGE' | 'DOUBT_ANSWER' | 'DOUBT_UPVOTE' | 'SYSTEM';
  title: string;
  message: string;
  data?: {
    requestId?: string;
    partnerId?: string;
    peerId?: string;
    doubtId?: string;
  };
  read: boolean;
  createdAt: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  token?: string | null;
  onOpenPeerProfile?: (userId: string) => void;
  onOpenChatWithPartner?: (partner: any) => void;
  onOpenDoubt?: (doubtId: string) => void;
  onNotificationsRead?: () => void;
}

export const NotificationCenterModal: React.FC<Props> = ({
  visible,
  onClose,
  token,
  onOpenPeerProfile,
  onOpenChatWithPartner,
  onOpenDoubt,
  onNotificationsRead
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'REQUESTS' | 'MESSAGES'>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadNotifications();
    }
  }, [visible]);

  const getEffectiveToken = async () => {
    if (token) return token;
    return await AsyncStorage.getItem('@peerbridge_token');
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const activeToken = await getEffectiveToken();
      if (!activeToken) return;

      const res = await api.getNotifications(activeToken);
      if (res && res.success && Array.isArray(res.data)) {
        setNotifications(res.data);
      }

      // Automatically mark all as read so the badge is cleared
      await api.markAllNotificationsRead(activeToken);
      if (onNotificationsRead) {
        onNotificationsRead();
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptFollow = async (requestId: string, item: NotificationItem) => {
    try {
      setActionLoadingId(item._id);
      const activeToken = await getEffectiveToken();
      if (!activeToken) return;

      const res = await api.acceptFollowRequest(activeToken, requestId);
      if (res && res.success) {
        setNotifications((prev) =>
          prev.map((n) =>
            n._id === item._id
              ? { ...n, message: 'Follow request accepted.', type: 'FOLLOW_ACCEPTED' as any }
              : n
          )
        );
        if (onNotificationsRead) onNotificationsRead();
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to accept follow request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeclineFollow = async (requestId: string, item: NotificationItem) => {
    try {
      setActionLoadingId(item._id);
      const activeToken = await getEffectiveToken();
      if (!activeToken) return;

      const res = await api.declineFollowRequest(activeToken, requestId);
      if (res && res.success) {
        setNotifications((prev) => prev.filter((n) => n._id !== item._id));
        if (onNotificationsRead) onNotificationsRead();
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to decline follow request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleItemPress = (item: NotificationItem) => {
    onClose();
    if (item.type === 'MESSAGE' && item.sender) {
      if (onOpenChatWithPartner) {
        onOpenChatWithPartner({
          _id: item.sender._id || item.data?.partnerId,
          name: item.sender.name,
          avatar: item.sender.avatar,
          department: item.sender.department,
          college: item.sender.college
        });
      }
    } else if (item.type === 'FOLLOW_REQUEST' || item.type === 'FOLLOW_ACCEPTED') {
      const peerId = item.sender?._id || item.data?.peerId;
      if (peerId && onOpenPeerProfile) {
        onOpenPeerProfile(peerId);
      }
    } else if (item.data?.doubtId && onOpenDoubt) {
      onOpenDoubt(item.data.doubtId);
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

  const filtered = notifications.filter((n) => {
    if (filter === 'REQUESTS') return n.type === 'FOLLOW_REQUEST';
    if (filter === 'MESSAGES') return n.type === 'MESSAGE';
    return true;
  });

  const getIconConfig = (type: string) => {
    switch (type) {
      case 'FOLLOW_REQUEST':
        return { icon: 'person-add', color: '#2563EB', bg: '#EFF6FF' };
      case 'FOLLOW_ACCEPTED':
        return { icon: 'checkmark-circle', color: '#10B981', bg: '#ECFDF5' };
      case 'MESSAGE':
        return { icon: 'chatbubble', color: '#00C48C', bg: '#ECFDF5' };
      case 'DOUBT_ANSWER':
        return { icon: 'bulb', color: '#8B5CF6', bg: '#F5F3FF' };
      case 'DOUBT_UPVOTE':
        return { icon: 'heart', color: '#EF4444', bg: '#FEF2F2' };
      default:
        return { icon: 'notifications', color: '#64748B', bg: '#F1F5F9' };
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Top Indicator */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="notifications" size={22} color="#0F172A" style={{ marginRight: 8 }} />
              <Text style={styles.title}>Notifications</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Filter Pills */}
          <View style={styles.filterBar}>
            <TouchableOpacity
              style={[styles.filterChip, filter === 'ALL' && styles.filterChipActive]}
              onPress={() => setFilter('ALL')}
            >
              <Text style={[styles.filterText, filter === 'ALL' && styles.filterTextActive]}>
                All ({notifications.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, filter === 'REQUESTS' && styles.filterChipActive]}
              onPress={() => setFilter('REQUESTS')}
            >
              <Text style={[styles.filterText, filter === 'REQUESTS' && styles.filterTextActive]}>
                Requests ({notifications.filter((n) => n.type === 'FOLLOW_REQUEST').length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, filter === 'MESSAGES' && styles.filterChipActive]}
              onPress={() => setFilter('MESSAGES')}
            >
              <Text style={[styles.filterText, filter === 'MESSAGES' && styles.filterTextActive]}>
                Messages ({notifications.filter((n) => n.type === 'MESSAGE').length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Body */}
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#00C48C" />
              <Text style={styles.loadingText}>Fetching activity updates...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="notifications-off-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>All Caught Up!</Text>
              <Text style={styles.emptyDesc}>
                You have no new notifications right now. Any messages, follow requests, or doubt activity will appear here.
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const config = getIconConfig(item.type);
                const isProcessing = actionLoadingId === item._id;
                const requestId = item.data?.requestId;

                return (
                  <TouchableOpacity
                    style={[styles.notifCard, !item.read && styles.notifCardUnread]}
                    activeOpacity={0.8}
                    onPress={() => handleItemPress(item)}
                  >
                    {/* Avatar with Type Icon Badge */}
                    <View style={styles.avatarBox}>
                      <Image
                        source={
                          item.sender?.avatar ? { uri: item.sender.avatar } : defaultAvatar
                        }
                        style={styles.avatar}
                      />
                      <View style={[styles.typeIconBadge, { backgroundColor: config.color }]}>
                        <Ionicons name={config.icon as any} size={10} color="#FFFFFF" />
                      </View>
                    </View>

                    {/* Content */}
                    <View style={styles.contentBox}>
                      <View style={styles.titleRow}>
                        <Text style={styles.notifTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.timeAgo}>{getTimeAgo(item.createdAt)}</Text>
                      </View>
                      <Text style={styles.notifMessage} numberOfLines={2}>
                        {item.message}
                      </Text>

                      {/* Quick Action buttons for Follow Requests */}
                      {item.type === 'FOLLOW_REQUEST' && requestId ? (
                        <View style={styles.actionsRow}>
                          <TouchableOpacity
                            style={[styles.btn, styles.confirmBtn]}
                            disabled={isProcessing}
                            onPress={() => handleAcceptFollow(requestId, item)}
                          >
                            {isProcessing ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <Text style={styles.confirmText}>Confirm</Text>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.btn, styles.deleteBtn]}
                            disabled={isProcessing}
                            onPress={() => handleDeclineFollow(requestId, item)}
                          >
                            <Text style={styles.deleteText}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      ) : item.type === 'MESSAGE' ? (
                        <View style={styles.actionsRow}>
                          <TouchableOpacity
                            style={[styles.btn, styles.replyBtn]}
                            onPress={() => handleItemPress(item)}
                          >
                            <Ionicons name="chatbubble" size={11} color="#FFFFFF" style={{ marginRight: 4 }} />
                            <Text style={styles.replyText}>Reply</Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>

                    {/* Unread Blue Dot indicator */}
                    {!item.read && <View style={styles.unreadDot} />}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end'
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    minHeight: '60%',
    paddingBottom: 20
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A'
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9'
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC'
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9'
  },
  filterChipActive: {
    backgroundColor: '#0F172A'
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B'
  },
  filterTextActive: {
    color: '#FFFFFF'
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 6,
    backgroundColor: '#FFFFFF'
  },
  notifCardUnread: {
    backgroundColor: '#F8FAFC'
  },
  avatarBox: {
    position: 'relative',
    marginRight: 12
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0'
  },
  typeIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF'
  },
  contentBox: {
    flex: 1
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 6
  },
  timeAgo: {
    fontSize: 10,
    color: '#94A3B8'
  },
  notifMessage: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8
  },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  confirmBtn: {
    backgroundColor: '#2563EB'
  },
  confirmText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  deleteBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  deleteText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569'
  },
  replyBtn: {
    backgroundColor: '#00C48C',
    flexDirection: 'row'
  },
  replyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
    marginTop: 6,
    marginLeft: 6
  },
  centerContainer: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B'
  },
  emptyTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: '700',
    color: '#334155'
  },
  emptyDesc: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 20
  }
});
