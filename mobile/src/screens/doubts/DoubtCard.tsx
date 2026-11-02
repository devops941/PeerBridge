import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DoubtItem, DoubtStatus } from '../../types';

interface Props {
  doubt: DoubtItem;
  currentUserId?: string;
  onPress: (doubt: DoubtItem) => void;
  onVolunteerPress?: (doubt: DoubtItem) => void;
}

const defaultAvatar = require('../../../assets/user.png');

export const DoubtCard: React.FC<Props> = ({
  doubt,
  currentUserId,
  onPress,
  onVolunteerPress
}) => {
  const isAuthor = currentUserId && String(doubt.author?._id) === String(currentUserId);

  const getStatusBadge = (status: DoubtStatus) => {
    switch (status) {
      case 'RESOLVED':
        return {
          label: 'RESOLVED',
          bg: '#ECFDF5',
          border: '#A7F3D0',
          text: '#047857',
          icon: 'checkmark-circle'
        };
      case 'IN_PROGRESS':
        return {
          label: 'IN PROGRESS',
          bg: '#EFF6FF',
          border: '#BFDBFE',
          text: '#1D4ED8',
          icon: 'sync-circle'
        };
      case 'CLOSED':
        return {
          label: 'CLOSED',
          bg: '#F1F5F9',
          border: '#CBD5E1',
          text: '#64748B',
          icon: 'lock-closed'
        };
      default:
        return {
          label: 'OPEN FOR HELP',
          bg: '#F0FDF4',
          border: '#BBF7D0',
          text: '#00A374',
          icon: 'radio-button-on'
        };
    }
  };

  const statusConfig = getStatusBadge(doubt.status);

  // Time-ago formatting helper
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

  const avatarUri =
    doubt.author?.avatar && doubt.author.avatar.startsWith('http')
      ? { uri: doubt.author.avatar }
      : defaultAvatar;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.88}
      onPress={() => onPress(doubt)}
    >
      {/* Top Author & Status Row */}
      <View style={styles.topRow}>
        <View style={styles.authorSection}>
          <Image source={avatarUri} style={styles.authorAvatar} resizeMode="cover" />
          <View style={styles.authorMeta}>
            <View style={styles.authorNameRow}>
              <Text style={styles.authorName} numberOfLines={1}>
                {doubt.author?.name || 'Student Peer'}
              </Text>
              {isAuthor && <Text style={styles.authorBadge}>(You)</Text>}
            </View>
            <Text style={styles.authorSubtitle} numberOfLines={1}>
              {doubt.author?.college || doubt.author?.department || 'PeerBridge Student'} •{' '}
              {getTimeAgo(doubt.createdAt)}
            </Text>
          </View>
        </View>

        {/* Status Pill */}
        <View
          style={[
            styles.statusPill,
            { backgroundColor: statusConfig.bg, borderColor: statusConfig.border }
          ]}
        >
          <Ionicons
            name={statusConfig.icon as any}
            size={11}
            color={statusConfig.text}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.statusPillText, { color: statusConfig.text }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      {/* Subject & Topic Badges */}
      <View style={styles.categoriesRow}>
        <View style={styles.subjectChip}>
          <Ionicons name="book-outline" size={12} color="#00C48C" style={{ marginRight: 4 }} />
          <Text style={styles.subjectChipText}>{doubt.subject}</Text>
        </View>

        {doubt.topic ? (
          <View style={styles.topicChip}>
            <Text style={styles.topicChipText}>{doubt.topic}</Text>
          </View>
        ) : null}

        {doubt.codeSnippet ? (
          <View style={styles.codeSnippetBadge}>
            <Ionicons name="code-slash" size={11} color="#6366F1" style={{ marginRight: 3 }} />
            <Text style={styles.codeSnippetBadgeText}>Code attached</Text>
          </View>
        ) : null}

        {Array.isArray(doubt.attachments) && doubt.attachments.length > 0 ? (
          <View style={styles.imageBadgeChip}>
            <Ionicons
              name={doubt.attachments.length > 1 ? 'images-outline' : 'image-outline'}
              size={11}
              color="#0284C7"
              style={{ marginRight: 3 }}
            />
            <Text style={styles.imageBadgeChipText}>
              {doubt.attachments.length > 1 ? `${doubt.attachments.length} Photos` : 'Image'}
            </Text>
          </View>
        ) : null}

        {doubt.videoUrl ? (
          <View style={styles.videoBadgeChip}>
            <Ionicons name="videocam" size={11} color="#DC2626" style={{ marginRight: 3 }} />
            <Text style={styles.videoBadgeChipText}>Video (Max 10MB)</Text>
          </View>
        ) : null}
      </View>

      {/* Doubt Title */}
      <Text style={styles.doubtTitle} numberOfLines={2}>
        {doubt.title}
      </Text>

      {/* Question Snippet */}
      <Text style={styles.questionSnippet} numberOfLines={3}>
        {doubt.question}
      </Text>

      {/* Attached Image Thumbnail */}
      {Array.isArray(doubt.attachments) && doubt.attachments.length > 0 && doubt.attachments[0] ? (
        <View style={styles.attachmentContainer}>
          <Image
            source={{ uri: doubt.attachments[0] }}
            style={styles.attachmentThumb}
            resizeMode="cover"
          />
          <View style={styles.attachmentOverlay}>
            <Ionicons
              name={doubt.attachments.length > 1 ? 'images' : 'scan-outline'}
              size={13}
              color="#FFFFFF"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.attachmentOverlayText}>
              {doubt.attachments.length > 1
                ? `View ${doubt.attachments.length} Photos`
                : 'View Attachment'}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Attached Video Card */}
      {doubt.videoUrl ? (
        <View style={styles.videoCardContainer}>
          <View style={styles.videoCardIconCircle}>
            <Ionicons name="play" size={15} color="#FFFFFF" style={{ marginLeft: 2 }} />
          </View>
          <View style={styles.videoCardMeta}>
            <Text style={styles.videoCardTitle}>Video Explanation Attached</Text>
            <Text style={styles.videoCardSub}>
              {doubt.videoDuration ? `${Math.round(doubt.videoDuration)}s • ` : ''}Max 10MB clip
            </Text>
          </View>
          <View style={styles.videoCardBadge}>
            <Ionicons name="videocam-outline" size={12} color="#DC2626" style={{ marginRight: 4 }} />
            <Text style={styles.videoCardBadgeText}>Watch</Text>
          </View>
        </View>
      ) : null}

      {/* Tags Row */}
      {Array.isArray(doubt.tags) && doubt.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {doubt.tags.map((tag) => (
            <View key={tag} style={styles.tagItem}>
              <Text style={styles.tagItemText}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Bottom Footer with Counters & Volunteer Action */}
      <View style={styles.footerRow}>
        <View style={styles.countersSection}>
          <View style={styles.counterItem}>
            <Ionicons name="heart-outline" size={14} color="#EF4444" style={{ marginRight: 4 }} />
            <Text style={styles.counterText}>
              <Text style={{ fontWeight: '700', color: '#0F172A' }}>
                {doubt.upvoteCount || (Array.isArray(doubt.upvotes) ? doubt.upvotes.length : 0)}
              </Text>{' '}
              Likes
            </Text>
          </View>

          <View style={styles.counterItem}>
            <Ionicons name="chatbubble-ellipses-outline" size={14} color="#3B82F6" style={{ marginRight: 4 }} />
            <Text style={styles.counterText}>
              <Text style={{ fontWeight: '700', color: '#0F172A' }}>{doubt.answerCount || 0}</Text>{' '}
              Comments
            </Text>
          </View>

          <View style={styles.counterItem}>
            <Ionicons name="people-outline" size={14} color="#00C48C" style={{ marginRight: 4 }} />
            <Text style={styles.counterText}>
              <Text style={{ fontWeight: '700', color: '#0F172A' }}>{doubt.volunteerCount || 0}</Text>{' '}
              Helpers
            </Text>
          </View>
        </View>

        {/* Quick I Can Help CTA */}
        {!isAuthor && doubt.status === 'OPEN' && onVolunteerPress && (
          <TouchableOpacity
            style={styles.volunteerBtn}
            onPress={() => onVolunteerPress(doubt)}
            activeOpacity={0.8}
          >
            <Ionicons name="hand-right-outline" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.volunteerBtnText}>I Can Help</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8
  },
  authorAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: '#F1F5F9'
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
    fontWeight: '700',
    color: '#0F172A'
  },
  authorBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#00C48C',
    marginLeft: 4
  },
  authorSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3
  },
  categoriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8
  },
  subjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#D1FAE5'
  },
  subjectChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46'
  },
  topicChip: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  topicChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569'
  },
  codeSnippetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E7FF'
  },
  codeSnippetBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4F46E5'
  },
  doubtTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 22,
    marginBottom: 6
  },
  questionSnippet: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    marginBottom: 10
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12
  },
  tagItem: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 4
  },
  tagItemText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600'
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC'
  },
  countersSection: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  counterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16
  },
  counterText: {
    fontSize: 12,
    color: '#64748B'
  },
  volunteerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00C48C',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    shadowColor: '#00C48C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2
  },
  volunteerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  imageBadgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginLeft: 6
  },
  imageBadgeChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369A1'
  },
  attachmentContainer: {
    position: 'relative',
    height: 140,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    marginBottom: 10
  },
  attachmentThumb: {
    width: '100%',
    height: '100%',
    opacity: 0.95
  },
  attachmentOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  attachmentOverlayText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600'
  },
  videoBadgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginLeft: 6
  },
  videoBadgeChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626'
  },
  videoCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  videoCardIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  videoCardMeta: {
    flex: 1
  },
  videoCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A'
  },
  videoCardSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1
  },
  videoCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  videoCardBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626'
  }
});
