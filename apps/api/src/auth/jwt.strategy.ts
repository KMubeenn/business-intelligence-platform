import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'super-secret', // In production, use a secure secret
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    organizationId: string;
  }) {
    return Promise.resolve({
      userId: payload.sub,
      email: payload.email,
      organizationId: payload.organizationId,
    });
  }
}
