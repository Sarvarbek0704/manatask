import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export class CreateWorkLogBody {
  @IsString() @MinLength(2) title: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsUUID() projectId?: string | null;
  @IsOptional() @IsUUID() taskId?: string | null;
  @IsOptional() @IsInt() @Min(0) minutes?: number | null;
  @IsOptional() @IsDateString() workedOn?: string;
}

export class UpdateWorkLogBody {
  @IsOptional() @IsString() @MinLength(2) title?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() projectId?: string | null;
  @IsOptional() @IsInt() @Min(0) minutes?: number | null;
  @IsOptional() @IsDateString() workedOn?: string;
}

export class WorkLogQuery {
  @IsOptional() @IsUUID() userId?: string;
  @IsOptional() @IsUUID() projectId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() page?: number;
  @IsOptional() pageSize?: number;
}
