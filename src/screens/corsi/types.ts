import type { Course, Video } from '../../types';

/**
 * I due cataloghi hanno una lista dedicata e non intercambiabile, ma condividono
 * il dettaglio corso e il player: `CorsiStack` monta una sola delle due liste.
 */
export type CorsiStackParamList = {
  CorsiPosturaliList: undefined;
  CorsiAziendaliList: undefined;
  CourseVideos: { course: Course };
  VideoPlayer: { video: Video; course?: Course };
};
