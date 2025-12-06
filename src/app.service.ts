import { Injectable } from '@nestjs/common';
import { ProducerService } from './kafka/producer.service';
import { RedisService } from './redis/redis.service';
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse } from './app.dto';

@Injectable()
export class AppService {
  constructor(
    private readonly producerService: ProducerService,
    private readonly redisService: RedisService,
  ) {}
  async getHello() {
    await this.producerService.sendMessage({
      topic: 'test',
      messages: [{ value: 'Hello World!' }],
    });
    await this.redisService.set('test', 'Hello World from Redis!');
    const value = await this.redisService.get('test');
    console.log('Redis value:', value);
    return {
      message: 'Hello World!',
      redisValue: value,
    };
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    console.log('exception', exception);
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;

    const message = exception.message || 'Unknown error';

    // Получить stack trace если есть
    const errorObj = {
      message: exception.message,
      name: exception.name,
      stack: exception.stack,
      ...(exception.response && typeof exception.response === 'object' ? exception.response : {}),
    };

    response.status(status).json(
      new ApiResponse({
        success: false,
        message,
        error: errorObj,
        data: null,
      }),
    );
    // response.status(status).json(
    //   new ApiResponse({
    //     success: false,
    //     message,
    //     error: errorObj,
    //     data: null,
    //   }),
    // );
  }
}
