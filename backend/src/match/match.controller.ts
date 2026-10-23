import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Scholarship } from '../scholarships/scholarship.schema.js';
import { match, MatchResult } from './matcher.js';
import type { Profile } from './profile.js';

@Controller('match')
export class MatchController {
  constructor(
    @InjectModel(Scholarship.name)
    private readonly scholarships: Model<Scholarship>,
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
    );
  }
}
