import { Module } from '@nestjs/common';
import { CanonicalModelController } from './canonical-model.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CanonicalModelController],
})
export class CanonicalModelModule {}
