import { Controller, Post, Body, Headers, UnauthorizedException, Sse } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { OpsSyncService, OpsSyncEvent } from './ops-sync.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('OPS ↔ ETMS Synchronization')
@Controller('api/v1/ops-sync')
export class OpsSyncController {
  constructor(private readonly opsSyncService: OpsSyncService) {}

  private validateHeaderSignature(payload: any, signature: string) {
    // In dev environment or signed webhook, validate signature
    if (process.env.NODE_ENV === 'production') {
      const isValid = this.opsSyncService.verifySignature(payload, signature);
      if (!isValid) {
        throw new UnauthorizedException('Invalid OPS webhook signature');
      }
    }
  }

  @Public()
  @Sse('events')
  @ApiOperation({ summary: 'Realtime Server-Sent Events stream for OPS sync updates' })
  syncEvents(): Observable<OpsSyncEvent> {
    return this.opsSyncService.getSyncEventsObservable();
  }

  @Public()
  @Post('company')
  @ApiOperation({ summary: 'Provision or sync SaaS Company from OPS' })
  async syncCompany(@Body() payload: any, @Headers('x-ops-signature') signature: string) {
    this.validateHeaderSignature(payload, signature);
    return this.opsSyncService.syncCompany(payload);
  }

  @Public()
  @Post('user')
  @ApiOperation({ summary: 'Sync User account and permissions from OPS' })
  async syncUser(@Body() payload: any, @Headers('x-ops-signature') signature: string) {
    this.validateHeaderSignature(payload, signature);
    return this.opsSyncService.syncUser(payload);
  }

  @Public()
  @Post('parameters')
  @ApiOperation({ summary: 'Sync operational parameters from OPS to ETMS' })
  async syncParameters(@Body() payload: any, @Headers('x-ops-signature') signature: string) {
    this.validateHeaderSignature(payload, signature);
    return this.opsSyncService.syncParameters(payload);
  }

  @Public()
  @Post('feature-flags')
  @ApiOperation({ summary: 'Sync feature flag toggles from OPS to ETMS' })
  async syncFeatureFlags(@Body() payload: any, @Headers('x-ops-signature') signature: string) {
    this.validateHeaderSignature(payload, signature);
    return this.opsSyncService.syncFeatureFlags(payload);
  }

  @Public()
  @Post('subscription-status')
  @ApiOperation({ summary: 'Enforce SaaS tenant subscription lifecycle status' })
  async syncSubscriptionStatus(@Body() payload: any, @Headers('x-ops-signature') signature: string) {
    this.validateHeaderSignature(payload, signature);
    return this.opsSyncService.syncSubscriptionStatus(payload);
  }
}

