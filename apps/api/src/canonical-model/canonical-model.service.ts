import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCanonicalModelDto } from './dto/create-canonical-model.dto';
import { UpdateCanonicalModelDto } from './dto/update-canonical-model.dto';

@Injectable()
export class CanonicalModelService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateCanonicalModelDto, organizationId: string) {
    return this.prisma.canonicalModel.create({
      data: {
        organizationId,
        name: createDto.name,
        schemaJson: (createDto.schemaJson || []) as any,
      },
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.canonicalModel.findMany({
      where: { organizationId },
    });
  }

  async update(id: string, updateDto: UpdateCanonicalModelDto, organizationId: string) {
    const existing = await this.prisma.canonicalModel.findUnique({
      where: { id, organizationId },
    });
    if (!existing) {
      throw new NotFoundException(`Canonical Model with ID ${id} not found`);
    }

    return this.prisma.canonicalModel.update({
      where: { id },
      data: {
        ...(updateDto.name && { name: updateDto.name }),
        ...(updateDto.schemaJson && { schemaJson: updateDto.schemaJson as any }),
      },
    });
  }

  async remove(id: string, organizationId: string) {
    const existing = await this.prisma.canonicalModel.findUnique({
      where: { id, organizationId },
    });
    if (!existing) {
      throw new NotFoundException(`Canonical Model with ID ${id} not found`);
    }

    return this.prisma.canonicalModel.delete({
      where: { id },
    });
  }
}
