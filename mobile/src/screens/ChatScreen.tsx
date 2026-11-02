import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { getSocket } from '../services/socket';

const defaultAvatar = require('../../assets/user.png');

interface PeerUser {
  _id: string;
  name: string;
  avatar?: string;
  college?: string;
  department?: string;
}

interface Props {
  onBack: () => void;
  token?: string | null;
  currentUserId?: string;
  initialPartner?: PeerUser | null;
  doubtContext?: { title: string; subject: string } | null;
  onActivePartnerChange?: (partner: PeerUser | null) => void;
}

export const ChatScreen: React.FC<Props> = ({
  onBack,
  token,
  currentUserId,
  initialPartner = null,
  doubtContext = null,
  onActivePartnerChange
}) => {
  // Navigation inside chat: either active conversation or list
  const [activePartner, setActivePartner] = useState<PeerUser | null>(initialPartner);
  const [conversations, setConversations] = useState<any[]>([]);
  const [connectedPeers, setConnectedPeers] = useState<any[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);

  // Active chat state
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaUploadProgress, setMediaUploadProgress] = useState('');
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Notify parent whether inside active chat or list view
  useEffect(() => {
    if (onActivePartnerChange) {
      onActivePartnerChange(activePartner);
    }
  }, [activePartner]);

  const getEffectiveToken = async () => {
    if (token) return token;
    return await AsyncStorage.getItem('@peerbridge_token');
  };

  // Load conversations and connected peers list if no active partner
  useEffect(() => {
    if (!activePartner) {
      loadConversations();
      loadConnectedPeers();
    }
  }, [activePartner]);

  // Load messages when an active partner is selected
  useEffect(() => {
    if (activePartner?._id) {
      loadMessages(activePartner._id);
    }
  }, [activePartner?._id]);

  // Real-time Socket.IO listener for live chat messages
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !currentUserId) return;

    socket.emit('register_user', currentUserId);

    const handleNewMessage = (msg: any) => {
      console.log('[Socket] new_message received in ChatScreen:', msg);
      const partnerId = activePartner?._id;
      if (!partnerId) {
        loadConversations();
        return;
      }

      const msgSenderId = String(msg.senderId?._id || msg.senderId);
      const msgReceiverId = String(msg.receiverId?._id || msg.receiverId);

      if (
        msgSenderId === String(partnerId) ||
        (msgSenderId === String(currentUserId) && msgReceiverId === String(partnerId))
      ) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        loadConversations();
      }
    };

    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [activePartner?._id, currentUserId]);

  // Auto-scroll when keyboard appears on Android / iOS
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 80);
      }
    );

    return () => {
      showSub.remove();
    };
  }, []);

  const loadConversations = async () => {
    try {
      setLoadingConversations(true);
      const activeToken = await getEffectiveToken();
      if (!activeToken) return;
      const res = await api.getConversations(activeToken);
      if (res && res.success && Array.isArray(res.data)) {
        setConversations(res.data);
      }
    } catch (e) {
      console.warn('Failed to load conversations:', e);
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadConnectedPeers = async () => {
    try {
      const activeToken = await getEffectiveToken();
      if (!activeToken) return;
      const res = await api.getConnectedPeers(activeToken);
      if (res && res.success && Array.isArray(res.data)) {
        setConnectedPeers(res.data);
      }
    } catch (e) {
      console.warn('Failed to load connected peers:', e);
    }
  };

  const loadMessages = async (partnerId: string) => {
    try {
      setLoadingMessages(true);
      const activeToken = await getEffectiveToken();
      if (!activeToken) return;
      const res = await api.getMessages(activeToken, partnerId);
      if (res && res.success && res.data) {
        setMessages(res.data.messages || []);
      }
    } catch (e) {
      console.warn('Failed to load messages:', e);
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessageText = async (textToSend: string) => {
    if (!activePartner?._id || !textToSend.trim() || sending) return;
    const cleanText = textToSend.trim();
    setInputText('');
    setSending(true);

    const activeToken = await getEffectiveToken();
    if (!activeToken) {
      Alert.alert('Sign In Required', 'Please sign in to send messages.');
      setSending(false);
      return;
    }

    // Optimistic UI update
    const tempMsg = {
      _id: `temp-${Date.now()}`,
      senderId: currentUserId,
      receiverId: activePartner._id,
      content: cleanText,
      type: 'text',
      createdAt: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempMsg]);

    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 50);

    try {
      const res = await api.sendMessage(activeToken, {
        receiverId: activePartner._id,
        content: cleanText
      });
      if (res && res.success && res.data) {
        setMessages((prev) =>
          prev.map((m) => (m._id === tempMsg._id ? res.data : m))
        );
      }
    } catch (err: any) {
      Alert.alert('Send Failed', 'Could not deliver message to peer. Please check connection.');
    } finally {
      setSending(false);
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleSendMessage = async () => {
    await sendMessageText(inputText);
  };

  const handlePickImage = async () => {
    setShowAttachmentMenu(false);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant photo library access to send images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          await sendMediaMessage(`data:image/jpeg;base64,${asset.base64}`, 'image');
        }
      }
    } catch (err: any) {
      console.warn('Pick image error:', err);
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const handlePickVideo = async () => {
    setShowAttachmentMenu(false);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant library access to send videos.');
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

        // Strict 10MB limit check requested by user
        const MAX_BYTES = 10 * 1024 * 1024;
        if (asset.fileSize && asset.fileSize > MAX_BYTES) {
          Alert.alert(
            'Video Exceeds 10MB Limit ⚠️',
            `Selected video is ${(asset.fileSize / (1024 * 1024)).toFixed(1)}MB. Maximum allowed video size is 10MB. Please choose a shorter clip or compress it.`
          );
          return;
        }

        if (asset.base64) {
          await sendMediaMessage(
            `data:video/mp4;base64,${asset.base64}`,
            'video',
            asset.fileSize,
            asset.duration ? Math.round(asset.duration) : undefined
          );
        } else {
          Alert.alert('Error', 'Could not read video data from device.');
        }
      }
    } catch (err: any) {
      console.warn('Pick video error:', err);
      Alert.alert('Error', 'Failed to pick video clip.');
    }
  };

  const sendMediaMessage = async (
    base64Data: string,
    mediaType: 'image' | 'video',
    fileSize?: number,
    duration?: number
  ) => {
    if (!activePartner?._id) return;

    try {
      setUploadingMedia(true);
      setMediaUploadProgress(`Uploading ${mediaType === 'video' ? 'video (max 10MB)' : 'photo'}...`);

      const activeToken = await getEffectiveToken();
      if (!activeToken) {
        Alert.alert('Sign In Required', 'Please sign in to send media.');
        return;
      }

      let uploadedUrl = '';
      let videoDuration = duration;

      if (mediaType === 'video') {
        const uploadRes = await api.uploadVideo(activeToken, base64Data, fileSize, 'peerbridge/chat');
        if (uploadRes && uploadRes.success && uploadRes.data?.url) {
          uploadedUrl = uploadRes.data.url;
          if (uploadRes.data.duration) videoDuration = Math.round(uploadRes.data.duration);
        } else {
          Alert.alert('Upload Failed', uploadRes?.message || 'Video upload failed.');
          return;
        }
      } else {
        const uploadRes = await api.uploadImage(activeToken, base64Data, 'peerbridge/chat');
        if (uploadRes && uploadRes.success && uploadRes.data?.url) {
          uploadedUrl = uploadRes.data.url;
        } else {
          Alert.alert('Upload Failed', uploadRes?.message || 'Image upload failed.');
          return;
        }
      }

      const tempMsg = {
        _id: `temp-${Date.now()}`,
        senderId: currentUserId,
        receiverId: activePartner._id,
        content: mediaType === 'video' ? '🎥 Video Attachment' : '📷 Photo Attachment',
        type: mediaType,
        mediaUrl: uploadedUrl,
        mediaDuration: videoDuration,
        fileSize,
        createdAt: new Date().toISOString()
      };
      setMessages((prev) => [...prev, tempMsg]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

      const res = await api.sendMessage(activeToken, {
        receiverId: activePartner._id,
        content: mediaType === 'video' ? '🎥 Video Attachment' : '📷 Photo Attachment',
        type: mediaType,
        mediaUrl: uploadedUrl,
        mediaDuration: videoDuration,
        fileSize
      });

      if (res && res.success && res.data) {
        setMessages((prev) => prev.map((m) => (m._id === tempMsg._id ? res.data : m)));
      }
    } catch (err: any) {
      console.warn('Send media error:', err);
      Alert.alert('Error', err.message || 'Failed to send media message.');
    } finally {
      setUploadingMedia(false);
      setMediaUploadProgress('');
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  // 1. If NO active partner: render Conversations List View
  if (!activePartner) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Peer Discussions</Text>
            <Text style={styles.headerSub}>PeerBridge Academic Collaboration</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={loadConversations}
            activeOpacity={0.7}
          >
            <Ionicons name="reload-outline" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Instagram Direct Style: Connected Peers Carousel */}
        {connectedPeers.length > 0 && (
          <View style={styles.peersStoryContainer}>
            <Text style={styles.peersStoryTitle}>Connected Peers</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.peersStoryScroll}
            >
              {connectedPeers.map((peer) => {
                const peerAvatar =
                  peer.avatar && peer.avatar.startsWith('http')
                    ? { uri: peer.avatar }
                    : defaultAvatar;
                return (
                  <TouchableOpacity
                    key={`story-${peer._id}`}
                    style={styles.storyItem}
                    activeOpacity={0.8}
                    onPress={() => setActivePartner(peer)}
                  >
                    <View style={styles.storyRing}>
                      <Image source={peerAvatar} style={styles.storyAvatar} />
                      <View style={styles.onlineDot} />
                    </View>
                    <Text style={styles.storyName} numberOfLines={1}>
                      {peer.name?.split(' ')[0] || 'Peer'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {loadingConversations ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#00C48C" />
            <Text style={styles.loadingText}>Loading peer chats...</Text>
          </View>
        ) : conversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="chatbubbles-outline" size={42} color="#00C48C" />
            </View>
            <Text style={styles.emptyTitle}>
              {connectedPeers.length > 0 ? 'No Active Chats Yet' : 'No Conversations Yet'}
            </Text>
            <Text style={styles.emptySub}>
              {connectedPeers.length > 0
                ? 'Tap any connected peer above to start an instant 1-on-1 doubt discussion!'
                : 'Connect with peers or volunteer on academic questions to collaborate!'}
            </Text>

            {/* If has connected peers, list them directly */}
            {connectedPeers.length > 0 && (
              <View style={styles.quickPeersBox}>
                <Text style={styles.quickPeersHeading}>Your Connections</Text>
                {connectedPeers.slice(0, 5).map((p) => (
                  <TouchableOpacity
                    key={`quick-${p._id}`}
                    style={styles.quickPeerRow}
                    activeOpacity={0.7}
                    onPress={() => setActivePartner(p)}
                  >
                    <Image
                      source={p.avatar ? { uri: p.avatar } : defaultAvatar}
                      style={styles.quickPeerAvatar}
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.quickPeerName}>{p.name}</Text>
                      <Text style={styles.quickPeerMeta}>{p.department || 'Connected Peer'}</Text>
                    </View>
                    <View style={styles.quickMsgBadge}>
                      <Ionicons name="chatbubble" size={12} color="#FFFFFF" />
                      <Text style={styles.quickMsgText}>Chat</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.convListContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.messagesSectionTitle}>Recent Messages</Text>
            {conversations.map((item) => {
              const partner = item.partner;
              const pAvatar =
                partner?.avatar && partner.avatar.startsWith('http')
                  ? { uri: partner.avatar }
                  : defaultAvatar;

              return (
                <TouchableOpacity
                  key={partner._id}
                  style={styles.convCard}
                  activeOpacity={0.8}
                  onPress={() => setActivePartner(partner)}
                >
                  <Image source={pAvatar} style={styles.convAvatar} />
                  <View style={styles.convMeta}>
                    <View style={styles.convNameRow}>
                      <Text style={styles.convName} numberOfLines={1}>
                        {partner.name || 'Peer Scholar'}
                      </Text>
                      {item.lastMessage?.createdAt ? (
                        <Text style={styles.convTime}>
                          {new Date(item.lastMessage.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.convCollege} numberOfLines={1}>
                      {partner.college || partner.department || 'PeerBridge Student'}
                    </Text>
                    <Text style={styles.convLastMsg} numberOfLines={1}>
                      {item.lastMessage?.content || 'Tap to chat'}
                    </Text>
                  </View>
                  {item.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadCountText}>{item.unreadCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    );
  }

  // 2. Active Chat View with selected partner
  const partnerAvatar =
    activePartner.avatar && activePartner.avatar.startsWith('http')
      ? { uri: activePartner.avatar }
      : defaultAvatar;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (initialPartner) {
              onBack();
            } else {
              setActivePartner(null);
            }
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>

        <Image source={partnerAvatar} style={styles.headerAvatar} />
        <View style={styles.headerUserMeta}>
          <Text style={styles.headerUserName} numberOfLines={1}>
            {activePartner.name || 'Peer Scholar'}
          </Text>
          <Text style={styles.headerCollege} numberOfLines={1}>
            {activePartner.college || activePartner.department || 'PeerBridge Student'}
          </Text>
        </View>
      </View>

      {/* Doubt Context Bar (If entered from a doubt) */}
      {doubtContext ? (
        <View style={styles.contextBanner}>
          <Ionicons name="help-circle" size={15} color="#00C48C" style={{ marginRight: 6 }} />
          <Text style={styles.contextBannerText} numberOfLines={1}>
            Discussing: <Text style={{ fontWeight: '700' }}>{doubtContext.title}</Text> ({doubtContext.subject})
          </Text>
        </View>
      ) : null}

      {/* Messages Scroll Area */}
      {loadingMessages ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="small" color="#00C48C" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyMessagesBox}>
              <View style={styles.emptyHeroCircle}>
                <Ionicons name="chatbubbles" size={38} color="#00C48C" />
              </View>
              <Text style={styles.emptyMsgTitle}>Start Academic Collaboration</Text>
              <Text style={styles.emptyMsgSub}>
                Send a friendly message to {activePartner.name} to exchange doubts, share solutions, and study together!
              </Text>

              {/* Quick Message Starters */}
              <View style={styles.quickStartersBox}>
                <Text style={styles.quickStartersTitle}>Tap a quick starter to send:</Text>
                <View style={styles.quickStartersRow}>
                  {[
                    `👋 Hi ${activePartner.name.split(' ')[0]}!`,
                    `📚 Need help with doubts!`,
                    `💡 Can we discuss this topic?`,
                    `🤝 Let's collaborate on learning!`
                  ].map((starterText) => (
                    <TouchableOpacity
                      key={starterText}
                      style={styles.starterChip}
                      activeOpacity={0.7}
                      onPress={() => sendMessageText(starterText)}
                    >
                      <Text style={styles.starterChipText}>{starterText}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          ) : (
            messages.map((msg, index) => {
              const isMe =
                msg.senderId === currentUserId ||
                (typeof msg.senderId === 'object' && msg.senderId?._id === currentUserId);
              const timeStr = msg.createdAt
                ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <View
                  key={msg._id || index}
                  style={[
                    styles.messageRow,
                    isMe ? styles.myMessageRow : styles.theirMessageRow
                  ]}
                >
                  <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
                    {/* Media Image Message */}
                    {(msg.type === 'image' || (msg.mediaUrl && !msg.type?.includes('video'))) && msg.mediaUrl ? (
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => setPreviewMedia({ url: msg.mediaUrl, type: 'image' })}
                        style={styles.bubbleMediaWrap}
                      >
                        <Image source={{ uri: msg.mediaUrl }} style={styles.bubbleImage} resizeMode="cover" />
                        <View style={styles.bubbleMediaZoomHint}>
                          <Ionicons name="scan-outline" size={13} color="#FFFFFF" />
                        </View>
                      </TouchableOpacity>
                    ) : null}

                    {/* Media Video Message */}
                    {msg.type === 'video' && msg.mediaUrl ? (
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => setPreviewMedia({ url: msg.mediaUrl, type: 'video' })}
                        style={styles.bubbleVideoWrap}
                      >
                        <View style={styles.bubbleVideoOverlay}>
                          <View style={styles.bubblePlayIconCircle}>
                            <Ionicons name="play" size={26} color="#FFFFFF" style={{ marginLeft: 2 }} />
                          </View>
                          <View style={styles.bubbleVideoBadge}>
                            <Ionicons name="videocam" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                            <Text style={styles.bubbleVideoBadgeText}>
                              {msg.mediaDuration
                                ? `${Math.floor(msg.mediaDuration / 60)}:${(msg.mediaDuration % 60).toString().padStart(2, '0')}`
                                : 'Video (max 10MB)'}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ) : null}

                    {/* Text Message (only if not default placeholder) */}
                    {msg.content &&
                    !msg.content.startsWith('📷 Photo Attachment') &&
                    !msg.content.startsWith('🎥 Video Attachment') ? (
                      <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
                        {msg.content}
                      </Text>
                    ) : null}

                    {timeStr ? (
                      <Text style={[styles.timeText, isMe ? styles.myTimeText : styles.theirTimeText]}>
                        {timeStr}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Uploading Progress Floating Pill */}
      {uploadingMedia && (
        <View style={styles.uploadingProgressBox}>
          <ActivityIndicator size="small" color="#00C48C" style={{ marginRight: 8 }} />
          <Text style={styles.uploadingProgressText}>{mediaUploadProgress || 'Uploading media...'}</Text>
        </View>
      )}

      {/* Prominent Message Input Bar */}
      <View style={styles.inputBar}>
        {/* Attachment Options Button (+ icon) */}
        <TouchableOpacity
          style={styles.attachBtn}
          onPress={() => setShowAttachmentMenu(true)}
          disabled={uploadingMedia}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle" size={32} color="#00C48C" />
        </TouchableOpacity>

        <View style={styles.inputInnerBox}>
          <TextInput
            style={styles.textInput}
            placeholder={`Message ${activePartner.name}...`}
            placeholderTextColor="#94A3B8"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={handleSendMessage}
          />
        </View>
        <TouchableOpacity
          style={[
            styles.sendBtn,
            inputText.trim().length > 0 ? styles.sendBtnActive : styles.sendBtnDisabled
          ]}
          onPress={handleSendMessage}
          disabled={!inputText.trim() || sending}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons
              name="send"
              size={18}
              color={inputText.trim().length > 0 ? '#FFFFFF' : '#94A3B8'}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Attachment Options Sheet Modal */}
      <Modal
        visible={showAttachmentMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAttachmentMenu(false)}
      >
        <TouchableOpacity
          style={styles.attachmentModalOverlay}
          activeOpacity={1}
          onPress={() => setShowAttachmentMenu(false)}
        >
          <View style={styles.attachmentSheet}>
            <View style={styles.attachmentSheetHeader}>
              <Text style={styles.attachmentSheetTitle}>Send Media to {activePartner.name}</Text>
              <TouchableOpacity onPress={() => setShowAttachmentMenu(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.attachmentOptionsRow}>
              {/* Photo Option */}
              <TouchableOpacity
                style={styles.attachmentOptionItem}
                onPress={handlePickImage}
                activeOpacity={0.8}
              >
                <View style={[styles.attachmentIconCircle, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                  <Ionicons name="image" size={26} color="#2563EB" />
                </View>
                <Text style={styles.attachmentOptionLabel}>Send Photo</Text>
                <Text style={styles.attachmentOptionSub}>Diagrams & solutions</Text>
              </TouchableOpacity>

              {/* Video Option (Max 10MB) */}
              <TouchableOpacity
                style={styles.attachmentOptionItem}
                onPress={handlePickVideo}
                activeOpacity={0.8}
              >
                <View style={[styles.attachmentIconCircle, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                  <Ionicons name="videocam" size={26} color="#00C48C" />
                </View>
                <Text style={styles.attachmentOptionLabel}>Send Video</Text>
                <Text style={styles.attachmentOptionSub}>Max 10MB clip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Fullscreen Media Preview Modal */}
      <Modal
        visible={Boolean(previewMedia)}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setPreviewMedia(null)}
      >
        <View style={styles.mediaViewerContainer}>
          <View style={styles.mediaViewerHeader}>
            <TouchableOpacity
              style={styles.mediaViewerCloseBtn}
              onPress={() => setPreviewMedia(null)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.mediaViewerTitle}>
              {previewMedia?.type === 'video' ? 'Video Attachment (Max 10MB)' : 'Photo Lightbox'}
            </Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.mediaViewerContent}>
            {previewMedia?.type === 'image' && previewMedia.url ? (
              <Image source={{ uri: previewMedia.url }} style={styles.mediaViewerImage} resizeMode="contain" />
            ) : previewMedia?.type === 'video' && previewMedia.url ? (
              <View style={styles.mediaViewerVideoBox}>
                <View style={styles.mediaViewerVideoCard}>
                  <Ionicons name="play-circle" size={84} color="#00C48C" />
                  <Text style={styles.mediaViewerVideoText}>PeerBridge Video Player</Text>
                  <Text style={styles.mediaViewerVideoSub} numberOfLines={2}>
                    Cloudinary Stream • Max 10MB Clip
                  </Text>
                  <TouchableOpacity
                    style={{
                      marginTop: 20,
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#00C48C',
                      paddingHorizontal: 22,
                      paddingVertical: 12,
                      borderRadius: 14
                    }}
                    activeOpacity={0.85}
                    onPress={async () => {
                      if (previewMedia?.url) {
                        try {
                          await Linking.openURL(previewMedia.url);
                        } catch (e) {
                          Alert.alert('Cannot Stream', 'Unable to open video stream URL.');
                        }
                      }
                    }}
                  >
                    <Ionicons name="play" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Stream Video Now</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginTop: Platform.OS === 'android' ? 24 : 0
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 10
  },
  headerTitleWrap: {
    flex: 1
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A'
  },
  headerSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1
  },
  refreshBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#00C48C',
    marginRight: 10
  },
  headerUserMeta: {
    flex: 1
  },
  headerUserName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A'
  },
  headerCollege: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1
  },
  contextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0'
  },
  contextBannerText: {
    fontSize: 12,
    color: '#065F46',
    flex: 1
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20
  },
  convListContent: {
    padding: 16
  },
  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10
  },
  convAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  convMeta: {
    marginLeft: 12,
    flex: 1
  },
  convNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  convName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1
  },
  convTime: {
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 6
  },
  convCollege: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },
  convLastMsg: {
    fontSize: 13,
    color: '#334155',
    marginTop: 4
  },
  unreadBadge: {
    backgroundColor: '#00C48C',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8
  },
  unreadCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800'
  },
  chatScroll: {
    flex: 1
  },
  chatContent: {
    padding: 16,
    paddingBottom: 20
  },
  emptyMessagesBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20
  },
  emptyHeroCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  emptyMsgTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 6,
    marginBottom: 4,
    textAlign: 'center'
  },
  emptyMsgSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18
  },
  quickStartersBox: {
    marginTop: 22,
    width: '100%',
    alignItems: 'center'
  },
  quickStartersTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 10
  },
  quickStartersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8
  },
  starterChip: {
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE'
  },
  starterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB'
  },
  messageRow: {
    marginBottom: 10,
    flexDirection: 'row'
  },
  myMessageRow: {
    justifyContent: 'flex-end'
  },
  theirMessageRow: {
    justifyContent: 'flex-start'
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18
  },
  myBubble: {
    backgroundColor: '#00C48C',
    borderBottomRightRadius: 4
  },
  theirBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomLeftRadius: 4
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20
  },
  myMessageText: {
    color: '#FFFFFF',
    fontWeight: '500'
  },
  theirMessageText: {
    color: '#0F172A'
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end'
  },
  myTimeText: {
    color: 'rgba(255, 255, 255, 0.75)'
  },
  theirTimeText: {
    color: '#94A3B8'
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    elevation: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8
  },
  inputInnerBox: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  textInput: {
    fontSize: 14,
    color: '#0F172A',
    maxHeight: 100,
    minHeight: 28,
    paddingVertical: 2
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10
  },
  sendBtnActive: {
    backgroundColor: '#00C48C',
    elevation: 4,
    shadowColor: '#00C48C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6
  },
  sendBtnDisabled: {
    backgroundColor: '#E2E8F0'
  },
  peersStoryContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  peersStoryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    paddingHorizontal: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  peersStoryScroll: {
    paddingHorizontal: 12
  },
  storyItem: {
    alignItems: 'center',
    marginHorizontal: 8,
    width: 60
  },
  storyRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    padding: 2,
    borderWidth: 2,
    borderColor: '#00C48C',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center'
  },
  storyAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E2E8F0'
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  storyName: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center'
  },
  messagesSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginVertical: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  quickPeersBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 18
  },
  quickPeersHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10
  },
  quickPeerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC'
  },
  quickPeerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E2E8F0'
  },
  quickPeerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A'
  },
  quickPeerMeta: {
    fontSize: 11,
    color: '#64748B'
  },
  quickMsgBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00C48C',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4
  },
  quickMsgText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  attachBtn: {
    paddingRight: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  uploadingProgressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#A7F3D0'
  },
  uploadingProgressText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46'
  },
  bubbleMediaWrap: {
    width: 220,
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 4,
    backgroundColor: '#000000'
  },
  bubbleImage: {
    width: '100%',
    height: '100%'
  },
  bubbleMediaZoomHint: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  bubbleVideoWrap: {
    width: 220,
    height: 150,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 4
  },
  bubbleVideoOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  bubblePlayIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 196, 140, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4
  },
  bubbleVideoBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10
  },
  bubbleVideoBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700'
  },
  attachmentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end'
  },
  attachmentSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24
  },
  attachmentSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  attachmentSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A'
  },
  attachmentOptionsRow: {
    flexDirection: 'row',
    gap: 12
  },
  attachmentOptionItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  attachmentIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  attachmentOptionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A'
  },
  attachmentOptionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },
  mediaViewerContainer: {
    flex: 1,
    backgroundColor: '#000000'
  },
  mediaViewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 20,
    paddingBottom: 14,
    backgroundColor: 'rgba(0,0,0,0.6)'
  },
  mediaViewerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  mediaViewerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800'
  },
  mediaViewerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  mediaViewerImage: {
    width: '100%',
    height: '100%'
  },
  mediaViewerVideoBox: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  mediaViewerVideoCard: {
    width: '100%',
    height: 260,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#00C48C'
  },
  mediaViewerVideoText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 14
  },
  mediaViewerVideoSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center'
  }
});
