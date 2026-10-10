export type VisiteStackParamList = {
  VisiteMenu: undefined;
  /** Precompilazione facoltativa (es. riprenotazione dopo una disdetta). */
  BookVisit: { osteopataId?: number; studioId?: number } | undefined;
  GestioneVisite: undefined;
  PagamentiPaziente: undefined;
};
