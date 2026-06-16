import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { TaskPriority, StatusCategory, DependencyType } from '@manatask/shared';

export class CreateTaskBody {
  @IsUUID() projectId: string;
  @IsString() @MinLength(1) title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() statusId?: string;
  @IsOptional() @IsEnum(TaskPriority) priority?: TaskPriority;
  @IsOptional() assigneeId?: string | null;
  @IsOptional() sprintId?: string | null;
  @IsOptional() parentId?: string | null;
  @IsOptional() @IsDateString() dueDate?: string | null;
  @IsOptional() @IsDateString() startDate?: string | null;
  @IsOptional() @IsInt() estimateMinutes?: number | null;
  @IsOptional() @IsArray() labelIds?: string[];
  @IsOptional() @IsArray() assigneeIds?: string[];
  @IsOptional() customFields?: Record<string, unknown>;
}

export class UpdateTaskBody {
  @IsOptional() @IsString() @MinLength(1) title?: string;
  @IsOptional() description?: string | null;
  @IsOptional() @IsUUID() statusId?: string;
  @IsOptional() @IsEnum(TaskPriority) priority?: TaskPriority;
  @IsOptional() assigneeId?: string | null;
  @IsOptional() sprintId?: string | null;
  @IsOptional() dueDate?: string | null;
  @IsOptional() startDate?: string | null;
  @IsOptional() estimateMinutes?: number | null;
  @IsOptional() @IsArray() labelIds?: string[];
  @IsOptional() @IsArray() assigneeIds?: string[];
  @IsOptional() customFields?: Record<string, unknown>;
  @IsOptional() @IsInt() version?: number;
}

export class MoveTaskBody {
  @IsUUID() statusId: string;
  @IsNumber() order: number;
}

export class TaskQueryParams {
  @IsOptional() @IsUUID() projectId?: string;
  @IsOptional() assigneeId?: string;
  @IsOptional() @IsUUID() sprintId?: string;
  @IsOptional() @IsEnum(StatusCategory) statusCategory?: StatusCategory;
  @IsOptional() @IsEnum(TaskPriority) priority?: TaskPriority;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsUUID() labelId?: string;
  @IsOptional() @IsDateString() dueBefore?: string;
  @IsOptional() parentId?: string;
  @IsOptional() page?: number;
  @IsOptional() pageSize?: number;
}

export class CreateCommentBody {
  @IsString() @MinLength(1) body: string;
}

export class CreateChecklistItemBody {
  @IsString() @MinLength(1) text: string;
}

export class UpdateChecklistItemBody {
  @IsOptional() @IsString() text?: string;
  @IsOptional() @IsBoolean() done?: boolean;
}

export class CreateDependencyBody {
  @IsEnum(DependencyType) type: DependencyType;
  @IsUUID() targetTaskId: string;
}

export class LogTimeBody {
  @IsInt() @Min(1) minutes: number;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsDateString() spentOn?: string;
}
