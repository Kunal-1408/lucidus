import {
  ConflictException,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IngestionService } from '../ingestion/ingestion.service.js';
import type { RunSummary } from '../ingestion/run-summary.js';
import { AdminTokenGuard } from './admin-token.guard.js';

@Controller('admin')
@UseGuards(AdminTokenGuard)
export class AdminController {
  constructor(private readonly ingestion: IngestionService) {}

  // Starts an Ingestion run in the background and answers at once.
  @Post('ingest')
  @HttpCode(202)
  async ingest(): Promise<{ runId: string }> {
    const run = await this.ingestion.start();
    if (!run.started) {
      throw new ConflictException({
        statusCode: 409,
        message: 'An Ingestion run is already in progress',
        runId: run.runId,
      });
    }
    return { runId: run.runId };
  }

  @Get('ingest/:runId')
  async run(@Param('runId') runId: string): Promise<RunSummary> {
    const summary = await this.ingestion.summary(runId);
    if (!summary) throw new NotFoundException(`No Ingestion run ${runId}`);
    return summary;
  }
}
