import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export type TabType = 'home' | 'doubts' | 'add' | 'chat' | 'profile' | 'explore' | 'quiz';

interface Props {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onAddPress?: () => void;
}

export const BottomTabBar: React.FC<Props> = ({ activeTab, onTabChange, onAddPress }) => {
  const tabs = [
    { key: 'home' as TabType, icon: 'home-outline', activeIcon: 'home', label: 'Home' },
    { key: 'doubts' as TabType, icon: 'help-buoy-outline', activeIcon: 'help-buoy', label: 'Doubts' },
    { key: 'add' as TabType, icon: 'add', activeIcon: 'add', label: 'Add' },
    { key: 'chat' as TabType, icon: 'chatbubbles-outline', activeIcon: 'chatbubbles', label: 'Chat' },
    { key: 'profile' as TabType, icon: 'person-outline', activeIcon: 'person', label: 'Profile' }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const isCenter = tab.key === 'add' || tab.key === 'quiz';

          if (isCenter) {
            return (
              <TouchableOpacity
                key={tab.key}
                activeOpacity={0.85}
                onPress={() => {
                  if (onAddPress) {
                    onAddPress();
                  } else {
                    onTabChange(tab.key);
                  }
                }}
                style={styles.centerButtonWrapper}
              >
                <View style={[styles.centerButton, isActive && styles.centerButtonActive]}>
                  <Ionicons name="add" size={30} color="#FFFFFF" />
                </View>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive, { marginTop: 4 }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.7}
              onPress={() => onTabChange(tab.key)}
              style={styles.tabItem}
            >
              <Ionicons
                name={(isActive ? tab.activeIcon : tab.icon) as any}
                size={22}
                color={isActive ? '#00C48C' : '#94A3B8'}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    zIndex: 999
  },
  bar: {
    flexDirection: 'row',
    height: 68,
    backgroundColor: '#FFFFFF',
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 6
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    minWidth: 48
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2
  },
  tabLabelActive: {
    color: '#00C48C',
    fontWeight: '800'
  },
  centerButtonWrapper: {
    top: -14,
    alignItems: 'center'
  },
  centerButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#00C48C',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00C48C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF'
  },
  centerButtonActive: {
    backgroundColor: '#00A374',
    transform: [{ scale: 1.05 }]
  }
});
