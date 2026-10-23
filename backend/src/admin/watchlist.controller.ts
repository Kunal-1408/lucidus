import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { parseWatchlistEntry } from '../watchlist/watchlist-entry-input.js';
import { WatchlistEntry } from '../watchlist/watchlist-entry.schema.js';
import { AdminTokenGuard } from './admin-token.guard.js';

export type WatchlistEntryView = WatchlistEntry & { id: string };

// The operator's handle on the Watchlist: adding a source here needs no code
// change or redeploy; the next Ingestion run picks it up.
@Controller('admin/watchlist')
@UseGuards(AdminTokenGuard)
export class WatchlistController {
  constructor(
    @InjectModel(WatchlistEntry.name)
    private readonly watchlist: Model<WatchlistEntry>,
  ) {}

  @Post()
  async add(@Body() body: unknown): Promise<WatchlistEntryView> {
    const parsed = parseWatchlistEntry(body);
    if (!parsed.ok) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.reasons,
      });
    }
    const { url } = parsed.entry;
    const duplicate = () =>
      new ConflictException(`${url} is already on the Watchlist`);
    // Checked up front too, since the unique index may still be building.
    if (await this.watchlist.exists({ url })) throw duplicate();
    try {
      const created = await this.watchlist.create(parsed.entry);
      return toView(created.toObject());
    } catch (err) {
      throw isDuplicateKey(err) ? duplicate() : err;
    }
  }

  @Get()
  async list(): Promise<WatchlistEntryView[]> {
    const entries = await this.watchlist.find().sort({ _id: 1 }).lean();
    return entries.map(toView);
  }

  // Removes the source only. Its Scholarships stay listed until the next
  // Ingestion run marks them inactive.
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    const removed =
      isValidObjectId(id) && (await this.watchlist.findByIdAndDelete(id));
    if (!removed) throw new NotFoundException(`No Watchlist entry ${id}`);
  }
}

function toView(
  doc: WatchlistEntry & { _id: Types.ObjectId; __v?: number },
): WatchlistEntryView {
  const { _id, __v: _version, ...entry } = doc;
  return { id: _id.toHexString(), ...entry };
}

function isDuplicateKey(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: unknown }).code === 11000
  );
}
