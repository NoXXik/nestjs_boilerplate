import { BadRequestException } from '@nestjs/common';
import { z, ZodError } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const formatZodErrors = (err: ZodError) => err.errors.map((e) => `${e.path.join('.') || 'value'}: ${e.message}`).join('; ');

export const parseBody = <T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> => {
  try {
    return schema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new BadRequestException(formatZodErrors(err));
    }
    throw err;
  }
};
