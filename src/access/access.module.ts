import { Module } from '@nestjs/common';
import { AccessService } from './access.service';
import { AccessController } from './access.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AccessGuard } from './guards/access.guard';

@Module({
  imports: [PrismaModule],
  controllers: [AccessController],
  providers: [AccessService, AccessGuard],
  exports: [AccessService],
})
export class AccessModule {}

