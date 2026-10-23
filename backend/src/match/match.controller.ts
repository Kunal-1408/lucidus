import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CLOCK, type Clock } from '../clock.js';
import { Scholarship } from '../scholarships/scholarship.schema.js';
import {
  type PointerGroup,
  UniversityPointersService,
} from '../universities/university-pointers.service.js';
import { match, MatchResult } from './matcher.js';
import type { Profile } from './profile.js';

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
    @Body() profile: Profile,
  ): Promise<MatchResult & { universityPointers: PointerGroup[] }> {
    const visible = await this.scholarships
      .find({ status: 'active', needsReview: false })
      .lean();
    const result = match(
      profile ?? {},
      visible.map((s) => Object.assign(s, { id: s._id.toString() })),
      indiaDate(this.clock.now()),
    );
    // Pointers sit beside the Matcher's results and never pass through it.
    return {
      ...result,
      universityPointers: await this.universityPointers.forDestination(
        profile?.destination,
      ),
    };
  }
}

// Students are in India, so "today" is the date in India Standard Time.
function indiaDate(now: Date): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}
