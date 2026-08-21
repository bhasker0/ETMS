import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import Redis from 'ioredis';
import { REDIS_TOKEN_BLACKLIST_PREFIX } from '../constants';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private redisClient: Redis;

  constructor(private reflector: Reflector) {
    super();
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      lazyConnect: true,
    });
    this.redisClient.connect().catch(() => {});
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        if (this.redisClient.status === 'ready') {
          const isBlacklisted = await this.redisClient.get(
            `${REDIS_TOKEN_BLACKLIST_PREFIX}${token}`,
          );
          if (isBlacklisted) {
            throw new UnauthorizedException('Token has been revoked/logged out');
          }
        }
      } catch (err) {
        if (err instanceof UnauthorizedException) {
          throw err;
        }
      }
    }

    return super.canActivate(context) as Promise<boolean>;
  }
}
