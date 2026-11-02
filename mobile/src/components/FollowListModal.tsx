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
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';

const defaultAvatar = require('../../assets/user.png');

interface PeerItem {
  _id: string;
  name: string;
  avatar?: string;
  college?: string;
  department?: string;
  headline?: string;
  rating?: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  type: 'followers' | 'following';
  currentUserId?: string;
  onSelectPeer?: (peer: PeerItem) => void;
}

export const FollowListModal: React.FC<Props> = ({
  visible,
  onClose,
  userId,
  userName,
  type,
  currentUserId,
  onSelectPeer
}) => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<PeerItem[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (visible && userId) {
      fetchList();
    }
  }, [visible, userId, type]);

  const fetchList = async () => {
    try {
      setLoading(true);
      const res =
        type === 'followers'
          ? await api.getFollowers(userId)
          : await api.getFollowing(userId);

      if (res && res.success && Array.isArray(res.data)) {
        setUsers(res.data);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.warn('Failed to fetch follow list:', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((u) =>
    (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.department || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIndicator} />
            <View style={styles.headerRow}>
              <Text style={styles.title}>
                {type === 'followers' ? 'Followers' : 'Following'}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.subTitle}>
              {userName}'s {type === 'followers' ? 'followers network' : 'following list'}
            </Text>

            {/* Search Input */}
            <View style={styles.searchBar}>
              <Ionicons name="search" size={16} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search peers by name or dept..."
                placeholderTextColor="#94A3B8"
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* List Content */}
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.loadingText}>Loading {type}...</Text>
            </View>
          ) : filteredUsers.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="people-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>
                {search ? 'No matching peers' : `No ${type} yet`}
              </Text>
              <Text style={styles.emptyDesc}>
                {search
                  ? 'Try searching with another keyword'
                  : type === 'followers'
                  ? 'Be the first to connect with this learner!'
                  : 'Not following anyone yet.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isMe = currentUserId === item._id;
                return (
                  <TouchableOpacity
                    style={styles.userRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (onSelectPeer) {
                        onClose();
                        onSelectPeer(item);
                      }
                    }}
                  >
                    <Image
                      source={item.avatar ? { uri: item.avatar } : defaultAvatar}
                      style={styles.avatar}
                    />
                    <View style={styles.userInfo}>
                      <View style={styles.nameRow}>
                        <Text style={styles.userName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        {isMe && <Text style={styles.youBadge}>You</Text>}
                      </View>
                      <Text style={styles.userMeta} numberOfLines={1}>
                        {item.department || item.college || 'Peer Learner'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
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
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end'
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    minHeight: '50%',
    paddingBottom: 24
  },
  headerIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A'
  },
  subTitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 10
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9'
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 38,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#0F172A'
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 8
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC'
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0'
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A'
  },
  youBadge: {
    marginLeft: 6,
    fontSize: 10,
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    fontWeight: '700'
  },
  userMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2
  },
  centerContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B'
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#334155'
  },
  emptyDesc: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4
  }
});
