import { Transform } from 'class-transformer';
import {
  IsDefined,
  IsString,
  Length,
  MaxLength,
  ValidateIf,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateCategoryDto {
  @Transform(trimString)
  @ValidateIf(
    (object: UpdateCategoryDto) =>
      object.description === undefined || object.name !== undefined,
  )
  @IsDefined()
  @IsString()
  @Length(1, 100)
  name?: string;

  @Transform(trimString)
  @ValidateIf(
    (object: UpdateCategoryDto) =>
      object.name === undefined || object.description !== undefined,
  )
  @ValidateIf((_object, value: unknown) => value !== null)
  @IsDefined()
  @IsString()
  @MaxLength(500)
  description?: string | null;
}
