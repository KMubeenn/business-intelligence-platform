import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    let assignedRole: any = 'OWNER';
    let orgData: any = {};

    if (dto.inviteToken) {
      const invite = await this.prisma.teamInvite.findFirst({
        where: { token: dto.inviteToken, email: dto.email },
      });
      if (!invite || invite.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid or expired invite token, or email mismatch.');
      }
      assignedRole = invite.role;
      orgData = {
        organizationId: invite.organizationId,
      };

      // Delete the invite since it's used
      await this.prisma.teamInvite.delete({ where: { id: invite.id } });
    } else {
      if (!dto.organizationName) throw new BadRequestException('Organization name is required if no invite token is provided');
      orgData = {
        organization: {
          create: {
            name: dto.organizationName,
          },
        },
      };
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: assignedRole,
        ...orgData,
      },
      include: {
        organization: true,
      },
    });

    return this.generateTokens(user.id, user.email, user.organizationId, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user.id, user.email, user.organizationId, user.role);
  }

  async getInviteDetails(token: string) {
    const invite = await this.prisma.teamInvite.findFirst({
      where: { token },
      include: { organization: true },
    });

    if (!invite || invite.expiresAt < new Date()) {
      throw new NotFoundException('Invite not found or expired');
    }

    return {
      email: invite.email,
      organizationName: invite.organization.name,
      role: invite.role,
    };
  }

  private async generateTokens(
    userId: string,
    email: string,
    organizationId: string,
    role: string,
  ) {
    const payload = { sub: userId, email, organizationId, role };

    return {
      access_token: await this.jwtService.signAsync(payload, {
        expiresIn: '7d',
      }),
      refresh_token: await this.jwtService.signAsync(payload, {
        expiresIn: '7d',
      }),
    };
  }
}
