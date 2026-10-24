import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { CLOCK, type Clock } from '../clock.js';
import { parseOverride } from '../overrides/override-input.js';
import { Override } from '../overrides/override.schema.js';
import { Scholarship } from '../scholarships/scholarship.schema.js';
import { scholarshipKey } from '../scholarships/scholarship-key.js';
import { AdminTokenGuard } from './admin-token.guard.js';
import { rejected } from '../http-errors.js';
import { insertUnique, type View, withId } from './admin-records.js';

export type OverrideView = View<Override>;

// The reviewer's fixes, sent from Postman. A new Override takes effect on
// the next Ingestion run, with no redeploy, and without reading the page
// again: it applies to the extraction the reviewer saw.
@Controller('admin/overrides')
@UseGuards(AdminTokenGuard)
export class OverridesController {
  constructor(
    @InjectModel(Override.name)
    private readonly overrides: Model<Override>,
    @InjectModel(Scholarship.name)
    private readonly scholarships: Model<Scholarship>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  @Post()
  async add(@Body() body: unknown): Promise<OverrideView> {
    const parsed = parseOverride(body);
    if (!parsed.ok) throw rejected(parsed.reasons);
    const key = scholarshipKey(parsed.override);
    const named = `${key.schemeName} from ${key.sourceUrl}`;
    const scholarship = await this.scholarships
      .findOne(key, { contentHash: 1 })
      .lean();
    if (!scholarship) throw rejected([`No Scholarship ${named}`]);
    // One written against older text would only lapse on the next run.
    if (scholarship.contentHash !== parsed.override.contentHash) {
      throw rejected([`contentHash is not the current hash of ${named}`]);
    }
    return insertUnique(
      this.overrides,
      key,
      { ...parsed.override, reviewedAt: this.clock.now() },
      `${named} already has an Override`,
    );
  }

  @Get()
  async list(): Promise<OverrideView[]> {
    const overrides = await this.overrides.find().sort({ _id: 1 }).lean();
    return overrides.map(withId);
  }

  // The next run restores the Scholarship as extracted, without the fix.
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    const removed =
      isValidObjectId(id) && (await this.overrides.findByIdAndDelete(id));
    if (!removed) throw new NotFoundException(`No Override ${id}`);
  }
}
