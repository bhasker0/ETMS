import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MunimService } from './munim.service';
import {
  MunimInviteCompanyDto,
  CompanyInviteMunimDto,
  RespondMunimRequestDto,
} from './dto/munim.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureToggleGuard } from '../../common/guards/feature-toggle.guard';
import { RequireFeature } from '../../common/decorators/feature.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentCompanyId } from '../../common/decorators/current-company.decorator';

@ApiTags('Munim (Accountant) Collaboration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, FeatureToggleGuard)
@RequireFeature('munim_portal')
@Controller('api/v1/munim')
export class MunimController {
  constructor(private munimService: MunimService) {}

  @Post('invite-company')
  @ApiOperation({ summary: 'Munim sends an accountant access request to a Company' })
  async munimInviteCompany(
    @CurrentUser('id') munimUserId: string,
    @Body() dto: MunimInviteCompanyDto,
  ) {
    return this.munimService.munimInviteCompany(munimUserId, dto);
  }

  @Post('company-invite-munim')
  @ApiOperation({ summary: 'Company Owner invites a registered Munim' })
  async companyInviteMunim(
    @CurrentCompanyId() companyId: string,
    @CurrentUser('id') companyUserId: string,
    @Body() dto: CompanyInviteMunimDto,
  ) {
    return this.munimService.companyInviteMunim(companyId, companyUserId, dto);
  }

  @Get('my-requests')
  @ApiOperation({ summary: 'Get all collaboration requests for the logged in Munim' })
  async getMunimRequests(@CurrentUser('id') munimUserId: string) {
    return this.munimService.getMunimRequests(munimUserId);
  }

  @Get('company-requests')
  @ApiOperation({ summary: 'Get all Munim collaboration requests for the active Company' })
  async getCompanyRequests(@CurrentCompanyId() companyId: string) {
    return this.munimService.getCompanyRequests(companyId);
  }

  @Patch('requests/:id/respond')
  @ApiOperation({ summary: 'Accept, Reject, or Revoke a collaboration request' })
  async respondToRequest(
    @Param('id') requestId: string,
    @CurrentUser() user: any,
    @Body() dto: RespondMunimRequestDto,
  ) {
    return this.munimService.respondToRequest(requestId, user, dto);
  }

  @Get('companies')
  @ApiOperation({ summary: 'Get all companies where the Munim has approved access' })
  async getApprovedCompanies(@CurrentUser('id') munimUserId: string) {
    return this.munimService.getApprovedCompanies(munimUserId);
  }

  @Get('consolidated-daybook')
  @ApiOperation({ summary: 'Consolidated Daybook & production metrics across all approved client companies' })
  @ApiQuery({ name: 'startDate', required: false, example: '2026-08-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2026-08-15' })
  async getConsolidatedDaybook(
    @CurrentUser('id') munimUserId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.munimService.getConsolidatedDaybook(munimUserId, startDate, endDate);
  }
}
