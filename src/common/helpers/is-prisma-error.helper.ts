import { Prisma } from '../../generated/prisma/client.js';

export const isPrismaError = (error: unknown, code: string): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
