import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { AuthNavigationState } from './types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  initialEmail?: string;
  onNavigate: (state: AuthNavigationState) => void;
}

export const ForgotPasswordScreen: React.FC<Props> = ({ initialEmail = '', onNavigate }) => {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSendResetOtp = async () => {
    setErrorMessage(null);

    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid registered email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.forgotPassword(email.trim());

      if (res && res.success) {
        // Navigate to OTP verification screen for password reset
        onNavigate({
          screen: 'otp_verify',
          email: email.trim(),
          otpPurpose: 'password_reset',
          devCodeHint: res.data?.devCode
        });
      } else {
        setErrorMessage(res?.message || 'Unable to process password reset request.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Server connection failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#00C48C" />

      {/* ========================================================
          TOP SECTION: Emerald Hero Banner (Matching Design Theme)
      ======================================================== */}
      <View style={styles.topHeroBanner}>
        <View style={styles.topNavRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => onNavigate({ screen: 'login' })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.heroContentRow}>
          <View style={styles.heroTextCol}>
            <Text style={styles.heroHeadline}>
              Reset Your Password{'\n'}& Regain Account{'\n'}Access
            </Text>
          </View>

          {/* Graphical Mockup Preview */}
          <View style={styles.mockPhonePeeking}>
            <View style={styles.phoneSpeaker} />
            <View style={styles.phoneInnerCard}>
              <View style={styles.miniIconBox}>
                <Ionicons name="key" size={14} color="#00C48C" />
              </View>
              <View style={styles.miniBarActive} />
              <View style={styles.miniBarMuted} />
            </View>
          </View>
        </View>
      </View>

      {/* ========================================================
          BOTTOM SECTION: Overlapping Curved White Card
      ======================================================== */}
      <View style={styles.bottomCardWrapper}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Title & Instructions */}
            <View style={styles.headerTitleRow}>
              <Text style={styles.sheetTitle}>Forgot Password?</Text>
              <Text style={styles.sheetSubtitle}>
                Enter your registered university email. We will send a secure 6-digit recovery code to reset your password.
              </Text>
            </View>

            {/* Error Alert */}
            {errorMessage ? (
              <View style={styles.errorAlert}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Email Address Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#64748B" style={styles.inputLeadingIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter your registered email"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setErrorMessage(null);
                }}
                editable={!loading}
              />
            </View>

            {/* Primary Action Button: Emerald Pill Button */}
            <TouchableOpacity
              style={[styles.loginButton, loading && { opacity: 0.7 }]}
              activeOpacity={0.85}
              onPress={handleSendResetOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.loginButtonText}>Send Reset Code</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>

            {/* Return to Login Link */}
            <View style={styles.bottomRow}>
              <Text style={styles.bottomText}>Remember your password? </Text>
              <TouchableOpacity onPress={() => onNavigate({ screen: 'login' })}>
                <Text style={styles.bottomLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#00C48C'
  },
  topHeroBanner: {
    height: SCREEN_HEIGHT * 0.34,
    backgroundColor: '#00C48C',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    justifyContent: 'space-between',
    paddingBottom: 28,
    position: 'relative'
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  heroContentRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between'
  },
  heroTextCol: {
    flex: 1,
    paddingRight: 10
  },
  heroHeadline: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 32,
    letterSpacing: -0.5
  },
  mockPhonePeeking: {
    width: 90,
    height: 110,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 8,
    alignItems: 'center',
    shadowColor: '#004D36',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    marginBottom: -28
  },
  phoneSpeaker: {
    width: 26,
    height: 3,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    marginBottom: 8
  },
  phoneInnerCard: {
    width: '100%',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 6,
    alignItems: 'center'
  },
  miniIconBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E6FBF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6
  },
  miniBarActive: {
    width: '80%',
    height: 4,
    backgroundColor: '#00C48C',
    borderRadius: 2,
    marginBottom: 4
  },
  miniBarMuted: {
    width: '50%',
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2
  },
  bottomCardWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24
  },
  headerTitleRow: {
    marginBottom: 24
  },
  sheetTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5
  },
  sheetSubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
    marginTop: 6
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 12,
    borderRadius: 14,
    marginBottom: 16
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    fontWeight: '500'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    height: 54,
    paddingHorizontal: 16,
    marginBottom: 20
  },
  inputLeadingIcon: {
    marginRight: 10
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    height: '100%'
  },
  loginButton: {
    backgroundColor: '#00C48C',
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00C48C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26
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
