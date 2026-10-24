import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProductDto } from './create-product.dto.js';
import { UpdateProductDto } from './update-product.dto.js';

const categoryId = '77bbef2d-f0c9-456d-a478-dbc523ff0876';

describe('Product DTOs', () => {
  it('normalizes a valid create request', async () => {
    const dto = plainToInstance(CreateProductDto, {
      sku: '  SKU-001  ',
      name: '  Keyboard  ',
      categoryId: `  ${categoryId}  `,
      description: '  Mechanical  ',
      price: '  49.90  ',
      minStock: 2,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({
      sku: 'SKU-001',
      name: 'Keyboard',
      categoryId,
      description: 'Mechanical',
      price: '49.90',
      minStock: 2,
    });
  });

  it.each([
    ['-1', 'negative price'],
    ['1.999', 'more than two decimal places'],
    ['10000000000.00', 'more than ten integer digits'],
    [1, 'numeric price instead of a string'],
  ])('rejects %s as %s', async (price, reason) => {
    expect(reason).toBeTruthy();
    const dto = plainToInstance(CreateProductDto, {
      sku: 'SKU-001',
      name: 'Keyboard',
      categoryId,
      price,
    });

    expect(await validate(dto)).not.toHaveLength(0);
  });

  it.each([-1, 1.5])('rejects invalid minimum stock %s', async (minStock) => {
    const dto = plainToInstance(CreateProductDto, {
      sku: 'SKU-001',
      name: 'Keyboard',
      categoryId,
      price: '49.90',
      minStock,
    });

    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('accepts a partial update and a null description', async () => {
    const dto = plainToInstance(UpdateProductDto, {
      name: '  Updated keyboard  ',
      description: null,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({ name: 'Updated keyboard', description: null });
  });
});
