import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthNavigationState } from './types';

interface Props {
  message?: string;
  onNavigate: (state: AuthNavigationState) => void;
}

export const RegisterSuccessScreen: React.FC<Props> = ({ message, onNavigate }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Celebration Icon Card */}
        <View style={styles.iconContainer}>
          <View style={styles.outerGlow}>
            <View style={styles.innerCircle}>
              <Ionicons name="checkmark-done" size={48} color="#FFFFFF" />
            </View>
          </View>
        </View>

        <Text style={styles.heading}>Registration Successful!</Text>
        <Text style={styles.subtitle}>
          {message || 'Your email has been verified and your PeerBridge account is now active.'}
        </Text>

        {/* Reward Pill */}
        <View style={styles.rewardCard}>
          <Ionicons name="gift" size={24} color="#00C48C" style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rewardTitle}>+50 Learning Credits Awarded</Text>
            <Text style={styles.rewardDesc}>Use credits to book peer study sessions or practice quizzes.</Text>
          </View>
        </View>

        {/* CTA to Login */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => onNavigate({ screen: 'login' })}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Proceed to Sign In</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40
  },
  iconContainer: {
    marginBottom: 28
  },
  outerGlow: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center'
  },
  innerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#00C48C',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00C48C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 12
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 32,
    width: '100%'
  },
  rewardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00A374',
    marginBottom: 2
  },
  rewardDesc: {
    fontSize: 12,
    color: '#475569'
  },
  primaryButton: {
    backgroundColor: '#00C48C',
    height: 52,
    borderRadius: 26,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00C48C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  }
});
