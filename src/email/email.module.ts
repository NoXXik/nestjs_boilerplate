import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { KafkaModule } from 'src/kafka/kafka.module';
import { EmailConsumer } from './email.consumer';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [KafkaModule, RedisModule],
  controllers: [EmailController],
  providers: [EmailService, EmailConsumer],
  exports: [EmailService],
})
export class EmailModule {}

