import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const defaultAvatar = require('../../assets/user.png');

export interface PushNotificationPayload {
  _id?: string;
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
    peerId?: string;
    partnerId?: string;
    partnerName?: string;
    partnerAvatar?: string;
    doubtId?: string;
  };
  createdAt?: string;
}

interface Props {
  notification: PushNotificationPayload | null;
  onDismiss: () => void;
  onAcceptRequest?: (requestId: string) => Promise<void>;
  onDeclineRequest?: (requestId: string) => Promise<void>;
  onPressBanner?: (notification: PushNotificationPayload) => void;
}

export const InAppNotificationBanner: React.FC<Props> = ({
  notification,
  onDismiss,
  onAcceptRequest,
  onDeclineRequest,
  onPressBanner
}) => {
  const translateY = useRef(new Animated.Value(-120)).current;
  const [processing, setProcessing] = React.useState(false);

  useEffect(() => {
    if (notification) {
      // Slide down
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 7,
        tension: 40
      }).start();

      // Auto dismiss after 7 seconds if not interacting
      const timer = setTimeout(() => {
        handleDismiss();
      }, 7000);

      return () => clearTimeout(timer);
    } else {
      Animated.timing(translateY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true
      }).start();
    }
  }, [notification]);

  const handleDismiss = () => {
    Animated.timing(translateY, {
      toValue: -120,
      duration: 250,
      useNativeDriver: true
    }).start(() => {
      onDismiss();
    });
  };

  if (!notification) return null;

  const isFollowRequest = notification.type === 'FOLLOW_REQUEST';
  const requestId = notification.data?.requestId;

  const handleAccept = async () => {
    if (!requestId || !onAcceptRequest || processing) return;
    try {
      setProcessing(true);
      await onAcceptRequest(requestId);
      handleDismiss();
    } catch (e) {
      console.warn('Accept error:', e);
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!requestId || !onDeclineRequest || processing) return;
    try {
      setProcessing(true);
      await onDeclineRequest(requestId);
      handleDismiss();
    } catch (e) {
      console.warn('Decline error:', e);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }]
        }
      ]}
    >
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => {
          if (onPressBanner) onPressBanner(notification);
        }}
      >
        {/* Left Avatar / Icon */}
        <View style={styles.avatarContainer}>
          <Image
            source={
              notification.sender?.avatar
                ? { uri: notification.sender.avatar }
                : defaultAvatar
            }
            style={styles.avatar}
          />
          <View style={[styles.badge, notification.type === 'MESSAGE' && { backgroundColor: '#00C48C' }]}>
            <Ionicons
              name={
                isFollowRequest
                  ? 'person-add'
                  : notification.type === 'MESSAGE'
                  ? 'chatbubble-ellipses'
                  : 'notifications'
              }
              size={10}
              color="#FFFFFF"
            />
          </View>
        </View>

        {/* Center Text */}
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {notification.title}
            </Text>
            <Text style={styles.timeTag}>Just now</Text>
          </View>
          <Text style={styles.message} numberOfLines={2}>
            {notification.message}
          </Text>

          {/* Quick Action Buttons for Follow Requests */}
          {isFollowRequest && requestId ? (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.confirmBtn]}
                onPress={handleAccept}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmText}>Confirm</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.deleteBtn]}
                onPress={handleDecline}
                disabled={processing}
              >
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          ) : notification.type === 'MESSAGE' ? (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#00C48C', flexDirection: 'row', gap: 4 }]}
                onPress={() => {
                  handleDismiss();
                  if (onPressBanner) onPressBanner(notification);
                }}
              >
                <Ionicons name="chatbubble" size={11} color="#FFFFFF" />
                <Text style={styles.confirmText}>Reply</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* Close Button */}
        <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss}>
          <Ionicons name="close" size={16} color="#94A3B8" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 28,
    left: 14,
    right: 14,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10
  },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#334155'
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    backgroundColor: '#1E293B'
  },
  badge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0F172A'
  },
  textContainer: {
    flex: 1,
    marginRight: 8
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC'
  },
  timeTag: {
    fontSize: 10,
    color: '#94A3B8'
  },
  message: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 16
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
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
    backgroundColor: '#334155'
  },
  deleteText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E2E8F0'
  },
  closeBtn: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#1E293B'
  }
});
