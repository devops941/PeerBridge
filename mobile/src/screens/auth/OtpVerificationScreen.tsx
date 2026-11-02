import React, { useState, useEffect, useRef } from 'react';
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
  email: string;
  registrationId?: string;
  purpose: 'email_verification' | 'password_reset';
  devCodeHint?: string;
  onNavigate: (state: AuthNavigationState) => void;
}

export const OtpVerificationScreen: React.FC<Props> = ({
  email,
  registrationId,
  purpose,
  devCodeHint,
  onNavigate
}) => {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // 5-minute countdown timer (300 seconds)
  const [expirySeconds, setExpirySeconds] = useState(300);

  // 60-second cooldown timer for resend
  const [cooldownSeconds, setCooldownSeconds] = useState(60);

  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSec = sec % 60;
    return `${mins}:${remainingSec < 10 ? '0' : ''}${remainingSec}`;
  };

  const handleDigitChange = (value: string, index: number) => {
    setErrorMessage(null);

    // If pasted string of 6 digits
    if (value.length > 1) {
      const clean = value.replace(/[^0-9]/g, '').slice(0, 6);
      const newDigits = [...digits];
      for (let i = 0; i < clean.length; i++) {
        newDigits[i] = clean[i];
      }
      setDigits(newDigits);
      if (clean.length === 6) {
        inputRefs.current[5]?.focus();
      }
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = value.replace(/[^0-9]/g, '');
    setDigits(newDigits);

    // Auto-advance focus to next cell
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = digits.join('');
    if (otpCode.length !== 6) {
      setErrorMessage('Please enter all 6 digits of your verification code.');
      return;
    }

    if (expirySeconds === 0) {
      setErrorMessage('This code has expired. Please request a new verification code.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      if (purpose === 'email_verification') {
        const res = await api.verifyOtp({
          registrationId,
          email,
          otpCode
        });

        if (res && res.success) {
          onNavigate({
            screen: 'register_success',
            successMessage: res.message || 'Email verified and account activated!'
          });
        } else {
          setErrorMessage(res?.message || 'Invalid or expired verification code.');
        }
      } else {
        // Password Reset Verification
        const res = await api.verifyResetOtp(email, otpCode);
        if (res && res.success && res.data?.resetAuthorizationToken) {
          onNavigate({
            screen: 'reset_password',
            email,
            resetAuthorizationToken: res.data.resetAuthorizationToken
          });
        } else {
          setErrorMessage(res?.message || 'Invalid or expired code.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed. Please check network.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldownSeconds > 0) return;

    setResending(true);
    setErrorMessage(null);
    setSuccessNotice(null);
    try {
      const res = await api.resendOtp(email, purpose);
      if (res && res.success) {
        setSuccessNotice('A new 6-digit code was sent to your email.');
        setCooldownSeconds(60);
        setExpirySeconds(300);
        setDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        setErrorMessage(res?.message || 'Failed to resend code.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not resend code.');
    } finally {
      setResending(false);
    }
  };

  const isRegister = purpose === 'email_verification';

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
            onPress={() => onNavigate({ screen: isRegister ? 'register' : 'forgot_password' })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.heroContentRow}>
          <View style={styles.heroTextCol}>
            <Text style={styles.heroHeadline}>
              Enter 6-Digit{'\n'}Security Code
            </Text>
            <Text style={styles.heroEmailSubtitle} numberOfLines={1}>
              Sent to: {email}
            </Text>
          </View>

          {/* Graphical Mockup Preview with shield */}
          <View style={styles.mockPhonePeeking}>
            <View style={styles.phoneSpeaker} />
            <View style={styles.phoneInnerCard}>
              <View style={styles.miniIconBox}>
                <Ionicons name="shield-checkmark" size={14} color="#00C48C" />
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
              <Text style={styles.sheetTitle}>Verification</Text>
              <Text style={styles.sheetSubtitle}>
                Please check your inbox or spam folder for the 6-digit confirmation code.
              </Text>
            </View>

            {/* Dev Mode Banner (For instant zero friction emulator testing) */}
            {devCodeHint ? (
              <View style={styles.devBanner}>
                <Ionicons name="construct-outline" size={16} color="#047857" style={{ marginRight: 6 }} />
                <Text style={styles.devBannerText}>
                  Dev Mode Code: <Text style={{ fontWeight: '800' }}>{devCodeHint}</Text>
                </Text>
              </View>
            ) : null}

            {/* Success Notice */}
            {successNotice ? (
              <View style={styles.successAlert}>
                <Ionicons name="checkmark-circle" size={16} color="#047857" />
                <Text style={styles.successText}>{successNotice}</Text>
              </View>
            ) : null}

            {/* Error Alert */}
            {errorMessage ? (
              <View style={styles.errorAlert}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* 6 Digit OTP Cells */}
            <View style={styles.otpGrid}>
              {digits.map((digit, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.otpCell,
                    digit ? styles.otpCellFilled : null,
                    idx === digits.findIndex((d) => !d) ? styles.otpCellActive : null
                  ]}
                >
                  <TextInput
                    ref={(ref) => {
                      inputRefs.current[idx] = ref;
                    }}
                    style={styles.otpInput}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digit}
                    onChangeText={(val) => handleDigitChange(val, idx)}
                    onKeyPress={(e) => handleKeyPress(e, idx)}
                    selectTextOnFocus
                    editable={!loading}
                  />
                </View>
              ))}
            </View>

            {/* Expiry Timer Row */}
            <View style={styles.timerRow}>
              <Ionicons name="time-outline" size={16} color="#64748B" style={{ marginRight: 4 }} />
              <Text style={styles.timerText}>
                {expirySeconds > 0
                  ? `Code expires in ${formatTime(expirySeconds)}`
                  : 'Code has expired'}
              </Text>
            </View>

            {/* Primary Action Button: Emerald Pill Button */}
            <TouchableOpacity
              style={[styles.loginButton, loading && { opacity: 0.7 }]}
              activeOpacity={0.85}
              onPress={handleVerify}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.loginButtonText}>Verify & Continue</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>

            {/* Resend Code Section */}
            <View style={styles.resendRow}>
              <Text style={styles.resendNotice}>Didn't receive the email? </Text>
              {cooldownSeconds > 0 ? (
                <Text style={styles.resendTimer}>Resend in ({cooldownSeconds}s)</Text>
              ) : (
                <TouchableOpacity onPress={handleResend} disabled={resending}>
                  <Text style={styles.resendActiveLink}>
                    {resending ? 'Sending...' : 'Resend Code'}
                  </Text>
                </TouchableOpacity>
              )}
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
  heroEmailSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
    fontWeight: '500'
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
    paddingTop: 30,
    paddingBottom: 24
  },
  headerTitleRow: {
    marginBottom: 20
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
  devBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6FBF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 10,
    borderRadius: 12,
    marginBottom: 16
  },
  devBannerText: {
    fontSize: 12,
    color: '#047857'
  },
  successAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    padding: 12,
    borderRadius: 14,
    marginBottom: 16
  },
  successText: {
    color: '#15803D',
    fontSize: 13,
    marginLeft: 8,
    fontWeight: '500'
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
  otpGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  otpCell: {
    width: (SCREEN_WIDTH - 48 - 50) / 6,
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center'
  },
  otpCellActive: {
    borderColor: '#00C48C',
    backgroundColor: '#FFFFFF',
    shadowColor: '#00C48C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2
  },
  otpCellFilled: {
    borderColor: '#00C48C',
    backgroundColor: '#F0FDF4'
  },
  otpInput: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    width: '100%',
    height: '100%'
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24
  },
  timerText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500'
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
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22
  },
  resendNotice: {
    fontSize: 13,
    color: '#64748B'
  },
  resendTimer: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500'
  },
  resendActiveLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00C48C'
  }
});
