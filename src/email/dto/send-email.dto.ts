import { z } from 'zod';

export const sendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  text: z.string().optional(),
  html: z.string().optional(),
  template: z.string().optional(),
  context: z.record(z.any()).optional(),
});

export type SendEmailDto = z.infer<typeof sendEmailSchema>;

