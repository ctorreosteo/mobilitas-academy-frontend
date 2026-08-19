import React, { useMemo } from 'react';
import { PixelRatio, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
};

type Profile = {
  /** larghezze delle vertebre, dalla cervicale alla lombare, in frazioni del lato dell'icona */
  vertebrae: number[];
  /** segmenti di sacro e coccige */
  tail: { width: number; height: number }[];
  vertebraHeight: number;
  /** ampiezza della curva a S della colonna */
  amplitude: number;
  gap: number;
};

const FULL: Profile = {
  vertebrae: [0.28, 0.34, 0.4, 0.46, 0.5, 0.46],
  tail: [
    { width: 0.26, height: 0.07 },
    { width: 0.15, height: 0.055 },
  ],
  vertebraHeight: 0.082,
  amplitude: 0.06,
  gap: 0.038,
};

// Sotto i 18px le vertebre sottili collassano in un blocco unico: servono meno
// segmenti, più spessi e distanziati.
const COMPACT: Profile = {
  vertebrae: [0.3, 0.4, 0.5, 0.44],
  tail: [{ width: 0.22, height: 0.1 }],
  vertebraHeight: 0.13,
  amplitude: 0.055,
  gap: 0.06,
};

const COMPACT_BREAKPOINT = 18;

const SpineIcon: React.FC<Props> = ({ size = 26, color, style }) => {
  const segments = useMemo(() => {
    const profile = size < COMPACT_BREAKPOINT ? COMPACT : FULL;
    const round = (value: number) => PixelRatio.roundToNearestPixel(value);
    const gap = Math.max(round(size * profile.gap), StyleSheet.hairlineWidth);
    const count = profile.vertebrae.length;

    const raw = profile.vertebrae
      .map((width, index) => ({
        width,
        height: profile.vertebraHeight,
        offset: profile.amplitude * Math.cos((2 * Math.PI * index) / (count - 1)),
      }))
      .concat(
        profile.tail.map((segment, index) => ({
          width: segment.width,
          height: segment.height,
          offset: profile.amplitude * (0.6 - index * 0.25),
        }))
      );

    return raw.map((segment, index) => {
      const height = Math.max(round(size * segment.height), 1);
      return {
        key: index,
        style: {
          width: Math.max(round(size * segment.width), 2),
          height,
          borderRadius: height / 2,
          transform: [{ translateX: size * segment.offset }],
          marginBottom: index === raw.length - 1 ? 0 : gap,
        } as ViewStyle,
      };
    });
  }, [size]);

  return (
    <View style={[{ width: size, height: size }, styles.container, style]}>
      {segments.map(({ key, style: segmentStyle }) => (
        <View key={key} style={[segmentStyle, { backgroundColor: color }]} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SpineIcon;
