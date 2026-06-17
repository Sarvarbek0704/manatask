import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { WorkLogStatus } from '@manatask/shared';

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
  @IsOptional() @IsIn(Object.values(WorkLogStatus)) status?: WorkLogStatus;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() page?: number;
  @IsOptional() pageSize?: number;
}

export class ReviewWorkLogBody {
  @IsIn(['accept', 'reject']) decision: 'accept' | 'reject';
}

export class UpsertChallengeBody {
  @IsOptional() @IsString() @MinLength(2) title?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsInt() @Min(1) target?: number;
}
