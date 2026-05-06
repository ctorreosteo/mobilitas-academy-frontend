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
import { theme, withOpacity } from '../theme';
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
  const stats = [
    { key: 'completed', value: '2', label: 'Corsi completati', icon: 'checkmark-done-circle-outline' as const },
    { key: 'ongoing', value: '6', label: 'In corso', icon: 'play-circle-outline' as const },
    { key: 'progress', value: '53%', label: 'Progresso', icon: 'trending-up-outline' as const },
  ];

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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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
        <View style={styles.dividerWrap}>
          <View style={[styles.dividerLine, styles.dividerLineLeft]} />
          <View style={[styles.dividerLine, styles.dividerLineRight]} />
          <View style={styles.dividerIconWrap}>
            <View style={styles.dividerIconInner}>
              <Ionicons name="person-outline" size={14} color={theme.colors.secondary} />
            </View>
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
          {stats.map((stat) => (
            <View key={stat.key} style={styles.statCard}>
              <View style={styles.statHeader}>
                <Ionicons name={stat.icon} size={15} color={withOpacity(theme.colors.secondary, 0.85)} />
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
              <Text style={styles.statNumber}>{stat.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Impostazioni</Text>
          <View style={styles.sectionCard}>
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemContent}>
                <View style={styles.menuItemIconWrap}>
                  <Ionicons name="person-circle-outline" size={17} color={theme.colors.secondary} />
                </View>
                <Text style={styles.menuItemText}>Modifica Profilo</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} style={styles.menuItemArrow} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemContent}>
                <View style={styles.menuItemIconWrap}>
                  <Ionicons name="notifications-outline" size={17} color={theme.colors.secondary} />
                </View>
                <Text style={styles.menuItemText}>Notifiche</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} style={styles.menuItemArrow} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemContent}>
                <View style={styles.menuItemIconWrap}>
                  <Ionicons name="shield-checkmark-outline" size={17} color={theme.colors.secondary} />
                </View>
                <Text style={styles.menuItemText}>Privacy</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} style={styles.menuItemArrow} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemContent}>
                <View style={styles.menuItemIconWrap}>
                  <Ionicons name="help-buoy-outline" size={17} color={theme.colors.secondary} />
                </View>
                <Text style={styles.menuItemText}>Aiuto e Supporto</Text>
              </View>
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
                    Risolve piccoli problemi e ricarica i contenuti dell'app.
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
              <View style={styles.menuItemContent}>
                <View style={styles.menuItemIconWrap}>
                  <Ionicons name="key-outline" size={17} color={theme.colors.secondary} />
                </View>
                <Text style={styles.menuItemText}>Cambia Password</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} style={styles.menuItemArrow} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemContent}>
                <View style={styles.menuItemIconWrap}>
                  <Ionicons name="download-outline" size={17} color={theme.colors.secondary} />
                </View>
                <Text style={styles.menuItemText}>Esporta Dati</Text>
              </View>
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
    backgroundColor: theme.colors.background.primary,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 42,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.secondary, // Verde secondario per titolo principale
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: withOpacity(theme.colors.text.secondary, 0.76),
  },
  headerBadge: {
    alignSelf: 'flex-start',
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.35),
    backgroundColor: withOpacity(theme.colors.secondary, 0.12),
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
  dividerWrap: {
    position: 'relative',
    height: 28,
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  dividerLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: withOpacity(theme.colors.secondary, 0.24),
  },
  dividerLineLeft: {
    left: 0,
    right: '58%',
  },
  dividerLineRight: {
    left: '58%',
    right: 0,
  },
  dividerIconWrap: {
    alignSelf: 'center',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.32),
    backgroundColor: withOpacity(theme.colors.secondary, 0.08),
  },
  dividerIconInner: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    backgroundColor: withOpacity(theme.colors.black, 0.26),
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.2),
    shadowColor: theme.colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 8,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: withOpacity(theme.colors.secondary, 0.16),
    borderWidth: 3,
    borderColor: withOpacity(theme.colors.secondary, 0.34),
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.secondary,
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
    color: theme.colors.text.secondary,
  },
  userEmail: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: withOpacity(theme.colors.text.secondary, 0.72),
    marginBottom: 8,
  },
  userRole: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.secondary,
    backgroundColor: withOpacity(theme.colors.secondary, 0.12),
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: withOpacity(theme.colors.black, 0.34),
    borderRadius: 18,
    minHeight: 108,
    paddingHorizontal: 12,
    paddingVertical: 14,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.24),
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.26,
    shadowRadius: 14,
    elevation: 7,
  },
  statHeader: {
    alignItems: 'center',
    gap: 8,
  },
  statNumber: {
    fontSize: 38,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.secondary,
    lineHeight: 42,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: withOpacity(theme.colors.text.secondary, 0.76),
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  menuSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.titlePrimary,
    marginBottom: 10,
    marginLeft: 2,
  },
  sectionCard: {
    backgroundColor: withOpacity(theme.colors.black, 0.24),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.15),
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
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
    backgroundColor: withOpacity(theme.colors.text.secondary, 0.1),
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuItemIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.22),
    backgroundColor: withOpacity(theme.colors.secondary, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.text.secondary,
  },
  menuItemArrow: {
    fontSize: 20,
    color: withOpacity(theme.colors.text.secondary, 0.56),
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
    color: withOpacity(theme.colors.text.secondary, 0.62),
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
