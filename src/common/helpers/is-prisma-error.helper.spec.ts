import { Prisma } from '../../generated/prisma/client.js';
import { isPrismaError } from './is-prisma-error.helper.js';

describe('isPrismaError', () => {
  it('matches a known Prisma error by code', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Duplicate', {
      code: 'P2002',
      clientVersion: '7.10.0',
    });

    expect(isPrismaError(error, 'P2002')).toBe(true);
    expect(isPrismaError(error, 'P2025')).toBe(false);
  });

  it('rejects non-Prisma errors', () => {
    expect(isPrismaError(new Error('Failure'), 'P2002')).toBe(false);
  });
});
