import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../components/AppHeader';

interface Props {
  title: string;
  subtitle: string;
  iconName: any;
  user?: any;
  onOpenProfile?: () => void;
  onBack?: () => void;
}

export const SimpleTabScreen: React.FC<Props> = ({
  title,
  subtitle,
  iconName,
  user,
  onOpenProfile,
  onBack
}) => {
  return (
    <View style={styles.container}>
      <AppHeader user={user} onOpenProfile={onOpenProfile} />

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name={iconName} size={40} color="#00C48C" />
        </View>

        <Text style={styles.heading}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.tagPill}>
          <Text style={styles.tagText}>Module Active</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 110
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20
  },
  tagPill: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569'
  }
});
