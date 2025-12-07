import {
  BadRequestException,
  Body,
  Controller,
  Post,
} from '@nestjs/common';
import { EmailService } from './email.service';
import { sendEmailSchema, SendEmailDto } from './dto/send-email.dto';
import { ZodError } from 'zod';
import { ApiResponse } from 'src/app.dto';

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  private parse<T>(schema: any, body: unknown): T {
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

  @Post('send')
  async send(@Body() body: unknown) {
    const dto = this.parse<SendEmailDto>(sendEmailSchema, body);
    const res = await this.emailService.sendEmail(dto);
    return new ApiResponse({
      success: true,
      message: 'Email queued',
      data: res,
    });
  }
}

