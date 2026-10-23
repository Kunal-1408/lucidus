import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { UniversityPointerOutcome } from '../universities/university-pointers.service.js';
import type { RunCounts, RunState, SourceOutcome } from './run-summary.js';

// One Ingestion run's record, written as the run goes so its summary can be
// read while it is still running.
@Schema({ collection: 'ingestion_runs' })
export class IngestionRun {
  @Prop({
    type: String,
    required: true,
    enum: ['running', 'finished', 'failed', 'interrupted'],
  })
  state: RunState;

  @Prop({ required: true })
  startedAt: Date;

  @Prop()
  finishedAt?: Date;

  // Kept schemaless so a new counter or outcome field needs no migration.
  @Prop({ type: Object, required: true })
  counts: RunCounts;

  @Prop({ type: [Object], default: [] })
  sources: SourceOutcome[];

  @Prop({ type: [Object], default: [] })
  universityPointers: UniversityPointerOutcome[];
}

export const IngestionRunSchema = SchemaFactory.createForClass(IngestionRun);
