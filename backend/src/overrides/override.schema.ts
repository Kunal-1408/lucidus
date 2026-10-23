import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OverrideAction = 'approve' | 'replace';
export type OverrideResult = 'applied' | 'invalid' | 'page changed';

// A corrected Criterion as the reviewer writes it: the field, its raw
// value(s) as the fixed lists name them (as the LLM gives them), and the
// sentence on the page it comes from. The code sets op and changeability.
@Schema({ _id: false })
export class ReplacementCriterion {
  @Prop({ required: true })
  field: string;

  @Prop({ type: [String], required: true })
  values: string[];

  @Prop({ required: true })
  sourceText: string;
}

// A person's fix for one Scholarship, holding only for the page text (the
// section's content hash) it was written against. One per Scholarship.
@Schema({ collection: 'overrides' })
export class Override {
  @Prop({ required: true })
  sourceUrl: string;

  @Prop({ required: true })
  schemeName: string;

  @Prop({ required: true })
  contentHash: string;

  @Prop({ type: String, required: true, enum: ['approve', 'replace'] })
  action: OverrideAction;

  // Only when replacing.
  @Prop({ type: [ReplacementCriterion], default: undefined })
  criteria?: ReplacementCriterion[];

  @Prop({ required: true })
  note: string;

  @Prop({ required: true })
  reviewedBy: string;

  // When the Override was written; the Scholarship's reviewed at.
  @Prop({ required: true })
  reviewedAt: Date;

  // What the last Ingestion run that reached this Scholarship made of it.
  // Only Ingestion writes these.
  @Prop({ type: String, enum: ['applied', 'invalid', 'page changed'] })
  lastResult?: OverrideResult;

  // Why it was skipped, when invalid.
  @Prop({ type: [String], default: undefined })
  problems?: string[];
}

export type OverrideDocument = HydratedDocument<Override>;
export const OverrideSchema = SchemaFactory.createForClass(Override);
OverrideSchema.index({ sourceUrl: 1, schemeName: 1 }, { unique: true });
