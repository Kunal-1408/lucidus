import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { POINTER_COUNTRIES, type PointerCountry } from './worqnow.js';

// A university known to offer international scholarships, listed only so
// the Student can look it up. Never a Scholarship and never matched.
@Schema({ collection: 'university_pointers' })
export class UniversityPointer {
  @Prop({ type: String, required: true, enum: POINTER_COUNTRIES })
  country: PointerCountry;

  // WorqNow's university code.
  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  name: string;
}

export const UniversityPointerSchema =
  SchemaFactory.createForClass(UniversityPointer);
