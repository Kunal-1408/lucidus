import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

// A Criterion compares one Profile field against a value, keeping the exact
// sentence it came from.
@Schema({ _id: false })
export class Criterion {
  @Prop({ required: true })
  field: string;

  @Prop({ type: String, required: true, enum: ['eq', 'in', 'lte', 'gte'] })
  op: 'eq' | 'in' | 'lte' | 'gte';

  @Prop({ type: Object, required: true })
  value: unknown;

  @Prop({ required: true })
  changeable: boolean;

  @Prop({ required: true })
  sourceText: string;

  @Prop({ type: String, required: true, enum: ['high', 'medium', 'low'] })
  confidence: ConfidenceLevel;
}

@Schema({ _id: false })
export class ExtraRequirement {
  @Prop({ required: true })
  text: string;

  @Prop({ required: true })
  sourceText: string;
}

// A Scholarship is identified by its source URL plus scheme name. It is never
// deleted; it goes inactive when its source stops listing it.
@Schema({ collection: 'scholarships' })
export class Scholarship {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  provider: string;

  @Prop({
    type: String,
    required: true,
    enum: ['government', 'corporate', 'university'],
  })
  type: 'government' | 'corporate' | 'university';

  @Prop({ required: true })
  amountText: string;

  @Prop()
  amount?: number;

  @Prop()
  currency?: string;

  // ISO date (YYYY-MM-DD); absent when the source doesn't announce one.
  @Prop()
  deadline?: string;

  @Prop({ required: true })
  officialUrl: string;

  @Prop({ required: true })
  sourceUrl: string;

  @Prop({ required: true })
  schemeName: string;

  @Prop({ required: true })
  contentHash: string;

  @Prop({ required: true })
  lastVerified: Date;

  @Prop({ type: String, required: true, enum: ['active', 'inactive'] })
  status: 'active' | 'inactive';

  @Prop({ type: String, required: true, enum: ['high', 'medium', 'low'] })
  confidence: ConfidenceLevel;

  @Prop({ required: true })
  needsReview: boolean;

  @Prop({ type: [Criterion], default: [] })
  criteria: Criterion[];

  @Prop({ type: [ExtraRequirement], default: [] })
  extraRequirements: ExtraRequirement[];

  @Prop()
  reviewedBy?: string;

  @Prop()
  reviewedAt?: Date;
}

export type ScholarshipDocument = HydratedDocument<Scholarship>;
export const ScholarshipSchema = SchemaFactory.createForClass(Scholarship);
ScholarshipSchema.index({ sourceUrl: 1, schemeName: 1 }, { unique: true });

// The filter for Scholarships a Student can see in results: listed and not
// awaiting review.
export const VISIBLE = { status: 'active', needsReview: false } as const;
