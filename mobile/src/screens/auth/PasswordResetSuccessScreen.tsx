import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthNavigationState } from './types';

interface Props {
  message?: string;
  onNavigate: (state: AuthNavigationState) => void;
}

export const PasswordResetSuccessScreen: React.FC<Props> = ({ message, onNavigate }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.outerGlow}>
            <View style={styles.innerCircle}>
              <Ionicons name="lock-closed" size={44} color="#FFFFFF" />
            </View>
          </View>
        </View>

        <Text style={styles.heading}>Password Reset Complete</Text>
        <Text style={styles.subtitle}>
          {message ||
            'Your password was successfully updated. All previous active sessions were signed out for security.'}
        </Text>

        <View style={styles.noticeCard}>
          <Ionicons name="information-circle-outline" size={22} color="#0284C7" style={{ marginRight: 10 }} />
          <Text style={styles.noticeText}>
            You can now sign in using your updated password.
          </Text>
        </View>

        {/* CTA to Login */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => onNavigate({ screen: 'login' })}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Sign In with New Password</Text>
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
    backgroundColor: '#E0F2FE',
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
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    borderRadius: 16,
    padding: 16,
    marginBottom: 32,
    width: '100%'
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: '#0369A1',
    lineHeight: 18,
    fontWeight: '500'
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
