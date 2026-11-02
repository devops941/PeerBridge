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
  Dimensions,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { promptGoogleOAuth } from '../../services/googleAuth';
import { AuthNavigationState, GoogleProfileData } from './types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  onLoginSuccess: (token: string, refreshToken: string, user: any) => void;
  onNavigate: (state: AuthNavigationState) => void;
}

export const LoginScreen: React.FC<Props> = ({ onLoginSuccess, onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Email + Password Login
  const handleLogin = async () => {
    setErrorMessage(null);
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid university email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.login(email.trim(), password);
      if (res && res.success && res.data) {
        onLoginSuccess(res.data.token, res.data.refreshToken, res.data.user);
      } else if (res && res.isUnverified) {
        Alert.alert(
          'Email Not Verified',
          'We have sent a verification code to complete your signup.',
          [
            {
              text: 'Verify Now',
              onPress: () => {
                onNavigate({
                  screen: 'otp_verify',
                  email: email.trim(),
                  otpPurpose: 'email_verification'
                });
              }
            }
          ]
        );
      } else {
        setErrorMessage(res?.message || 'Invalid email or password.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to connect to the authentication server.');
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth Flow
  const handleGoogleSignIn = async () => {
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

      // Check with backend (pass idToken or fallback, autoRegister: true for seamless registration)
      const tokenToSend = result.idToken || result.accessToken || 'simulated_google_token_dev';
      const verifyRes = await api.googleVerifyIntent(tokenToSend, true);

      if (verifyRes && verifyRes.success) {
        if (verifyRes.isNewUser && !verifyRes.data?.token) {
          // If onboarding completion is explicitly required
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
        } else if (verifyRes.data) {
          // Existing or auto-provisioned Google user: Log in immediately!
          onLoginSuccess(
            verifyRes.data.token,
            verifyRes.data.refreshToken,
            verifyRes.data.user
          );
        }
      } else {
        setErrorMessage(verifyRes?.message || 'Google authentication failed.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Google sign-in encountered an error.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#00C48C" />

      {/* ========================================================
          TOP SECTION: Emerald Hero Banner (Screenshot Screen 2)
      ======================================================== */}
      <View style={styles.topHeroBanner}>
        {/* Navigation row with back arrow */}
        <View style={styles.topNavRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => onNavigate({ screen: 'welcome' })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Content Row: Headline on Left, Mockup on Right */}
        <View style={styles.heroContentRow}>
          <View style={styles.heroTextCol}>
            <Text style={styles.heroHeadline}>
              Log in to stay on{'\n'}top of your doubts{'\n'}and projects.
            </Text>
          </View>

          {/* Graphical Phone Mockup preview peeking in */}
          <View style={styles.mockPhonePeeking}>
            <View style={styles.phoneSpeaker} />
            <View style={styles.phoneInnerCard}>
              <View style={styles.miniIconBox}>
                <Ionicons name="school" size={14} color="#00C48C" />
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
              <Text style={styles.sheetTitle}>Login</Text>
              <View style={styles.inlineSwitchRow}>
                <Text style={styles.switchText}>Don't Have An Account? </Text>
                <TouchableOpacity onPress={() => onNavigate({ screen: 'register' })}>
                  <Text style={styles.switchLink}>Sign Up</Text>
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

            {/* Input 1: Email Address */}
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

            {/* Input 2: Password */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.inputLeadingIcon} />
              <TextInput
                style={[styles.textInput, { paddingRight: 40 }]}
                placeholder="Enter your password"
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

            {/* Row: Remember Me & Forgot Password */}
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.checkboxRow}
                activeOpacity={0.8}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={[styles.checkboxBox, rememberMe && styles.checkboxBoxActive]}>
                  {rememberMe && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkboxLabel}>Remember Me</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  onNavigate({
                    screen: 'forgot_password',
                    email: email.trim()
                  })
                }
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.forgotPasswordLink}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Primary Action Button: Emerald Pill Button */}
            <TouchableOpacity
              style={[styles.loginButton, (loading || googleLoading) && { opacity: 0.7 }]}
              activeOpacity={0.85}
              onPress={handleLogin}
              disabled={loading || googleLoading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
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
              onPress={handleGoogleSignIn}
              disabled={googleLoading || loading}
            >
              {googleLoading ? (
                <ActivityIndicator size="small" color="#00C48C" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={18} color="#EA4335" style={{ marginRight: 10 }} />
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
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
    paddingTop: 28,
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
    marginBottom: 14,
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
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 20
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
    fontSize: 13,
    color: '#64748B'
  },
  forgotPasswordLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00C48C'
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
    marginVertical: 20
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
