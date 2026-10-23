import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  NEEDING_REVIEW,
  type ReviewEntry,
  scholarshipEntry,
  type StoredScholarship,
} from '../review/review-report.js';
import { Scholarship } from '../scholarships/scholarship.schema.js';
import { AdminTokenGuard } from './admin-token.guard.js';

// The reviewer's list of what to check, read from Postman.
@Controller('admin/review')
@UseGuards(AdminTokenGuard)
export class ReviewController {
  constructor(
    @InjectModel(Scholarship.name)
    private readonly scholarships: Model<Scholarship>,
  ) {}

  @Get()
  async report(): Promise<ReviewEntry[]> {
    const needing = await this.scholarships
      .find(NEEDING_REVIEW)
      .sort({ sourceUrl: 1, schemeName: 1 })
      .lean<StoredScholarship[]>();
    return needing.map(scholarshipEntry);
  }
}
