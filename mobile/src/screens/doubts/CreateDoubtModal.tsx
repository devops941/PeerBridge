import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Dimensions,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';
import { SubjectItem } from '../../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  token?: string | null;
  onDoubtCreated: (doubt: any) => void;
}

const POPULAR_LANGUAGES = ['python', 'javascript', 'cpp', 'java', 'sql', 'typescript'];

export const CreateDoubtModal: React.FC<Props> = ({
  visible,
  onClose,
  token,
  onDoubtCreated
}) => {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  const [title, setTitle] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [question, setQuestion] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeSnippet, setCodeSnippet] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [attachedVideo, setAttachedVideo] = useState<{
    url: string;
    duration?: number;
    thumbnail?: string;
    fileSize?: number;
  } | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const MAX_IMAGES = 5;

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

  useEffect(() => {
    if (visible) {
      loadSubjects();
    }
  }, [visible]);

  const loadSubjects = async () => {
    try {
      setLoadingSubjects(true);
      const res = await api.getSubjects();
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        setSubjects(res.data);
        if (!selectedSubject) {
          setSelectedSubject(res.data[0].name);
        }
      } else {
        setSubjects([]);
      }
    } catch (e) {
      console.warn('Failed to fetch subjects catalogue:', e);
    } finally {
      setLoadingSubjects(false);
    }
  };

  const handleAddTag = () => {
    const clean = tagInput.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!clean) return;
    if (tags.includes(clean)) {
      setTagInput('');
      return;
    }
    if (tags.length >= 5) {
      Alert.alert('Tag Limit', 'You can add up to 5 topic tags.');
      return;
    }
    setTags([...tags, clean]);
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handlePickAttachment = async (mode: 'library' | 'camera') => {
    if (attachedImages.length >= MAX_IMAGES) {
      Alert.alert('Limit Reached', `You can attach up to ${MAX_IMAGES} images per doubt.`);
      return;
    }

    try {
      if (mode === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permission is needed to take a doubt picture.');
          return;
        }
        const res = await ImagePicker.launchCameraAsync({
          allowsEditing: false,
          quality: 0.8,
          base64: true
        });
        if (!res.canceled && res.assets && res.assets[0].base64) {
          uploadSingleAttachment(`data:image/jpeg;base64,${res.assets[0].base64}`);
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Media library permission is needed to select images.');
          return;
        }
        const remainingSlots = MAX_IMAGES - attachedImages.length;
        const res = await ImagePicker.launchImageLibraryAsync({
          allowsMultipleSelection: true,
          selectionLimit: remainingSlots,
          quality: 0.8,
          base64: true
        });

        if (!res.canceled && res.assets && res.assets.length > 0) {
          uploadMultipleAttachments(res.assets);
        }
      }
    } catch (e: any) {
      console.warn('Image picker error:', e);
      Alert.alert('Selection Error', e.message || 'Could not pick image.');
    }
  };

  const uploadSingleAttachment = async (base64Str: string) => {
    try {
      setUploadingImage(true);
      setUploadProgress('Uploading 1 photo...');
      const activeToken = token || (await AsyncStorage.getItem('@peerbridge_token'));
      if (!activeToken) {
        Alert.alert('Sign In Required', 'Please sign in to upload images.');
        return;
      }
      const res = await api.uploadImage(activeToken, base64Str, 'peerbridge/doubts');
      if (res && res.success && res.data?.url) {
        setAttachedImages((prev) => [...prev, res.data.url].slice(0, MAX_IMAGES));
        Alert.alert('Photo Attached! 📷', `Photo added (${attachedImages.length + 1}/${MAX_IMAGES})`);
      } else {
        Alert.alert('Upload Failed', res?.message || 'Could not upload image to Cloudinary.');
      }
    } catch (err: any) {
      Alert.alert('Upload Error', err.message || 'Network error uploading image.');
    } finally {
      setUploadingImage(false);
      setUploadProgress('');
    }
  };

  const uploadMultipleAttachments = async (assets: ImagePicker.ImagePickerAsset[]) => {
    try {
      setUploadingImage(true);
      const activeToken = token || (await AsyncStorage.getItem('@peerbridge_token'));
      if (!activeToken) {
        Alert.alert('Sign In Required', 'Please sign in to upload images.');
        return;
      }

      const availableCount = MAX_IMAGES - attachedImages.length;
      const assetsToUpload = assets.slice(0, availableCount);
      const uploadedUrls: string[] = [];

      for (let i = 0; i < assetsToUpload.length; i++) {
        const asset = assetsToUpload[i];
        if (asset.base64) {
          setUploadProgress(`Uploading ${i + 1} of ${assetsToUpload.length}...`);
          try {
            const res = await api.uploadImage(
              activeToken,
              `data:image/jpeg;base64,${asset.base64}`,
              'peerbridge/doubts'
            );
            if (res && res.success && res.data?.url) {
              uploadedUrls.push(res.data.url);
            }
          } catch (itemErr) {
            console.warn('Single image upload failed:', itemErr);
          }
        }
      }

      if (uploadedUrls.length > 0) {
        setAttachedImages((prev) => [...prev, ...uploadedUrls].slice(0, MAX_IMAGES));
        Alert.alert(
          'Photos Attached! 📷',
          `Added ${uploadedUrls.length} photo(s). Total: ${attachedImages.length + uploadedUrls.length}/${MAX_IMAGES}`
        );
      } else {
        Alert.alert('Upload Failed', 'Could not upload selected images. Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Upload Error', err.message || 'Network error uploading images.');
    } finally {
      setUploadingImage(false);
      setUploadProgress('');
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setAttachedImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handlePickVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant library permissions to attach a video.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.7,
        base64: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        // 10MB limit check requested by user
        const MAX_BYTES = 10 * 1024 * 1024;
        if (asset.fileSize && asset.fileSize > MAX_BYTES) {
          Alert.alert(
            'Video Exceeds 10MB Limit ⚠️',
            `Selected video is ${(asset.fileSize / (1024 * 1024)).toFixed(1)}MB. Maximum allowed post video size is 10MB. Please choose a shorter clip or compress it.`
          );
          return;
        }

        if (asset.base64) {
          setUploadingVideo(true);
          setVideoUploadProgress('Uploading video to Cloudinary (max 10MB)...');
          const activeToken = token || (await AsyncStorage.getItem('@peerbridge_token'));
          if (!activeToken) {
            Alert.alert('Sign In Required', 'Please sign in to upload video.');
            return;
          }

          const res = await api.uploadVideo(
            activeToken,
            `data:video/mp4;base64,${asset.base64}`,
            asset.fileSize,
            'peerbridge/doubts'
          );

          if (res && res.success && res.data?.url) {
            setAttachedVideo({
              url: res.data.url,
              duration: res.data.duration
                ? Math.round(res.data.duration)
                : asset.duration
                ? Math.round(asset.duration)
                : 0,
              thumbnail: res.data.thumbnail,
              fileSize: asset.fileSize
            });
            Alert.alert('Video Attached! 🎥', 'Your video explanation (max 10MB) was uploaded successfully.');
          } else {
            Alert.alert('Upload Failed', res?.message || 'Could not upload video.');
          }
        }
      }
    } catch (err: any) {
      console.warn('Pick post video error:', err);
      Alert.alert('Error', err.message || 'Failed to select video.');
    } finally {
      setUploadingVideo(false);
      setVideoUploadProgress('');
    }
  };

  const handleRemoveVideo = () => {
    setAttachedVideo(null);
  };

  const handleSubmit = async () => {
    const activeToken = token || (await AsyncStorage.getItem('@peerbridge_token'));
    if (!activeToken) {
      Alert.alert('Sign In Required', 'Please log in to post your academic doubt.');
      return;
    }

    if (!title.trim() || title.trim().length < 5) {
      Alert.alert('Title Required', 'Please enter a clear title (at least 5 characters).');
      return;
    }

    if (!selectedSubject) {
      Alert.alert('Subject Required', 'Please select a subject for your doubt.');
      return;
    }

    if (!question.trim() || question.trim().length < 10) {
      Alert.alert(
        'Details Required',
        'Please describe your doubt in detail so peers can volunteer to explain (at least 10 characters).'
      );
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.createDoubt(activeToken, {
        title: title.trim(),
        subject: selectedSubject,
        topic: topic.trim(),
        question: question.trim(),
        codeSnippet: showCodeInput ? codeSnippet.trim() : '',
        codeLanguage: showCodeInput ? codeLanguage : '',
        attachments: attachedImages,
        videoUrl: attachedVideo?.url || '',
        videoDuration: attachedVideo?.duration || 0,
        videoThumbnail: attachedVideo?.thumbnail || '',
        tags
      });

      if (res && res.success && res.data) {
        Alert.alert('Doubt Published!', 'Your question is now visible to peer learners and mentors.');
        onDoubtCreated(res.data);
        resetForm();
        onClose();
      } else {
        Alert.alert('Failed to Post', res?.message || 'Could not publish doubt.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Network error publishing doubt.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setTopic('');
    setQuestion('');
    setCodeSnippet('');
    setShowCodeInput(false);
    setAttachedImages([]);
    setAttachedVideo(null);
    setTags([]);
    setTagInput('');
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
              <View style={styles.headerIconBadge}>
                <Ionicons name="help-buoy" size={20} color="#00C48C" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Ask an Academic Doubt</Text>
                <Text style={styles.headerSubtitle}>PeerBridge peer community will volunteer to help</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingBottom: 260 }}
          >
            {/* Subject Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Academic Subject <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              {loadingSubjects ? (
                <ActivityIndicator size="small" color="#00C48C" style={{ marginVertical: 10 }} />
              ) : subjects.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectPillsRow}>
                  {subjects.map((sub) => {
                    const isSelected = selectedSubject === sub.name;
                    return (
                      <TouchableOpacity
                        key={sub._id || sub.name}
                        style={[styles.subjectPill, isSelected && styles.subjectPillSelected]}
                        onPress={() => setSelectedSubject(sub.name)}
                        activeOpacity={0.75}
                      >
                        <Ionicons
                          name={(sub.iconName || 'book-outline') as any}
                          size={13}
                          color={isSelected ? '#FFFFFF' : '#475569'}
                          style={{ marginRight: 5 }}
                        />
                        <Text style={[styles.subjectPillText, isSelected && styles.subjectPillTextSelected]}>
                          {sub.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : (
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Data Structures, React Native, Physics..."
                  placeholderTextColor="#94A3B8"
                  value={selectedSubject}
                  onChangeText={setSelectedSubject}
                />
              )}
            </View>

            {/* Question Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Doubt Title <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. How does Dijkstra's algorithm handle negative weights?"
                placeholderTextColor="#94A3B8"
                value={title}
                onChangeText={setTitle}
                maxLength={200}
              />
            </View>

            {/* Sub-Topic */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Specific Topic (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Graph Theory / Shortest Path"
                placeholderTextColor="#94A3B8"
                value={topic}
                onChangeText={setTopic}
                maxLength={100}
              />
            </View>

            {/* Detailed Question Body */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Detailed Explanation & Where You're Stuck <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Describe your current understanding, the code or formula you tried, and what part needs clarification..."
                placeholderTextColor="#94A3B8"
                value={question}
                onChangeText={setQuestion}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>

            {/* Code Snippet Toggle */}
            <TouchableOpacity
              style={styles.codeToggleBtn}
              onPress={() => setShowCodeInput(!showCodeInput)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={showCodeInput ? 'code-slash' : 'code-outline'}
                size={18}
                color={showCodeInput ? '#00C48C' : '#64748B'}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.codeToggleText, showCodeInput && { color: '#00C48C', fontWeight: '700' }]}>
                {showCodeInput ? 'Hide Code Snippet' : '+ Attach Code Snippet (Optional)'}
              </Text>
            </TouchableOpacity>

            {showCodeInput && (
              <View style={styles.codeWrapper}>
                <View style={styles.languageRow}>
                  <Text style={styles.codeLabel}>Language:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {POPULAR_LANGUAGES.map((lang) => (
                      <TouchableOpacity
                        key={lang}
                        style={[styles.langChip, codeLanguage === lang && styles.langChipActive]}
                        onPress={() => setCodeLanguage(lang)}
                      >
                        <Text
                          style={[styles.langChipText, codeLanguage === lang && styles.langChipTextActive]}
                        >
                          {lang}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <TextInput
                  style={[styles.textInput, styles.codeArea]}
                  placeholder="// Paste your relevant code or pseudocode here..."
                  placeholderTextColor="#64748B"
                  value={codeSnippet}
                  onChangeText={setCodeSnippet}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            )}

            {/* Image Attachment (Up to 5 Diagrams, Homework photos, Screenshots) */}
            <View style={styles.inputGroup}>
              <View style={styles.labelWithSubRow}>
                <View style={styles.labelWithBadgeRow}>
                  <Text style={styles.inputLabel}>
                    Attach Diagrams / Problem Images (Max {MAX_IMAGES})
                  </Text>
                  <View style={styles.imageCountPill}>
                    <Text style={styles.imageCountPillText}>
                      {attachedImages.length}/{MAX_IMAGES}
                    </Text>
                  </View>
                </View>
                <Text style={styles.inputSubLabel}>
                  Upload up to 5 homework photos, textbook diagrams, or code screenshots
                </Text>
              </View>

              {/* Uploading progress indicator */}
              {uploadingImage && (
                <View style={styles.imageUploadingCard}>
                  <ActivityIndicator size="small" color="#00C48C" />
                  <Text style={styles.imageUploadingText}>
                    {uploadProgress || 'Uploading images to Cloudinary...'}
                  </Text>
                </View>
              )}

              {/* Attached Images Horizontal Scroll Previews */}
              {attachedImages.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.attachedImagesList}
                >
                  {attachedImages.map((imgUrl, idx) => (
                    <View key={imgUrl + idx} style={styles.attachedThumbCard}>
                      <Image source={{ uri: imgUrl }} style={styles.attachedThumbImage} resizeMode="cover" />
                      <View style={styles.thumbIndexBadge}>
                        <Text style={styles.thumbIndexText}>#{idx + 1}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.thumbRemoveBtn}
                        onPress={() => handleRemoveImage(idx)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="close-circle" size={22} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}

              {/* Picker Action Buttons (Visible if less than MAX_IMAGES) */}
              {attachedImages.length < MAX_IMAGES && (
                <View style={styles.imagePickerBtnsRow}>
                  <TouchableOpacity
                    style={styles.pickImageBtn}
                    onPress={() => handlePickAttachment('library')}
                    disabled={uploadingImage}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="images-outline" size={18} color="#00C48C" style={{ marginRight: 6 }} />
                    <Text style={styles.pickImageBtnText}>
                      {attachedImages.length > 0
                        ? `+ Add More (${attachedImages.length}/${MAX_IMAGES})`
                        : 'Upload Photos (Max 5)'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.pickImageBtn}
                    onPress={() => handlePickAttachment('camera')}
                    disabled={uploadingImage}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="camera-outline" size={18} color="#3B82F6" style={{ marginRight: 6 }} />
                    <Text style={styles.pickImageBtnText}>Take Picture</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Video Explanation Attachment (Max 10MB) */}
            <View style={styles.inputGroup}>
              <View style={styles.labelWithSubRow}>
                <View style={styles.labelWithBadgeRow}>
                  <Text style={styles.inputLabel}>
                    Attach Video Explanation (Max 10MB)
                  </Text>
                  {attachedVideo && (
                    <View style={[styles.imageCountPill, { backgroundColor: '#ECFDF5' }]}>
                      <Text style={[styles.imageCountPillText, { color: '#047857' }]}>
                        Attached 🎥
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.inputSubLabel}>
                  Record a screen capture, lab demo, or explanation video under 10MB
                </Text>
              </View>

              {/* Video Uploading progress indicator */}
              {uploadingVideo && (
                <View style={[styles.imageUploadingCard, { borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' }]}>
                  <ActivityIndicator size="small" color="#00C48C" />
                  <Text style={[styles.imageUploadingText, { color: '#065F46' }]}>
                    {videoUploadProgress || 'Uploading video to Cloudinary (max 10MB)...'}
                  </Text>
                </View>
              )}

              {/* Attached Video Card */}
              {attachedVideo ? (
                <View style={styles.attachedVideoCard}>
                  <View style={styles.attachedVideoThumbBox}>
                    <Ionicons name="videocam" size={28} color="#00C48C" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.attachedVideoTitle} numberOfLines={1}>
                      Academic Video Attached
                    </Text>
                    <Text style={styles.attachedVideoMeta}>
                      {attachedVideo.fileSize ? `${(attachedVideo.fileSize / (1024 * 1024)).toFixed(1)} MB • ` : ''}
                      {attachedVideo.duration ? `${attachedVideo.duration}s duration` : 'MP4 Clip'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.thumbRemoveBtnVideo}
                    onPress={handleRemoveVideo}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.pickVideoBtn}
                  onPress={handlePickVideo}
                  disabled={uploadingVideo}
                  activeOpacity={0.85}
                >
                  <Ionicons name="videocam-outline" size={20} color="#7C3AED" style={{ marginRight: 8 }} />
                  <Text style={styles.pickVideoBtnText}>+ Attach Video Clip (Max 10MB)</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Topic Tags */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tags (Max 5)</Text>
              <View style={styles.tagInputRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1, marginRight: 8 }]}
                  placeholder="e.g. recursion, matrices, tree"
                  placeholderTextColor="#94A3B8"
                  value={tagInput}
                  onChangeText={setTagInput}
                  autoCapitalize="none"
                  onSubmitEditing={handleAddTag}
                />
                <TouchableOpacity style={styles.addTagBtn} onPress={handleAddTag} activeOpacity={0.8}>
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                  <Text style={styles.addTagBtnText}>Add</Text>
                </TouchableOpacity>
              </View>

              {tags.length > 0 && (
                <View style={styles.tagsDisplayRow}>
                  {tags.map((t) => (
                    <View key={t} style={styles.tagBadge}>
                      <Text style={styles.tagBadgeText}>#{t}</Text>
                      <TouchableOpacity onPress={() => handleRemoveTag(t)} style={{ marginLeft: 4 }}>
                        <Ionicons name="close-circle" size={14} color="#64748B" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionsFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.publishBtn, submitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.publishBtnText}>Publish Doubt</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
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
    maxHeight: '90%',
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
    flex: 1
  },
  headerIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A'
  },
  headerSubtitle: {
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
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 16
  },
  inputGroup: {
    marginBottom: 16
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6
  },
  subjectPillsRow: {
    flexDirection: 'row',
    marginHorizontal: -4
  },
  subjectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginHorizontal: 4
  },
  subjectPillSelected: {
    backgroundColor: '#00C48C',
    borderColor: '#00C48C'
  },
  subjectPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569'
  },
  subjectPillTextSelected: {
    color: '#FFFFFF'
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A'
  },
  textArea: {
    minHeight: 110
  },
  codeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 12
  },
  codeToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B'
  },
  codeWrapper: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginRight: 8
  },
  langChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    marginRight: 6
  },
  langChipActive: {
    backgroundColor: '#00C48C'
  },
  langChipText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600'
  },
  langChipTextActive: {
    color: '#FFFFFF'
  },
  codeArea: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    color: '#38BDF8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    minHeight: 120
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  addTagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00C48C',
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 12
  },
  addTagBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 3
  },
  tagsDisplayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  tagBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155'
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
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00C48C',
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 14,
    shadowColor: '#00C48C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  publishBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  labelWithSubRow: {
    marginBottom: 6
  },
  inputSubLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2
  },
  imageUploadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 18,
    borderStyle: 'dashed'
  },
  imageUploadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginLeft: 8
  },
  attachedImagePreviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center'
  },
  attachedImagePreview: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F1F5F9'
  },
  attachedImageMeta: {
    marginLeft: 12,
    flex: 1,
    justifyContent: 'center'
  },
  attachedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8
  },
  attachedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857'
  },
  removeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  removeImageBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444'
  },
  imagePickerBtnsRow: {
    flexDirection: 'row',
    gap: 10
  },
  labelWithBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  imageCountPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  imageCountPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857'
  },
  attachedImagesList: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8
  },
  attachedThumbCard: {
    position: 'relative',
    width: 90,
    height: 90,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#0F172A'
  },
  attachedThumbImage: {
    width: '100%',
    height: '100%'
  },
  thumbIndexBadge: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  thumbIndexText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700'
  },
  thumbRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12
  },
  pickImageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 14
  },
  pickImageBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155'
  },
  pickVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F3FF',
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 4
  },
  pickVideoBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6D28D9'
  },
  attachedVideoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#00C48C',
    marginTop: 6
  },
  attachedVideoThumbBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center'
  },
  attachedVideoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A'
  },
  attachedVideoMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2
  },
  thumbRemoveBtnVideo: {
    padding: 4
  }
});
