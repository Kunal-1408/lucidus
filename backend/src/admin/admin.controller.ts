import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { IngestionService } from '../ingestion/ingestion.service.js';
import { AdminTokenGuard } from './admin-token.guard.js';

@Controller('admin')
@UseGuards(AdminTokenGuard)
export class AdminController {
  constructor(private readonly ingestion: IngestionService) {}

  @Post('ingest')
  @HttpCode(200)
  ingest() {
    return this.ingestion.run();
  }
}
