import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  // Animazioni principali
  const outerCircleScale = useRef(new Animated.Value(0.8)).current;
  const outerCircleOpacity = useRef(new Animated.Value(0.3)).current;
  const innerCircleScale = useRef(new Animated.Value(0)).current;
  const innerCircleOpacity = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current; // Opacità separata per il logo
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  
  // Puntini verdi
  const dot1Opacity = useRef(new Animated.Value(0)).current;
  const dot1Scale = useRef(new Animated.Value(0)).current;
  const dot2Opacity = useRef(new Animated.Value(0)).current;
  const dot2Scale = useRef(new Animated.Value(0)).current;
  const dot3Opacity = useRef(new Animated.Value(0)).current;
  const dot3Scale = useRef(new Animated.Value(0)).current;
  
  // Puntini di caricamento in basso
  const loadingDot1 = useRef(new Animated.Value(0.3)).current;
  const loadingDot2 = useRef(new Animated.Value(0.3)).current;
  const loadingDot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Sequenza di animazioni
    const animations = Animated.sequence([
      // 1. Cerchio esterno appare e si espande
      Animated.parallel([
        Animated.timing(outerCircleScale, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false, // false per evitare conflitti con animazioni successive
        }),
        Animated.timing(outerCircleOpacity, {
          toValue: 0.6,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false, // false per opacità per compatibilità con immagini/testo
        }),
      ]),
      
      // 2. Cerchio interno appare con effetto pop
      Animated.parallel([
        Animated.spring(innerCircleScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: false, // false per evitare conflitti
        }),
        Animated.timing(innerCircleOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false, // Cambiato a false per permettere l'animazione dell'opacità con immagini
        }),
      ]),
      // 2b. Logo appare dopo il cerchio
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      
      // 3. Puntini verdi appaiono sequenzialmente
      Animated.stagger(150, [
        Animated.parallel([
          Animated.spring(dot1Scale, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: false,
          }),
          Animated.timing(dot1Opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
          }),
        ]),
        Animated.parallel([
          Animated.spring(dot2Scale, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: false,
          }),
          Animated.timing(dot2Opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
          }),
        ]),
        Animated.parallel([
          Animated.spring(dot3Scale, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: false,
          }),
          Animated.timing(dot3Opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
          }),
        ]),
      ]),
      
      // 4. Testo appare
      Animated.delay(200),
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]);

    animations.start((finished) => {
      if (!finished) {
        // Se l'animazione non completa, forza la visibilità
        console.log('⚠️ Animazione non completata, forzo visibilità elementi');
        innerCircleOpacity.setValue(1);
        logoOpacity.setValue(1);
        subtitleOpacity.setValue(1);
      }
    });

    // Fallback: dopo 1.5 secondi, forza la visibilità se ancora non visibili
    const fallbackTimer = setTimeout(() => {
      console.log('⚠️ Fallback: forzo visibilità elementi');
      innerCircleOpacity.setValue(1);
      logoOpacity.setValue(1);
      subtitleOpacity.setValue(1);
    }, 1500);

    // Animazione pulsante per il cerchio esterno
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(outerCircleScale, {
          toValue: 1.1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(outerCircleScale, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );
    pulseAnimation.start();

    // Animazione pulsante per i puntini verdi
    const createDotPulse = (dotOpacity: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dotOpacity, {
            toValue: 0.4,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(dotOpacity, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      );
    };

    const dotPulse1 = createDotPulse(dot1Opacity, 0);
    const dotPulse2 = createDotPulse(dot2Opacity, 300);
    const dotPulse3 = createDotPulse(dot3Opacity, 600);
    
    dotPulse1.start();
    dotPulse2.start();
    dotPulse3.start();

    // Animazione per i puntini di caricamento in basso
    const loadingAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(loadingDot1, {
            toValue: 1,
            duration: 400,
            useNativeDriver: false,
          }),
          Animated.timing(loadingDot2, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: false,
          }),
          Animated.timing(loadingDot3, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: false,
          }),
        ]),
        Animated.parallel([
          Animated.timing(loadingDot1, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: false,
          }),
          Animated.timing(loadingDot2, {
            toValue: 1,
            duration: 400,
            useNativeDriver: false,
          }),
          Animated.timing(loadingDot3, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: false,
          }),
        ]),
        Animated.parallel([
          Animated.timing(loadingDot1, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: false,
          }),
          Animated.timing(loadingDot2, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: false,
          }),
          Animated.timing(loadingDot3, {
            toValue: 1,
            duration: 400,
            useNativeDriver: false,
          }),
        ]),
      ])
    );
    loadingAnimation.start();

    // Dopo 2 secondi, chiama onFinish
    const timer = setTimeout(() => {
      // Animazione di fade out
      Animated.parallel([
        Animated.timing(innerCircleOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(logoOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(outerCircleOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(subtitleOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(dot1Opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(dot2Opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(dot3Opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start(() => {
        onFinish();
      });
    }, 2000);

    return () => {
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
      animations.stop();
      pulseAnimation.stop();
      dotPulse1.stop();
      dotPulse2.stop();
      dotPulse3.stop();
      loadingAnimation.stop();
    };
  }, []);

  return (
    <LinearGradient
      colors={['#0A3D62', '#1E88E5', '#42A5F5']}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Cerchio esterno */}
        <Animated.View
          style={[
            styles.outerCircle,
            {
              transform: [{ scale: outerCircleScale }],
              opacity: outerCircleOpacity,
            },
          ]}
        />

        {/* Cerchio interno */}
        <Animated.View
          style={[
            styles.innerCircle,
            {
              transform: [{ scale: innerCircleScale }],
              opacity: innerCircleOpacity,
            },
          ]}
        >
          <Animated.Image
            source={require('../../assets/logo_verde.png')}
            style={[
              styles.logoImage,
              {
                opacity: logoOpacity,
              },
            ]}
            resizeMode="contain"
            onError={(error: any) => {
              console.error('❌ Errore caricamento logo:', error);
            }}
            onLoad={() => {
              console.log('✅ Logo caricato con successo');
            }}
          />
        </Animated.View>

        {/* Puntini verdi attorno ai cerchi */}
        <Animated.View
          style={[
            styles.greenDot,
            styles.dot1,
            {
              opacity: dot1Opacity,
              transform: [{ scale: dot1Scale }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.greenDot,
            styles.dot2,
            {
              opacity: dot2Opacity,
              transform: [{ scale: dot2Scale }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.greenDot,
            styles.dot3,
            {
              opacity: dot3Opacity,
              transform: [{ scale: dot3Scale }],
            },
          ]}
        />

        {/* Testo sotto il cerchio */}
        <Animated.View
          style={[
            styles.subtitleContainer,
            {
              opacity: subtitleOpacity,
            },
          ]}
        >
          <Text style={styles.subtitleText}>
            Lo Studio Osteopatico più importante di Torino
          </Text>
        </Animated.View>

        {/* Puntini di caricamento in basso */}
        <View style={styles.loadingDotsContainer}>
          <Animated.View
            style={[
              styles.loadingDot,
              {
                opacity: loadingDot1,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.loadingDot,
              {
                opacity: loadingDot2,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.loadingDot,
              {
                opacity: loadingDot3,
              },
            ]}
          />
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerCircle: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  innerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoImage: {
    width: 140,
    height: 140,
  },
  greenDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#72fa93',
    shadowColor: '#72fa93',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  dot1: {
    left: -60,
    top: 40,
  },
  dot2: {
    right: -60,
    top: 40,
  },
  dot3: {
    top: -60,
  },
  subtitleContainer: {
    marginTop: 130, // Metà del cerchio (100px) + spazio (30px) per posizionarlo sotto
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  subtitleText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 28,
    letterSpacing: 0.5,
  },
  loadingDotsContainer: {
    flexDirection: 'row',
    marginTop: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#72fa93',
    shadowColor: '#72fa93',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default SplashScreen;
