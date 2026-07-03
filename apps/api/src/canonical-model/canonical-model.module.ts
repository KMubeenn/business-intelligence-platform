import { Module } from '@nestjs/common';
import { CanonicalModelController } from './canonical-model.controller';
import { CanonicalModelService } from './canonical-model.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CanonicalModelController],
  providers: [CanonicalModelService],
  exports: [CanonicalModelService],
})
export class CanonicalModelModule {}
