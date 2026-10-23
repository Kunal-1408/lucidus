import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

// A seed file URL the seeder has already put on the Watchlist once, so an
// operator's removal outlasts the next boot.
@Schema({ collection: 'watchlist_seeded' })
export class SeededSource {
  @Prop({ required: true, unique: true })
  url: string;
}

export const SeededSourceSchema = SchemaFactory.createForClass(SeededSource);
