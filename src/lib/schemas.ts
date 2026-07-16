import { z } from 'zod'

export const activityTypeSchema = z.enum(['SUPPORTO', 'MANUTENZIONE', 'PERMESSO', 'FERIE', 'STRAORDINARIO'])

export const timeEntrySchema = z.object({
  title: z.string().min(1, 'Il titolo è obbligatorio'),
  description: z.string().optional(),
  activityType: activityTypeSchema,
  duration: z.coerce
    .number({ invalid_type_error: 'Inserisci un numero' })
    .int()
    .min(1, 'Minimo 1 minuto')
    .max(14400, 'Massimo 30 giorni'),
  date: z.string().min(1, 'La data è obbligatoria'),
  clientName: z.string().optional(),
  projectName: z.string().optional(),
  tags: z.string().optional(),
})

export type TimeEntryInput = z.infer<typeof timeEntrySchema>

export const loginSchema = z.object({
  username: z.string().min(1, "L'username è obbligatorio"),
  password: z.string().min(1, 'La password è obbligatoria'),
})

export const setupSchema = z
  .object({
    username: z.string().min(3, "Minimo 3 caratteri").trim(),
    password: z
      .string()
      .min(8, 'Minimo 8 caratteri')
      .regex(/[a-zA-Z]/, 'Deve contenere almeno una lettera')
      .regex(/[0-9]/, 'Deve contenere almeno un numero'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Le password non coincidono',
    path: ['confirmPassword'],
  })
