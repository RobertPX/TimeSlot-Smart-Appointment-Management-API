import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateProfessionalDto {
  @ApiProperty({ description: 'ID of the user to promote to professional' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 'Cardiología' })
  @IsString()
  @IsNotEmpty()
  specialty: string;
}
