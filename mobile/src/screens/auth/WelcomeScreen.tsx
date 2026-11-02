import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthNavigationState } from './types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  onNavigate: (state: AuthNavigationState) => void;
}

export const WelcomeScreen: React.FC<Props> = ({ onNavigate }) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#00C48C" />

      {/* Top Half: Emerald Teal Hero Graphic Canvas */}
      <View style={styles.topHeroSection}>
        {/* Decorative background circles */}
        <View style={styles.decorCircleLarge} />
        <View style={styles.decorCircleSmall} />

        {/* Mockup Card Illustration matching screenshot Screen 1 */}
        <View style={styles.illustrationCard}>
          {/* Mock header bar */}
          <View style={styles.mockHeaderRow}>
            <View style={styles.mockBadge}>
              <Ionicons name="sparkles" size={14} color="#00C48C" />
              <Text style={styles.mockBadgeText}>PeerBridge 2.0</Text>
            </View>
            <View style={styles.mockAvatarGroup}>
              <View style={[styles.miniAvatar, { backgroundColor: '#10B981' }]}>
                <Text style={styles.avatarLetter}>A</Text>
              </View>
              <View style={[styles.miniAvatar, { backgroundColor: '#0EA5E9', marginLeft: -8 }]}>
                <Text style={styles.avatarLetter}>G</Text>
              </View>
            </View>
          </View>

          {/* Mock Task Checklist Elements */}
          <View style={styles.mockTaskRow}>
            <View style={styles.mockCheckCircle}>
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            </View>
            <View style={styles.mockTaskTexts}>
              <Text style={styles.mockTaskTitle}>DSA Doubt Solved</Text>
              <Text style={styles.mockTaskSub}>Explained by Alex • 10m ago</Text>
            </View>
          </View>

          <View style={[styles.mockTaskRow, { marginTop: 10 }]}>
            <View style={[styles.mockCheckCircle, { backgroundColor: '#00C48C' }]}>
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            </View>
            <View style={styles.mockTaskTexts}>
              <Text style={styles.mockTaskTitle}>1-on-1 Mentorship Booked</Text>
              <Text style={styles.mockTaskSub}>Today at 4:30 PM • UI/UX</Text>
            </View>
          </View>

          {/* Mini progress bar */}
          <View style={styles.mockProgressTrack}>
            <View style={styles.mockProgressBar} />
          </View>
        </View>
      </View>

      {/* Bottom Half: Overlapping Curved White Sheet */}
      <View style={styles.bottomCard}>
        {/* Brand Logo Banner */}
        <View style={styles.logoRow}>
          <Image
            source={require('../../../assets/app_icon.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
        </View>

        {/* Heading & Subtitle from Reference Screenshot */}
        <Text style={styles.title}>Let's Get You Set Up for Success</Text>
        <Text style={styles.description}>
          Organize your study goals, clear assignment doubts with senior peers, and collaborate smoothly in one simple, powerful app.
        </Text>

        {/* Primary CTA Button: Pill Emerald Button */}
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={() => onNavigate({ screen: 'login' })}
        >
          <Text style={styles.primaryButtonText}>Get started</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        {/* Secondary Navigation Shortcut */}
        <View style={styles.bottomRow}>
          <Text style={styles.bottomText}>New to campus? </Text>
          <TouchableOpacity onPress={() => onNavigate({ screen: 'register' })}>
            <Text style={styles.bottomLink}>Create an Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#00C48C'
  },
  topHeroSection: {
    height: SCREEN_HEIGHT * 0.46,
    backgroundColor: '#00C48C',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    paddingTop: 30
  },
  decorCircleLarge: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.12)'
  },
  decorCircleSmall: {
    position: 'absolute',
    bottom: 20,
    left: -40,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255, 255, 255, 0.08)'
  },
  illustrationCard: {
    width: SCREEN_WIDTH * 0.82,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    shadowColor: '#004D36',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)'
  },
  mockHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14
  },
  mockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6FBF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4
  },
  mockBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857'
  },
  mockAvatarGroup: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  miniAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800'
  },
  mockTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 14
  },
  mockCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  mockTaskTexts: {
    flex: 1
  },
  mockTaskTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A'
  },
  mockTaskSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1
  },
  mockProgressTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    marginTop: 14,
    overflow: 'hidden'
  },
  mockProgressBar: {
    width: '75%',
    height: '100%',
    backgroundColor: '#00C48C',
    borderRadius: 3
  },
  bottomCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 28,
    paddingTop: 30,
    paddingBottom: 24,
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8
  },
  logoRow: {
    alignItems: 'center',
    marginBottom: 8
  },
  brandLogo: {
    width: 220,
    height: 52
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.5,
    marginTop: 4
  },
  description: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
    paddingHorizontal: 8
  },
  primaryButton: {
    backgroundColor: '#00C48C',
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00C48C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
    marginTop: 14
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700'
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10
  },
  bottomText: {
    fontSize: 14,
    color: '#64748B'
  },
  bottomLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00C48C'
  }
});

