import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  SafeAreaView,
  StatusBar,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { api } from '../services/api';
import { promptGoogleOAuth } from '../services/googleAuth';

interface Props {
  onLoginSuccess: (token: string, user: any) => void;
}

type ScreenView = 'login' | 'register' | 'otp_verify';

export const LoginScreen: React.FC<Props> = ({ onLoginSuccess }) => {
  const [view, setView] = useState<ScreenView>('login');

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [devCodeHint, setDevCodeHint] = useState<string | null>(null);

  // 1. Handle Login with Not-Registered Check & Auto-Redirect
  const handleLogin = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    if (!password) {
      Alert.alert('Password Required', 'Please enter your password, or use Email OTP.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.login(email.trim(), password);
      if (res && res.success && res.data) {
        onLoginSuccess(res.data.token, res.data.user);
      } else if (res && res.notRegistered) {
        Alert.alert(
          'Account Not Found',
          'You have not registered with this email yet. Please create an account first.',
          [
            {
              text: 'Create Account',
              onPress: () => setView('register')
            }
          ]
        );
        setView('register');
      } else {
        Alert.alert('Login Failed', res.message || 'Invalid email or password');
      }
    } catch (err: any) {
      Alert.alert('Login Error', err.message || 'Server connection failed.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Register (Create Account)
  const handleRegister = async () => {
    if (!fullName.trim()) {
      Alert.alert('Name Required', 'Please enter your full name.');
      return;
    }
    if (!email || !email.includes('@')) {
      Alert.alert('Email Required', 'Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }
    if (!agreeTerms) {
      Alert.alert('Terms Agreement', 'Please agree to the Terms & Conditions.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.register({
        name: fullName.trim(),
        email: email.trim(),
        password: password
      });
      if (res && res.success && res.data) {
        Alert.alert('🎉 Account Created!', 'Registration successful. Welcome to PeerBridge!');
        onLoginSuccess(res.data.token, res.data.user);
      } else {
        Alert.alert('Registration Failed', res.message || 'Please check details.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to register account.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Send OTP with Registration Check
  const handleSendOtp = async (intent: 'login' | 'register' = 'login') => {
    if (!email || !email.includes('@')) {
      Alert.alert('Email Required', 'Please enter your student email.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.sendOtp(email.trim(), intent);
      if (res && res.success) {
        setDevCodeHint(res.devCode || null);
        setView('otp_verify');
        Alert.alert(
          '📧 OTP Sent!',
          `A 6-digit verification code has been sent to ${email.trim()}.`
        );
      } else if (res && res.notRegistered) {
        Alert.alert(
          'Not Registered',
          'This email is not registered yet. Please create an account first.',
          [
            {
              text: 'Create Account',
              onPress: () => setView('register')
            }
          ]
        );
        setView('register');
      } else {
        Alert.alert('Notice', res.message || 'Could not send OTP.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Verify OTP Code
  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.trim().length < 6) {
      Alert.alert('Incomplete Code', 'Please enter the 6-digit OTP code.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.verifyOtp(email.trim(), otpCode.trim());
      if (res && res.success && res.data) {
        onLoginSuccess(res.data.token, res.data.user);
      } else {
        Alert.alert('Verification Failed', res.message || 'Invalid or expired code.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Verification error.');
    } finally {
      setLoading(false);
    }
  };

  // 5. Official Google OAuth Sign-In (Opens Google's real mobile account chooser)
  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await promptGoogleOAuth();
      if (!result.success) {
        if (result.error && result.error !== 'Sign-in cancelled') {
          Alert.alert('Google Sign-In', result.error);
        }
        return;
      }

      if (result.user) {
        const res = await api.googleSignIn({
          email: result.user.email,
          name: result.user.name,
          avatar: result.user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'
        });

        if (res && res.success && res.data) {
          Alert.alert('🎉 Welcome!', `Signed in as ${res.data.user.name}`);
          onLoginSuccess(res.data.token, res.data.user);
        } else {
          Alert.alert('Sign-In Failed', res.message || 'Could not authenticate Google account.');
        }
      }
    } catch (err: any) {
      Alert.alert('Google Sign-In Error', err.message || 'Failed to authenticate.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* ========================================================
              SCREEN 1: LOGIN ("Welcome Back!")
          ======================================================== */}
          {view === 'login' && (
            <View style={styles.cardWrapper}>
              {/* Brand Logo at top */}
              <View style={styles.logoRow}>
                <Image
                  source={require('../../assets/logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>

              {/* Title & Subtitle */}
              <Text style={styles.welcomeTitle}>Welcome Back!</Text>
              <Text style={styles.welcomeSubtitle}>
                Continue your learning journey with PeerBridge
              </Text>

              {/* Email Address Input */}
              <View style={styles.inputBox}>
                <Ionicons name="mail-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  placeholder="Email address"
                  placeholderTextColor="#94A3B8"
                  style={styles.textInput}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Password Input with eye toggle */}
              <View style={styles.inputBox}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#94A3B8"
                  style={styles.textInput}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              </View>

              {/* Remember me & Forgot Password */}
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={styles.rememberMeRow}
                  activeOpacity={0.8}
                  onPress={() => setRememberMe(!rememberMe)}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                    {rememberMe && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                  </View>
                  <Text style={styles.rememberMeText}>Remember me</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => handleSendOtp('login')}>
                  <Text style={styles.forgotPasswordText}>Login via OTP?</Text>
                </TouchableOpacity>
              </View>

              {/* Login Button with Arrow */}
              <TouchableOpacity
                style={styles.mainActionBtn}
                activeOpacity={0.88}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={styles.btnContentRow}>
                    <Text style={styles.mainActionBtnText}>Login</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  </View>
                )}
              </TouchableOpacity>

              {/* Divider: OR CONTINUE WITH */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR SIGN IN WITH</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Dedicated Official Google Sign-In Button */}
              <TouchableOpacity
                style={styles.googleFullBtn}
                activeOpacity={0.85}
                onPress={handleGoogleSignIn}
                disabled={loading}
              >
                <View style={styles.googleIconCircle}>
                  <Ionicons name="logo-google" size={22} color="#EA4335" />
                </View>
                <Text style={styles.googleFullBtnText}>Continue with Google</Text>
              </TouchableOpacity>

              {/* Bottom Toggle: Don't have an account? Create Account */}
              <View style={styles.footerToggleRow}>
                <Text style={styles.footerToggleText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => setView('register')}>
                  <Text style={styles.footerToggleLink}>Create Account</Text>
                </TouchableOpacity>
              </View>

              {/* Decorative Banner pill */}
              <View style={styles.decorBanner}>
                <Ionicons name="sparkles" size={16} color="#059669" />
                <Text style={styles.decorBannerText}>Better Learning Together</Text>
              </View>
            </View>
          )}

          {/* ========================================================
              SCREEN 2: SIGNUP ("Create Your Account")
          ======================================================== */}
          {view === 'register' && (
            <View style={styles.cardWrapper}>
              {/* Header with Back and Already have an account */}
              <View style={styles.registerTopNav}>
                <TouchableOpacity style={styles.backCircleBtn} onPress={() => setView('login')}>
                  <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
                </TouchableOpacity>

                <View style={styles.alreadyAccountRow}>
                  <Text style={styles.alreadyAccountText}>Already have an account? </Text>
                  <TouchableOpacity onPress={() => setView('login')}>
                    <Text style={styles.alreadyAccountLink}>Login</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Heading */}
              <Text style={styles.welcomeTitle}>Create Your Account</Text>
              <Text style={styles.welcomeSubtitle}>
                Join PeerBridge and be part of a growing student learning community.
              </Text>

              {/* Full Name */}
              <Text style={styles.formLabel}>Full Name</Text>
              <View style={styles.inputBox}>
                <Ionicons name="person-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  placeholder="Enter your full name"
                  placeholderTextColor="#94A3B8"
                  style={styles.textInput}
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>

              {/* Email Address */}
              <Text style={styles.formLabel}>Email Address</Text>
              <View style={styles.inputBox}>
                <Ionicons name="mail-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  placeholder="Enter your email address"
                  placeholderTextColor="#94A3B8"
                  style={styles.textInput}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Password */}
              <Text style={styles.formLabel}>Password</Text>
              <View style={styles.inputBox}>
                <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  placeholder="Create a password"
                  placeholderTextColor="#94A3B8"
                  style={styles.textInput}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={18}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.passwordHint}>
                Minimum 8 characters with letters, numbers and symbols
              </Text>

              {/* Confirm Password */}
              <Text style={styles.formLabel}>Confirm Password</Text>
              <View style={styles.inputBox}>
                <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  placeholder="Confirm your password"
                  placeholderTextColor="#94A3B8"
                  style={styles.textInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={18}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              </View>

              {/* Create Account Button */}
              <TouchableOpacity
                style={styles.mainActionBtn}
                activeOpacity={0.88}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={styles.btnContentRow}>
                    <Text style={styles.mainActionBtnText}>Create Account</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  </View>
                )}
              </TouchableOpacity>

              {/* Divider: OR SIGN UP WITH */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR SIGN UP WITH</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Dedicated Official Google Sign-In Button */}
              <TouchableOpacity
                style={styles.googleFullBtn}
                activeOpacity={0.85}
                onPress={handleGoogleSignIn}
                disabled={loading}
              >
                <View style={styles.googleIconCircle}>
                  <Ionicons name="logo-google" size={22} color="#EA4335" />
                </View>
                <Text style={styles.googleFullBtnText}>Sign up with Google</Text>
              </TouchableOpacity>

              {/* Terms Checkbox */}
              <TouchableOpacity
                style={styles.termsRow}
                activeOpacity={0.8}
                onPress={() => setAgreeTerms(!agreeTerms)}
              >
                <View style={[styles.checkbox, agreeTerms && styles.checkboxActive]}>
                  {agreeTerms && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>
                <Text style={styles.termsText}>
                  I agree to the <Text style={styles.termsHighlight}>Terms & Conditions</Text> and{' '}
                  <Text style={styles.termsHighlight}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ========================================================
              SCREEN 3: 6-DIGIT OTP VERIFICATION MODAL
          ======================================================== */}
          {view === 'otp_verify' && (
            <View style={styles.cardWrapper}>
              <TouchableOpacity style={styles.backCircleBtn} onPress={() => setView('login')}>
                <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
              </TouchableOpacity>

              <Text style={styles.welcomeTitle}>Verify Email OTP</Text>
              <Text style={styles.welcomeSubtitle}>
                Enter the 6-digit code sent to <Text style={{ fontWeight: '700' }}>{email}</Text>
              </Text>

              {devCodeHint && (
                <View style={styles.devBanner}>
                  <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.devBannerText}>
                    Development OTP: <Text style={{ fontWeight: '800' }}>{devCodeHint}</Text>
                  </Text>
                </View>
              )}

              <View style={[styles.inputBox, { justifyContent: 'center' }]}>
                <TextInput
                  placeholder="• • • • • •"
                  placeholderTextColor="#94A3B8"
                  style={[styles.textInput, styles.otpInput]}
                  value={otpCode}
                  onChangeText={setOtpCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={styles.mainActionBtn}
                activeOpacity={0.88}
                onPress={handleVerifyOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={styles.btnContentRow}>
                    <Text style={styles.mainActionBtnText}>Verify & Proceed</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.resendBtn} onPress={() => handleSendOtp('login')}>
                <Text style={styles.resendBtnText}>Didn't receive code? Resend OTP</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3FBF7',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0
  },
  keyboardContainer: {
    flex: 1
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E6F4EA'
  },
  logoRow: {
    alignItems: 'center',
    marginBottom: 16
  },
  logoImage: {
    width: 220,
    height: 56
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 22,
    lineHeight: 18
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 4
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 50,
    paddingHorizontal: 14,
    marginBottom: 14
  },
  inputIcon: {
    marginRight: 10
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A'
  },
  eyeBtn: {
    padding: 6
  },
  passwordHint: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: -8,
    marginBottom: 14
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  rememberMeRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: '#FFFFFF'
  },
  checkboxActive: {
    backgroundColor: '#00875A',
    borderColor: '#00875A'
  },
  rememberMeText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500'
  },
  forgotPasswordText: {
    fontSize: 13,
    color: '#00875A',
    fontWeight: '600'
  },
  mainActionBtn: {
    backgroundColor: '#00875A', // Rich Emerald Green from design
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00875A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 22
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  mainActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0'
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    letterSpacing: 0.5
  },
  googleFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 20
  },
  googleIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  googleFullBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B'
  },
  socialCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 22
  },
  socialCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    gap: 6
  },
  socialCardText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155'
  },
  footerToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14
  },
  footerToggleText: {
    fontSize: 13,
    color: '#64748B'
  },
  footerToggleLink: {
    fontSize: 13,
    color: '#00875A',
    fontWeight: '700'
  },
  decorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
    alignSelf: 'center',
    marginTop: 4
  },
  decorBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
    fontStyle: 'italic'
  },
  registerTopNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  backCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  alreadyAccountRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  alreadyAccountText: {
    fontSize: 12,
    color: '#64748B'
  },
  alreadyAccountLink: {
    fontSize: 12,
    color: '#00875A',
    fontWeight: '700'
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6
  },
  termsText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
    lineHeight: 16
  },
  termsHighlight: {
    color: '#00875A',
    fontWeight: '700',
    textDecorationLine: 'underline'
  },
  otpInput: {
    fontSize: 22,
    letterSpacing: 8,
    fontWeight: '800',
    color: '#00875A',
    textAlign: 'center'
  },
  devBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
    gap: 6
  },
  devBannerText: {
    fontSize: 12,
    color: '#065F46'
  },
  resendBtn: {
    alignItems: 'center',
    paddingVertical: 8
  },
  resendBtnText: {
    fontSize: 12,
    color: '#00875A',
    fontWeight: '600'
  },
  googleModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end'
  },
  googlePickerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 12
  },
  googleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  googlePickerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B'
  },
  googlePickerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2
  },
  googleAccountsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16
  },
  googleAccountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7'
  },
  googleAvatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1A73E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  googleAvatarInitial: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800'
  },
  googleAccountMeta: {
    flex: 1
  },
  googleAccountName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B'
  },
  googleAccountEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2
  },
  otherInputWrapper: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4
  },
  otherTextInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1E293B'
  },
  otherSubmitBtn: {
    backgroundColor: '#00875A',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10
  },
  otherSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700'
  },
  googleDisclaimerText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 16,
    paddingHorizontal: 10
  },
  googleCancelActionBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center'
  },
  googleCancelActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B'
  }
});
