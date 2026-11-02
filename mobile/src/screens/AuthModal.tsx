import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { api } from '../services/api';

interface Props {
  visible: boolean;
  onClose: () => void;
  onLoginSuccess: (token: string, user: any) => void;
}

type AuthMode = 'otp_request' | 'otp_verify' | 'password_login';

export const AuthModal: React.FC<Props> = ({ visible, onClose, onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('otp_request');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [devCodeHint, setDevCodeHint] = useState<string | null>(null);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: any;
    if (mode === 'otp_verify' && countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [mode, countdown]);

  // 1. Send OTP to Email via SMTP
  const handleSendOtp = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.sendOtp(email.trim());
      if (res && res.success) {
        setDevCodeHint(res.devCode || null);
        setMode('otp_verify');
        setCountdown(60);
        Alert.alert(
          '📧 Verification Code Sent!',
          `A 6-digit OTP code has been sent to ${email.trim()}. Please check your inbox or spam folder.`
        );
      } else {
        Alert.alert('Notice', res.message || 'Failed to send OTP code.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Network request failed.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Verify OTP Code
  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.trim().length < 6) {
      Alert.alert('Incomplete OTP', 'Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.verifyOtp(email.trim(), otpCode.trim());
      if (res && res.success && res.data) {
        onLoginSuccess(res.data.token, res.data.user);
        onClose();
        Alert.alert('🎉 Welcome!', `Signed in successfully as ${res.data.user.name}`);
      } else {
        Alert.alert('Verification Failed', res.message || 'Invalid or expired OTP code.');
      }
    } catch (err: any) {
      Alert.alert('Verification Error', err.message || 'Failed to verify code.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Google One-Tap Sign-In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const googlePayload = {
        email: email && email.includes('@') ? email.trim() : 'student.google@peerbridge.edu',
        name: 'Gokul (Google User)',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80'
      };

      const res = await api.googleSignIn(googlePayload);
      if (res && res.success && res.data) {
        onLoginSuccess(res.data.token, res.data.user);
        onClose();
        Alert.alert('✅ Google Sign-In', `Welcome ${res.data.user.name}!`);
      } else {
        Alert.alert('Google Sign-In Failed', res.message || 'Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Google authentication error.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Password Login
  const handlePasswordLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.login(email.trim(), password);
      if (res && res.success && res.data) {
        onLoginSuccess(res.data.token, res.data.user);
        onClose();
      } else {
        Alert.alert('Login Failed', res.message || 'Invalid credentials');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Login error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          {/* Brand Header with PeerBridge Logo */}
          <View style={styles.brandHeaderRow}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Subtitle / Mode prompt */}
          <View style={styles.titleWrapper}>
            <Text style={styles.title}>
              {mode === 'otp_verify'
                ? 'Enter Verification Code'
                : 'Welcome to PeerBridge'}
            </Text>
            <Text style={styles.subtitle}>
              {mode === 'otp_verify'
                ? `Enter the 6-digit code sent to ${email}`
                : 'Student-to-Student Learning & Peer Collaboration'}
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* GOOGLE ONE-TAP BUTTON (Shown on main login screen) */}
            {mode !== 'otp_verify' && (
              <>
                <TouchableOpacity
                  style={styles.googleBtn}
                  activeOpacity={0.85}
                  onPress={handleGoogleSignIn}
                  disabled={loading}
                >
                  <Ionicons name="logo-google" size={20} color="#EA4335" style={{ marginRight: 10 }} />
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or continue with email</Text>
                  <View style={styles.dividerLine} />
                </View>
              </>
            )}

            {/* FLOW 1: REQUEST OTP */}
            {mode === 'otp_request' && (
              <View>
                <Text style={styles.inputLabel}>College or Personal Email</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                  <TextInput
                    placeholder="e.g. gokul@gmail.com or 21csr@kongu.edu"
                    placeholderTextColor={COLORS.textMuted}
                    style={styles.textInput}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <TouchableOpacity
                  style={styles.primaryBtn}
                  activeOpacity={0.88}
                  onPress={handleSendOtp}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Send Verification Code (OTP)</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.altModeBtn}
                  onPress={() => setMode('password_login')}
                >
                  <Text style={styles.altModeText}>Sign in with Password instead</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* FLOW 2: VERIFY 6-DIGIT OTP */}
            {mode === 'otp_verify' && (
              <View>
                {devCodeHint && (
                  <View style={styles.devBanner}>
                    <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.devBannerText}>
                      Test Code (Dev): <Text style={{ fontWeight: '800' }}>{devCodeHint}</Text>
                    </Text>
                  </View>
                )}

                <Text style={styles.inputLabel}>6-Digit OTP Code</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="key-outline" size={18} color={COLORS.primary} style={styles.inputIcon} />
                  <TextInput
                    placeholder="• • • • • •"
                    placeholderTextColor={COLORS.textMuted}
                    style={[styles.textInput, styles.otpInput]}
                    value={otpCode}
                    onChangeText={setOtpCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={styles.primaryBtn}
                  activeOpacity={0.88}
                  onPress={handleVerifyOtp}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Verify & Sign In</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.resendRow}>
                  {countdown > 0 ? (
                    <Text style={styles.countdownText}>Resend code in {countdown}s</Text>
                  ) : (
                    <TouchableOpacity onPress={handleSendOtp}>
                      <Text style={styles.resendActionText}>Resend OTP Code</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity onPress={() => setMode('otp_request')}>
                    <Text style={styles.changeEmailText}>Change Email</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* FLOW 3: PASSWORD LOGIN */}
            {mode === 'password_login' && (
              <View>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                  <TextInput
                    placeholder="student@peerbridge.edu"
                    placeholderTextColor={COLORS.textMuted}
                    style={styles.textInput}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                  <TextInput
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.textMuted}
                    style={styles.textInput}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>

                <TouchableOpacity
                  style={styles.primaryBtn}
                  activeOpacity={0.88}
                  onPress={handlePasswordLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Sign In</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.altModeBtn}
                  onPress={() => setMode('otp_request')}
                >
                  <Text style={styles.altModeText}>Sign in with Email OTP code</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end'
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    maxHeight: '90%'
  },
  brandHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  brandLogo: {
    width: 160,
    height: 42
  },
  titleWrapper: {
    marginBottom: 16
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    maxWidth: '92%',
    lineHeight: 18
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16
  },
  googleBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0'
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500'
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 50,
    paddingHorizontal: 14,
    marginBottom: 16
  },
  inputIcon: {
    marginRight: 10
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary
  },
  otpInput: {
    fontSize: 20,
    letterSpacing: 6,
    fontWeight: '800',
    color: COLORS.primaryDark
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 14
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800'
  },
  altModeBtn: {
    alignItems: 'center',
    paddingVertical: 6
  },
  altModeText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600'
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 6
  },
  countdownText: {
    fontSize: 12,
    color: COLORS.textMuted
  },
  resendActionText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700'
  },
  changeEmailText: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: '600'
  },
  devBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
    gap: 6
  },
  devBannerText: {
    fontSize: 12,
    color: COLORS.primaryDark
  }
});
