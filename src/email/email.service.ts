import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ProducerService } from 'src/kafka/producer.service';
import { SendEmailDto } from './dto/send-email.dto';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly topic = process.env.EMAIL_TOPIC || 'email-send';
  private readonly limitPerHour = Number(
    process.env.EMAIL_RATE_LIMIT_PER_HOUR || 10,
  );
  private readonly windowTtlSec = 60 * 60; // 1 hour

  constructor(
    private readonly producer: ProducerService,
    private readonly redis: RedisService,
  ) {}

  private async ensureRateLimit() {
    const key = 'email:rate:global';
    const count = await this.redis.getClient().incr(key);
    if (count === 1) {
      await this.redis.getClient().expire(key, this.windowTtlSec);
    }
    if (count > this.limitPerHour) {
      throw new HttpException(
        `Email rate limit exceeded (${this.limitPerHour}/hour)`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async sendEmail(payload: SendEmailDto) {
    await this.ensureRateLimit();

    const message = {
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      template: payload.template,
      context: payload.context,
    };

    await this.producer.sendMessage({
      topic: this.topic,
      messages: [
        {
          key: payload.to,
          value: JSON.stringify(message),
        },
      ],
    });

    this.logger.log(
      `Queued email to ${payload.to} on topic ${this.topic} (subject="${payload.subject}")`,
    );

    return { queued: true };
  }
}
