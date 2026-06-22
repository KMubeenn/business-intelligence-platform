import { Module } from '@nestjs/common';
import { TransformationService } from './transformation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [PrismaModule],
  providers: [TransformationService],
})
export class TransformationModule {}
