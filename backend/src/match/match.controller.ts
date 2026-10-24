import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { rejected } from '../admin/admin-errors.js';
import { CLOCK, type Clock, indiaDate } from '../clock.js';
import { Scholarship, VISIBLE } from '../scholarships/scholarship.schema.js';
import {
  type UniversityPointerGroup,
  UniversityPointersService,
} from '../universities/university-pointers.service.js';
import { match, MatchResult } from './matcher.js';
import { parseProfile } from './profile-input.js';

@Controller('match')
export class MatchController {
  constructor(
    @InjectModel(Scholarship.name)
    private readonly scholarships: Model<Scholarship>,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly universityPointers: UniversityPointersService,
  ) {}

  @Post()
  @HttpCode(200)
  async match(
    @Body() body: unknown,
  ): Promise<MatchResult & { universityPointers: UniversityPointerGroup[] }> {
    const parsed = parseProfile(body);
    if (!parsed.ok) throw rejected(parsed.reasons);
    const { profile } = parsed;
    const visible = await this.scholarships.find(VISIBLE).lean();
    const result = match(
      profile,
      visible.map((s) => Object.assign(s, { id: s._id.toString() })),
      indiaDate(this.clock.now()),
    );
    // Pointers sit beside the Matcher's results and never pass through it.
    return {
      ...result,
      universityPointers: await this.universityPointers.forDestination(
        profile.destination,
      ),
    };
  }
}
