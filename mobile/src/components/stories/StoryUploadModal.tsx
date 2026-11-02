import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';

interface Props {
  visible: boolean;
  token: string | null;
  currentUser: any;
  onClose: () => void;
  onStoryCreated: (newStory: any) => void;
}

const ACADEMIC_PRESET_BACKGROUNDS = [
  { id: 'emerald', name: 'PeerBridge Mint', bg: '#00C48C', text: '#FFFFFF', icon: 'school' },
  { id: 'dark-scholar', name: 'Deep Tech', bg: '#0F172A', text: '#38BDF8', icon: 'code-slash' },
  { id: 'indigo', name: 'Quantum', bg: '#4F46E5', text: '#FFFFFF', icon: 'planet' },
  { id: 'rose', name: 'Innovation', bg: '#E11D48', text: '#FFFFFF', icon: 'bulb' },
  { id: 'amber', name: 'Exam Prep', bg: '#D97706', text: '#FFFFFF', icon: 'book' },
  { id: 'violet', name: 'Calculus', bg: '#7C3AED', text: '#FFFFFF', icon: 'calculator' }
];

export const StoryUploadModal: React.FC<Props> = ({
  visible,
  token,
  currentUser,
  onClose,
  onStoryCreated
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedBg, setSelectedBg] = useState(ACADEMIC_PRESET_BACKGROUNDS[0]);
  const [caption, setCaption] = useState('');
  const [mode, setMode] = useState<'photo' | 'text'>('photo');
  const [uploading, setUploading] = useState(false);

  const resetForm = () => {
    setSelectedImage(null);
    setCaption('');
    setMode('photo');
    setUploading(false);
  };

  const handlePickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow gallery access to pick a photo for your story.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
        base64: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          setSelectedImage(`data:image/jpeg;base64,${asset.base64}`);
        } else {
          setSelectedImage(asset.uri);
        }
        setMode('photo');
      }
    } catch (err: any) {
      console.warn('Error picking image:', err);
      Alert.alert('Error', 'Failed to pick image from device.');
    }
  };

  const handleCaptureFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to capture a story photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
        base64: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          setSelectedImage(`data:image/jpeg;base64,${asset.base64}`);
        } else {
          setSelectedImage(asset.uri);
        }
        setMode('photo');
      }
    } catch (err: any) {
      console.warn('Error launching camera:', err);
      Alert.alert('Error', 'Failed to open camera.');
    }
  };

  const handlePublishStory = async () => {
    if (mode === 'photo' && !selectedImage) {
      Alert.alert('Select Photo', 'Please choose a photo from your gallery or take a picture first.');
      return;
    }

    if (mode === 'text' && !caption.trim()) {
      Alert.alert('Enter Caption', 'Please enter your academic note or thought to share.');
      return;
    }

    try {
      setUploading(true);

      const payload: any = {
        caption: caption.trim(),
        mediaType: mode
      };

      if (mode === 'photo' && selectedImage) {
        payload.mediaUrl = selectedImage;
      } else {
        payload.background = selectedBg.bg;
        payload.mediaUrl = `https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80`;
      }

      const res = await api.createStory(token, payload);
      if (res && res.success && res.data) {
        Alert.alert('✨ Story Shared!', 'Your academic story is live for 24 hours to your followers.');
        onStoryCreated(res.data);
        resetForm();
        onClose();
      } else {
        Alert.alert('Upload Failed', res?.message || 'Could not publish story. Please try again.');
      }
    } catch (err: any) {
      console.error('Publish story error:', err);
      Alert.alert('Error', err.message || 'Network error sharing story.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={() => {
        if (!uploading) {
          resetForm();
          onClose();
        }
      }}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => {
              resetForm();
              onClose();
            }}
            disabled={uploading}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={22} color="#0F172A" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Add to Story</Text>

          <TouchableOpacity
            style={[
              styles.sharePill,
              (!selectedImage && !caption.trim()) || uploading ? styles.sharePillDisabled : null
            ]}
            onPress={handlePublishStory}
            disabled={(!selectedImage && !caption.trim()) || uploading}
            activeOpacity={0.8}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.sharePillText}>Share</Text>
                <Ionicons name="arrow-forward" size={15} color="#FFFFFF" style={{ marginLeft: 4 }} />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Mode Selector (Photo Story vs Academic Thought Card) */}
        <View style={styles.tabSwitchBox}>
          <TouchableOpacity
            style={[styles.tabSwitch, mode === 'photo' && styles.tabSwitchActive]}
            onPress={() => setMode('photo')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="image-outline"
              size={16}
              color={mode === 'photo' ? '#00C48C' : '#64748B'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabSwitchText, mode === 'photo' && styles.tabSwitchTextActive]}>
              Photo / Notes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabSwitch, mode === 'text' && styles.tabSwitchActive]}
            onPress={() => setMode('text')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="text-outline"
              size={16}
              color={mode === 'text' ? '#00C48C' : '#64748B'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabSwitchText, mode === 'text' && styles.tabSwitchTextActive]}>
              Academic Thought
            </Text>
          </TouchableOpacity>
        </View>

        {/* Story Canvas / Preview Area */}
        <View style={styles.previewContainer}>
          {mode === 'photo' ? (
            selectedImage ? (
              <View style={styles.imageCanvas}>
                <Image source={{ uri: selectedImage }} style={styles.fullImagePreview} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.changePhotoBtn}
                  onPress={handlePickFromGallery}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera-reverse" size={16} color="#FFFFFF" />
                  <Text style={styles.changePhotoText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyPhotoBox}>
                <View style={styles.emptyCircle}>
                  <Ionicons name="camera" size={48} color="#00C48C" />
                </View>
                <Text style={styles.emptyTitle}>Capture or Upload Photo</Text>
                <Text style={styles.emptySub}>
                  Share assignment solutions, study notes, campus moments, or peer academic updates!
                </Text>

                <View style={styles.photoActionRow}>
                  <TouchableOpacity
                    style={styles.pickActionBtn}
                    onPress={handlePickFromGallery}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="images" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.pickActionText}>Gallery</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.pickActionBtn, styles.cameraActionBtn]}
                    onPress={handleCaptureFromCamera}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.pickActionText}>Camera</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          ) : (
            /* Text Academic Card Mode */
            <View style={[styles.textCanvas, { backgroundColor: selectedBg.bg }]}>
              <View style={styles.textCanvasTop}>
                <Ionicons name={selectedBg.icon as any} size={28} color={selectedBg.text} />
                <Text style={[styles.textCanvasBadge, { color: selectedBg.text }]}>
                  {selectedBg.name}
                </Text>
              </View>

              <TextInput
                style={[styles.textCanvasInput, { color: selectedBg.text }]}
                placeholder="Type your academic thought, question, or study tip here..."
                placeholderTextColor="rgba(255, 255, 255, 0.65)"
                multiline
                maxLength={240}
                value={caption}
                onChangeText={setCaption}
                textAlignVertical="center"
              />

              <Text style={styles.charCountText}>{caption.length}/240</Text>
            </View>
          )}
        </View>

        {/* Bottom Options Controls */}
        <View style={styles.bottomControls}>
          {mode === 'photo' && (
            <View style={styles.captionInputBox}>
              <Ionicons name="pencil" size={16} color="#64748B" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.captionInput}
                placeholder="Add a caption to your story..."
                placeholderTextColor="#94A3B8"
                value={caption}
                onChangeText={setCaption}
                maxLength={150}
              />
            </View>
          )}

          {mode === 'text' && (
            <View style={styles.presetsBox}>
              <Text style={styles.presetsTitle}>Theme Background:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsScroll}>
                {ACADEMIC_PRESET_BACKGROUNDS.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: item.bg },
                      selectedBg.id === item.id && styles.colorCircleActive
                    ]}
                    onPress={() => setSelectedBg(item)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={item.icon as any} size={14} color={item.text} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <Text style={styles.audienceNote}>
            🔒 Visible only to followers and peers you connect with for 24 hours.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : (StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 20),
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9'
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2
  },
  sharePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00C48C',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#00C48C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3
  },
  sharePillDisabled: {
    opacity: 0.45,
    elevation: 0,
    shadowOpacity: 0
  },
  sharePillText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14
  },
  tabSwitchBox: {
    flexDirection: 'row',
    backgroundColor: '#EEF2F6',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  tabSwitch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10
  },
  tabSwitchActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2
  },
  tabSwitchText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B'
  },
  tabSwitchTextActive: {
    color: '#00C48C',
    fontWeight: '800'
  },
  previewContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2
  },
  imageCanvas: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0F172A'
  },
  fullImagePreview: {
    width: '100%',
    height: '100%'
  },
  changePhotoBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  changePhotoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4
  },
  emptyPhotoBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#FFFFFF'
  },
  emptyCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#E6FAF3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#00C48C'
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 290
  },
  photoActionRow: {
    flexDirection: 'row',
    gap: 12
  },
  pickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 22,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3
  },
  cameraActionBtn: {
    backgroundColor: '#00C48C',
    shadowColor: '#00C48C'
  },
  pickActionText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14
  },
  textCanvas: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
    borderRadius: 20
  },
  textCanvasTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  textCanvasBadge: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  textCanvasInput: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 32,
    textAlign: 'center',
    paddingHorizontal: 10
  },
  charCountText: {
    alignSelf: 'flex-end',
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11
  },
  bottomControls: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16
  },
  captionInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1
  },
  captionInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 14
  },
  presetsBox: {
    marginBottom: 12
  },
  presetsTitle: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8
  },
  presetsScroll: {
    flexDirection: 'row',
    gap: 10
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0'
  },
  colorCircleActive: {
    borderColor: '#0F172A',
    transform: [{ scale: 1.1 }]
  },
  audienceNote: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4
  }
});
