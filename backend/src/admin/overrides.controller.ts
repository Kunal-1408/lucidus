import {
  Body,
  ConflictException,
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
import { isValidObjectId, Model, Types } from 'mongoose';
import { CLOCK, type Clock } from '../clock.js';
import { parseOverride } from '../overrides/override-input.js';
import { Override } from '../overrides/override.schema.js';
import { Scholarship } from '../scholarships/scholarship.schema.js';
import { scholarshipKey } from '../scholarships/scholarship-key.js';
import { AdminTokenGuard } from './admin-token.guard.js';
import { isDuplicateKey, rejected } from './admin-errors.js';

export type OverrideView = Override & { id: string };

// The reviewer's fixes, sent from Postman. A new Override takes effect on
// the next Ingestion run, with no redeploy.
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
    if (!(await this.scholarships.exists(key))) {
      throw rejected([
        `No Scholarship ${key.schemeName} from ${key.sourceUrl}`,
      ]);
    }
    const duplicate = () =>
      new ConflictException(
        `${key.schemeName} from ${key.sourceUrl} already has an Override`,
      );
    // Checked up front too, since the unique index may still be building.
    if (await this.overrides.exists(key)) throw duplicate();
    try {
      const created = await this.overrides.create({
        ...parsed.override,
        reviewedAt: this.clock.now(),
      });
      return toView(created.toObject());
    } catch (err) {
      throw isDuplicateKey(err) ? duplicate() : err;
    }
  }

  @Get()
  async list(): Promise<OverrideView[]> {
    const overrides = await this.overrides.find().sort({ _id: 1 }).lean();
    return overrides.map(toView);
  }

  // The Scholarship is extracted afresh on the next run, without the fix.
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    const removed =
      isValidObjectId(id) && (await this.overrides.findByIdAndDelete(id));
    if (!removed) throw new NotFoundException(`No Override ${id}`);
  }
}

function toView(
  doc: Override & { _id: Types.ObjectId; __v?: number },
): OverrideView {
  const { _id, __v: _version, ...override } = doc;
  return { id: _id.toHexString(), ...override };
}
