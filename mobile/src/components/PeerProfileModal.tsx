import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { FollowListModal } from './FollowListModal';

const defaultAvatar = require('../../assets/user.png');

interface Props {
  visible: boolean;
  onClose: () => void;
  userId: string | null;
  currentUserId?: string;
  token?: string | null;
  onOpenChatWithPeer?: (peerUser: any) => void;
  onOpenFullProfile?: (peerUser: any) => void;
}

export const PeerProfileModal: React.FC<Props> = ({
  visible,
  onClose,
  userId,
  currentUserId,
  token,
  onOpenChatWithPeer,
  onOpenFullProfile
}) => {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Submodal for Followers / Following list
  const [listModalType, setListModalType] = useState<'followers' | 'following' | null>(null);

  useEffect(() => {
    if (visible && userId) {
      loadProfile();
    } else {
      setProfile(null);
    }
  }, [visible, userId]);

  const getEffectiveToken = async () => {
    if (token) return token;
    return await AsyncStorage.getItem('@peerbridge_token');
  };

  const loadProfile = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const activeToken = await getEffectiveToken();
      const res = await api.getPeerProfile(userId, currentUserId);
      if (res && res.success && res.data) {
        setProfile(res.data);
      }
    } catch (err) {
      console.warn('Failed to load peer profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowAction = async () => {
    if (!userId || !profile || actionLoading) return;
    const activeToken = await getEffectiveToken();
    if (!activeToken) {
      Alert.alert('Sign In Required', 'Please sign in to connect with peers.');
      return;
    }

    try {
      setActionLoading(true);
      const isFollowing = profile.relationship?.isFollowing;
      const isRequested = profile.relationship?.isRequested;

      if (isFollowing) {
        // Unfollow confirmation
        Alert.alert(
          'Unfollow Peer',
          `Are you sure you want to unfollow ${profile.name}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Unfollow',
              style: 'destructive',
              onPress: async () => {
                try {
                  setActionLoading(true);
                  const res = await api.unfollowUser(activeToken, userId);
                  if (res && res.success) {
                    setProfile((prev: any) => ({
                      ...prev,
                      stats: {
                        ...prev.stats,
                        followerCount: Math.max(0, (prev.stats?.followerCount || 1) - 1)
                      },
                      relationship: {
                        ...prev.relationship,
                        isFollowing: false,
                        isRequested: false
                      }
                    }));
                  }
                } catch (e) {
                  Alert.alert('Error', 'Failed to unfollow peer.');
                } finally {
                  setActionLoading(false);
                }
              }
            }
          ]
        );
        return;
      }

      if (isRequested) {
        // Cancel follow request
        const res = await api.cancelFollowRequest(activeToken, userId);
        if (res && res.success) {
          setProfile((prev: any) => ({
            ...prev,
            relationship: {
              ...prev.relationship,
              isRequested: false
            }
          }));
        }
      } else {
        // Send follow request
        const res = await api.sendFollowRequest(activeToken, userId);
        if (res && res.success) {
          if (res.isFollowing) {
            setProfile((prev: any) => ({
              ...prev,
              stats: {
                ...prev.stats,
                followerCount: (prev.stats?.followerCount || 0) + 1
              },
              relationship: {
                ...prev.relationship,
                isFollowing: true,
                isRequested: false
              }
            }));
          } else {
            setProfile((prev: any) => ({
              ...prev,
              relationship: {
                ...prev.relationship,
                isRequested: true
              }
            }));
            Alert.alert('Request Sent 📨', `Follow request sent to ${profile.name}. They will be notified.`);
          }
        }
      }
    } catch (err: any) {
      Alert.alert('Action Failed', err.message || 'Could not update follow status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenChat = () => {
    if (!profile) return;
    onClose();
    if (onOpenChatWithPeer) {
      onOpenChatWithPeer({
        _id: profile._id,
        name: profile.name,
        avatar: profile.avatar,
        college: profile.college,
        department: profile.department
      });
    }
  };

  const isSelf = currentUserId === userId;
  const isFollowing = profile?.relationship?.isFollowing;
  const isRequested = profile?.relationship?.isRequested;

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            {/* Top Indicator */}
            <View style={styles.indicator} />

            {/* Header Bar */}
            <View style={styles.headerBar}>
              <Text style={styles.headerTitle}>Learner Profile</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={styles.loadingText}>Fetching peer profile...</Text>
              </View>
            ) : !profile ? (
              <View style={styles.centerBox}>
                <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
                <Text style={styles.errorText}>Peer profile could not be loaded.</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
                {/* Profile Identity Card */}
                <View style={styles.identityContainer}>
                  <View style={styles.avatarWrapper}>
                    <Image
                      source={profile.avatar ? { uri: profile.avatar } : defaultAvatar}
                      style={styles.avatar}
                    />
                    <View style={styles.badgeIcon}>
                      <Ionicons name="checkmark-circle" size={20} color="#2563EB" />
                    </View>
                  </View>

                  <Text style={styles.profileName}>{profile.name}</Text>
                  {profile.headline ? (
                    <Text style={styles.profileHeadline}>{profile.headline}</Text>
                  ) : null}

                  <View style={styles.deptRow}>
                    <Ionicons name="school-outline" size={14} color="#64748B" />
                    <Text style={styles.deptText}>
                      {profile.department || 'General Engineering'} • {profile.college || 'PeerBridge Campus'}
                    </Text>
                  </View>

                  {profile.rating ? (
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={13} color="#F59E0B" />
                      <Text style={styles.ratingText}>
                        {Number(profile.rating).toFixed(1)} Peer Rating
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Stats Row (Instagram style) */}
                <View style={styles.statsCard}>
                  <View style={styles.statCol}>
                    <Text style={styles.statNumber}>{profile.stats?.doubtsCount ?? 0}</Text>
                    <Text style={styles.statLabel}>Doubts</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statCol}>
                    <Text style={styles.statNumber}>{profile.stats?.solutionsCount ?? 0}</Text>
                    <Text style={styles.statLabel}>Solutions</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <TouchableOpacity
                    style={styles.statCol}
                    activeOpacity={0.7}
                    onPress={() => setListModalType('followers')}
                  >
                    <Text style={[styles.statNumber, styles.statClickable]}>
                      {profile.stats?.followerCount ?? 0}
                    </Text>
                    <Text style={styles.statLabel}>Followers</Text>
                  </TouchableOpacity>
                  <View style={styles.statDivider} />
                  <TouchableOpacity
                    style={styles.statCol}
                    activeOpacity={0.7}
                    onPress={() => setListModalType('following')}
                  >
                    <Text style={[styles.statNumber, styles.statClickable]}>
                      {profile.stats?.followingCount ?? 0}
                    </Text>
                    <Text style={styles.statLabel}>Following</Text>
                  </TouchableOpacity>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                  {isSelf ? (
                    <View style={styles.selfBadge}>
                      <Ionicons name="person-circle-outline" size={18} color="#2563EB" />
                      <Text style={styles.selfBadgeText}>This is your public peer profile</Text>
                    </View>
                  ) : (
                    <>
                      {/* Follow / Requested / Following button */}
                      <TouchableOpacity
                        style={[
                          styles.actionBtn,
                          isFollowing
                            ? styles.followingBtn
                            : isRequested
                            ? styles.requestedBtn
                            : styles.followBtn
                        ]}
                        activeOpacity={0.8}
                        onPress={handleFollowAction}
                        disabled={actionLoading}
                      >
                        {actionLoading ? (
                          <ActivityIndicator size="small" color={isFollowing || isRequested ? '#2563EB' : '#FFFFFF'} />
                        ) : (
                          <>
                            <Ionicons
                              name={
                                isFollowing
                                  ? 'checkmark-outline'
                                  : isRequested
                                  ? 'time-outline'
                                  : 'person-add-outline'
                              }
                              size={16}
                              color={isFollowing || isRequested ? '#334155' : '#FFFFFF'}
                              style={{ marginRight: 6 }}
                            />
                            <Text
                              style={[
                                styles.actionBtnText,
                                isFollowing || isRequested ? styles.followingBtnText : styles.followBtnText
                              ]}
                            >
                              {isFollowing ? 'Following' : isRequested ? 'Requested' : 'Follow'}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      {/* Direct Message Button */}
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.messageBtn]}
                        activeOpacity={0.8}
                        onPress={handleOpenChat}
                      >
                        <Ionicons name="chatbubble-ellipses-outline" size={16} color="#0F172A" style={{ marginRight: 6 }} />
                        <Text style={styles.messageBtnText}>Message</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                {/* View Full Profile & Portfolio Button (Screenshot 4 Transition) */}
                <TouchableOpacity
                  style={styles.fullProfileBtn}
                  activeOpacity={0.85}
                  onPress={() => {
                    onClose();
                    if (onOpenFullProfile) {
                      onOpenFullProfile(profile);
                    }
                  }}
                >
                  <View style={styles.fullProfileBtnContent}>
                    <View style={styles.fullProfileIconCircle}>
                      <Ionicons name="folder-open" size={16} color="#00C48C" />
                    </View>
                    <View>
                      <Text style={styles.fullProfileBtnTitle}>View Full Profile & Projects</Text>
                      <Text style={styles.fullProfileBtnSub}>Explore portfolio, campus info & achievements</Text>
                    </View>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color="#00C48C" />
                </TouchableOpacity>

                {/* Bio & Details Section */}
                {profile.bio ? (
                  <View style={styles.bioCard}>
                    <Text style={styles.sectionHeading}>About Learner</Text>
                    <Text style={styles.bioText}>{profile.bio}</Text>
                  </View>
                ) : null}

                {/* Knowledge Hub Info */}
                <View style={styles.infoBanner}>
                  <Ionicons name="shield-checkmark" size={18} color="#10B981" />
                  <Text style={styles.infoBannerText}>
                    Connected peers can exchange direct 1-on-1 doubt chats, participate in live collaborative problem solving, and share notes.
                  </Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Followers / Following List Sub-Modal */}
      {listModalType && (
        <FollowListModal
          visible={!!listModalType}
          onClose={() => setListModalType(null)}
          userId={profile?._id}
          userName={profile?.name || 'Peer'}
          type={listModalType}
          currentUserId={currentUserId}
          onSelectPeer={(selectedPeer) => {
            setListModalType(null);
            // Open clicked peer's profile
            setProfile(null);
            // Trigger parent or reload
          }}
        />
      )}
    </>
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
    paddingBottom: 24
  },
  indicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A'
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9'
  },
  centerBox: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B'
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600'
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32
  },
  identityContainer: {
    alignItems: 'center',
    marginBottom: 16
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 3,
    borderColor: '#EFF6FF',
    backgroundColor: '#E2E8F0'
  },
  badgeIcon: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 10
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4
  },
  profileHeadline: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
    paddingHorizontal: 16
  },
  deptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  deptText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#64748B'
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309'
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18
  },
  statCol: {
    flex: 1,
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A'
  },
  statClickable: {
    color: '#2563EB',
    textDecorationLine: 'underline'
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500'
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0'
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 10
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 14
  },
  followBtn: {
    backgroundColor: '#2563EB'
  },
  followBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  requestedBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  followingBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  followingBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155'
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700'
  },
  messageBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  messageBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A'
  },
  fullProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E6FBF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16
  },
  fullProfileBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  fullProfileIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  fullProfileBtnTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#047857'
  },
  fullProfileBtnSub: {
    fontSize: 11,
    color: '#059669',
    marginTop: 1
  },
  selfBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE'
  },
  selfBadgeText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600'
  },
  bioCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6
  },
  bioText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  infoBannerText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 12,
    color: '#065F46',
    lineHeight: 17
  }
});
