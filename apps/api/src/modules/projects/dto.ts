import {
  IsEnum,
  IsHexColor,
  IsOptional,
  IsString,
  Length,
  MinLength,
  IsDateString,
} from 'class-validator';
import { StatusCategory, SprintState } from '@manatask/shared';

export class CreateProjectBody {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @Length(2, 10)
  key: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;
}

export class UpdateProjectBody {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsHexColor() color?: string;
}

export class CreateStatusBody {
  @IsString() name: string;
  @IsEnum(StatusCategory) category: StatusCategory;
  @IsOptional() @IsHexColor() color?: string;
}

export class UpdateStatusBody {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEnum(StatusCategory) category?: StatusCategory;
  @IsOptional() @IsHexColor() color?: string;
  @IsOptional() order?: number;
}

export class CreateSprintBody {
  @IsString() name: string;
  @IsOptional() @IsString() goal?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
}

export class UpdateSprintBody {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() goal?: string;
  @IsOptional() @IsEnum(SprintState) state?: SprintState;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
}

export class CreateLabelBody {
  @IsString() name: string;
  @IsHexColor() color: string;
}
