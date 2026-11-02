import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Dimensions,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DoubtItem } from '../../types';
import { api } from '../../services/api';

interface Props {
  visible: boolean;
  doubt: DoubtItem | null;
  onClose: () => void;
  token?: string | null;
  onSuccess: (updatedDoubt: DoubtItem) => void;
}

export const VolunteerModal: React.FC<Props> = ({
  visible,
  doubt,
  onClose,
  token,
  onSuccess
}) => {
  const [introMessage, setIntroMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (!doubt) return null;

  const handleSubmit = async () => {
    if (!token) {
      Alert.alert('Sign In Required', 'Please log in to volunteer to help your peers.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.volunteerForDoubt(token, doubt._id, introMessage.trim());
      if (res && res.success) {
        Alert.alert(
          'Offer Sent! 🤝',
          `Your offer to help has been sent to ${doubt.author?.name || 'the student'}. Once accepted, you can collaborate directly!`
        );
        onSuccess({
          ...doubt,
          volunteerCount: (doubt.volunteerCount || 0) + 1,
          hasVolunteered: true
        });
        setIntroMessage('');
        onClose();
      } else {
        Alert.alert('Could Not Volunteer', res?.message || 'Failed to submit volunteer offer.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Network error while submitting offer.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={Keyboard.dismiss}
        />
        <View
          style={[
            styles.modalContainer,
            Platform.OS === 'android' && keyboardHeight > 0 && {
              marginBottom: keyboardHeight,
              maxHeight: Math.max(280, Dimensions.get('window').height - keyboardHeight - 30)
            }
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="hand-right" size={20} color="#00C48C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Volunteer to Help</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {doubt.subject} • {doubt.title}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Form Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
          >
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle-outline" size={18} color="#00A374" style={{ marginRight: 8 }} />
              <Text style={styles.infoBannerText}>
                As a peer helper, you can explain concepts, share lecture insights, and help your fellow student ace this topic!
              </Text>
            </View>

            <Text style={styles.inputLabel}>Introductory Note (Optional)</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="e.g. Hi! I solved a similar recursion problem last week. I can walk you through the base cases..."
              placeholderTextColor="#94A3B8"
              value={introMessage}
              onChangeText={setIntroMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={300}
            />

            {/* Actions Footer */}
            <View style={[styles.actionsFooter, { paddingHorizontal: 0, paddingBottom: 10 }]}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={submitting}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sendBtn, submitting && { opacity: 0.7 }]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.sendBtnText}>Send Offer to Help</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end'
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 28
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A'
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  contentBody: {
    paddingHorizontal: 20,
    paddingTop: 16
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 16
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#065F46',
    lineHeight: 18
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8
  },
  messageInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 100,
    marginBottom: 16
  },
  actionsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginRight: 10
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B'
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00C48C',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 14,
    shadowColor: '#00C48C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  sendBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF'
  }
});
