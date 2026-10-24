import { Transform } from 'class-transformer';
import { IsString, Length, MaxLength, ValidateIf } from 'class-validator';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateCategoryDto {
  @Transform(trimString)
  @IsString()
  @Length(1, 100)
  name: string;

  @Transform(trimString)
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(500)
  description?: string;
}
