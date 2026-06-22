import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('canonical-models')
@UseGuards(AuthGuard('jwt'))
export class CanonicalModelController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getModels(@Request() req: { user: { organizationId: string } }) {
    return this.prisma.canonicalModel.findMany({
      where: { organizationId: req.user.organizationId },
    });
  }
}
