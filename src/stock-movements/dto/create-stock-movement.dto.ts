import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsString, IsUUID, Length, Min } from 'class-validator';
import { MovementType } from '../../generated/prisma/client.js';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateStockMovementDto {
  @Transform(trimString)
  @IsUUID()
  productId: string;

  @IsEnum(MovementType)
  type: MovementType;

  @IsInt()
  @Min(1)
  quantity: number;

  @Transform(trimString)
  @IsString()
  @Length(1, 255)
  reason: string;
}
