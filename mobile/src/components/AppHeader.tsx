import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile } from '../types';

interface Props {
  user?: UserProfile | null;
  onOpenProfile?: () => void;
  onOpenNotifications?: () => void;
  title?: string;
  subtitle?: string;
}

const defaultAvatar = require('../../assets/user.png');

export const AppHeader: React.FC<Props> = ({
  user,
  onOpenProfile,
  onOpenNotifications,
  title,
  subtitle
}) => {
  const [imageError, setImageError] = useState(false);

  const firstName = user?.name ? user.name.split(' ')[0] : 'Learner';
  const collegeName = user?.college || '';
  const department = user?.department ? user.department.split('&')[0].trim() : '';
  const subtitleDisplay = subtitle || (collegeName ? `${collegeName}${department ? ` • ${department}` : ''}` : 'Complete your profile');

  const avatarSource =
    !imageError && user?.avatar && user.avatar.startsWith('http')
      ? { uri: user.avatar }
      : defaultAvatar;

  return (
    <View style={styles.container}>
      {/* Left: User Avatar + Name + College Subtitle */}
      <TouchableOpacity
        style={styles.profileSection}
        onPress={onOpenProfile}
        activeOpacity={0.8}
      >
        <View style={styles.avatarWrapper}>
          <Image
            source={avatarSource}
            style={styles.avatar}
            onError={() => setImageError(true)}
            resizeMode="cover"
          />
          <View style={styles.onlineDot} />
        </View>

        <View style={styles.identityTextCol}>
          <Text style={styles.greetingText} numberOfLines={1}>
            {title || `Welcome, ${firstName}`}
          </Text>
          <View style={styles.collegeRow}>
            <Ionicons name="school" size={12} color="#00C48C" style={{ marginRight: 4 }} />
            <Text style={styles.collegeSubtitle} numberOfLines={1}>
              {subtitleDisplay}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Right: Properly Aligned Action Buttons */}
      <View style={styles.actionsSection}>
        {/* Notifications Bell */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onOpenNotifications || onOpenProfile}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={20} color="#0F172A" />
          <View style={styles.notificationBadgeDot} />
        </TouchableOpacity>

        {/* Profile Shortcut */}
        {onOpenProfile && (
          <TouchableOpacity
            style={[styles.iconButton, { marginLeft: 10 }]}
            onPress={onOpenProfile}
            activeOpacity={0.7}
          >
            <Ionicons name="person-outline" size={19} color="#00C48C" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 3
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12
  },
  avatarWrapper: {
    position: 'relative'
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#00C48C',
    backgroundColor: '#F1F5F9'
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  identityTextCol: {
    marginLeft: 11,
    flex: 1
  },
  greetingText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3
  },
  collegeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2
  },
  collegeSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    flex: 1
  },
  actionsSection: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  notificationBadgeDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444'
  }
});
