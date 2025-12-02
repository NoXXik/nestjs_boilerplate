import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { ApiResponse } from 'src/app.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async getUsers() {
    const res = await this.userService.findAll();
    return new ApiResponse({
      success: true,
      message: 'Success',
      data: res,
    });
  }

  @Post()
  async createUser(@Body() body: CreateUserDto) {
    const res = await this.userService.create(body);
    return new ApiResponse({
      success: true,
      message: 'Success',
      data: res,
    });
  }

  @Post('/:id')
  async updateUser(@Param('id') id: number, @Body() body: UpdateUserDto) {
    try {
      const res = await this.userService.update(Number(id), body);
      return new ApiResponse({
        success: true,
        message: 'Success',
        data: res,
      });
    } catch (error) {
        throw error;
    }
  }
  @Delete('/:id')
  async deleteUser(@Param('id') id: number) {
    const res = await this.userService.remove(Number(id));
    return new ApiResponse({
      success: true,
      message: 'Success',
      data: res,
    });
  }
}
