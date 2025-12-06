import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AccessService } from './access.service';
import { UpdateAccessDto, updateAccessSchema } from './dto/update-access.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RequireAccess } from './decorators/require-access.decorator';
import { AccessGuard } from './guards/access.guard';
import { ApiResponse } from 'src/app.dto';
import { ZodError } from 'zod';

@Controller('access')
export class AccessController {
  constructor(private readonly accessService: AccessService) {}

  private parseBody<T>(schema: any, body: unknown): T {
    try {
      return schema.parse(body);
    } catch (err) {
      if (err instanceof ZodError) {
        const msg = err.errors
          .map((e) => `${e.path.join('.') || 'value'}: ${e.message}`)
          .join('; ');
        throw new BadRequestException(msg);
      }
      throw err;
    }
  }

  // Matrix for current user's role (only modules/tabs where at least one action exists)
  @UseGuards(JwtAuthGuard)
  @Get('matrix')
  async getMatrix(@Req() req: any) {
    console.log(req.user);
    const roleId = req.user?.roleId;
    if (!roleId) {
      return new ApiResponse({
        success: true,
        message: 'No role assigned',
        data: [],
      });
    }
    const matrix = await this.accessService.getMatrixForRole(roleId);
    return new ApiResponse({
      success: true,
      message: 'Access matrix fetched',
      data: matrix,
    });
  }

  // Get modules/tabs/actions for all roles
  @UseGuards(JwtAuthGuard)
  @RequireAccess({
    moduleCode: 'ACCESS',
    tabCode: 'ROLEACCESS',
    actionCode: 'VIEW',
  })
  @Get('matrix/all')
  async getMatrixAllRoles(@Req() req: any) {
    const matrix = await this.accessService.getMatrixForAllRoles();
    return new ApiResponse({
      success: true,
      message: 'Access matrix fetched',
      data: matrix,
    });
  }

  // Matrix for current user's role (only modules/tabs where at least one action exists)
  @UseGuards(JwtAuthGuard)
  @RequireAccess({
    moduleCode: 'ACCESS',
    tabCode: 'ROLEACCESS',
    actionCode: 'VIEW',
  })
  @Get('matrix/:roleCode')
  async getMatrixRoleCode(@Req() req: any) {
    const roleCode = req.params.roleCode;
    if (!roleCode) {
      return new ApiResponse({
        success: true,
        message: 'No role code provided',
        data: [],
      });
    }
    const matrix = await this.accessService.getMatrixForRole(
      undefined,
      roleCode,
    );
    return new ApiResponse({
      success: true,
      message: 'Access matrix fetched',
      data: matrix,
    });
  }

  

  // Admin/API: replace accesses for role/module/tab with provided actions
  @UseGuards(JwtAuthGuard, AccessGuard)
  @RequireAccess({
    moduleCode: 'ACCESS',
    tabCode: 'ROLEACCESS',
    actionCode: 'EDIT',
  })
  @Post('upsert')
  async upsert(@Body() body: unknown) {
    const dto = this.parseBody<UpdateAccessDto>(updateAccessSchema, body);
    const res = await this.accessService.upsertAccess(dto);
    return new ApiResponse({
      success: true,
      message: 'Access updated',
      data: res,
    });
  }
}
