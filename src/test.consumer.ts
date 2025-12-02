import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConsumerService } from './kafka/consumer.service';

@Injectable()
export class TestConsumer implements OnModuleInit {
  constructor(private readonly consumerService: ConsumerService) {}

  async onModuleInit() {
    console.log('TestConsumer initialized');
    await this.consumerService.consume(
      { topics: ['test'] },
      {
        eachMessage: async ({ topic, message, partition }) => {
          console.log(
            topic.toString(),
            message.value.toString(),
            partition.toString(),
          );
        },
      },
    );
  }
}
