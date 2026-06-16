import { Body, Controller, Get, NotFoundException, Patch } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { User } from '../../database/entities';
import { toUserPublic } from '../../common/mappers';
import { CurrentUser, RequestUser } from '../../common/decorators';

class UpdateMeBody {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() avatarUrl?: string;
  @IsOptional() @IsIn(['uz', 'ru', 'en']) locale?: 'uz' | 'ru' | 'en';
}

@Controller('users')
export class UsersController {
  constructor(@InjectRepository(User) private users: Repository<User>) {}

  @Get('me')
  async me(@CurrentUser() u: RequestUser) {
    const user = await this.users.findOne({ where: { id: u.id } });
    if (!user) throw new NotFoundException('User not found.');
    return toUserPublic(user);
  }

  @Patch('me')
  async update(@CurrentUser() u: RequestUser, @Body() body: UpdateMeBody) {
    await this.users.update({ id: u.id }, body);
    const user = await this.users.findOneOrFail({ where: { id: u.id } });
    return toUserPublic(user);
  }
}
