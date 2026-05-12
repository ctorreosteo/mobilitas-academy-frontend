import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
// @ts-ignore - @expo/vector-icons è parte di Expo SDK
import { Ionicons } from '@expo/vector-icons';
import { theme, withOpacity } from '../theme';
import { cleanAndRefreshCaches } from '../services/appCacheService';
import { getStoredUserProfile, StoredUserProfile } from '../services/authTokenStorage';
import { fetchCurrentUser } from '../services/authApi';
import { useAuth } from '../context/AuthContext';
import { fetchOsteopataRiferimentoPaziente } from '../services/pazientiService';
import {
  fetchOsteopatiPerStudio,
  fetchStudiAttivi,
} from '../services/studioVisitsService';
import StudioWhatsAppSupportButton from '../components/StudioWhatsAppSupportButton';

const DELETE_ACCOUNT_WHATSAPP_PREFILL =
  'Buongiorno, vorrei richiedere la cancellazione definitiva del mio account Mobilitas Academy.';

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
  const [confirmLogoutVisible, setConfirmLogoutVisible] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [confirmCleanVisible, setConfirmCleanVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewStudioListVisible, setReviewStudioListVisible] = useState(false);
  const [selectedReviewStudioId, setSelectedReviewStudioId] = useState<number | null>(null);
  const [reviewActionError, setReviewActionError] = useState<string | null>(null);
  const [openingReviewLink, setOpeningReviewLink] = useState(false);
  const [inactiveFeatureName, setInactiveFeatureName] = useState<string | null>(null);
  const [cleanResultModal, setCleanResultModal] = useState<{
    title: string;
    message: string;
    isError: boolean;
  } | null>(null);
  const [deleteAccountModalVisible, setDeleteAccountModalVisible] = useState(false);

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

  const pazienteId = profile?.pazienteId ?? null;
  const studiReviewQuery = useQuery({
    queryKey: ['profile-review-studi'],
    queryFn: fetchStudiAttivi,
    staleTime: 60_000,
    enabled: reviewModalVisible,
  });
  const osteopataRiferimentoQuery = useQuery({
    queryKey: ['profile-review-osteopata-riferimento', pazienteId],
    queryFn: () => fetchOsteopataRiferimentoPaziente(pazienteId!),
    staleTime: 60_000,
    enabled: reviewModalVisible && typeof pazienteId === 'number' && pazienteId > 0,
  });
  const reviewStudi = studiReviewQuery.data ?? [];
  const selectedReviewStudio =
    reviewStudi.find((studio) => studio.id === selectedReviewStudioId) ?? null;

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
    setConfirmCleanVisible(true);
  };

  const confirmCleanAndRefresh = async () => {
    setCleaning(true);
    try {
      await cleanAndRefreshCaches(queryClient);
      await loadProfile();
      setConfirmCleanVisible(false);
      setCleanResultModal({
        title: 'Cache pulita',
        message: 'Riapri una sezione per ricaricare i contenuti.',
        isError: false,
      });
    } catch (e) {
      setConfirmCleanVisible(false);
      setCleanResultModal({
        title: 'Errore',
        message: e instanceof Error ? e.message : 'Operazione non riuscita',
        isError: true,
      });
    } finally {
      setCleaning(false);
    }
  };

  const handleLogout = () => {
    setConfirmLogoutVisible(true);
  };

  const openReviewModal = () => {
    setReviewActionError(null);
    setSelectedReviewStudioId(null);
    setReviewStudioListVisible(false);
    setReviewModalVisible(true);
  };

  useFocusEffect(
    useCallback(() => {
      return () => {
        setReviewModalVisible(false);
        setReviewStudioListVisible(false);
      };
    }, [])
  );

  React.useEffect(() => {
    if (!reviewModalVisible || selectedReviewStudioId != null) return;
    if (reviewStudi.length === 0) return;
    const refOsteopataId = osteopataRiferimentoQuery.data?.id;
    if (typeof refOsteopataId !== 'number' || refOsteopataId <= 0) {
      setSelectedReviewStudioId(reviewStudi[0]?.id ?? null);
      return;
    }

    let cancelled = false;
    (async () => {
      for (const studio of reviewStudi) {
        try {
          const osteopatiStudio = await fetchOsteopatiPerStudio(studio.id);
          if (cancelled) return;
          if (osteopatiStudio.some((o) => o.id === refOsteopataId)) {
            setSelectedReviewStudioId(studio.id);
            return;
          }
        } catch {
          // continua con gli altri studi disponibili
        }
      }
      if (!cancelled) {
        setSelectedReviewStudioId(reviewStudi[0]?.id ?? null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reviewModalVisible, selectedReviewStudioId, reviewStudi, osteopataRiferimentoQuery.data]);

  const handleOpenReviewLink = async () => {
    if (selectedReviewStudioId == null || !selectedReviewStudio) return;
    setOpeningReviewLink(true);
    setReviewActionError(null);
    try {
      const reviewLink = selectedReviewStudio.googleReviewLink?.trim() ?? '';
      if (!reviewLink) {
        throw new Error('Recensione non disponibile per questo studio');
      }
      if (!/^https?:\/\//i.test(reviewLink)) {
        throw new Error('Link recensione non valido');
      }
      const canOpen = await Linking.canOpenURL(reviewLink);
      if (!canOpen) {
        throw new Error('Impossibile aprire il link recensione');
      }
      await Linking.openURL(reviewLink);
      setReviewModalVisible(false);
    } catch (e) {
      setReviewActionError(e instanceof Error ? e.message : 'Operazione non riuscita');
    } finally {
      setOpeningReviewLink(false);
    }
  };

  const confirmLogout = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      setProfile(null);
      setConfirmLogoutVisible(false);
    } finally {
      setIsSigningOut(false);
    }
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
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setInactiveFeatureName('Modifica Profilo')}
              activeOpacity={0.75}
            >
              <View style={styles.menuItemContent}>
                <View style={styles.menuItemIconWrap}>
                  <Ionicons name="person-circle-outline" size={17} color={theme.colors.secondary} />
                </View>
                <Text style={styles.menuItemText}>Modifica Profilo</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} style={styles.menuItemArrow} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setInactiveFeatureName('Notifiche')}
              activeOpacity={0.75}
            >
              <View style={styles.menuItemContent}>
                <View style={styles.menuItemIconWrap}>
                  <Ionicons name="notifications-outline" size={17} color={theme.colors.secondary} />
                </View>
                <Text style={styles.menuItemText}>Notifiche</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} style={styles.menuItemArrow} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setInactiveFeatureName('Privacy')}
              activeOpacity={0.75}
            >
              <View style={styles.menuItemContent}>
                <View style={styles.menuItemIconWrap}>
                  <Ionicons name="shield-checkmark-outline" size={17} color={theme.colors.secondary} />
                </View>
                <Text style={styles.menuItemText}>Privacy</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} style={styles.menuItemArrow} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setInactiveFeatureName('Aiuto e Supporto')}
              activeOpacity={0.75}
            >
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
          <Text style={styles.sectionTitle}>Recensioni</Text>
          <View style={styles.sectionCard}>
            <TouchableOpacity
              style={[styles.menuItem, styles.actionRow]}
              onPress={openReviewModal}
              activeOpacity={0.75}
            >
              <View style={styles.actionRowLeft}>
                <Ionicons name="star-outline" size={22} color={theme.colors.accent} />
                <View style={styles.actionTexts}>
                  <Text style={styles.menuItemText}>Scrivi una recensione</Text>
                  <Text style={styles.actionSubtitle}>
                    Lascia una recensione Google per lo studio che preferisci.
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} style={styles.menuItemArrow} />
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

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={[styles.menuItem, styles.actionRow]}
              onPress={() => setDeleteAccountModalVisible(true)}
              activeOpacity={0.75}
            >
              <View style={styles.actionRowLeft}>
                <Ionicons name="trash-outline" size={22} color={theme.colors.error} />
                <View style={styles.actionTexts}>
                  <Text style={[styles.menuItemText, styles.logoutText]}>Elimina account</Text>
                  <Text style={[styles.actionSubtitle, styles.logoutSubtitle]}>
                    Richiedi la cancellazione definitiva tramite la segreteria.
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
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setInactiveFeatureName('Cambia Password')}
              activeOpacity={0.75}
            >
              <View style={styles.menuItemContent}>
                <View style={styles.menuItemIconWrap}>
                  <Ionicons name="key-outline" size={17} color={theme.colors.secondary} />
                </View>
                <Text style={styles.menuItemText}>Cambia Password</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} style={styles.menuItemArrow} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setInactiveFeatureName('Esporta Dati')}
              activeOpacity={0.75}
            >
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

      <Modal
        visible={reviewModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!openingReviewLink) setReviewModalVisible(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconWrap, styles.modalIconWrapAccent]}>
              <Ionicons name="star-outline" size={20} color={theme.colors.accent} />
            </View>
            <Text style={styles.modalTitle}>Scrivi una recensione</Text>
            <Text style={styles.modalText}>
              Seleziona lo studio per cui vuoi lasciare una recensione Google.
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.reviewSelectInput,
                pressed && styles.modalBtnPressed,
                (studiReviewQuery.isLoading || reviewStudi.length === 0) && styles.reviewSelectInputDisabled,
              ]}
              onPress={() => setReviewStudioListVisible((v) => !v)}
              disabled={studiReviewQuery.isLoading || reviewStudi.length === 0}
            >
              <Text style={selectedReviewStudio ? styles.reviewSelectValue : styles.reviewSelectPlaceholder}>
                {studiReviewQuery.isLoading
                  ? 'Caricamento studi...'
                  : selectedReviewStudio?.nome ?? 'Seleziona studio'}
              </Text>
              <Ionicons
                name={reviewStudioListVisible ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={withOpacity(theme.colors.text.secondary, 0.7)}
              />
            </Pressable>

            {reviewStudioListVisible ? (
              <View style={styles.reviewOptionsCard}>
                {reviewStudi.map((studio) => {
                  const isSelected = studio.id === selectedReviewStudioId;
                  return (
                    <Pressable
                      key={studio.id}
                      style={({ pressed }) => [
                        styles.reviewOptionRow,
                        isSelected && styles.reviewOptionRowSelected,
                        pressed && styles.modalBtnPressed,
                      ]}
                      onPress={() => {
                        setSelectedReviewStudioId(studio.id);
                        setReviewStudioListVisible(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.reviewOptionText,
                          isSelected && styles.reviewOptionTextSelected,
                        ]}
                      >
                        {studio.nome}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {reviewActionError ? <Text style={styles.reviewErrorText}>{reviewActionError}</Text> : null}

            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalSecondaryBtn, pressed && styles.modalBtnPressed]}
                onPress={() => setReviewModalVisible(false)}
                disabled={openingReviewLink}
              >
                <Text style={styles.modalSecondaryBtnText}>Annulla</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalPrimaryBtn,
                  pressed && styles.modalBtnPressed,
                  (openingReviewLink || selectedReviewStudioId == null) && styles.modalPrimaryBtnDisabled,
                ]}
                onPress={handleOpenReviewLink}
                disabled={openingReviewLink || selectedReviewStudioId == null}
              >
                {openingReviewLink ? (
                  <ActivityIndicator size="small" color={theme.colors.background.primary} />
                ) : (
                  <Text style={styles.modalPrimaryBtnText}>Scrivi recensione</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={confirmCleanVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!cleaning) setConfirmCleanVisible(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconWrap, styles.modalIconWrapAccent]}>
              <Ionicons name="refresh-circle-outline" size={20} color={theme.colors.accent} />
            </View>
            <Text style={styles.modalTitle}>Pulisci cache e aggiorna</Text>
            <Text style={styles.modalText}>
              Verranno svuotate la cache dei dati, il token YouTube locale e la cache delle durate video.
              La sessione Mobilitas resta attiva.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalSecondaryBtn, pressed && styles.modalBtnPressed]}
                onPress={() => setConfirmCleanVisible(false)}
                disabled={cleaning}
              >
                <Text style={styles.modalSecondaryBtnText}>Annulla</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalPrimaryBtn, pressed && styles.modalBtnPressed]}
                onPress={confirmCleanAndRefresh}
                disabled={cleaning}
              >
                {cleaning ? (
                  <ActivityIndicator size="small" color={theme.colors.background.primary} />
                ) : (
                  <Text style={styles.modalPrimaryBtnText}>Pulisci</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={confirmLogoutVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isSigningOut) setConfirmLogoutVisible(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
            </View>
            <Text style={styles.modalTitle}>Conferma logout</Text>
            <Text style={styles.modalText}>
              Vuoi uscire e terminare la sessione su questo dispositivo?
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalSecondaryBtn, pressed && styles.modalBtnPressed]}
                onPress={() => setConfirmLogoutVisible(false)}
                disabled={isSigningOut}
              >
                <Text style={styles.modalSecondaryBtnText}>Annulla</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalDangerBtn, pressed && styles.modalBtnPressed]}
                onPress={confirmLogout}
                disabled={isSigningOut}
              >
                {isSigningOut ? (
                  <ActivityIndicator size="small" color={theme.colors.background.primary} />
                ) : (
                  <Text style={styles.modalDangerBtnText}>Esci</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(cleanResultModal)}
        transparent
        animationType="fade"
        onRequestClose={() => setCleanResultModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View
              style={[
                styles.modalIconWrap,
                cleanResultModal?.isError ? styles.modalIconWrapError : styles.modalIconWrapSuccess,
              ]}
            >
              <Ionicons
                name={cleanResultModal?.isError ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                size={20}
                color={cleanResultModal?.isError ? theme.colors.error : theme.colors.secondary}
              />
            </View>
            <Text style={styles.modalTitle}>{cleanResultModal?.title}</Text>
            <Text style={styles.modalText}>{cleanResultModal?.message}</Text>
            <Pressable
              style={({ pressed }) => [styles.modalPrimaryBtn, pressed && styles.modalBtnPressed]}
              onPress={() => setCleanResultModal(null)}
            >
              <Text style={styles.modalPrimaryBtnText}>Chiudi</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={deleteAccountModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteAccountModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
            </View>
            <Text style={styles.modalTitle}>Eliminazione definitiva account</Text>
            <Text style={styles.modalText}>
              {`Per motivi di sicurezza e privacy, la cancellazione definitiva dell'account non può essere completata dall'app. Contatta la segreteria su WhatsApp: ti guideranno nella procedura.`}
            </Text>
            <View style={styles.deleteAccountModalFooter}>
              <StudioWhatsAppSupportButton
                prefilledMessage={DELETE_ACCOUNT_WHATSAPP_PREFILL}
                style={styles.deleteAccountWhatsappBtn}
              />
              <Pressable
                style={({ pressed }) => [styles.modalDismissFullBtn, pressed && styles.modalBtnPressed]}
                onPress={() => setDeleteAccountModalVisible(false)}
              >
                <Text style={styles.modalSecondaryBtnText}>Chiudi</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(inactiveFeatureName)}
        transparent
        animationType="fade"
        onRequestClose={() => setInactiveFeatureName(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconWrap, styles.modalIconWrapAccent]}>
              <Ionicons name="information-circle-outline" size={20} color={theme.colors.accent} />
            </View>
            <Text style={styles.modalTitle}>{inactiveFeatureName} non disponibile</Text>
            <Text style={styles.modalText}>
              Al momento questa funzionalita non e attiva in app. Per assistenza, contatta la
              segreteria.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.modalPrimaryBtn, pressed && styles.modalBtnPressed]}
              onPress={() => setInactiveFeatureName(null)}
            >
              <Text style={styles.modalPrimaryBtnText}>Ho capito</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 36,
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
    marginBottom: 24,
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
    backgroundColor: withOpacity(theme.colors.primary, 0.45),
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.25),
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
    backgroundColor: withOpacity(theme.colors.primary, 0.45),
    borderRadius: 18,
    minHeight: 108,
    paddingHorizontal: 12,
    paddingVertical: 14,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.25),
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
    backgroundColor: withOpacity(theme.colors.primary, 0.45),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.25),
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: withOpacity(theme.colors.black, 0.45),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.28),
    backgroundColor: theme.colors.background.primary,
    padding: 18,
    gap: 12,
  },
  modalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.error, 0.35),
    backgroundColor: withOpacity(theme.colors.error, 0.12),
  },
  modalIconWrapAccent: {
    borderColor: withOpacity(theme.colors.accent, 0.35),
    backgroundColor: withOpacity(theme.colors.accent, 0.12),
  },
  modalIconWrapSuccess: {
    borderColor: withOpacity(theme.colors.secondary, 0.35),
    backgroundColor: withOpacity(theme.colors.secondary, 0.12),
  },
  modalIconWrapError: {
    borderColor: withOpacity(theme.colors.error, 0.35),
    backgroundColor: withOpacity(theme.colors.error, 0.12),
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.secondary,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 21,
    color: withOpacity(theme.colors.text.secondary, 0.92),
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  modalActions: {
    marginTop: 4,
    flexDirection: 'row',
    gap: 10,
  },
  modalSecondaryBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.32),
    backgroundColor: withOpacity(theme.colors.secondary, 0.1),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 12,
  },
  modalSecondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.secondary,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    textAlign: 'center',
  },
  modalDangerBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.error, 0.45),
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 12,
  },
  modalDangerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.background.primary,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    textAlign: 'center',
  },
  modalPrimaryBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.accent, 0.45),
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 12,
  },
  modalPrimaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.background.primary,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    textAlign: 'center',
  },
  modalPrimaryBtnDisabled: {
    opacity: 0.5,
  },
  reviewSelectInput: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.3),
    backgroundColor: withOpacity(theme.colors.primary, 0.42),
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  reviewSelectInputDisabled: {
    opacity: 0.6,
  },
  reviewSelectValue: {
    flex: 1,
    color: theme.colors.text.secondary,
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  reviewSelectPlaceholder: {
    flex: 1,
    color: withOpacity(theme.colors.text.secondary, 0.62),
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  reviewErrorText: {
    fontSize: 13,
    color: theme.colors.error,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    lineHeight: 18,
  },
  reviewOptionsCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.2),
    backgroundColor: withOpacity(theme.colors.primary, 0.35),
    maxHeight: 220,
    overflow: 'hidden',
  },
  reviewOptionRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: withOpacity(theme.colors.text.secondary, 0.1),
  },
  reviewOptionRowSelected: {
    backgroundColor: withOpacity(theme.colors.secondary, 0.14),
  },
  reviewOptionText: {
    color: theme.colors.text.secondary,
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  reviewOptionTextSelected: {
    color: theme.colors.secondary,
    fontWeight: '600',
  },
  modalBtnPressed: {
    opacity: 0.9,
  },
  deleteAccountModalFooter: {
    marginTop: 4,
    gap: 10,
    width: '100%',
  },
  deleteAccountWhatsappBtn: {
    width: '100%',
  },
  modalDismissFullBtn: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.32),
    backgroundColor: withOpacity(theme.colors.secondary, 0.1),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 12,
  },
});

export default ProfileScreen;
