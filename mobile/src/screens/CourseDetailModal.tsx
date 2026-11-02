import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

const { width } = Dimensions.get('window');

interface Props {
  visible: boolean;
  course: any;
  onClose: () => void;
  onBookSession: (course: any) => void;
  onOpenChat: () => void;
}

export const CourseDetailModal: React.FC<Props> = ({
  visible,
  course,
  onClose,
  onBookSession,
  onOpenChat
}) => {
  if (!course) return null;

  const [isPlaying, setIsPlaying] = useState(false);

  const relatedVideos = [
    { id: '1', title: 'What is Cirkit', duration: '07:02', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=200&q=80' },
    { id: '2', title: 'What is C Bloking book', duration: '07:02', image: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777f?auto=format&fit=crop&w=200&q=80' },
    { id: '3', title: 'What is C Programing', duration: '07:02', image: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=200&q=80' },
    { id: '4', title: 'What is Python', duration: '07:02', image: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=200&q=80' },
    { id: '5', title: 'What is Computer', duration: '07:02', image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=200&q=80' }
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onClose}>
            <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Courses</Text>
          <TouchableOpacity style={styles.headerAction}>
            <Ionicons name="share-social-outline" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Hero Video Preview Card */}
          <View style={styles.videoPlayerCard}>
            <Image
              source={{ uri: course.image || 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=800&q=80' }}
              style={styles.videoThumbnail}
            />
            {/* Play Button Overlay */}
            <TouchableOpacity
              style={styles.playOverlayButton}
              activeOpacity={0.8}
              onPress={() => setIsPlaying(!isPlaying)}
            >
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Video Meta Tags */}
            <View style={styles.videoMetaTags}>
              <View style={styles.bestSellingPill}>
                <Text style={styles.bestSellingText}>BEST SELLING</Text>
              </View>
              <View style={styles.statsPill}>
                <Ionicons name="people-outline" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.statsText}>23.5k</Text>
              </View>
              <View style={styles.statsPill}>
                <Ionicons name="star" size={12} color={COLORS.accent} style={{ marginRight: 4 }} />
                <Text style={styles.statsText}>4.9</Text>
              </View>
            </View>
          </View>

          {/* Course Title & Overview */}
          <View style={styles.sectionContainer}>
            <Text style={styles.courseTitle}>{course.title || 'UX UI Design'}</Text>
            <Text style={styles.courseDescription}>
              There are many variations of passages of Lorem Ipsum available, but the majority have
              suffered alteration in some form, by injected humour, or randomised words which don't look even slightly believable.
            </Text>

            {/* Lesson Count Banner */}
            <View style={styles.lessonMetaBanner}>
              <View style={styles.lessonPlayCircle}>
                <Ionicons name="play" size={16} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.lessonCountHead}>63 Lesson</Text>
                <Text style={styles.lessonCountSub}>64 Videos • 30 Shift • 80 Quiz</Text>
              </View>
            </View>
          </View>

          {/* Related Videos Section */}
          <View style={styles.relatedSection}>
            <Text style={styles.relatedHeading}>Related videos</Text>
            {relatedVideos.map((video) => (
              <TouchableOpacity key={video.id} style={styles.relatedVideoRow} activeOpacity={0.8}>
                <Image source={{ uri: video.image }} style={styles.relatedThumb} />
                <View style={styles.relatedVideoDetails}>
                  <Text style={styles.relatedVideoTitle} numberOfLines={1}>{video.title}</Text>
                  <Text style={styles.relatedVideoDesc} numberOfLines={1}>Lorem Ipsum is simply dumm..</Text>
                </View>
                <Text style={styles.videoDurationText}>{video.duration}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 110 }} />
        </ScrollView>

        {/* Sticky Bottom Order Bar */}
        <View style={styles.stickyFooterBar}>
          <TouchableOpacity style={styles.footerChatBtn} onPress={onOpenChat}>
            <Ionicons name="chatbubble-ellipses-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>

          <View style={styles.footerPriceCol}>
            <Text style={styles.coursePriceLabel}>Course Price</Text>
            <Text style={styles.coursePriceValue}>$120 / 20 Credits</Text>
          </View>

          <TouchableOpacity
            style={styles.orderNowButton}
            activeOpacity={0.85}
            onPress={() => onBookSession(course)}
          >
            <Text style={styles.orderNowButtonText}>ORDER NOW</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  headerAction: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16
  },
  videoPlayerCard: {
    width: '100%',
    height: 200,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F172A',
    marginBottom: 18
  },
  videoThumbnail: {
    width: '100%',
    height: '100%'
  },
  playOverlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -25,
    marginLeft: -25,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  videoMetaTags: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  bestSellingPill: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  bestSellingText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800'
  },
  statsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  statsText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600'
  },
  sectionContainer: {
    marginBottom: 20
  },
  courseTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8
  },
  courseDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
    marginBottom: 16
  },
  lessonMetaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  lessonPlayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  lessonCountHead: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  lessonCountSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2
  },
  relatedSection: {
    marginTop: 4
  },
  relatedHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12
  },
  relatedVideoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  relatedThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: '#0F172A'
  },
  relatedVideoDetails: {
    flex: 1
  },
  relatedVideoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2
  },
  relatedVideoDesc: {
    fontSize: 11,
    color: COLORS.textMuted
  },
  videoDurationText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  stickyFooterBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10
  },
  footerChatBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  footerPriceCol: {
    flex: 1
  },
  coursePriceLabel: {
    fontSize: 11,
    color: COLORS.textMuted
  },
  coursePriceValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  orderNowButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center'
  },
  orderNowButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800'
  }
});
