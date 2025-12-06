import { HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, UserDbDto } from './dto/user.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserDto): Promise<any> {
    try {
      // await this.prisma.user.findUnique({ where: { email: data.email } });
      return (this.prisma as any).user.create({ data });
    } catch (error) {
      console.error('Failed to create user in service:', error);
      throw new Error('Failed to create user');
    }
  }
  async findAll(): Promise<any[]> {
    try {
      return await (this.prisma as any).user.findMany();
    } catch (error) {
      console.error('Failed to find all users in service:', error);
      throw new Error(error);
    }
  }
  async findOne(id: number): Promise<any | null> {
    try {
      return await (this.prisma as any).user.findUnique({ where: { id } });
    } catch (error) {
      console.error('Failed to find user by id in service:', error);
      throw new Error(error);
    }
  }

  async update(id: number, data: UpdateUserDto): Promise<any> {
    try {
      const user_db = await (this.prisma as any).user.findUnique({
        where: { id },
      });
      if (!user_db) {
        throw new HttpException('User not found', 404);
      }
      return await (this.prisma as any).user.update({ where: { id }, data });
    } catch (error) {
      console.error('Failed to update user in service:', error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(error, 400); // статус 400 или свой
    }
  }
  async remove(id: number): Promise<any> {
    try {
      return await (this.prisma as any).user.delete({ where: { id } });
    } catch (error) {
      console.error('Failed to remove user in service:', error);
      throw new Error(error);
    }
  }
  async findByEmail(email: string): Promise<UserDbDto | null> {
    try {
      return (await (this.prisma as any).user.findUnique({
        where: { email },
      })) as UserDbDto | null;
    } catch (error) {
      console.error('Failed to find user by email in service:', error);
      throw new Error(error);
    }
  }

  async findByRefreshTokenHash(
    refreshTokenHash: string,
  ): Promise<UserDbDto | null> {
    try {
      return await (this.prisma as any).user.findFirst({
        where: { refreshTokenHash },
      });
    } catch (error) {
      console.error(
        'Failed to find user by refresh token hash in service:',
        error,
      );
      throw new Error(error);
    }
  }
}
