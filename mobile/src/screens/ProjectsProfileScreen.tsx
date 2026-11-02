import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Linking,
  Share,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../theme/colors';
import { api } from '../services/api';
import { UserProfile, EducationEntry, ExperienceEntry, ProjectEntry, UserType } from '../types';

interface Props {
  onBack: () => void;
  token?: string | null;
  onLogout?: () => void;
  onOpenAuth?: () => void;
  currentUser?: UserProfile | null;
  peerUser?: any;
  onUserUpdated?: (updatedUser: UserProfile) => void;
  onOpenChatWithPeer?: (peerUser: any) => void;
}

const defaultAvatar = require('../../assets/user.png');
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Pastel chip color pallete matching Screenshot 4
const CATEGORY_CHIP_COLORS = [
  { bg: '#ECFDF5', border: '#A7F3D0', text: '#047857' }, // Soft Mint
  { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8' }, // Soft Sky
  { bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C' }, // Soft Peach
  { bg: '#F5F3FF', border: '#DDD6FE', text: '#6D28D9' }  // Soft Lavender
];

export const ProjectsProfileScreen: React.FC<Props> = ({
  onBack,
  token,
  onLogout,
  onOpenAuth,
  currentUser,
  peerUser,
  onUserUpdated,
  onOpenChatWithPeer
}) => {
  // Determine if viewing a peer's profile vs own profile
  const peerId = peerUser?._id || peerUser?.id;
  const myId = currentUser?.id || (currentUser as any)?._id;
  const isPeerMode = Boolean(peerUser && peerId && peerId !== myId);

  // Initialize Profile State
  const initialData = isPeerMode ? peerUser : currentUser;
  const [profile, setProfile] = useState<UserProfile>({
    id: initialData?.id || initialData?._id || '',
    name: initialData?.name || (isPeerMode ? 'Peer Learner' : 'User Profile'),
    email: initialData?.email || '',
    role: initialData?.role || 'student',
    userType: initialData?.userType || 'student',
    headline: initialData?.headline || (isPeerMode ? 'Student & Peer' : 'Student & Learner'),
    avatar: initialData?.avatar || '',
    college: initialData?.college || (isPeerMode ? 'PeerBridge Campus' : ''),
    department: initialData?.department || (isPeerMode ? 'General Engineering' : ''),
    yearOfStudy: initialData?.yearOfStudy,
    semester: initialData?.semester,
    studentId: initialData?.studentId || '',
    campusLocation: initialData?.campusLocation || '',
    bio: initialData?.bio || '',
    skills: initialData?.skills || [],
    subjects: initialData?.subjects || [],
    rating: initialData?.rating || (isPeerMode ? 4.8 : 5.0),
    reviewCount: initialData?.reviewCount || 0,
    studentsCount: initialData?.studentsCount || 0,
    coursesCount: initialData?.coursesCount || 0
  });

  // Peer Mode States
  const [peerLoading, setPeerLoading] = useState(isPeerMode);
  const [peerStats, setPeerStats] = useState({
    doubtsCount: peerUser?.stats?.doubtsCount ?? 2,
    solutionsCount: peerUser?.stats?.solutionsCount ?? 0,
    followerCount: peerUser?.stats?.followerCount ?? 1,
    followingCount: peerUser?.stats?.followingCount ?? 1
  });
  const [isFollowing, setIsFollowing] = useState(Boolean(peerUser?.relationship?.isFollowing));
  const [isRequested, setIsRequested] = useState(Boolean(peerUser?.relationship?.isRequested));
  const [actionLoading, setActionLoading] = useState(false);

  // Segmented Tabs
  const [activeSegment, setActiveSegment] = useState<'Projects' | 'Courses'>('Projects');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Dynamic Keyboard tracking
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Edit Profile Form States
  const [editName, setEditName] = useState(profile.name);
  const [editUserType, setEditUserType] = useState<UserType>(profile.userType || 'student');
  const [editHeadline, setEditHeadline] = useState(profile.headline || '');
  const [editCollege, setEditCollege] = useState(profile.college || '');
  const [editDepartment, setEditDepartment] = useState(profile.department || '');
  const [editYear, setEditYear] = useState(profile.yearOfStudy ? String(profile.yearOfStudy) : '');
  const [editSemester, setEditSemester] = useState(profile.semester ? String(profile.semester) : '');
  const [editStudentId, setEditStudentId] = useState(profile.studentId || '');
  const [editLocation, setEditLocation] = useState(profile.campusLocation || '');
  const [editBio, setEditBio] = useState(profile.bio || '');

  // Dynamic Education State
  const [education, setEducation] = useState<EducationEntry[]>(
    Array.isArray(initialData?.education) ? initialData.education : []
  );
  const [showEducationModal, setShowEducationModal] = useState(false);
  const [eduInstitution, setEduInstitution] = useState('');
  const [eduDegree, setEduDegree] = useState('');
  const [eduFieldOfStudy, setEduFieldOfStudy] = useState('');
  const [eduStartYear, setEduStartYear] = useState('');
  const [eduEndYear, setEduEndYear] = useState('');
  const [eduGrade, setEduGrade] = useState('');

  // Dynamic Experience State
  const [experience, setExperience] = useState<ExperienceEntry[]>(
    Array.isArray(initialData?.experience) ? initialData.experience : []
  );
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [expTitle, setExpTitle] = useState('');
  const [expCompany, setExpCompany] = useState('');
  const [expLocation, setExpLocation] = useState('');
  const [expStartDate, setExpStartDate] = useState('');
  const [expEndDate, setExpEndDate] = useState('');
  const [expDescription, setExpDescription] = useState('');

  // Dynamic Projects State
  const [projects, setProjects] = useState<ProjectEntry[]>(
    Array.isArray(initialData?.projects) ? initialData.projects : []
  );
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projTitle, setProjTitle] = useState('');
  const [projTag, setProjTag] = useState('');
  const [projDescription, setProjDescription] = useState('');
  const [projLink, setProjLink] = useState('');
  const [projImage, setProjImage] = useState('');
  const [uploadingProjImage, setUploadingProjImage] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Dynamic Skills State & Modal
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [newSkillText, setNewSkillText] = useState('');

  // Dynamic Enrolled Courses
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);

  // Load Peer Profile details if in Peer Mode
  useEffect(() => {
    if (isPeerMode && peerId) {
      loadPeerProfile();
    } else if (!isPeerMode && token) {
      loadProfileData();
    }
  }, [peerId, isPeerMode, token]);

  const loadPeerProfile = async () => {
    try {
      setPeerLoading(true);
      const res = await api.getPeerProfile(peerId, myId);
      if (res && res.success && res.data) {
        const d = res.data;
        setProfile((prev) => ({
          ...prev,
          id: d._id || d.id || prev.id,
          name: d.name || prev.name,
          email: d.email || prev.email,
          role: d.role || prev.role,
          userType: d.userType || prev.userType,
          headline: d.headline || prev.headline,
          avatar: d.avatar || prev.avatar,
          college: d.college || prev.college,
          department: d.department || prev.department,
          yearOfStudy: d.yearOfStudy ?? prev.yearOfStudy,
          semester: d.semester ?? prev.semester,
          studentId: d.studentId || prev.studentId,
          campusLocation: d.campusLocation || prev.campusLocation,
          bio: d.bio || prev.bio,
          skills: Array.isArray(d.skills) ? d.skills : prev.skills,
          rating: d.rating ?? prev.rating ?? 4.8,
          reviewCount: d.reviewCount ?? prev.reviewCount
        }));
        if (Array.isArray(d.projects)) {
          setProjects(d.projects);
        }
        if (Array.isArray(d.education)) {
          setEducation(d.education);
        }
        if (Array.isArray(d.experience)) {
          setExperience(d.experience);
        }
        if (d.stats) {
          setPeerStats({
            doubtsCount: d.stats.doubtsCount ?? 0,
            solutionsCount: d.stats.solutionsCount ?? 0,
            followerCount: d.stats.followerCount ?? 0,
            followingCount: d.stats.followingCount ?? 0
          });
        }
        if (d.relationship) {
          setIsFollowing(Boolean(d.relationship.isFollowing));
          setIsRequested(Boolean(d.relationship.isRequested));
        }
      }
    } catch (e) {
      console.warn('Failed to load peer profile:', e);
    } finally {
      setPeerLoading(false);
    }
  };

  const syncUserChanges = async (updatedUser: any) => {
    if (!updatedUser) return;
    setProfile((prev) => ({ ...prev, ...updatedUser }));
    if (Array.isArray(updatedUser.education)) {
      setEducation(updatedUser.education);
    }
    if (Array.isArray(updatedUser.experience)) {
      setExperience(updatedUser.experience);
    }
    if (Array.isArray(updatedUser.projects)) {
      setProjects(updatedUser.projects);
    }
    if (onUserUpdated) {
      onUserUpdated(updatedUser);
    }
    try {
      await AsyncStorage.setItem('@peerbridge_user', JSON.stringify(updatedUser));
    } catch (e) {
      console.warn('AsyncStorage cache sync error:', e);
    }
  };

  const loadProfileData = async () => {
    try {
      if (!token) return;
      const res = await api.getProfile(token);
      if (res && res.success && res.data) {
        await syncUserChanges(res.data);
      }
    } catch (e) {
      console.warn('Failed to fetch profile:', e);
    }
  };

  const avatarSource =
    !imageError && profile.avatar && profile.avatar.startsWith('http')
      ? { uri: profile.avatar }
      : defaultAvatar;

  // Follow / Unfollow in Peer Mode
  const handleToggleFollow = async () => {
    if (!token) {
      Alert.alert('Sign In Required', 'Please sign in to connect with peers.');
      return;
    }
    if (!peerId || actionLoading) return;

    try {
      setActionLoading(true);
      if (isFollowing) {
        Alert.alert(
          'Unfollow Peer',
          `Are you sure you want to unfollow ${profile.name}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Unfollow',
              style: 'destructive',
              onPress: async () => {
                try {
                  setActionLoading(true);
                  const res = await api.unfollowUser(token, peerId);
                  if (res && res.success) {
                    setIsFollowing(false);
                    setPeerStats((prev) => ({
                      ...prev,
                      followerCount: Math.max(0, prev.followerCount - 1)
                    }));
                  }
                } catch {
                  Alert.alert('Error', 'Failed to unfollow peer.');
                } finally {
                  setActionLoading(false);
                }
              }
            }
          ]
        );
        return;
      }

      if (isRequested) {
        const res = await api.cancelFollowRequest(token, peerId);
        if (res && res.success) {
          setIsRequested(false);
        }
      } else {
        const res = await api.sendFollowRequest(token, peerId);
        if (res && res.success) {
          if (res.isFollowing) {
            setIsFollowing(true);
            setIsRequested(false);
            setPeerStats((prev) => ({
              ...prev,
              followerCount: prev.followerCount + 1
            }));
          } else {
            setIsRequested(true);
            Alert.alert('Request Sent 📨', `Follow request sent to ${profile.name}. They will be notified.`);
          }
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not update follow status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Message Peer
  const handleMessagePeer = () => {
    if (onOpenChatWithPeer) {
      onOpenChatWithPeer({
        _id: peerId,
        name: profile.name,
        avatar: profile.avatar,
        college: profile.college,
        department: profile.department
      });
    }
  };

  // Book 1-on-1 Consultation Session
  const handleBookSession = () => {
    Alert.alert(
      '📅 Book 1-on-1 Peer Session',
      `Would you like to start a collaborative peer learning session with ${profile.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Session Chat',
          onPress: () => {
            if (onOpenChatWithPeer) {
              onOpenChatWithPeer({
                _id: peerId,
                name: profile.name,
                avatar: profile.avatar,
                college: profile.college,
                department: profile.department,
                initialMessage: `Hi ${profile.name}! I would like to book a 1-on-1 peer learning session with you.`
              });
            }
          }
        }
      ]
    );
  };

  // Share profile
  const handleShareProfile = async () => {
    try {
      await Share.share({
        message: `Check out ${profile.name}'s peer profile on PeerBridge! College: ${profile.college || 'PeerBridge Campus'}, Department: ${profile.department || 'Engineering'}`
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  // Open external project links
  const handleOpenLink = async (url?: string) => {
    if (!url) return;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Invalid Link', 'Could not open this URL.');
      }
    } catch (e) {
      Alert.alert('Error', 'Unable to open link.');
    }
  };

  const handleOpenEdit = () => {
    setEditName(profile.name);
    setEditUserType(profile.userType || 'student');
    setEditHeadline(profile.headline || '');
    setEditCollege(profile.college || '');
    setEditDepartment(profile.department || '');
    setEditYear(profile.yearOfStudy ? String(profile.yearOfStudy) : '');
    setEditSemester(profile.semester ? String(profile.semester) : '');
    setEditStudentId(profile.studentId || '');
    setEditLocation(profile.campusLocation || '');
    setEditBio(profile.bio || '');
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Required Field', 'Name cannot be empty.');
      return;
    }

    setSavingProfile(true);
    try {
      const payload: Partial<UserProfile> = {
        name: editName.trim(),
        userType: editUserType,
        headline: editHeadline.trim(),
        college: editCollege.trim(),
        department: editDepartment.trim(),
        yearOfStudy: editYear.trim() ? parseInt(editYear, 10) : undefined,
        semester: editSemester.trim() ? parseInt(editSemester, 10) : undefined,
        studentId: editStudentId.trim(),
        campusLocation: editLocation.trim(),
        bio: editBio.trim()
      };

      if (token) {
        const res = await api.updateProfile(token, payload);
        if (res && res.success && res.data) {
          await syncUserChanges(res.data);
          Alert.alert('Success', 'Profile updated successfully.');
        } else {
          Alert.alert('Update Failed', res?.message || 'Could not update profile on server.');
        }
      } else {
        setProfile((prev) => ({ ...prev, ...payload }));
      }
      setShowEditModal(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Image Picker & Upload Helpers
  const pickImageFromDevice = async (mode: 'library' | 'camera'): Promise<string | null> => {
    try {
      if (mode === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permission is required to take a picture.');
          return null;
        }
        const res = await ImagePicker.launchCameraAsync({
          allowsEditing: false,
          quality: 0.8,
          base64: true
        });
        if (!res.canceled && res.assets && res.assets[0].base64) {
          return `data:image/jpeg;base64,${res.assets[0].base64}`;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Media library permission is required to choose a picture.');
          return null;
        }
        const res = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: false,
          quality: 0.8,
          base64: true
        });
        if (!res.canceled && res.assets && res.assets[0].base64) {
          return `data:image/jpeg;base64,${res.assets[0].base64}`;
        }
      }
    } catch (err: any) {
      console.warn('Error picking image:', err);
      Alert.alert('Selection Error', err.message || 'Could not pick image.');
    }
    return null;
  };

  const uploadAvatarDirect = async (base64Image: string) => {
    if (!token) {
      Alert.alert('Sign In Required', 'Please log in to upload a profile picture.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: onOpenAuth }
      ]);
      return;
    }
    try {
      setUploadingAvatar(true);
      const res = await api.uploadAvatar(token, base64Image);
      if (res && res.success && res.data) {
        if (res.data.user) {
          await syncUserChanges(res.data.user);
        } else if (res.data.url) {
          setProfile((prev) => ({ ...prev, avatar: res.data.url }));
        }
        setImageError(false);
        Alert.alert('Success', 'Profile photo uploaded and saved!');
      } else {
        Alert.alert('Upload Failed', res?.message || 'Could not upload avatar.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Network error uploading profile photo.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSelectAvatarSource = () => {
    Alert.alert(
      'Update Profile Picture',
      'Choose an image to upload:',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const base64 = await pickImageFromDevice('camera');
            if (base64) uploadAvatarDirect(base64);
          }
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            const base64 = await pickImageFromDevice('library');
            if (base64) uploadAvatarDirect(base64);
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const uploadProjectImageDirect = async (base64Image: string) => {
    if (!token) {
      Alert.alert('Sign In Required', 'Please log in to upload project images.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: onOpenAuth }
      ]);
      return;
    }
    try {
      setUploadingProjImage(true);
      const res = await api.uploadProjectImage(token, base64Image);
      if (res && res.success && res.data?.url) {
        setProjImage(res.data.url);
        Alert.alert('Success', 'Project preview image uploaded!');
      } else {
        Alert.alert('Upload Failed', res?.message || 'Could not upload project image.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Network error uploading project image.');
    } finally {
      setUploadingProjImage(false);
    }
  };

  const handleSelectProjectImageSource = () => {
    Alert.alert(
      'Project Preview Thumbnail',
      'Upload project cover image:',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const base64 = await pickImageFromDevice('camera');
            if (base64) uploadProjectImageDirect(base64);
          }
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            const base64 = await pickImageFromDevice('library');
            if (base64) uploadProjectImageDirect(base64);
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  // Education Handlers
  const handleSaveEducation = async () => {
    if (!eduInstitution.trim() || !eduDegree.trim()) {
      Alert.alert('Required Fields', 'Institution and Degree name are required.');
      return;
    }
    const newEntry: EducationEntry = {
      id: `edu_${Date.now()}`,
      institution: eduInstitution.trim(),
      degree: eduDegree.trim(),
      fieldOfStudy: eduFieldOfStudy.trim(),
      startYear: eduStartYear.trim() || '',
      endYear: eduEndYear.trim() || 'Present',
      grade: eduGrade.trim()
    };
    const updated = [newEntry, ...education];

    if (token) {
      try {
        const res = await api.updateProfile(token, { education: updated });
        if (res && res.success && res.data) {
          await syncUserChanges(res.data);
          Alert.alert('Saved', 'Education details added.');
          setShowEducationModal(false);
          setEduInstitution('');
          setEduDegree('');
          setEduFieldOfStudy('');
          setEduStartYear('');
          setEduEndYear('');
          setEduGrade('');
        }
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to save education.');
      }
    } else {
      setEducation(updated);
      setShowEducationModal(false);
    }
  };

  const handleDeleteEducation = async (id: string) => {
    const updated = education.filter((e) => e.id !== id);
    if (token) {
      try {
        const res = await api.updateProfile(token, { education: updated });
        if (res && res.success && res.data) {
          await syncUserChanges(res.data);
        }
      } catch {
        Alert.alert('Error', 'Failed to remove education entry.');
      }
    } else {
      setEducation(updated);
    }
  };

  // Experience Handlers
  const handleSaveExperience = async () => {
    if (!expTitle.trim() || !expCompany.trim()) {
      Alert.alert('Required Fields', 'Role title and Organization name are required.');
      return;
    }
    const newEntry: ExperienceEntry = {
      id: `exp_${Date.now()}`,
      title: expTitle.trim(),
      company: expCompany.trim(),
      location: expLocation.trim(),
      startDate: expStartDate.trim() || '2023',
      endDate: expEndDate.trim() || 'Present',
      description: expDescription.trim()
    };
    const updated = [newEntry, ...experience];

    if (token) {
      try {
        const res = await api.updateProfile(token, { experience: updated });
        if (res && res.success && res.data) {
          await syncUserChanges(res.data);
          Alert.alert('Saved', 'Experience entry added.');
          setShowExperienceModal(false);
          setExpTitle('');
          setExpCompany('');
          setExpLocation('');
          setExpStartDate('');
          setExpEndDate('');
          setExpDescription('');
        }
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to save experience.');
      }
    } else {
      setExperience(updated);
      setShowExperienceModal(false);
    }
  };

  const handleDeleteExperience = async (id: string) => {
    const updated = experience.filter((e) => e.id !== id);
    if (token) {
      try {
        const res = await api.updateProfile(token, { experience: updated });
        if (res && res.success && res.data) {
          await syncUserChanges(res.data);
        }
      } catch {
        Alert.alert('Error', 'Failed to remove experience entry.');
      }
    } else {
      setExperience(updated);
    }
  };

  // Projects Handlers
  const handleSaveProject = async () => {
    if (!projTitle.trim() || !projTag.trim()) {
      Alert.alert('Required Fields', 'Project title and tech stack tags are required.');
      return;
    }
    const newEntry: ProjectEntry = {
      id: `proj_${Date.now()}`,
      title: projTitle.trim(),
      tag: projTag.trim(),
      description: projDescription.trim(),
      link: projLink.trim(),
      stars: 1,
      collaborators: 1,
      image:
        projImage.trim() ||
        'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80'
    };
    const updated = [newEntry, ...projects];

    if (token) {
      try {
        const res = await api.updateProfile(token, { projects: updated });
        if (res && res.success && res.data) {
          await syncUserChanges(res.data);
          Alert.alert('Published', 'Project added to your portfolio showcase.');
          setShowProjectModal(false);
          setProjTitle('');
          setProjTag('');
          setProjDescription('');
          setProjLink('');
          setProjImage('');
        }
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to save project.');
      }
    } else {
      setProjects(updated);
      setShowProjectModal(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    Alert.alert('Delete Project', 'Are you sure you want to remove this project from your portfolio?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updated = projects.filter((p) => p.id !== id);
          if (token) {
            try {
              const res = await api.updateProfile(token, { projects: updated });
              if (res && res.success && res.data) {
                await syncUserChanges(res.data);
              }
            } catch {
              Alert.alert('Error', 'Failed to delete project.');
            }
          } else {
            setProjects(updated);
          }
        }
      }
    ]);
  };

  // Skills Handlers
  const handleSaveSkill = async () => {
    if (!newSkillText.trim()) return;
    const trimmed = newSkillText.trim();
    const currentSkills = profile.skills || [];
    if (currentSkills.includes(trimmed)) {
      Alert.alert('Notice', 'Skill is already in your verified skills list.');
      return;
    }
    const updated = [...currentSkills, trimmed];
    if (token) {
      try {
        const res = await api.updateProfile(token, { skills: updated });
        if (res && res.success && res.data) {
          await syncUserChanges(res.data);
          setShowSkillModal(false);
          setNewSkillText('');
        }
      } catch {
        Alert.alert('Error', 'Failed to add skill.');
      }
    } else {
      setProfile((prev) => ({ ...prev, skills: updated }));
      setShowSkillModal(false);
      setNewSkillText('');
    }
  };

  const handleDeleteSkill = async (skillToRemove: string) => {
    const currentSkills = profile.skills || [];
    const updated = currentSkills.filter((s) => s !== skillToRemove);
    if (token) {
      try {
        const res = await api.updateProfile(token, { skills: updated });
        if (res && res.success && res.data) {
          await syncUserChanges(res.data);
        }
      } catch {
        Alert.alert('Error', 'Failed to remove skill.');
      }
    } else {
      setProfile((prev) => ({ ...prev, skills: updated }));
    }
  };

  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#00A374" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          isPeerMode && { paddingBottom: 110 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ========================================================================= */}
        {/* 1. Curved Hero Header Section (Screenshot 4 Design Language)             */}
        {/* ========================================================================= */}
        <View style={styles.curvedHeroBanner}>
          {/* Abstract Concentric Circles matching Screenshot 4 */}
          <View style={styles.concentricCircleOne} />
          <View style={styles.concentricCircleTwo} />
          <View style={styles.concentricCircleThree} />

          {/* Top Bar Navigation */}
          <View style={styles.heroTopBar}>
            <TouchableOpacity
              style={styles.heroIconButton}
              onPress={onBack}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <Text style={styles.heroTopBarTitle}>
              {isPeerMode ? 'Learner Profile' : 'User Profile'}
            </Text>

            {isPeerMode ? (
              <TouchableOpacity
                style={styles.heroIconButton}
                onPress={handleShareProfile}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            ) : onLogout ? (
              <TouchableOpacity
                style={styles.heroLogoutIconButton}
                onPress={() => setShowLogoutModal(true)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 40 }} />
            )}
          </View>

          {/* Hero Content Information */}
          <View style={styles.heroMainContent}>
            {/* Student Name with Checkmark */}
            <View style={styles.heroNameRow}>
              <Text style={styles.heroStudentName} numberOfLines={1}>
                {profile.name}
              </Text>
              <Ionicons name="checkmark-circle" size={22} color="#A7F3D0" style={{ marginLeft: 6 }} />
            </View>

            {/* Department & College Subtitle */}
            <Text style={styles.heroSubtitle} numberOfLines={1}>
              {profile.department || 'General Engineering'} • {profile.college || 'PeerBridge Campus'}
            </Text>

            {/* Rating & Badges */}
            <View style={styles.heroRatingRow}>
              <View style={styles.heroRatingPill}>
                <Ionicons name="star" size={14} color="#FDE047" style={{ marginRight: 5 }} />
                <Text style={styles.heroRatingText}>
                  {profile.rating ? profile.rating.toFixed(1) : '4.8'} Peer Rating
                </Text>
              </View>

              <View style={styles.heroRolePill}>
                <Ionicons name="school" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.heroRoleText}>
                  {profile.userType ? profile.userType.toUpperCase() : 'STUDENT'}
                </Text>
              </View>
            </View>

            {/* Doubts, Solutions, Followers Stats (Screenshot 2 & 4 style) */}
            <View style={styles.heroStatsContainer}>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatNumber}>{peerStats.doubtsCount}</Text>
                <Text style={styles.heroStatLabel}>Doubts</Text>
              </View>
              <View style={styles.heroStatDivider} />

              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatNumber}>{peerStats.solutionsCount}</Text>
                <Text style={styles.heroStatLabel}>Solutions</Text>
              </View>
              <View style={styles.heroStatDivider} />

              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatNumber}>{peerStats.followerCount}</Text>
                <Text style={styles.heroStatLabel}>Followers</Text>
              </View>
              <View style={styles.heroStatDivider} />

              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatNumber}>{peerStats.followingCount}</Text>
                <Text style={styles.heroStatLabel}>Following</Text>
              </View>
            </View>
          </View>

          {/* Floating Overlapping Avatar Badge (Screenshot 4 Screen 3 Signature) */}
          <View style={styles.overlappingAvatarBadge}>
            <Image
              source={avatarSource}
              style={styles.overlappingAvatarImage}
              onError={() => setImageError(true)}
              resizeMode="cover"
            />

            {!isPeerMode ? (
              <TouchableOpacity
                style={styles.avatarCameraBadge}
                onPress={handleSelectAvatarSource}
                disabled={uploadingAvatar}
                activeOpacity={0.8}
              >
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.avatarOnlineDot} />
            )}
          </View>
        </View>

        {/* ========================================================================= */}
        {/* 2. Overlapping Curved White Card Body (Screenshot 4 Architecture)       */}
        {/* ========================================================================= */}
        <View style={styles.curvedWhiteCard}>
          {/* Bio / About Section */}
          <View style={styles.bioSection}>
            {profile.headline ? (
              <Text style={styles.headlineText}>{profile.headline}</Text>
            ) : null}

            {profile.bio ? (
              <Text style={styles.bioParagraph}>{profile.bio}</Text>
            ) : !isPeerMode ? (
              <TouchableOpacity onPress={handleOpenEdit} style={styles.addBioPlaceholder}>
                <Ionicons name="add" size={14} color="#00C48C" style={{ marginRight: 4 }} />
                <Text style={styles.addBioPlaceholderText}>Add bio or study interests</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.bioParagraph}>
                Active peer learner at {profile.college || 'PeerBridge Campus'}. Ready to collaborate and solve doubts together!
              </Text>
            )}

            {!isPeerMode && (
              <TouchableOpacity
                style={styles.editProfileBtn}
                onPress={handleOpenEdit}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={15} color="#00C48C" style={{ marginRight: 6 }} />
                <Text style={styles.editProfileBtnText}>Edit Profile Details</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ========================================================================= */}
          {/* 3. Categories / Verified Skills Chips (Screenshot 4 Layout)             */}
          {/* ========================================================================= */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWithIcon}>
                <View style={[styles.sectionIconBadge, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="ribbon" size={17} color="#00C48C" />
                </View>
                <Text style={styles.sectionTitle}>Categories & Skills</Text>
              </View>

              {!isPeerMode && (
                <TouchableOpacity
                  style={styles.addSkillBtn}
                  onPress={() => setShowSkillModal(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={15} color="#FFFFFF" style={{ marginRight: 3 }} />
                  <Text style={styles.addSkillBtnText}>Add Skill</Text>
                </TouchableOpacity>
              )}
            </View>

            {profile.skills && profile.skills.length > 0 ? (
              <View style={styles.categoriesChipsWrap}>
                {profile.skills.map((skill, idx) => {
                  const colorScheme = CATEGORY_CHIP_COLORS[idx % CATEGORY_CHIP_COLORS.length];
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor: colorScheme.bg,
                          borderColor: colorScheme.border
                        }
                      ]}
                    >
                      <Ionicons name="checkmark-circle" size={13} color={colorScheme.text} style={{ marginRight: 5 }} />
                      <Text style={[styles.categoryChipText, { color: colorScheme.text }]}>{skill}</Text>
                      {!isPeerMode && (
                        <TouchableOpacity
                          onPress={() => handleDeleteSkill(skill)}
                          style={{ marginLeft: 6 }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="close-circle" size={14} color="#94A3B8" />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptySkillsBox}>
                <Ionicons name="sparkles-outline" size={24} color="#94A3B8" style={{ marginBottom: 4 }} />
                <Text style={styles.emptySkillsText}>
                  {isPeerMode ? 'No verified skills listed yet' : 'No skills added yet'}
                </Text>
                {!isPeerMode && (
                  <TouchableOpacity
                    style={styles.emptySkillsAddBtn}
                    onPress={() => setShowSkillModal(true)}
                  >
                    <Text style={styles.emptySkillsAddBtnText}>+ Add First Skill</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* ========================================================================= */}
          {/* 4. Campus & Institution Info Card (Screenshot 3 Matching Layout)        */}
          {/* ========================================================================= */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWithIcon}>
                <View style={[styles.sectionIconBadge, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="business" size={17} color="#D97706" />
                </View>
                <Text style={styles.sectionTitle}>Campus & Institution Info</Text>
              </View>

              {!isPeerMode && (
                <TouchableOpacity onPress={handleOpenEdit} activeOpacity={0.7}>
                  <Text style={styles.editSectionLink}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.campusInfoCard}>
              {/* Institution */}
              <View style={styles.campusInfoRow}>
                <View style={styles.campusInfoIconWrap}>
                  <Ionicons name="school-outline" size={17} color="#64748B" />
                </View>
                <Text style={styles.campusInfoLabel}>Institution:</Text>
                <Text style={styles.campusInfoVal} numberOfLines={1}>
                  {profile.college || 'PeerBridge Campus'}
                </Text>
              </View>

              {/* Department */}
              <View style={styles.campusInfoRow}>
                <View style={styles.campusInfoIconWrap}>
                  <Ionicons name="book-outline" size={17} color="#64748B" />
                </View>
                <Text style={styles.campusInfoLabel}>Department:</Text>
                <Text style={styles.campusInfoVal} numberOfLines={1}>
                  {profile.department || 'General Engineering'}
                </Text>
              </View>

              {/* Academic Level */}
              <View style={styles.campusInfoRow}>
                <View style={styles.campusInfoIconWrap}>
                  <Ionicons name="time-outline" size={17} color="#64748B" />
                </View>
                <Text style={styles.campusInfoLabel}>Academic Level:</Text>
                <Text style={styles.campusInfoVal}>
                  {profile.yearOfStudy ? `Year ${profile.yearOfStudy}` : 'Year 4'}
                  {' • '}
                  {profile.semester ? `Semester ${profile.semester}` : 'Semester 6'}
                </Text>
              </View>

              {/* ID / Roll No */}
              {profile.studentId ? (
                <View style={styles.campusInfoRow}>
                  <View style={styles.campusInfoIconWrap}>
                    <Ionicons name="card-outline" size={17} color="#64748B" />
                  </View>
                  <Text style={styles.campusInfoLabel}>ID / Roll No:</Text>
                  <Text style={styles.campusInfoVal}>#{profile.studentId}</Text>
                </View>
              ) : null}

              {/* Campus Location */}
              {profile.campusLocation ? (
                <View style={[styles.campusInfoRow, { borderBottomWidth: 0 }]}>
                  <View style={styles.campusInfoIconWrap}>
                    <Ionicons name="location-outline" size={17} color="#64748B" />
                  </View>
                  <Text style={styles.campusInfoLabel}>Location:</Text>
                  <Text style={styles.campusInfoVal}>{profile.campusLocation}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* ========================================================================= */}
          {/* 5. Portfolio Showcase & Projects (Screenshot 2 & 4 Style)               */}
          {/* ========================================================================= */}
          <View style={styles.sectionBlock}>
            {/* Segmented Tabs: Projects vs Courses */}
            <View style={styles.portfolioSegmentedBar}>
              {(['Projects', 'Courses'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.portfolioSegmentBtn,
                    activeSegment === tab && styles.portfolioSegmentBtnActive
                  ]}
                  onPress={() => setActiveSegment(tab)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.portfolioSegmentBtnText,
                      activeSegment === tab && styles.portfolioSegmentBtnTextActive
                    ]}
                  >
                    {tab} ({tab === 'Projects' ? projects.length : enrolledCourses.length})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {activeSegment === 'Projects' && (
              <View style={styles.projectsContainer}>
                {/* Header bar with Add Project */}
                <View style={styles.portfolioHeaderBar}>
                  <View>
                    <Text style={styles.portfolioHeading}>Portfolio Showcase</Text>
                    <Text style={styles.portfolioSub}>Highlight what you have built</Text>
                  </View>

                  {!isPeerMode && (
                    <TouchableOpacity
                      style={styles.addProjectPillBtn}
                      onPress={() => setShowProjectModal(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.addProjectPillBtnText}>Add Project</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {projects.length === 0 ? (
                  <View style={styles.emptyPortfolioBox}>
                    <Ionicons name="code-slash-outline" size={36} color="#CBD5E1" style={{ marginBottom: 6 }} />
                    <Text style={styles.emptyPortfolioTitle}>
                      {isPeerMode ? 'No projects posted yet' : 'No portfolio projects added'}
                    </Text>
                    <Text style={styles.emptyPortfolioSub}>
                      {isPeerMode
                        ? 'This peer has not published any projects yet.'
                        : 'Showcase web apps, mobile apps, models, and research projects you have built.'}
                    </Text>
                    {!isPeerMode && (
                      <TouchableOpacity
                        style={styles.emptyPortfolioAddBtn}
                        onPress={() => setShowProjectModal(true)}
                      >
                        <Text style={styles.emptyPortfolioAddBtnText}>+ Add First Project</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  projects.map((proj) => (
                    <View key={proj.id} style={styles.modernProjectCard}>
                      {/* Project Image Banner */}
                      <View style={styles.projectImageContainer}>
                        <Image
                          source={{
                            uri:
                              proj.image ||
                              'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80'
                          }}
                          style={styles.modernProjectImage}
                          resizeMode="cover"
                        />

                        {/* Star Rating Badge Overlay */}
                        <View style={styles.projectStarBadge}>
                          <Ionicons name="star" size={13} color="#F59E0B" style={{ marginRight: 3 }} />
                          <Text style={styles.projectStarText}>{proj.stars || 1}</Text>
                        </View>
                      </View>

                      {/* Project Information */}
                      <View style={styles.modernProjectBody}>
                        <View style={styles.projectHeaderRow}>
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.modernProjectTitle}>{proj.title}</Text>
                            <View style={styles.projectTagPill}>
                              <Text style={styles.projectTagPillText}>{proj.tag}</Text>
                            </View>
                          </View>

                          {!isPeerMode && (
                            <TouchableOpacity
                              onPress={() => handleDeleteProject(proj.id)}
                              style={styles.projectTrashBtn}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="trash-outline" size={18} color="#EF4444" />
                            </TouchableOpacity>
                          )}
                        </View>

                        {proj.description ? (
                          <Text style={styles.modernProjectDesc} numberOfLines={3}>
                            {proj.description}
                          </Text>
                        ) : null}

                        {proj.link ? (
                          <TouchableOpacity
                            style={styles.projectLinkBtn}
                            onPress={() => handleOpenLink(proj.link)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="logo-github" size={15} color="#00C48C" style={{ marginRight: 5 }} />
                            <Text style={styles.projectLinkBtnText} numberOfLines={1}>
                              View Repository / Demo
                            </Text>
                            <Ionicons name="open-outline" size={13} color="#00C48C" style={{ marginLeft: 4 }} />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {activeSegment === 'Courses' && (
              <View style={styles.emptyPortfolioBox}>
                <Ionicons name="book-outline" size={36} color="#CBD5E1" style={{ marginBottom: 6 }} />
                <Text style={styles.emptyPortfolioTitle}>No course enrollments found</Text>
                <Text style={styles.emptyPortfolioSub}>
                  Collaborative courses and study circles will be tracked here.
                </Text>
              </View>
            )}
          </View>

          {/* ========================================================================= */}
          {/* 6. Education History (Dynamic)                                           */}
          {/* ========================================================================= */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWithIcon}>
                <View style={[styles.sectionIconBadge, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name="school" size={17} color="#00C48C" />
                </View>
                <Text style={styles.sectionTitle}>Education History</Text>
              </View>

              {!isPeerMode && (
                <TouchableOpacity
                  style={styles.addSkillBtn}
                  onPress={() => setShowEducationModal(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={15} color="#FFFFFF" style={{ marginRight: 3 }} />
                  <Text style={styles.addSkillBtnText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>

            {education.length === 0 ? (
              <View style={styles.emptySkillsBox}>
                <Ionicons name="school-outline" size={24} color="#94A3B8" style={{ marginBottom: 4 }} />
                <Text style={styles.emptySkillsText}>
                  {isPeerMode ? 'No education history listed' : 'No education history added'}
                </Text>
              </View>
            ) : (
              <View style={styles.historyList}>
                {education.map((edu, idx) => (
                  <View
                    key={edu.id || idx}
                    style={[
                      styles.historyItemRow,
                      idx === education.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 }
                    ]}
                  >
                    <View style={styles.timelineCol}>
                      <View style={styles.timelineDot} />
                      {idx < education.length - 1 && <View style={styles.timelineLine} />}
                    </View>

                    <View style={{ flex: 1, paddingLeft: 10 }}>
                      <View style={styles.historyTitleRow}>
                        <Text style={styles.historyTitle}>{edu.institution}</Text>
                        {!isPeerMode && (
                          <TouchableOpacity
                            onPress={() => handleDeleteEducation(edu.id)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="trash-outline" size={15} color="#94A3B8" />
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text style={styles.historySubtitle}>
                        {edu.degree} {edu.fieldOfStudy ? `• ${edu.fieldOfStudy}` : ''}
                      </Text>
                      <Text style={styles.historyMetaText}>
                        {edu.startYear} - {edu.endYear} {edu.grade ? `• ${edu.grade}` : ''}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* ========================================================================= */}
      {/* 7. Sticky Bottom Action Bar (Screenshot 4 Peer Mode Interaction)          */}
      {/* ========================================================================= */}
      {isPeerMode && (
        <View style={styles.peerStickyActionBar}>
          {/* Follow Button */}
          <TouchableOpacity
            style={[
              styles.peerFollowBtn,
              isFollowing && styles.peerFollowBtnActive,
              isRequested && styles.peerFollowBtnRequested
            ]}
            onPress={handleToggleFollow}
            disabled={actionLoading}
            activeOpacity={0.8}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color={isFollowing ? '#00C48C' : '#FFFFFF'} />
            ) : isFollowing ? (
              <>
                <Ionicons name="checkmark" size={16} color="#00C48C" style={{ marginRight: 4 }} />
                <Text style={styles.peerFollowBtnActiveText}>Following</Text>
              </>
            ) : isRequested ? (
              <>
                <Ionicons name="hourglass-outline" size={16} color="#F59E0B" style={{ marginRight: 4 }} />
                <Text style={styles.peerFollowBtnRequestedText}>Requested</Text>
              </>
            ) : (
              <>
                <Ionicons name="person-add" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.peerFollowBtnText}>Follow</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Message Peer Button */}
          <TouchableOpacity
            style={styles.peerMessageBtn}
            onPress={handleMessagePeer}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubble-ellipses" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.peerMessageBtnText}>Message</Text>
          </TouchableOpacity>

          {/* 1-on-1 Session Button */}
          <TouchableOpacity
            style={styles.peerBookBtn}
            onPress={handleBookSession}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar" size={17} color="#00C48C" style={{ marginRight: 5 }} />
            <Text style={styles.peerBookBtnText}>1-on-1</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ========================================================================= */}
      {/* Modals: Edit Profile, Add Skill, Add Education, Add Project, Logout       */}
      {/* ========================================================================= */}

      {/* 1. Edit Profile Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent onRequestClose={() => setShowEditModal(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={Keyboard.dismiss} />
          <View
            style={[
              styles.editModalContainer,
              Platform.OS === 'android' && keyboardHeight > 0 && {
                marginBottom: keyboardHeight,
                maxHeight: Math.max(280, Dimensions.get('window').height - keyboardHeight - 30)
              }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeading}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flexShrink: 1 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[
                styles.modalScrollContent,
                { paddingBottom: Platform.OS === 'ios' ? 140 : 100 }
              ]}
            >
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Full Name *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Full Name"
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Role Classification</Text>
                <View style={styles.typeSelectorRow}>
                  {(
                    [
                      { type: 'student', label: 'Student', icon: 'school-outline' },
                      { type: 'professional', label: 'Professional', icon: 'briefcase-outline' },
                      { type: 'mentor', label: 'Mentor', icon: 'bulb-outline' },
                      { type: 'alumni', label: 'Alumni', icon: 'ribbon-outline' }
                    ] as const
                  ).map((item) => (
                    <TouchableOpacity
                      key={item.type}
                      style={[
                        styles.typeSelectChip,
                        editUserType === item.type && styles.typeSelectChipActive
                      ]}
                      onPress={() => setEditUserType(item.type)}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={14}
                        color={editUserType === item.type ? '#00A374' : '#64748B'}
                        style={{ marginRight: 5 }}
                      />
                      <Text
                        style={[
                          styles.typeSelectChipText,
                          editUserType === item.type && styles.typeSelectChipTextActive
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Professional Headline</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editHeadline}
                  onChangeText={setEditHeadline}
                  placeholder="e.g. Computer Science Student | Mobile Developer"
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>College / University</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editCollege}
                  onChangeText={setEditCollege}
                  placeholder="e.g. GRI"
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Department</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editDepartment}
                  onChangeText={setEditDepartment}
                  placeholder="e.g. Computer Science"
                />
              </View>

              <View style={styles.modalRowInputs}>
                <View style={[styles.modalInputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.modalInputLabel}>Year of Study</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editYear}
                    onChangeText={setEditYear}
                    keyboardType="numeric"
                    placeholder="e.g. 4"
                  />
                </View>
                <View style={[styles.modalInputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.modalInputLabel}>Semester</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editSemester}
                    onChangeText={setEditSemester}
                    keyboardType="numeric"
                    placeholder="e.g. 6"
                  />
                </View>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Student Roll / Register ID</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editStudentId}
                  onChangeText={setEditStudentId}
                  placeholder="e.g. #202620202"
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Campus Location</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editLocation}
                  onChangeText={setEditLocation}
                  placeholder="e.g. GRI Campus"
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>About / Bio</Text>
                <TextInput
                  style={[styles.modalInput, { height: 75, textAlignVertical: 'top' }]}
                  value={editBio}
                  onChangeText={setEditBio}
                  multiline
                  placeholder="Tell peers what you study, mentor, or build..."
                />
              </View>

              <TouchableOpacity
                style={[styles.modalPrimaryBtn, savingProfile && styles.buttonDisabled]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalPrimaryBtnText}>Save Profile Changes</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 2. Add Skill Modal */}
      <Modal visible={showSkillModal} animationType="slide" transparent onRequestClose={() => setShowSkillModal(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={Keyboard.dismiss} />
          <View style={styles.editModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeading}>Add Verified Skill</Text>
              <TouchableOpacity onPress={() => setShowSkillModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20 }}>
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Skill Name</Text>
                <TextInput
                  style={styles.modalInput}
                  value={newSkillText}
                  onChangeText={setNewSkillText}
                  placeholder="e.g. React.js, Node.js, Python, Figma"
                  autoFocus
                />
              </View>

              <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleSaveSkill}>
                <Text style={styles.modalPrimaryBtnText}>Add to Verified Skills</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 3. Add Education Modal */}
      <Modal visible={showEducationModal} animationType="slide" transparent onRequestClose={() => setShowEducationModal(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={Keyboard.dismiss} />
          <View style={styles.editModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeading}>Add Education Entry</Text>
              <TouchableOpacity onPress={() => setShowEducationModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Institution *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={eduInstitution}
                  onChangeText={setEduInstitution}
                  placeholder="e.g. Kongu Engineering College"
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Degree *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={eduDegree}
                  onChangeText={setEduDegree}
                  placeholder="e.g. B.E. / B.Tech"
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Field of Study</Text>
                <TextInput
                  style={styles.modalInput}
                  value={eduFieldOfStudy}
                  onChangeText={setEduFieldOfStudy}
                  placeholder="e.g. Computer Science & Engineering"
                />
              </View>

              <View style={styles.modalRowInputs}>
                <View style={[styles.modalInputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.modalInputLabel}>Start Year</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={eduStartYear}
                    onChangeText={setEduStartYear}
                    placeholder="2021"
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.modalInputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.modalInputLabel}>End Year</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={eduEndYear}
                    onChangeText={setEduEndYear}
                    placeholder="2025"
                  />
                </View>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Grade / Percentage</Text>
                <TextInput
                  style={styles.modalInput}
                  value={eduGrade}
                  onChangeText={setEduGrade}
                  placeholder="e.g. 8.85 CGPA"
                />
              </View>

              <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleSaveEducation}>
                <Text style={styles.modalPrimaryBtnText}>Save Education</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 4. Add Project Modal */}
      <Modal visible={showProjectModal} animationType="slide" transparent onRequestClose={() => setShowProjectModal(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={Keyboard.dismiss} />
          <View style={styles.editModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeading}>Add Portfolio Project</Text>
              <TouchableOpacity onPress={() => setShowProjectModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Project Title *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={projTitle}
                  onChangeText={setProjTitle}
                  placeholder="e.g. PeerBridge Mobile Platform"
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Tech Stack & Tags *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={projTag}
                  onChangeText={setProjTag}
                  placeholder="e.g. React Native, Node.js, MongoDB"
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Project Description</Text>
                <TextInput
                  style={[styles.modalInput, { height: 75, textAlignVertical: 'top' }]}
                  value={projDescription}
                  onChangeText={setProjDescription}
                  multiline
                  placeholder="Explain what the project solves and key highlights..."
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>GitHub / Demo Link</Text>
                <TextInput
                  style={styles.modalInput}
                  value={projLink}
                  onChangeText={setProjLink}
                  placeholder="https://github.com/..."
                  autoCapitalize="none"
                />
              </View>

              {/* Cover Image Upload */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Project Cover Image</Text>
                {projImage ? (
                  <View style={styles.projectImagePreviewBox}>
                    <Image source={{ uri: projImage }} style={styles.projectImagePreview} resizeMode="cover" />
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => setProjImage('')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="trash-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.removeImageText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.uploadImagePlaceholderBtn}
                    onPress={handleSelectProjectImageSource}
                    disabled={uploadingProjImage}
                    activeOpacity={0.8}
                  >
                    {uploadingProjImage ? (
                      <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                        <ActivityIndicator size="small" color="#00C48C" style={{ marginBottom: 6 }} />
                        <Text style={styles.uploadImageSub}>Uploading image...</Text>
                      </View>
                    ) : (
                      <>
                        <Ionicons name="cloud-upload-outline" size={24} color="#00C48C" style={{ marginBottom: 4 }} />
                        <Text style={styles.uploadImageTitle}>Upload Project Thumbnail</Text>
                        <Text style={styles.uploadImageSub}>Camera or Photo Gallery</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleSaveProject}>
                <Text style={styles.modalPrimaryBtnText}>Publish to Portfolio</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 5. Logout Confirmation Modal */}
      <Modal visible={showLogoutModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmBox}>
            <View style={styles.logoutIconCircle}>
              <Ionicons name="log-out-outline" size={28} color="#EF4444" />
            </View>
            <Text style={styles.confirmHeading}>End PeerBridge Session?</Text>
            <Text style={styles.confirmSub}>
              You will be signed out and your active session on this device will be securely closed.
            </Text>

            <View style={styles.confirmActionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.logoutConfirmBtn}
                onPress={() => {
                  setShowLogoutModal(false);
                  if (onLogout) onLogout();
                }}
              >
                <Text style={styles.logoutConfirmText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  contentContainer: {
    paddingBottom: 40
  },

  // ==========================================
  // Curved Hero Header (Screenshot 4 Architecture)
  // ==========================================
  curvedHeroBanner: {
    backgroundColor: '#00A374',
    paddingTop: Platform.OS === 'android' ? 36 : 48,
    paddingBottom: 54,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    position: 'relative',
    overflow: 'visible'
  },
  // Concentric decorative circles matching Screenshot 4
  concentricCircleOne: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.16)'
  },
  concentricCircleTwo: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)'
  },
  concentricCircleThree: {
    position: 'absolute',
    top: -20,
    left: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.10)'
  },

  // Top Bar Navigation
  heroTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  heroIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  heroLogoutIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  heroTopBarTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF'
  },

  // Hero Content Details
  heroMainContent: {
    paddingRight: 70 // room for overlapping avatar
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  heroStudentName: {
    fontSize: 25,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.88)',
    fontWeight: '500',
    marginBottom: 12
  },

  // Rating and Role Pills
  heroRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16
  },
  heroRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16
  },
  heroRatingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  heroRolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 16
  },
  heroRoleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF'
  },

  // Doubts / Solutions / Followers Stats
  heroStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: 'space-around'
  },
  heroStatItem: {
    alignItems: 'center'
  },
  heroStatNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  heroStatLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
    marginTop: 1
  },
  heroStatDivider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)'
  },

  // Floating Overlapping Avatar Badge (Screenshot 4 Screen 3 Signature)
  overlappingAvatarBadge: {
    position: 'absolute',
    bottom: -32,
    right: 20,
    width: 80,
    height: 80,
    borderRadius: 26,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 10
  },
  overlappingAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 22
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#00C48C',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  avatarOnlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    borderWidth: 2.5,
    borderColor: '#FFFFFF'
  },

  // ==========================================
  // Overlapping Curved White Card Body
  // ==========================================
  curvedWhiteCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -20,
    paddingTop: 36,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2
  },

  // Bio / About
  bioSection: {
    marginBottom: 24
  },
  headlineText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6
  },
  bioParagraph: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    marginBottom: 12
  },
  addBioPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12
  },
  addBioPlaceholderText: {
    fontSize: 13,
    color: '#00C48C',
    fontWeight: '500'
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    paddingVertical: 10
  },
  editProfileBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00C48C'
  },

  // Section Blocks
  sectionBlock: {
    marginBottom: 26
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14
  },
  sectionTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  sectionIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A'
  },
  editSectionLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00C48C'
  },

  // Categories & Verified Skills Chips (Screenshot 4 Style)
  categoriesChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600'
  },
  addSkillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00C48C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  addSkillBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  emptySkillsBox: {
    alignItems: 'center',
    paddingVertical: 18,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed'
  },
  emptySkillsText: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 6
  },
  emptySkillsAddBtn: {
    marginTop: 4
  },
  emptySkillsAddBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00C48C'
  },

  // Campus & Institution Info Card (Screenshot 3 Matching Layout)
  campusInfoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  campusInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6'
  },
  campusInfoIconWrap: {
    width: 28,
    alignItems: 'center',
    marginRight: 8
  },
  campusInfoLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    width: 105
  },
  campusInfoVal: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700'
  },

  // Portfolio Showcase & Projects (Screenshot 2 & 4 Style)
  portfolioSegmentedBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16
  },
  portfolioSegmentBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10
  },
  portfolioSegmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2
  },
  portfolioSegmentBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B'
  },
  portfolioSegmentBtnTextActive: {
    color: '#00A374',
    fontWeight: '700'
  },
  projectsContainer: {},
  portfolioHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14
  },
  portfolioHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A'
  },
  portfolioSub: {
    fontSize: 12,
    color: '#94A3B8'
  },
  addProjectPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00C48C',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16
  },
  addProjectPillBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF'
  },

  // Modern Project Card
  modernProjectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  projectImageContainer: {
    position: 'relative',
    width: '100%',
    height: 170
  },
  modernProjectImage: {
    width: '100%',
    height: '100%'
  },
  projectStarBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  projectStarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A'
  },
  modernProjectBody: {
    padding: 16
  },
  projectHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between'
  },
  modernProjectTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4
  },
  projectTagPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8
  },
  projectTagPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00C48C'
  },
  projectTrashBtn: {
    padding: 4
  },
  modernProjectDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: '#475569',
    marginBottom: 10
  },
  projectLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8
  },
  projectLinkBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00C48C'
  },
  emptyPortfolioBox: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed'
  },
  emptyPortfolioTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4
  },
  emptyPortfolioSub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 10
  },
  emptyPortfolioAddBtn: {
    marginTop: 4
  },
  emptyPortfolioAddBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00C48C'
  },

  // Education History Rows
  historyList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  historyItemRow: {
    flexDirection: 'row',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
    marginBottom: 14
  },
  timelineCol: {
    alignItems: 'center',
    width: 18
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00C48C',
    marginTop: 4
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 4
  },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A'
  },
  historySubtitle: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2
  },
  historyMetaText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2
  },

  // ==========================================
  // Sticky Bottom Action Bar (Peer Mode)
  // ==========================================
  peerStickyActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
    gap: 8
  },
  peerFollowBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00C48C',
    paddingVertical: 12,
    borderRadius: 14
  },
  peerFollowBtnActive: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  peerFollowBtnRequested: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A'
  },
  peerFollowBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  peerFollowBtnActiveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00C48C'
  },
  peerFollowBtnRequestedText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706'
  },
  peerMessageBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    borderRadius: 14
  },
  peerMessageBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  peerBookBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 12,
    borderRadius: 14
  },
  peerBookBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00C48C'
  },

  // ==========================================
  // Modals Styling
  // ==========================================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end'
  },
  editModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingBottom: 20
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A'
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16
  },
  modalInputGroup: {
    marginBottom: 16
  },
  modalInputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A'
  },
  modalRowInputs: {
    flexDirection: 'row'
  },
  typeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  typeSelectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC'
  },
  typeSelectChipActive: {
    borderColor: '#00C48C',
    backgroundColor: '#ECFDF5'
  },
  typeSelectChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B'
  },
  typeSelectChipTextActive: {
    color: '#00A374'
  },
  modalPrimaryBtn: {
    backgroundColor: '#00C48C',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8
  },
  modalPrimaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  buttonDisabled: {
    opacity: 0.6
  },
  projectImagePreviewBox: {
    position: 'relative',
    height: 140,
    borderRadius: 12,
    overflow: 'hidden'
  },
  projectImagePreview: {
    width: '100%',
    height: '100%'
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  removeImageText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700'
  },
  uploadImagePlaceholderBtn: {
    height: 100,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderStyle: 'dashed',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  uploadImageTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00C48C'
  },
  uploadImageSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2
  },

  // Logout Box
  confirmBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginHorizontal: 24,
    marginBottom: 60,
    padding: 24,
    alignItems: 'center'
  },
  logoutIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  confirmHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8
  },
  confirmSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20
  },
  confirmActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%'
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center'
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569'
  },
  logoutConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center'
  },
  logoutConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF'
  }
});
