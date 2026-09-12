import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/create-expense.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentCompanyId } from '../../common/decorators/current-company.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { COMPANY_ID_HEADER } from '../../common/constants';

@ApiTags('Expenses (Direct & Indirect Factory Costs)')
@ApiBearerAuth()
@ApiHeader({ name: COMPANY_ID_HEADER, description: 'Active Tenant UUID', required: true })
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('api/v1/expenses')
export class ExpensesController {
  constructor(private expensesService: ExpensesService) {}

  @Post()
  @Roles(Role.COMPANY_ADMIN, Role.SUPERVISOR, Role.MUNIM, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Record a new factory expense (power, rent, repair, carting)' })
  async createExpense(
    @CurrentCompanyId() companyId: string,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expensesService.createExpense(companyId, dto);
  }

  @Get('summary')
  @Roles(Role.COMPANY_ADMIN, Role.SUPERVISOR, Role.MUNIM, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get direct vs indirect expense summaries and category breakdown' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getExpensesSummary(
    @CurrentCompanyId() companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.expensesService.getExpensesSummary(companyId, startDate, endDate);
  }

  @Get()
  @Roles(Role.COMPANY_ADMIN, Role.SUPERVISOR, Role.MUNIM, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List and filter expenses' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, enum: ['DIRECT', 'INDIRECT', 'ALL'] })
  @ApiQuery({ name: 'expenseType', required: false, type: String })
  @ApiQuery({ name: 'paymentMode', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getExpenses(
    @CurrentCompanyId() companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('category') category?: string,
    @Query('expenseType') expenseType?: string,
    @Query('paymentMode') paymentMode?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.expensesService.getExpenses(companyId, {
      startDate,
      endDate,
      category,
      expenseType,
      paymentMode,
      search,
      page,
      limit,
    });
  }

  @Get(':id')
  @Roles(Role.COMPANY_ADMIN, Role.SUPERVISOR, Role.MUNIM, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get expense details by ID' })
  async getExpenseById(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    return this.expensesService.getExpenseById(companyId, id);
  }

  @Put(':id')
  @Roles(Role.COMPANY_ADMIN, Role.SUPERVISOR, Role.MUNIM, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update expense' })
  async updateExpense(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.updateExpense(companyId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.COMPANY_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete expense' })
  async deleteExpense(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    return this.expensesService.deleteExpense(companyId, id);
  }
}
