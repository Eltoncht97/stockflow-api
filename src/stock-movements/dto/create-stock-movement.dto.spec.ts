import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MovementType } from '../../generated/prisma/client.js';
import { CreateStockMovementDto } from './create-stock-movement.dto.js';

const productId = 'ac78d2d3-7f6f-40ad-92ea-297a10e2f7b1';

describe('CreateStockMovementDto', () => {
  it('normalizes a valid movement', async () => {
    const dto = plainToInstance(CreateStockMovementDto, {
      productId: `  ${productId}  `,
      type: MovementType.IN,
      quantity: 2,
      reason: '  Received from supplier  ',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({
      productId,
      type: MovementType.IN,
      quantity: 2,
      reason: 'Received from supplier',
    });
  });

  it.each([0, -1, 1.5])('rejects invalid quantity %s', async (quantity) => {
    const dto = plainToInstance(CreateStockMovementDto, {
      productId,
      type: MovementType.IN,
      quantity,
      reason: 'Received',
    });

    expect(await validate(dto)).not.toHaveLength(0);
  });

  it.each([
    [{ productId: 'invalid' }, 'invalid product UUID'],
    [{ type: 'TRANSFER' }, 'invalid movement type'],
    [{ reason: '   ' }, 'blank reason'],
    [{ reason: 'a'.repeat(256) }, 'reason longer than 255 characters'],
  ])('rejects %s (%s)', async (override, reason) => {
    expect(reason).toBeTruthy();
    const dto = plainToInstance(CreateStockMovementDto, {
      productId,
      type: MovementType.IN,
      quantity: 1,
      reason: 'Received',
      ...override,
    });

    expect(await validate(dto)).not.toHaveLength(0);
  });
});
