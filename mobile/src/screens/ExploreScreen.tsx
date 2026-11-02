import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { api } from '../services/api';
import { TutorItem } from '../types';

const { width } = Dimensions.get('window');

interface Props {
  onSelectMentor: (mentor: TutorItem) => void;
  onBack: () => void;
}

export const ExploreScreen: React.FC<Props> = ({ onSelectMentor, onBack }) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [mentors, setMentors] = useState<TutorItem[]>([]);
  const [loading, setLoading] = useState(true);

  const categories = ['All', 'UI/UX Design', 'Programming', 'Biomedical Tech', 'Python'];

  const fallbackMentors: TutorItem[] = [
    {
      _id: 't1',
      name: 'Kawsar Ahmed',
      email: 'kawsar@peerbridge.edu',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      department: 'Human Computer Interaction',
      college: 'Kongu Engineering College',
      subjects: ['UI/UX Design', 'Figma'],
      skills: ['Figma', 'Prototyping'],
      rating: 4.9,
      reviewCount: 38,
      coursesCount: 4,
      studentsCount: 8000,
      hourlyRateCredits: 20,
      bio: 'Senior UI/UX Designer & Peer Tutor. 4+ years of Figma and mobile app design.'
    },
    {
      _id: 't2',
      name: 'Priya Sharma',
      email: 'priya@peerbridge.edu',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      department: 'Computer Science',
      college: 'Tech University',
      subjects: ['Machine Learning', 'Python'],
      skills: ['TensorFlow', 'Python'],
      rating: 4.8,
      reviewCount: 22,
      coursesCount: 3,
      studentsCount: 5200,
      hourlyRateCredits: 18,
      bio: 'AI & Data Science peer mentor.'
    },
    {
      _id: 't3',
      name: 'Alex Chen',
      email: 'alex@peerbridge.edu',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
      department: 'Software Engineering',
      college: 'State Tech',
      subjects: ['Programming', 'Node.js'],
      skills: ['React Native', 'TypeScript'],
      rating: 4.9,
      reviewCount: 45,
      coursesCount: 5,
      studentsCount: 6200,
      hourlyRateCredits: 18,
      bio: 'Fullstack developer specializing in React Native and Node.'
    },
    {
      _id: 't4',
      name: 'Mahbuba Akter',
      email: 'mahbuba@peerbridge.edu',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
      department: 'Biomedical Informatics',
      college: 'Medical School',
      subjects: ['Biomedical Tech', 'Python for Health'],
      skills: ['Python', 'Data Analytics'],
      rating: 4.8,
      reviewCount: 24,
      coursesCount: 3,
      studentsCount: 3400,
      hourlyRateCredits: 15,
      bio: 'Biomedical student & Peer mentor in Medical Tech.'
    }
  ];

  useEffect(() => {
    loadMentors();
  }, [selectedCategory]);

  const loadMentors = async () => {
    setLoading(true);
    try {
      const res = await api.getTutors(selectedCategory, searchQuery);
      if (res && res.success && res.data && res.data.length > 0) {
        setMentors(res.data);
      } else {
        setMentors(fallbackMentors);
      }
    } catch {
      setMentors(fallbackMentors);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mentors</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Search peer mentors, skills..."
          placeholderTextColor={COLORS.textMuted}
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={loadMentors}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchQuery(''); loadMentors(); }}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Category Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryPill, selectedCategory === cat && styles.categoryPillActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.categoryPillText, selectedCategory === cat && styles.categoryPillTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Grid of Mentors */}
      {loading ? (
        <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.mentorGrid}>
          {mentors.map((mentor) => (
            <TouchableOpacity
              key={mentor._id}
              activeOpacity={0.88}
              style={styles.mentorCard}
              onPress={() => onSelectMentor(mentor)}
            >
              <Image source={{ uri: mentor.avatar }} style={styles.mentorImage} />

              <View style={styles.mentorInfoOverlay}>
                <View style={styles.mentorNameRow}>
                  <Text style={styles.mentorName} numberOfLines={1}>
                    {mentor.name}
                  </Text>
                  <View style={styles.starsRow}>
                    {[...Array(5)].map((_, i) => (
                      <Ionicons key={i} name="star" size={8} color={COLORS.accent} />
                    ))}
                  </View>
                </View>

                <View style={styles.mentorMetaRow}>
                  <Text style={styles.mentorMetaText}>
                    0{mentor.coursesCount || 4} Course
                  </Text>
                  <Text style={styles.mentorMetaText}>
                    {mentor.studentsCount ? `${mentor.studentsCount}+ Enrolled` : '8000+ Enrolled'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ height: 90 }} />
    </ScrollView>
  );
};

const cardWidth = (width - 44) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  contentContainer: {
    paddingTop: 50,
    paddingHorizontal: 16
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary
  },
  categoriesScroll: {
    marginBottom: 16
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  categoryPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  categoryPillTextActive: {
    color: '#FFFFFF'
  },
  mentorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  mentorCard: {
    width: cardWidth,
    height: 210,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 14,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4
  },
  mentorImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0F172A'
  },
  mentorInfoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingVertical: 8,
    paddingHorizontal: 10
  },
  mentorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3
  },
  mentorName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 4
  },
  starsRow: {
    flexDirection: 'row',
    gap: 1
  },
  mentorMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  mentorMetaText: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.75)'
  }
});
