import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CLOCK, type Clock } from '../clock.js';
import { Scholarship } from '../scholarships/scholarship.schema.js';
import { match, MatchResult } from './matcher.js';
import type { Profile } from './profile.js';

@Controller('match')
export class MatchController {
  constructor(
    @InjectModel(Scholarship.name)
    private readonly scholarships: Model<Scholarship>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  @Post()
  @HttpCode(200)
  async match(@Body() profile: Profile): Promise<MatchResult> {
    const visible = await this.scholarships
      .find({ status: 'active', needsReview: false })
      .lean();
    return match(
      profile ?? {},
      visible.map((s) => Object.assign(s, { id: s._id.toString() })),
      indiaDate(this.clock.now()),
    );
  }
}

// Students are in India, so "today" is the date in India Standard Time.
function indiaDate(now: Date): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}
