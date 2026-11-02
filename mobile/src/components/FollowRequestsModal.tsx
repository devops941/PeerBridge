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

interface PendingRequest {
  _id: string;
  sender: {
    _id: string;
    name: string;
    avatar?: string;
    department?: string;
    college?: string;
    headline?: string;
  };
  createdAt: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  token?: string | null;
  onOpenPeerProfile?: (userId: string) => void;
  onRequestAccepted?: (senderUser: any) => void;
}

export const FollowRequestsModal: React.FC<Props> = ({
  visible,
  onClose,
  token,
  onOpenPeerProfile,
  onRequestAccepted
}) => {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadRequests();
    }
  }, [visible]);

  const getEffectiveToken = async () => {
    if (token) return token;
    return await AsyncStorage.getItem('@peerbridge_token');
  };

  const loadRequests = async () => {
    try {
      setLoading(true);
      const activeToken = await getEffectiveToken();
      if (!activeToken) return;
      const res = await api.getPendingFollowRequests(activeToken);
      if (res && res.success && Array.isArray(res.data)) {
        setRequests(res.data);
      } else {
        setRequests([]);
      }
    } catch (err) {
      console.warn('Failed to load pending requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId: string, sender: any) => {
    const activeToken = await getEffectiveToken();
    if (!activeToken) return;
    try {
      setActionLoadingId(requestId);
      const res = await api.acceptFollowRequest(activeToken, requestId);
      if (res && res.success) {
        setRequests((prev) => prev.filter((r) => r._id !== requestId));
        if (onRequestAccepted) {
          onRequestAccepted(sender);
        }
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to accept request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDecline = async (requestId: string) => {
    const activeToken = await getEffectiveToken();
    if (!activeToken) return;
    try {
      setActionLoadingId(requestId);
      const res = await api.declineFollowRequest(activeToken, requestId);
      if (res && res.success) {
        setRequests((prev) => prev.filter((r) => r._id !== requestId));
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to decline request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.indicator} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="people" size={20} color="#2563EB" style={{ marginRight: 8 }} />
              <Text style={styles.title}>Follow Requests</Text>
              {requests.length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{requests.length}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>
          <Text style={styles.subTitle}>
            Review peer learners wanting to connect and exchange doubt sessions with you
          </Text>

          {/* Content */}
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.loadingText}>Checking incoming requests...</Text>
            </View>
          ) : requests.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="heart-dislike-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Pending Requests</Text>
              <Text style={styles.emptyDesc}>
                When classmates and peers want to connect with you, their requests will appear here.
              </Text>
            </View>
          ) : (
            <FlatList
              data={requests}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isProcessing = actionLoadingId === item._id;
                return (
                  <View style={styles.requestCard}>
                    <TouchableOpacity
                      style={styles.cardLeft}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (onOpenPeerProfile && item.sender?._id) {
                          onOpenPeerProfile(item.sender._id);
                        }
                      }}
                    >
                      <Image
                        source={
                          item.sender?.avatar ? { uri: item.sender.avatar } : defaultAvatar
                        }
                        style={styles.avatar}
                      />
                      <View style={styles.senderInfo}>
                        <Text style={styles.senderName} numberOfLines={1}>
                          {item.sender?.name || 'Peer Learner'}
                        </Text>
                        <Text style={styles.senderMeta} numberOfLines={1}>
                          {item.sender?.department || item.sender?.college || 'Student'}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Actions */}
                    <View style={styles.actionsGroup}>
                      <TouchableOpacity
                        style={[styles.btn, styles.confirmBtn]}
                        disabled={isProcessing}
                        onPress={() => handleAccept(item._id, item.sender)}
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
                        onPress={() => handleDecline(item._id)}
                      >
                        <Text style={styles.deleteText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
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
    maxHeight: '82%',
    minHeight: '48%',
    paddingBottom: 24
  },
  indicator: {
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
    paddingTop: 8,
    paddingBottom: 4
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
  countBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE'
  },
  countText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB'
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9'
  },
  subTitle: {
    fontSize: 12,
    color: '#64748B',
    paddingHorizontal: 20,
    marginBottom: 12
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  cardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E2E8F0'
  },
  senderInfo: {
    marginLeft: 12,
    flex: 1
  },
  senderName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A'
  },
  senderMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 68
  },
  confirmBtn: {
    backgroundColor: '#2563EB'
  },
  confirmText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  deleteBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569'
  },
  centerContainer: {
    padding: 44,
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
    paddingHorizontal: 16
  }
});
