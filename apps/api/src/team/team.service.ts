import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class TeamService {
  constructor(private prisma: PrismaService) {}

  async getMembers(organizationId: string) {
    const users = await this.prisma.user.findMany({
      where: { organizationId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true },
    });
    
    const invites = await this.prisma.teamInvite.findMany({
      where: { organizationId },
      select: { id: true, email: true, role: true, token: true, expiresAt: true, createdAt: true },
    });

    return { users, invites };
  }

  async inviteMember(organizationId: string, email: string, role: Role) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({ where: { organizationId, email } });
    if (existingUser) throw new BadRequestException("User is already in the team");

    // Create or update invite
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await this.prisma.teamInvite.upsert({
      where: {
        organizationId_email: { organizationId, email }
      },
      update: { token, expiresAt, role },
      create: {
        organizationId,
        email,
        role,
        token,
        expiresAt,
      }
    });

    return invite;
  }

  async revokeInvite(organizationId: string, inviteId: string) {
    return this.prisma.teamInvite.deleteMany({
      where: { id: inviteId, organizationId }
    });
  }

  async removeMember(organizationId: string, userId: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, organizationId } });
    if (!user) throw new NotFoundException("User not found in organization");
    if (user.role === 'OWNER') throw new BadRequestException("Cannot remove the organization owner");
    
    return this.prisma.user.delete({ where: { id: userId } });
  }
}
