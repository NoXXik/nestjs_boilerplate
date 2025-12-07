import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConsumerService } from 'src/kafka/consumer.service';

@Injectable()
export class EmailConsumer implements OnModuleInit {
  private readonly logger = new Logger(EmailConsumer.name);
  private readonly topic = process.env.EMAIL_TOPIC || 'email-send';

  constructor(private readonly consumerService: ConsumerService) {}

  async onModuleInit() {
    await this.consumerService.consume(
      { topics: [this.topic], fromBeginning: false },
      {
        eachMessage: async ({ message }) => {
          if (!message.value) return;
          try {
            const payload = JSON.parse(message.value.toString());
            this.logger.log(
              `Mock send email: to=${payload.to}, subject=${payload.subject}`,
            );
            // Here would be real send via SMTP/provider
          } catch (err) {
            this.logger.error('Failed to process email message', err);
          }
        },
      },
    );
  }
}
