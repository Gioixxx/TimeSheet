import { z } from 'zod'

export const activityTypeSchema = z.enum(['SUPPORTO', 'MANUTENZIONE'])

export const timeEntrySchema = z.object({
  title: z.string().min(1, 'Il titolo è obbligatorio'),
  description: z.string().optional(),
  activityType: activityTypeSchema,
  duration: z.coerce
    .number({ invalid_type_error: 'Inserisci un numero' })
    .int()
    .min(1, 'Minimo 1 minuto')
    .max(1440, 'Massimo 1440 minuti (24h)'),
  date: z.string().min(1, 'La data è obbligatoria'),
  clientName: z.string().optional(),
  projectName: z.string().optional(),
  tags: z.string().optional(),
})

export type TimeEntryInput = z.infer<typeof timeEntrySchema>
