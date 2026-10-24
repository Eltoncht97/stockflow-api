import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { InventoryStatus } from '../inventory-status.enum.js';
import { InventoryQueryDto } from './inventory-query.dto.js';

const categoryId = '77bbef2d-f0c9-456d-a478-dbc523ff0876';

describe('InventoryQueryDto', () => {
  it('normalizes valid filters', async () => {
    const dto = plainToInstance(InventoryQueryDto, {
      categoryId,
      status: InventoryStatus.LOW_STOCK,
      search: '  keyBOARD  ',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.search).toBe('keyBOARD');
  });

  it.each([
    [{ categoryId: 'invalid' }, 'invalid category UUID'],
    [{ status: 'UNKNOWN' }, 'invalid status'],
    [{ search: '   ' }, 'blank search'],
    [{ search: 'a'.repeat(101) }, 'search longer than 100 characters'],
  ])('rejects %s (%s)', async (value, reason) => {
    expect(reason).toBeTruthy();
    const dto = plainToInstance(InventoryQueryDto, value);

    expect(await validate(dto)).not.toHaveLength(0);
  });
});
