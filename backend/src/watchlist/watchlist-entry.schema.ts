import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SourceType = 'html' | 'pdf' | 'json';
export type LastResult =
  'ok' | 'unchanged' | 'needs_js' | 'empty' | 'failed' | 'not_found';

// How a many-scholarship source is split into sections.
@Schema({ _id: false })
export class SplitRule {
  @Prop()
  itemsPath?: string;

  @Prop()
  nameField?: string;

  @Prop()
  splitSelector?: string;

  @Prop()
  splitPattern?: string;
}

// One Official source we check for scholarships. Name, provider, type and
// official URL come from here, never from extraction.
@Schema({ collection: 'watchlist' })
export class WatchlistEntry {
  @Prop({ required: true, unique: true })
  url: string;

  @Prop({ type: String, required: true, enum: ['html', 'pdf', 'json'] })
  type: SourceType;

  @Prop({ type: String, required: true, enum: ['india', 'abroad'] })
  region: 'india' | 'abroad';

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  provider: string;

  @Prop({
    type: String,
    required: true,
    enum: ['government', 'corporate', 'university'],
  })
  scholarshipType: 'government' | 'corporate' | 'university';

  @Prop({ required: true })
  officialUrl: string;

  @Prop({ type: String, required: true, enum: ['one', 'many'], default: 'one' })
  holds: 'one' | 'many';

  @Prop({ type: SplitRule })
  split?: SplitRule;

  @Prop({
    type: String,
    enum: ['ok', 'unchanged', 'needs_js', 'empty', 'failed', 'not_found'],
  })
  lastResult?: LastResult;
}

export type WatchlistEntryDocument = HydratedDocument<WatchlistEntry>;
export const WatchlistEntrySchema =
  SchemaFactory.createForClass(WatchlistEntry);
