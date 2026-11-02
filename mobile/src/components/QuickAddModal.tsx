import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAskDoubtPress: () => void;
  onAddStoryPress: () => void;
}

export const QuickAddModal: React.FC<Props> = ({
  visible,
  onClose,
  onAskDoubtPress,
  onAddStoryPress
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContainer}>
              <View style={styles.dragPill} />

              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Create & Share</Text>
                <Text style={styles.sheetSubtitle}>
                  Choose what you want to share with your peer community
                </Text>
              </View>

              <View style={styles.optionsList}>
                {/* 1. Ask an Academic Doubt */}
                <TouchableOpacity
                  style={styles.optionCard}
                  activeOpacity={0.75}
                  onPress={() => {
                    onClose();
                    onAskDoubtPress();
                  }}
                >
                  <View style={[styles.iconCircle, { backgroundColor: '#E6FAF3' }]}>
                    <Ionicons name="help-circle" size={26} color="#00C48C" />
                  </View>
                  <View style={styles.optionMeta}>
                    <View style={styles.titleRow}>
                      <Text style={styles.optionTitle}>Ask an Academic Doubt</Text>
                      <View style={styles.popularBadge}>
                        <Text style={styles.popularText}>Popular</Text>
                      </View>
                    </View>
                    <Text style={styles.optionDesc}>
                      Post a question with diagrams, code snippet & get peer solutions
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </TouchableOpacity>

                {/* 2. Add to 24-hour Story */}
                <TouchableOpacity
                  style={styles.optionCard}
                  activeOpacity={0.75}
                  onPress={() => {
                    onClose();
                    onAddStoryPress();
                  }}
                >
                  <View style={[styles.iconCircle, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="camera" size={24} color="#3B82F6" />
                  </View>
                  <View style={styles.optionMeta}>
                    <View style={styles.titleRow}>
                      <Text style={styles.optionTitle}>Add to Story (24h)</Text>
                      <View style={[styles.popularBadge, { backgroundColor: '#EFF6FF' }]}>
                        <Text style={[styles.popularText, { color: '#3B82F6' }]}>Instant</Text>
                      </View>
                    </View>
                    <Text style={styles.optionDesc}>
                      Share notes, quick assignment photos, or academic thoughts
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* Cancel Button */}
              <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.7} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end'
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20
  },
  dragPill: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 16
  },
  sheetHeader: {
    marginBottom: 18
  },
  sheetTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 17
  },
  optionsList: {
    gap: 12,
    marginBottom: 18
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14
  },
  optionMeta: {
    flex: 1,
    marginRight: 8
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A'
  },
  popularBadge: {
    backgroundColor: '#E6FAF3',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8
  },
  popularText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00C48C'
  },
  optionDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16
  },
  cancelBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B'
  }
});

