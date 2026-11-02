import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { AuthNavigationState, GoogleProfileData } from './types';

interface Props {
  registrationId: string;
  googleProfile?: GoogleProfileData;
  onNavigate: (state: AuthNavigationState) => void;
}

export const GoogleCompletionScreen: React.FC<Props> = ({
  registrationId,
  googleProfile,
  onNavigate
}) => {
  const [name, setName] = useState(googleProfile?.name || '');
  const [college, setCollege] = useState('University Institute of Technology');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [yearOfStudy, setYearOfStudy] = useState('3');
  const [role, setRole] = useState<'student' | 'tutor' | 'both'>('both');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleComplete = async () => {
    setErrorMessage(null);

    if (!college.trim()) {
      setErrorMessage('College / University name is mandatory.');
      return;
    }
    if (!department.trim()) {
      setErrorMessage('Academic department is mandatory.');
      return;
    }
    if (!agreeTerms) {
      setErrorMessage('Please accept the Terms & Conditions.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.googleCompleteRegister({
        registrationId,
        name: name.trim() || googleProfile?.name,
        college: college.trim(),
        department: department.trim(),
        yearOfStudy: parseInt(yearOfStudy, 10) || 3,
        role,
        agreeTerms
      });

      if (res && res.success) {
        // Navigate to Registration Success Screen
        onNavigate({
          screen: 'register_success',
          successMessage: 'Google onboarding complete! Please sign in using Continue with Google.'
        });
      } else {
        setErrorMessage(res?.message || 'Failed to complete registration.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Server connection error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => onNavigate({ screen: 'login' })}
            >
              <Ionicons name="arrow-back" size={22} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.topBarTitle}>Finish Profile</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Profile Badge Card */}
          <View style={styles.googleProfileCard}>
            <Image
              source={{
                uri:
                  googleProfile?.avatar ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
              }}
              style={styles.avatarImage}
            />
            <View style={styles.profileTextContainer}>
              <View style={styles.verifiedRow}>
                <Ionicons name="logo-google" size={14} color="#00C48C" style={{ marginRight: 4 }} />
                <Text style={styles.verifiedTag}>Verified Google Account</Text>
              </View>
              <Text style={styles.profileName} numberOfLines={1}>
                {googleProfile?.name || 'Google Learner'}
              </Text>
              <Text style={styles.profileEmail} numberOfLines={1}>
                {googleProfile?.email}
              </Text>
            </View>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.cardHeading}>Mandatory Academic Details</Text>
            <Text style={styles.cardSubheading}>
              Complete your student identity to unlock peer study sessions and 50 welcome credits.
            </Text>

            {errorMessage ? (
              <View style={styles.errorAlert}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Display Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Display Name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your Name"
                  placeholderTextColor="#94A3B8"
                  editable={!loading}
                />
              </View>
            </View>

            {/* College */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>College / University</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="school-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={college}
                  onChangeText={setCollege}
                  placeholder="e.g. Stanford University"
                  placeholderTextColor="#94A3B8"
                  editable={!loading}
                />
              </View>
            </View>

            {/* Department */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Department / Major</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="book-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={department}
                  onChangeText={setDepartment}
                  placeholder="e.g. Computer Science"
                  placeholderTextColor="#94A3B8"
                  editable={!loading}
                />
              </View>
            </View>

            {/* Year of Study Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current Year of Study</Text>
              <View style={styles.yearPillsRow}>
                {['1', '2', '3', '4'].map((yr) => {
                  const isSelected = yearOfStudy === yr;
                  return (
                    <TouchableOpacity
                      key={yr}
                      style={[styles.yearPill, isSelected && styles.yearPillActive]}
                      onPress={() => setYearOfStudy(yr)}
                    >
                      <Text style={[styles.yearPillText, isSelected && styles.yearPillTextActive]}>
                        Year {yr}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Role Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Platform Intent</Text>
              <View style={styles.roleRow}>
                {[
                  { key: 'student', label: 'Learner' },
                  { key: 'tutor', label: 'Mentor' },
                  { key: 'both', label: 'Both' }
                ].map((item) => {
                  const isSelected = role === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[styles.roleCard, isSelected && styles.roleCardActive]}
                      onPress={() => setRole(item.key as any)}
                    >
                      <Ionicons
                        name={
                          item.key === 'student'
                            ? 'reader-outline'
                            : item.key === 'tutor'
                            ? 'bulb-outline'
                            : 'people-outline'
                        }
                        size={18}
                        color={isSelected ? '#00C48C' : '#64748B'}
                      />
                      <Text style={[styles.roleCardText, isSelected && styles.roleCardTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Terms Checkbox */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setAgreeTerms(!agreeTerms)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, agreeTerms && styles.checkboxActive]}>
                {agreeTerms && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <Text style={styles.checkboxLabel}>
                I agree to the Community Guidelines & Terms of Service
              </Text>
            </TouchableOpacity>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleComplete}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Complete & Activate Account</Text>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  keyboardView: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A'
  },
  googleProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#00C48C'
  },
  profileTextContainer: {
    marginLeft: 14,
    flex: 1
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2
  },
  verifiedTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00C48C',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A'
  },
  profileEmail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 1
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  cardHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4
  },
  cardSubheading: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 20,
    lineHeight: 18
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    fontWeight: '500'
  },
  inputGroup: {
    marginBottom: 16
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50
  },
  inputIcon: {
    marginRight: 10
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500'
  },
  yearPillsRow: {
    flexDirection: 'row',
    gap: 8
  },
  yearPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  yearPillActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#00C48C'
  },
  yearPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B'
  },
  yearPillTextActive: {
    color: '#00C48C',
    fontWeight: '700'
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8
  },
  roleCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 6
  },
  roleCardActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#00C48C'
  },
  roleCardText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B'
  },
  roleCardTextActive: {
    color: '#00C48C',
    fontWeight: '700'
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
    marginTop: 6
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  checkboxActive: {
    backgroundColor: '#00C48C',
    borderColor: '#00C48C'
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    color: '#475569'
  },
  primaryButton: {
    backgroundColor: '#00C48C',
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00C48C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  },
  buttonDisabled: {
    opacity: 0.65
  }
});
