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
import { useQueryClient } from '@tanstack/react-query';
// @ts-ignore - @expo/vector-icons è parte di Expo SDK
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { cleanAndRefreshCaches } from '../services/appCacheService';
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
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<StoredUserProfile | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [cleaning, setCleaning] = useState(false);

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

  const handleCleanAndRefresh = () => {
    Alert.alert(
      'Pulisci cache e aggiorna',
      'Vengono svuotate la cache dei dati (es. corsi), il token YouTube salvato sul dispositivo e la cache delle durate video. La sessione Mobilitas resta attiva.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Pulisci',
          onPress: async () => {
            setCleaning(true);
            try {
              await cleanAndRefreshCaches(queryClient);
              await loadProfile();
              Alert.alert('Fatto', 'Cache pulita. Riapri una sezione per ricaricare i contenuti.');
            } catch (e) {
              Alert.alert('Errore', e instanceof Error ? e.message : 'Operazione non riuscita');
            } finally {
              setCleaning(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Vuoi uscire e terminare la sessione su questo dispositivo?', [
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
          <View style={styles.headerBadge}>
            <Ionicons name="sparkles-outline" size={14} color={theme.colors.text.primary} />
            <Text style={styles.headerBadgeText}>Area personale</Text>
          </View>
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
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>2</Text>
            <Text style={styles.statLabel}>Corsi Completati</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>6</Text>
            <Text style={styles.statLabel}>In Corso</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>53%</Text>
            <Text style={styles.statLabel}>Progresso</Text>
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Impostazioni</Text>
          <View style={styles.sectionCard}>
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuItemText}>Modifica Profilo</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} style={styles.menuItemArrow} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuItemText}>Notifiche</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} style={styles.menuItemArrow} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuItemText}>Privacy</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} style={styles.menuItemArrow} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuItemText}>Aiuto e Supporto</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} style={styles.menuItemArrow} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Sessione e dati</Text>
          <View style={styles.sectionCard}>
            <TouchableOpacity
              style={[styles.menuItem, styles.actionRow]}
              onPress={handleCleanAndRefresh}
              disabled={cleaning}
              activeOpacity={0.75}
            >
              <View style={styles.actionRowLeft}>
                <Ionicons name="refresh-circle-outline" size={22} color={theme.colors.accent} />
                <View style={styles.actionTexts}>
                  <Text style={styles.menuItemText}>Pulisci cache e aggiorna</Text>
                  <Text style={styles.actionSubtitle}>
                    Cache app, token YouTube locale, durate HLS in memoria
                  </Text>
                </View>
              </View>
              {cleaning ? (
                <ActivityIndicator size="small" color={theme.colors.accent} />
              ) : (
                <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} style={styles.menuItemArrow} />
              )}
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={[styles.menuItem, styles.logoutItem, styles.actionRow]}
              onPress={handleLogout}
              activeOpacity={0.75}
            >
              <View style={styles.actionRowLeft}>
                <Ionicons name="log-out-outline" size={22} color={theme.colors.error} />
                <View style={styles.actionTexts}>
                  <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
                  <Text style={[styles.actionSubtitle, styles.logoutSubtitle]}>
                    Disconnetti e torna alla schermata di accesso
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.error} style={{ opacity: 0.5 }} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.sectionCard}>
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuItemText}>Cambia Password</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} style={styles.menuItemArrow} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuItemText}>Esporta Dati</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} style={styles.menuItemArrow} />
            </TouchableOpacity>
          </View>
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
    paddingBottom: 18,
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
  headerBadge: {
    alignSelf: 'flex-start',
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(114,250,147,0.35)',
    backgroundColor: 'rgba(114,250,147,0.12)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.text.primary,
    letterSpacing: 0.2,
  },
  profileCard: {
    backgroundColor: theme.colors.background.secondary,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,37,82,0.08)',
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
    borderWidth: 3,
    borderColor: 'rgba(114,250,147,0.22)',
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
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,37,82,0.07)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.primary, // Blu
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.primary, // Blu
    opacity: 0.72,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  menuSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.text.primary,
    marginBottom: 10,
    marginLeft: 2,
  },
  sectionCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,37,82,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  menuItem: {
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuDivider: {
    marginHorizontal: 18,
    height: 1,
    backgroundColor: 'rgba(0,37,82,0.08)',
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
  actionRow: {
    alignItems: 'flex-start',
    paddingVertical: 14,
  },
  actionRowLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  actionTexts: {
    flex: 1,
  },
  actionSubtitle: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.primary,
    opacity: 0.55,
    marginTop: 4,
    lineHeight: 16,
  },
  logoutSubtitle: {
    color: theme.colors.error,
    opacity: 0.75,
  },
  logoutItem: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  logoutText: {
    color: theme.colors.error,
    fontWeight: '600',
  },
});

export default ProfileScreen;
