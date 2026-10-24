import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateProductDto {
  @Transform(trimString)
  @IsString()
  @Length(1, 50)
  sku: string;

  @Transform(trimString)
  @IsString()
  @Length(1, 150)
  name: string;

  @Transform(trimString)
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @Transform(trimString)
  @IsUUID()
  categoryId: string;

  @Transform(trimString)
  @IsString()
  @Matches(/^\d{1,10}(?:\.\d{1,2})?$/, {
    message:
      'price must be a non-negative decimal with up to 10 integer digits and 2 decimal places',
  })
  price: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  minStock?: number;
}
