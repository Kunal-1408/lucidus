import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { ConfidenceLevel } from '../scholarships/scholarship.schema.js';

// How a card looked when the Visitor saved it. Deadline status is left out:
// it depends on the day the Saved list is read.
export interface CardSnapshot {
  name: string;
  provider: string;
  amountText: string;
  officialUrl: string;
  deadline?: string;
  lastVerified: string;
  confidence: ConfidenceLevel;
}

// A scholarship a Visitor kept, with a snapshot so it stays readable if the
// scholarship later changes or goes inactive.
@Schema({ collection: 'saved_scholarships' })
export class SavedScholarship {
  @Prop({ required: true, index: true })
  visitorId: string;

  // The scholarship key: source URL plus scheme name.
  @Prop({ required: true })
  sourceUrl: string;

  @Prop({ required: true })
  schemeName: string;

  @Prop({ type: Object, required: true })
  snapshot: CardSnapshot;

  @Prop({ required: true })
  contentHash: string;

  @Prop({ required: true })
  savedAt: Date;
}

export const SavedScholarshipSchema =
  SchemaFactory.createForClass(SavedScholarship);
SavedScholarshipSchema.index(
  { visitorId: 1, sourceUrl: 1, schemeName: 1 },
  { unique: true },
);
