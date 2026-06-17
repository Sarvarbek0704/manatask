import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsIn,
  Length,
} from 'class-validator';

export class RegisterBody {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  workspaceName?: string;

  @IsOptional()
  @IsIn(['uz', 'ru', 'en'])
  locale?: 'uz' | 'ru' | 'en';
}

export class LoginBody {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RefreshBody {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class VerifyEmailBody {
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class VerifyOtpBody {
  @IsString()
  @Length(6, 6)
  code: string;
}

export class ForgotPasswordBody {
  @IsEmail()
  email: string;
}

export class ResetPasswordBody {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export class ChangePasswordBody {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}
