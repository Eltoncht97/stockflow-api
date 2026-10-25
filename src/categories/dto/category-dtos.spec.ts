import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCategoryDto } from './create-category.dto.js';
import { UpdateCategoryDto } from './update-category.dto.js';

describe('Category DTOs', () => {
  it('normalizes a valid create request', async () => {
    const dto = plainToInstance(CreateCategoryDto, {
      name: '  Hardware  ',
      description: '  Physical products  ',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toEqual({
      name: 'Hardware',
      description: 'Physical products',
    });
  });

  it.each([
    [{}, 'missing name'],
    [{ name: '   ' }, 'blank name'],
    [{ name: 'a'.repeat(101) }, 'name longer than 100 characters'],
    [
      { name: 'Hardware', description: 'a'.repeat(501) },
      'description longer than 500 characters',
    ],
  ])('rejects an invalid create request: %s (%s)', async (value, reason) => {
    expect(reason).toBeTruthy();
    const dto = plainToInstance(CreateCategoryDto, value);

    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('accepts a partial update and clears a description with null', async () => {
    const dto = plainToInstance(UpdateCategoryDto, { description: null });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.description).toBeNull();
  });

  it('rejects an empty update', async () => {
    const dto = plainToInstance(UpdateCategoryDto, {});

    expect(await validate(dto)).not.toHaveLength(0);
  });
});
