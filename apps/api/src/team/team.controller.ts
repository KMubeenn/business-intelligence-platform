import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TeamService } from './team.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('team')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get('members')
  getMembers(@Request() req: any) {
    return this.teamService.getMembers(req.user.organizationId);
  }

  @Post('invite')
  @Roles('OWNER', 'ADMIN')
  inviteMember(@Request() req: any, @Body() body: { email: string, role: any }) {
    return this.teamService.inviteMember(req.user.organizationId, body.email, body.role);
  }

  @Delete('invite/:id')
  @Roles('OWNER', 'ADMIN')
  revokeInvite(@Request() req: any, @Param('id') id: string) {
    return this.teamService.revokeInvite(req.user.organizationId, id);
  }

  @Delete('members/:id')
  @Roles('OWNER', 'ADMIN')
  removeMember(@Request() req: any, @Param('id') id: string) {
    return this.teamService.removeMember(req.user.organizationId, id);
  }
}
