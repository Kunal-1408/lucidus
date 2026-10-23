import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { CLOCK, type Clock, indiaDate } from '../clock.js';
import { deadlineStatus, type DeadlineStatus } from '../match/matcher.js';
import { scholarshipKey } from '../scholarships/scholarship-key.js';
import { Scholarship, VISIBLE } from '../scholarships/scholarship.schema.js';
import { CardSnapshot, SavedScholarship } from './saved-scholarship.schema.js';

export type SavedState =
  'live' | 'updated' | 'no_longer_listed' | 'being_rechecked';

export interface SavedCard {
  id: string;
  scholarshipId: string;
  savedAt: string;
  state: SavedState;
  card: CardSnapshot & { deadlineStatus: DeadlineStatus };
}

@Controller('saved')
export class SavedController {
  constructor(
    @InjectModel(SavedScholarship.name)
    private readonly saved: Model<SavedScholarship>,
    @InjectModel(Scholarship.name)
    private readonly scholarships: Model<Scholarship>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  @Post()
  async save(
    @Headers('x-visitor-id') visitorId: string | undefined,
    @Body() body: { scholarshipId?: unknown },
  ): Promise<SavedCard> {
    const visitor = requireVisitor(visitorId);
    const id = body?.scholarshipId;
    // Saving is only from Results cards, so only a visible Scholarship can
    // be saved.
    const scholarship =
      typeof id === 'string' && isValidObjectId(id)
        ? await this.scholarships.findOne({ _id: id, ...VISIBLE }).lean()
        : null;
    if (!scholarship)
      throw new NotFoundException(`No scholarship ${String(id)}`);

    // Saving again keeps the first save and its snapshot.
    const key = { visitorId: visitor, ...scholarshipKey(scholarship) };
    const saved = await this.saved.findOneAndUpdate(
      key,
      {
        $setOnInsert: {
          ...key,
          snapshot: snapshotOf(scholarship),
          contentHash: scholarship.contentHash,
          savedAt: this.clock.now(),
        },
      },
      { upsert: true, returnDocument: 'after', lean: true },
    );
    if (!saved) throw new Error('Upsert returned no saved scholarship');
    return this.toCard(saved, scholarship);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Headers('x-visitor-id') visitorId: string | undefined,
    @Param('id') id: string,
  ): Promise<void> {
    const visitor = requireVisitor(visitorId);
    const removed = isValidObjectId(id)
      ? await this.saved.deleteOne({ _id: id, visitorId: visitor })
      : { deletedCount: 0 };
    if (removed.deletedCount === 0) {
      throw new NotFoundException(`No saved scholarship ${id}`);
    }
  }

  @Get()
  async list(
    @Headers('x-visitor-id') visitorId: string | undefined,
  ): Promise<SavedCard[]> {
    const visitor = requireVisitor(visitorId);
    const saved = await this.saved
      .find({ visitorId: visitor })
      .sort({ savedAt: -1 })
      .lean();
    return Promise.all(
      saved.map(async (item) => {
        const live = await this.scholarships
          .findOne(scholarshipKey(item))
          .lean();
        return this.toCard(item, live);
      }),
    );
  }

  private toCard(
    item: SavedScholarship & { _id: Types.ObjectId },
    live: (Scholarship & { _id: Types.ObjectId }) | null,
  ): SavedCard {
    const state = stateOf(item, live);
    const card =
      live && (state === 'live' || state === 'updated')
        ? snapshotOf(live)
        : item.snapshot;
    return {
      id: item._id.toString(),
      // Scholarships are never deleted, so the live record is always found.
      scholarshipId: live?._id.toString() ?? '',
      savedAt: item.savedAt.toISOString(),
      state,
      card: {
        ...card,
        extraRequirements: card.extraRequirements ?? [],
        deadlineStatus: deadlineStatus(
          card.deadline,
          indiaDate(this.clock.now()),
        ),
      },
    };
  }
}

// Live state wins while the scholarship is listed; otherwise the snapshot
// is shown with the reason.
function stateOf(item: SavedScholarship, live: Scholarship | null): SavedState {
  if (!live || live.status === 'inactive') return 'no_longer_listed';
  if (live.needsReview) return 'being_rechecked';
  return live.contentHash !== item.contentHash ? 'updated' : 'live';
}

function requireVisitor(visitorId: string | undefined): string {
  const visitor = visitorId?.trim();
  if (!visitor) throw new BadRequestException('Missing x-visitor-id header');
  return visitor;
}

function snapshotOf(scholarship: Scholarship): CardSnapshot {
  return {
    name: scholarship.name,
    provider: scholarship.provider,
    amountText: scholarship.amountText,
    officialUrl: scholarship.officialUrl,
    deadline: scholarship.deadline,
    lastVerified: scholarship.lastVerified.toISOString(),
    confidence: scholarship.confidence,
    extraRequirements: scholarship.extraRequirements.map(
      ({ text, sourceText }) => ({ text, sourceText }),
    ),
  };
}
