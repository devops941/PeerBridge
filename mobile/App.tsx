import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Image,
  ActivityIndicator,
  Platform
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './src/services/api';
import { BottomTabBar, TabType } from './src/components/BottomTabBar';
import { HomeScreen } from './src/screens/HomeScreen';
import { SimpleTabScreen } from './src/screens/SimpleTabScreen';
import { ProjectsProfileScreen } from './src/screens/ProjectsProfileScreen';
import { DoubtsFeedScreen } from './src/screens/doubts/DoubtsFeedScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { AuthNavigator } from './src/screens/auth/AuthNavigator';
import { QuickAddModal } from './src/components/QuickAddModal';
import { CreateDoubtModal } from './src/screens/doubts/CreateDoubtModal';
import { StoryUploadModal } from './src/components/stories/StoryUploadModal';

export default function App() {
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [chatPartner, setChatPartner] = useState<any>(null);
  const [chatDoubtContext, setChatDoubtContext] = useState<any>(null);
  const [isInActiveChat, setIsInActiveChat] = useState(false);
  const [selectedPeerProfile, setSelectedPeerProfile] = useState<any>(null);

  // Creation Modals triggered from Center "Add" button
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [showGlobalCreateDoubt, setShowGlobalCreateDoubt] = useState(false);
  const [showGlobalStoryUpload, setShowGlobalStoryUpload] = useState(false);

  // Check login state on initial app load
  useEffect(() => {
    checkAuthSession();
  }, []);

  const checkAuthSession = async () => {
    try {
      const savedToken = await AsyncStorage.getItem('@peerbridge_token');
      const savedRefreshToken = await AsyncStorage.getItem('@peerbridge_refresh_token');
      const savedUser = await AsyncStorage.getItem('@peerbridge_user');

      if (savedToken) {
        setToken(savedToken);
        if (savedRefreshToken) setRefreshToken(savedRefreshToken);
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }

        // Seamlessly pull fresh seeded backend profile
        api.getProfile(savedToken).then((res) => {
          if (res && res.success && res.data) {
            setUser(res.data);
            AsyncStorage.setItem('@peerbridge_user', JSON.stringify(res.data)).catch(() => {});
          }
        }).catch((err) => console.warn('Background profile sync error:', err));
      }
    } catch (e) {
      console.warn('Error reading auth session:', e);
    } finally {
      setTimeout(() => {
        setIsAppLoading(false);
      }, 1200);
    }
  };

  // Called when Google or Email login succeeds
  const handleLoginSuccess = async (newToken: string, newRefreshToken: string, newUser: any) => {
    setToken(newToken);
    setRefreshToken(newRefreshToken);
    setUser(newUser);
    setActiveTab('home');

    try {
      await AsyncStorage.setItem('@peerbridge_token', newToken);
      if (newRefreshToken) {
        await AsyncStorage.setItem('@peerbridge_refresh_token', newRefreshToken);
      }
      await AsyncStorage.setItem('@peerbridge_user', JSON.stringify(newUser));
    } catch (e) {
      console.warn('Error saving auth tokens:', e);
    }

    Alert.alert('🎉 Welcome to PeerBridge!', `Signed in as ${newUser.name || 'Student'}`);
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      const savedRefreshToken = await AsyncStorage.getItem('@peerbridge_refresh_token');
      await api.logout(savedRefreshToken || undefined);
      await AsyncStorage.removeItem('@peerbridge_token');
      await AsyncStorage.removeItem('@peerbridge_refresh_token');
      await AsyncStorage.removeItem('@peerbridge_user');
    } catch (e) {
      console.warn('Error clearing session:', e);
    }
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    setActiveTab('home');
    Alert.alert('👋 Signed Out', 'You have been successfully logged out of PeerBridge.');
  };

  // 1. Splash Screen Loader
  if (isAppLoading) {
    return (
      <View style={styles.splashContainer}>
        <ExpoStatusBar style="dark" />
        <View style={styles.splashContent}>
          <Image
            source={require('./assets/app_icon.png')}
            style={styles.splashLogo}
            resizeMode="contain"
          />
        </View>
        <View style={styles.splashIndicatorWrapper}>
          <ActivityIndicator size="large" color="#00C48C" />
        </View>
      </View>
    );
  }

  // 2. Auth Gate: If NOT logged in, show Auth Navigator (8 modular secure auth screens)
  if (!token) {
    return (
      <>
        <ExpoStatusBar style="dark" />
        <StatusBar barStyle="dark-content" />
        <AuthNavigator onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  // 3. Authenticated App: Home, Explore, Study, Chat, and Academic Profile
  const renderActiveScreen = () => {
    // If viewing a full Peer Profile (Screenshot 4 dedicated page)
    if (selectedPeerProfile) {
      return (
        <ProjectsProfileScreen
          onBack={() => setSelectedPeerProfile(null)}
          token={token}
          currentUser={user}
          peerUser={selectedPeerProfile}
          onLogout={handleLogout}
          onOpenChatWithPeer={(peer) => {
            setSelectedPeerProfile(null);
            setChatPartner(peer);
            setIsInActiveChat(true);
            setActiveTab('chat');
          }}
        />
      );
    }

    switch (activeTab) {
      case 'home':
        return (
          <HomeScreen
            user={user}
            token={token}
            onOpenProfile={() => setActiveTab('profile')}
            onOpenPeerProfile={(peer) => setSelectedPeerProfile(peer)}
            onNavigateTab={(tab) => setActiveTab(tab as any)}
            onOpenChat={(partner, doubtContext) => {
              setChatPartner(partner);
              setChatDoubtContext(doubtContext);
              setIsInActiveChat(true);
              setActiveTab('chat');
            }}
            onLogout={handleLogout}
          />
        );
      case 'doubts':
      case 'explore':
        return (
          <DoubtsFeedScreen
            user={user}
            token={token}
            onOpenProfile={() => setActiveTab('profile')}
            onOpenChat={(partner, doubtContext) => {
              setChatPartner(partner);
              setChatDoubtContext(doubtContext);
              setIsInActiveChat(true);
              setActiveTab('chat');
            }}
          />
        );
      case 'quiz':
        return (
          <SimpleTabScreen
            title="Study & Quizzes"
            subtitle="Practice interactive quizzes, collaborative learning notes, and semester prep."
            iconName="school-outline"
            user={user}
            onOpenProfile={() => setActiveTab('profile')}
            onBack={() => setActiveTab('home')}
          />
        );
      case 'chat':
        return (
          <ChatScreen
            token={token}
            currentUserId={user?._id || user?.id}
            initialPartner={chatPartner}
            doubtContext={chatDoubtContext}
            onActivePartnerChange={(partner) => {
              setIsInActiveChat(Boolean(partner));
            }}
            onBack={() => {
              setIsInActiveChat(false);
              setChatPartner(null);
              setChatDoubtContext(null);
              setActiveTab('home');
            }}
          />
        );
      case 'profile':
        return (
          <ProjectsProfileScreen
            onBack={() => setActiveTab('home')}
            token={token}
            onLogout={handleLogout}
            currentUser={user}
            onUserUpdated={(updatedUser) => {
              setUser(updatedUser);
              AsyncStorage.setItem('@peerbridge_user', JSON.stringify(updatedUser)).catch(() => {});
            }}
          />
        );
      default:
        return (
          <HomeScreen
            user={user}
            token={token}
            onOpenProfile={() => setActiveTab('profile')}
            onOpenPeerProfile={(peer) => setSelectedPeerProfile(peer)}
            onNavigateTab={(tab: any) => setActiveTab(tab)}
            onOpenChat={(partner, doubtContext) => {
              setChatPartner(partner);
              setChatDoubtContext(doubtContext);
              setIsInActiveChat(true);
              setActiveTab('chat');
            }}
            onLogout={handleLogout}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style="dark" />
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Main Active Screen */}
      <View style={styles.screenWrapper}>{renderActiveScreen()}</View>

      {/* 5-Tab Floating Bottom Tab Bar (Hidden in 1-on-1 Direct Chat and Full Peer Profile) */}
      {!isInActiveChat && !selectedPeerProfile && (
        <BottomTabBar
          activeTab={activeTab}
          onTabChange={(tab) => {
            if (tab === 'add') {
              setShowQuickAddModal(true);
            } else {
              setActiveTab(tab);
            }
          }}
          onAddPress={() => setShowQuickAddModal(true)}
        />
      )}

      {/* Center "Add" Quick Action Bottom Sheet */}
      <QuickAddModal
        visible={showQuickAddModal}
        onClose={() => setShowQuickAddModal(false)}
        onAskDoubtPress={() => setShowGlobalCreateDoubt(true)}
        onAddStoryPress={() => setShowGlobalStoryUpload(true)}
      />

      {/* Global Create Doubt Modal */}
      <CreateDoubtModal
        visible={showGlobalCreateDoubt}
        onClose={() => setShowGlobalCreateDoubt(false)}
        token={token}
        onDoubtCreated={() => {
          setShowGlobalCreateDoubt(false);
          setActiveTab('home');
        }}
      />

      {/* Global Story Upload Modal */}
      <StoryUploadModal
        visible={showGlobalStoryUpload}
        token={token}
        currentUser={user}
        onClose={() => setShowGlobalStoryUpload(false)}
        onStoryCreated={() => {
          setShowGlobalStoryUpload(false);
          setActiveTab('home');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0
  },
  screenWrapper: {
    flex: 1
  },
  splashContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  splashContent: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  splashLogo: {
    width: 260,
    height: 68
  },
  splashIndicatorWrapper: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
