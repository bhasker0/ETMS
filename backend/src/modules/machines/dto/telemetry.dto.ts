import { IsString, IsNotEmpty, IsNumber, IsIn, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TelemetryIngestDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6', description: 'Machine UUID identifier' })
  @IsString()
  @IsNotEmpty()
  machineId: string;

  @ApiProperty({ example: 'running', enum: ['running', 'stopped'], description: 'Live operational status from CAN bus' })
  @IsString()
  @IsIn(['running', 'stopped'])
  status: 'running' | 'stopped';

  @ApiProperty({ example: 12345, description: 'Live accumulated stitch count from ESP32 edge counter' })
  @IsNumber()
  @Min(0)
  stitchCount: number;

  @ApiPropertyOptional({ example: 'd3b07384-d113-467f-94d5-5d9c73331b26', description: 'Assigned Machine IoT API Key (if not sent in x-api-key header)' })
  @IsOptional()
  @IsString()
  apiKey?: string;
}
