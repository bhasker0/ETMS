import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { Response } from 'express';
import { WageHisabService } from './wage-hisab.service';
import { GenerateWageHisabDto } from './dto/wage-hisab.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentCompanyId } from '../../common/decorators/current-company.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Role } from '../../common/enums/role.enum';
import { Permission } from '../../common/enums/permission.enum';
import { COMPANY_ID_HEADER } from '../../common/constants';

@ApiTags('Karigar Fortnightly Wage Hisab (કારીગર પખવાડિયા હિસાબ)')
@ApiBearerAuth()
@ApiHeader({ name: COMPANY_ID_HEADER, description: 'Active Tenant UUID', required: true })
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('api/v1/wage-hisab')
export class WageHisabController {
  constructor(private wageHisabService: WageHisabService) {}

  @Post('calculate')
  @RequirePermissions(Permission.HISAB_GENERATE)
  @ApiOperation({ summary: 'Calculate Karigar Fortnightly Wage Hisab (Output - Uchapat - Deductions)' })
  async calculateHisab(
    @CurrentCompanyId() companyId: string,
    @Body() dto: GenerateWageHisabDto,
  ) {
    return this.wageHisabService.calculateHisab(companyId, dto);
  }

  @Post('pdf')
  @RequirePermissions(Permission.HISAB_GENERATE)
  @ApiOperation({ summary: 'Download Karigar Fortnightly Hisab Payslip PDF' })
  async downloadHisabPdf(
    @CurrentCompanyId() companyId: string,
    @Body() dto: GenerateWageHisabDto,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.wageHisabService.generateHisabPdfBuffer(companyId, dto);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="hisab-${dto.karigar_id}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.status(HttpStatus.OK).send(pdfBuffer);
  }

  @Post('settle')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.HISAB_GENERATE)
  @ApiOperation({ summary: 'Finalize and settle fortnightly Hisab (marks Uchapat advances as settled)' })
  async settleHisab(
    @CurrentCompanyId() companyId: string,
    @Body() dto: GenerateWageHisabDto,
  ) {
    return this.wageHisabService.settleFortnightHisab(companyId, dto);
  }
}
