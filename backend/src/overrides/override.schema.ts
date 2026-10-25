import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export const OVERRIDE_ACTIONS = ['approve', 'replace'] as const;
export type OverrideAction = (typeof OVERRIDE_ACTIONS)[number];
// Lapsed: it names a field Criteria no longer check, or approves an
// extraction read again since; it stays lapsed until a reviewer replaces it.
export const OVERRIDE_RESULTS = [
  'applied',
  'invalid',
  'page changed',
  'lapsed',
] as const;
export type OverrideResult = (typeof OVERRIDE_RESULTS)[number];

// The results that skip an Override for the current text, each recorded with
// its problems: invalid (fixable by a corrected Override) or lapsed.
export type SkippedResult = Extract<OverrideResult, 'invalid' | 'lapsed'>;

export function isSkipped(
  result: OverrideResult | undefined,
): result is SkippedResult {
  return result === 'invalid' || result === 'lapsed';
}

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

  @Prop({ type: String, required: true, enum: OVERRIDE_ACTIONS })
  action: OverrideAction;

  // Only when replacing.
  @Prop({ type: [ReplacementCriterion], default: undefined })
  criteria?: ReplacementCriterion[];

  @Prop({ required: true })
  note: string;

  @Prop({ required: true })
  reviewedBy: string;

  // When the reviewer wrote it (set by the endpoint, or taken from the
  // overrides file); the Scholarship's reviewed at.
  @Prop({ required: true })
  reviewedAt: Date;

  // What the last Ingestion run that reached this Scholarship made of it.
  // Only Ingestion writes these.
  @Prop({ type: String, enum: OVERRIDE_RESULTS })
  lastResult?: OverrideResult;

  // Why it was skipped, when invalid or lapsed.
  @Prop({ type: [String], default: undefined })
  problems?: string[];
}

export const OverrideSchema = SchemaFactory.createForClass(Override);
OverrideSchema.index({ sourceUrl: 1, schemeName: 1 }, { unique: true });
