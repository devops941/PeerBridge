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
  StatusBar,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { promptGoogleOAuth } from '../../services/googleAuth';
import { AuthNavigationState, GoogleProfileData } from './types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  onNavigate: (state: AuthNavigationState) => void;
  onLoginSuccess?: (token: string, refreshToken: string, user: any) => void;
}

export const RegisterScreen: React.FC<Props> = ({ onNavigate, onLoginSuccess }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Email + Password Registration
  const handleRegister = async () => {
    setErrorMessage(null);

    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid university email address.');
      return;
    }
    if (!password || password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setErrorMessage('Password must contain at least one uppercase letter and one number.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Password confirmation does not match.');
      return;
    }
    if (!rememberMe) {
      setErrorMessage('Please accept the Terms & Conditions and Academic Honor Code.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.register({
        name: fullName.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        agreeTerms: rememberMe
      });

      if (res && res.success) {
        // Navigate to OTP Verification Screen
        onNavigate({
          screen: 'otp_verify',
          email: res.data?.email || email.trim(),
          registrationId: res.data?.registrationId,
          otpPurpose: 'email_verification',
          devCodeHint: res.data?.devCode
        });
      } else {
        setErrorMessage(res?.message || 'Registration failed. Please check your details.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Server connection error during registration.');
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth One-Tap Sign-Up Flow
  const handleGoogleSignUp = async () => {
    setErrorMessage(null);
    setGoogleLoading(true);
    try {
      const result = await promptGoogleOAuth();
      if (!result.success) {
        if (result.error && result.error !== 'Sign-in cancelled') {
          setErrorMessage(result.error);
        }
        setGoogleLoading(false);
        return;
      }

      // Check / Register with backend
      const tokenToSend = result.idToken || result.accessToken || 'simulated_google_token_dev';
      const verifyRes = await api.googleVerifyIntent(tokenToSend, true);

      if (verifyRes && verifyRes.success) {
        if (verifyRes.data?.token && onLoginSuccess) {
          // Instant one-tap registration success!
          onLoginSuccess(
            verifyRes.data.token,
            verifyRes.data.refreshToken,
            verifyRes.data.user
          );
        } else if (verifyRes.isNewUser) {
          const profile: GoogleProfileData = verifyRes.data?.profile || {
            email: result.user?.email || '',
            name: result.user?.name || '',
            avatar: result.user?.avatar
          };
          onNavigate({
            screen: 'google_completion',
            registrationId: verifyRes.data?.registrationId,
            googleProfile: profile
          });
        }
      } else {
        setErrorMessage(verifyRes?.message || 'Google registration failed.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Google sign-up encountered an error.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#00C48C" />

      {/* ========================================================
          TOP SECTION: Emerald Hero Banner (Screenshot Screen 3)
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
              Create Your Account{'\n'}and Simplify Your{'\n'}Workday
            </Text>
          </View>

          {/* Graphical Mockup preview matching screenshot Screen 3 */}
          <View style={styles.mockPhonePeeking}>
            <View style={styles.phoneSpeaker} />
            <View style={styles.phoneInnerCard}>
              <View style={styles.miniIconBox}>
                <Ionicons name="sparkles" size={14} color="#00C48C" />
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
            {/* Title & Inline Switch Link */}
            <View style={styles.headerTitleRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.sheetTitle}>Sign up</Text>
                <View style={styles.creditPill}>
                  <Ionicons name="gift-outline" size={13} color="#047857" />
                  <Text style={styles.creditPillText}>+50 Credits</Text>
                </View>
              </View>

              <View style={styles.inlineSwitchRow}>
                <Text style={styles.switchText}>Already Have An Account? </Text>
                <TouchableOpacity onPress={() => onNavigate({ screen: 'login' })}>
                  <Text style={styles.switchLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Error Alert */}
            {errorMessage ? (
              <View style={styles.errorAlert}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Input 1: Full Name */}
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#64748B" style={styles.inputLeadingIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter your full name"
                placeholderTextColor="#94A3B8"
                autoCapitalize="words"
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  setErrorMessage(null);
                }}
                editable={!loading && !googleLoading}
              />
            </View>

            {/* Input 2: Email Address */}
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#64748B" style={styles.inputLeadingIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter your email address"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setErrorMessage(null);
                }}
                editable={!loading && !googleLoading}
              />
            </View>

            {/* Input 3: Password */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.inputLeadingIcon} />
              <TextInput
                style={[styles.textInput, { paddingRight: 40 }]}
                placeholder="Password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setErrorMessage(null);
                }}
                editable={!loading && !googleLoading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>

            {/* Input 4: Confirm Password */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.inputLeadingIcon} />
              <TextInput
                style={[styles.textInput, { paddingRight: 40 }]}
                placeholder="Confirm password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setErrorMessage(null);
                }}
                editable={!loading && !googleLoading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>

            {/* Row: Remember Me & Terms */}
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.checkboxRow}
                activeOpacity={0.8}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={[styles.checkboxBox, rememberMe && styles.checkboxBoxActive]}>
                  {rememberMe && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkboxLabel}>I agree to Terms & Honor Code</Text>
              </TouchableOpacity>
            </View>

            {/* Primary Action Button: Emerald Pill Button */}
            <TouchableOpacity
              style={[styles.loginButton, (loading || googleLoading) && { opacity: 0.7 }]}
              activeOpacity={0.85}
              onPress={handleRegister}
              disabled={loading || googleLoading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Sign up</Text>
              )}
            </TouchableOpacity>

            {/* Google OAuth (Temporarily commented out) */}
            {/*
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or Continue With</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.googleFullButton}
              activeOpacity={0.85}
              onPress={handleGoogleSignUp}
              disabled={googleLoading || loading}
            >
              {googleLoading ? (
                <ActivityIndicator size="small" color="#00C48C" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={18} color="#EA4335" style={{ marginRight: 10 }} />
                  <Text style={styles.googleButtonText}>Sign up with Google</Text>
                </>
              )}
            </TouchableOpacity>
            */}
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
    height: SCREEN_HEIGHT * 0.32,
    backgroundColor: '#00C48C',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    justifyContent: 'space-between',
    paddingBottom: 26,
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
    fontSize: 23,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 30,
    letterSpacing: -0.5
  },
  mockPhonePeeking: {
    width: 86,
    height: 105,
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
    marginBottom: -26
  },
  phoneSpeaker: {
    width: 24,
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
    paddingTop: 24,
    paddingBottom: 24
  },
  headerTitleRow: {
    marginBottom: 16
  },
  sheetTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5
  },
  creditPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6FBF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4
  },
  creditPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857'
  },
  inlineSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  switchText: {
    fontSize: 13,
    color: '#64748B'
  },
  switchLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00C48C'
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 10,
    borderRadius: 14,
    marginBottom: 14
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 12,
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
    height: 52,
    paddingHorizontal: 16,
    marginBottom: 12,
    position: 'relative'
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
  eyeButton: {
    position: 'absolute',
    right: 14,
    padding: 4
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 18
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8
  },
  checkboxBoxActive: {
    backgroundColor: '#00C48C',
    borderColor: '#00C48C'
  },
  checkboxLabel: {
    fontSize: 12,
    color: '#64748B'
  },
  loginButton: {
    backgroundColor: '#00C48C',
    height: 52,
    borderRadius: 26,
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0'
  },
  dividerText: {
    fontSize: 12,
    color: '#94A3B8',
    paddingHorizontal: 12,
    fontWeight: '500'
  },
  googleFullButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    height: 52,
    borderRadius: 26,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2
  },
  googleButtonText: {
    color: '#1E293B',
    fontSize: 15,
    fontWeight: '700'
  }
});
