import {
  Body,
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
import { isValidObjectId, Model } from 'mongoose';
import { parseWatchlistEntry } from '../watchlist/watchlist-entry-input.js';
import { WatchlistEntry } from '../watchlist/watchlist-entry.schema.js';
import { rejected } from '../http-errors.js';
import { insertUnique, type View, withId } from './admin-records.js';
import { AdminTokenGuard } from './admin-token.guard.js';

export type WatchlistEntryView = View<WatchlistEntry>;

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
    if (!parsed.ok) throw rejected(parsed.reasons);
    const { url } = parsed.entry;
    return insertUnique(
      this.watchlist,
      { url },
      parsed.entry,
      `${url} is already on the Watchlist`,
    );
  }

  @Get()
  async list(): Promise<WatchlistEntryView[]> {
    const entries = await this.watchlist.find().sort({ _id: 1 }).lean();
    return entries.map(withId);
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
