import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({ description: 'Professional ID' })
  @IsUUID()
  professionalId: string;

  @ApiProperty({ description: 'Date in YYYY-MM-DD format', example: '2026-03-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Start time in HH:mm format', example: '10:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime: string;

  @ApiProperty({ description: 'End time in HH:mm format', example: '10:30' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be in HH:mm format',
  })
  endTime: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
