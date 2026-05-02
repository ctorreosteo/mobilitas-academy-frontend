import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../theme';
import { getStoredUserProfile, StoredUserProfile } from '../services/authTokenStorage';
import { fetchCurrentUser } from '../services/authApi';
import { useAuth } from '../context/AuthContext';

function initialsFromProfile(p: StoredUserProfile | null): string {
  if (p?.nome?.trim() && p?.cognome?.trim()) {
    return `${p.nome.trim()[0] ?? ''}${p.cognome.trim()[0] ?? ''}`.toUpperCase() || '?';
  }
  const email = p?.email?.trim() || '';
  if (!email) return '?';
  const local = email.split('@')[0] || '?';
  const compact = local.replace(/[^a-z0-9]/gi, '');
  if (compact.length >= 2) return compact.slice(0, 2).toUpperCase();
  return local.slice(0, 2).toUpperCase() || '?';
}

const ProfileScreen: React.FC = () => {
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<StoredUserProfile | null>(null);
  const [syncing, setSyncing] = useState(false);

  const loadProfile = useCallback(async () => {
    const local = await getStoredUserProfile();
    setProfile(local);
    setSyncing(true);
    try {
      const fresh = await fetchCurrentUser();
      setProfile(fresh);
    } catch {
      // token assente / rete: resta snapshot locale
    } finally {
      setSyncing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const displayName =
    profile?.nome && profile?.cognome
      ? `${profile.nome} ${profile.cognome}`.trim()
      : profile?.username || profile?.email?.split('@')[0] || 'Utente';
  const displayEmail = profile?.email || '—';
  const roleLine =
    profile?.ruoli?.length && profile.ruoli.length > 0
      ? profile.ruoli.map((r) => r.replace(/^ROLE_/, '')).join(', ')
      : '—';

  const handleLogout = () => {
    Alert.alert('Esci', 'Vuoi terminare la sessione su questo dispositivo?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Esci',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          setProfile(null);
          Alert.alert('Sessione terminata', 'Effettua di nuovo l’accesso dalla schermata di login.');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Profilo</Text>
          <Text style={styles.subtitle}>
            Gestisci il tuo account e le impostazioni
          </Text>
        </View>
        
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {initialsFromProfile(profile)}
              </Text>
            </View>
          </View>
          <View style={styles.profileTitleRow}>
            <Text style={styles.userName}>{displayName}</Text>
            {syncing ? (
              <ActivityIndicator size="small" color={theme.colors.primary} style={styles.syncSpinner} />
            ) : null}
          </View>
          <Text style={styles.userEmail}>{displayEmail}</Text>
          <Text style={styles.userRole}>{roleLine}</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>2</Text>
            <Text style={styles.statLabel}>Corsi Completati</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>6</Text>
            <Text style={styles.statLabel}>In Corso</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>53%</Text>
            <Text style={styles.statLabel}>Progresso</Text>
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Impostazioni</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Modifica Profilo</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Notifiche</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Privacy</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Aiuto e Supporto</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Cambia Password</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Esporta Dati</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
            <Text style={[styles.menuItemText, styles.logoutText]}>Esci</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary, // Blu scuro dal tema
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.text.primary, // Verde dal tema
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.text.secondary, // Bianco dal tema
    opacity: 0.9,
  },
  profileCard: {
    backgroundColor: theme.colors.background.white,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.background.white,
  },
  profileTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 4,
  },
  syncSpinner: {
    marginLeft: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.primary,
  },
  userEmail: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.primary,
    opacity: 0.7,
    marginBottom: 8,
  },
  userRole: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background.secondary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: theme.colors.text.primary, // Verde
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.primary, // Blu
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.primary, // Blu
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  menuItem: {
    backgroundColor: theme.colors.background.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.primary,
  },
  menuItemArrow: {
    fontSize: 20,
    color: theme.colors.primary,
    opacity: 0.5,
  },
  logoutItem: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  logoutText: {
    color: theme.colors.error,
  },
});

export default ProfileScreen;
