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
  email: string;
  resetAuthorizationToken: string;
  onNavigate: (state: AuthNavigationState) => void;
}

export const ResetPasswordScreen: React.FC<Props> = ({
  email,
  resetAuthorizationToken,
  onNavigate
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Criteria validation checks
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);

  const handleResetPassword = async () => {
    setErrorMessage(null);

    if (!hasMinLength || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      setErrorMessage('Please satisfy all password security criteria.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.resetPassword({
        email,
        resetAuthorizationToken,
        newPassword,
        confirmPassword
      });

      if (res && res.success) {
        onNavigate({
          screen: 'password_reset_success',
          successMessage: 'Your password was updated securely. All previous active sessions were signed out.'
        });
      } else {
        setErrorMessage(res?.message || 'Password update failed.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Server connection error.');
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
              Create a Strong{'\n'}New Password
            </Text>
            <Text style={styles.heroEmailSubtitle} numberOfLines={1}>
              Account: {email}
            </Text>
          </View>

          {/* Graphical Mockup Preview */}
          <View style={styles.mockPhonePeeking}>
            <View style={styles.phoneSpeaker} />
            <View style={styles.phoneInnerCard}>
              <View style={styles.miniIconBox}>
                <Ionicons name="lock-closed" size={14} color="#00C48C" />
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
              <Text style={styles.sheetTitle}>New Password</Text>
              <Text style={styles.sheetSubtitle}>
                Your new password must satisfy security standards to safeguard your peer learning account.
              </Text>
            </View>

            {/* Error Alert */}
            {errorMessage ? (
              <View style={styles.errorAlert}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Input 1: New Password */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.inputLeadingIcon} />
              <TextInput
                style={[styles.textInput, { paddingRight: 40 }]}
                placeholder="Enter new password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  setErrorMessage(null);
                }}
                editable={!loading}
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

            {/* Input 2: Confirm Password */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.inputLeadingIcon} />
              <TextInput
                style={[styles.textInput, { paddingRight: 40 }]}
                placeholder="Confirm new password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setErrorMessage(null);
                }}
                editable={!loading}
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

            {/* Password Criteria Checklist */}
            <View style={styles.criteriaBox}>
              <Text style={styles.criteriaTitle}>Password Requirements:</Text>
              <View style={styles.criteriaGrid}>
                <View style={[styles.criteriaPill, hasMinLength && styles.criteriaPillMet]}>
                  <Ionicons
                    name={hasMinLength ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={hasMinLength ? '#00C48C' : '#94A3B8'}
                  />
                  <Text style={[styles.criteriaText, hasMinLength && styles.criteriaTextMet]}>
                    8+ Characters
                  </Text>
                </View>

                <View style={[styles.criteriaPill, hasUpper && styles.criteriaPillMet]}>
                  <Ionicons
                    name={hasUpper ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={hasUpper ? '#00C48C' : '#94A3B8'}
                  />
                  <Text style={[styles.criteriaText, hasUpper && styles.criteriaTextMet]}>
                    Uppercase
                  </Text>
                </View>

                <View style={[styles.criteriaPill, hasLower && styles.criteriaPillMet]}>
                  <Ionicons
                    name={hasLower ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={hasLower ? '#00C48C' : '#94A3B8'}
                  />
                  <Text style={[styles.criteriaText, hasLower && styles.criteriaTextMet]}>
                    Lowercase
                  </Text>
                </View>

                <View style={[styles.criteriaPill, hasNumber && styles.criteriaPillMet]}>
                  <Ionicons
                    name={hasNumber ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={hasNumber ? '#00C48C' : '#94A3B8'}
                  />
                  <Text style={[styles.criteriaText, hasNumber && styles.criteriaTextMet]}>
                    Number
                  </Text>
                </View>

                <View style={[styles.criteriaPill, hasSpecial && styles.criteriaPillMet]}>
                  <Ionicons
                    name={hasSpecial ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={hasSpecial ? '#00C48C' : '#94A3B8'}
                  />
                  <Text style={[styles.criteriaText, hasSpecial && styles.criteriaTextMet]}>
                    Symbol (!@#$)
                  </Text>
                </View>
              </View>
            </View>

            {/* Primary Action Button: Emerald Pill Button */}
            <TouchableOpacity
              style={[styles.loginButton, loading && { opacity: 0.7 }]}
              activeOpacity={0.85}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.loginButtonText}>Update Password</Text>
                  <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>

            {/* Return to Login Link */}
            <View style={styles.bottomRow}>
              <Text style={styles.bottomText}>Back to </Text>
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
    paddingTop: 28,
    paddingBottom: 24
  },
  headerTitleRow: {
    marginBottom: 18
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
  criteriaBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginTop: 6,
    marginBottom: 22
  },
  criteriaTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8
  },
  criteriaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  criteriaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5
  },
  criteriaPillMet: {
    backgroundColor: '#E6FBF5',
    borderColor: '#A7F3D0'
  },
  criteriaText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500'
  },
  criteriaTextMet: {
    color: '#047857',
    fontWeight: '700'
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
    marginTop: 22
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
