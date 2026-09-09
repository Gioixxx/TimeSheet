import { activityTypeSchema } from './schemas'

export type ActivityType = (typeof activityTypeSchema)['options'][number]

/**
 * Elenco dei tipi di attività, derivato dallo schema: un tipo nuovo compare da solo in tutti i
 * form che iterano su questa lista, senza doverli aggiornare uno per uno — è così che
 * "Straordinario" era finito nel form manuale ma non nel filtro né nel pannello attività.
 */
export const ACTIVITY_TYPES = activityTypeSchema.options

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  SUPPORTO: 'Supporto',
  MANUTENZIONE: 'Manutenzione',
  PERMESSO: 'Permesso',
  FERIE: 'Ferie',
  STRAORDINARIO: 'Straordinario',
}

/** Minuti in una giornata lavorativa: unità con cui si contano le FERIE e gli straordinari. */
export const MINUTES_PER_WORKDAY = 480
