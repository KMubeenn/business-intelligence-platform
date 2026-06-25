import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TransformationService } from './transformation.service';
import { TransformationProcessor } from './transformation.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'transform',
    })
  ],
  providers: [TransformationService, TransformationProcessor],
})
export class TransformationModule {}
