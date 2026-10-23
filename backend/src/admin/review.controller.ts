import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Override } from '../overrides/override.schema.js';
import {
  NEEDING_REVIEW,
  overrideEntry,
  type ReviewEntry,
  scholarshipEntry,
  type StoredOverride,
  type StoredScholarship,
} from '../review/review-report.js';
import { Scholarship } from '../scholarships/scholarship.schema.js';
import { scholarshipKey } from '../scholarships/scholarship-key.js';
import { AdminTokenGuard } from './admin-token.guard.js';

const BY_KEY = { sourceUrl: 1, schemeName: 1 } as const;

// The reviewer's list of what to check, read from Postman: Scholarships
// needing review, then invalid and lapsed Overrides.
@Controller('admin/review')
@UseGuards(AdminTokenGuard)
export class ReviewController {
  constructor(
    @InjectModel(Scholarship.name)
    private readonly scholarships: Model<Scholarship>,
    @InjectModel(Override.name)
    private readonly overrides: Model<Override>,
  ) {}

  @Get()
  async report(): Promise<ReviewEntry[]> {
    const needing = await this.scholarships
      .find(NEEDING_REVIEW)
      .sort(BY_KEY)
      .lean<StoredScholarship[]>();
    return [
      ...needing.map(scholarshipEntry),
      ...(await this.overrideEntries()),
    ];
  }

  // An Override whose Scholarship is no longer listed has nothing left to
  // check, so it isn't reported.
  private async overrideEntries(): Promise<ReviewEntry[]> {
    const overrides = await this.overrides
      .find()
      .sort(BY_KEY)
      .lean<StoredOverride[]>();
    const entries: ReviewEntry[] = [];
    for (const override of overrides) {
      const scholarship = await this.scholarships
        .findOne({ ...scholarshipKey(override), status: 'active' })
        .lean<StoredScholarship>();
      const entry = scholarship && overrideEntry(override, scholarship);
      if (entry) entries.push(entry);
    }
    return entries;
  }
}
