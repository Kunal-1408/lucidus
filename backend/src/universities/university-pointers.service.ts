import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UniversityPointer } from './university-pointer.schema.js';
import {
  POINTER_COUNTRIES,
  type PointerCountry,
  WORQNOW,
  type WorqNowClient,
  type WorqNowUniversity,
} from './worqnow.js';

// One destination's pointers as Match returns them: names only, under a
// label saying they were not checked against the Profile.
export interface UniversityPointerGroup {
  country: PointerCountry;
  label: string;
  names: string[];
}

// How refreshing one country's pointers went, for the run summary.
export interface UniversityPointerOutcome {
  country: PointerCountry;
  result: 'ok' | 'failed';
  // Why the refresh failed, for the operator.
  detail?: string;
}

// Resolves to backend/data from both src/universities and dist/universities.
const NAMES_FILE = join(
  import.meta.dirname,
  '..',
  '..',
  'data',
  'university-names.json',
);
// Names for WorqNow codes that don't title-case well ("ucl", "mit").
const CODE_NAMES = JSON.parse(readFileSync(NAMES_FILE, 'utf8')) as Record<
  string,
  string
>;

// The name for a university WorqNow lists without one.
function nameFromCode(code: string): string {
  return (
    CODE_NAMES[code] ??
    code
      .split(/[-_\s]+/)
      .filter((word) => word.length > 0)
      .map((word) => word[0].toUpperCase() + word.slice(1))
      .join(' ')
  );
}

const COUNTRY_NAMES: Record<PointerCountry, string> = {
  uk: 'the UK',
  usa: 'the USA',
  canada: 'Canada',
  australia: 'Australia',
};

// Keeps the University pointers collection in step with WorqNow and reads
// it back for a Student's destination.
@Injectable()
export class UniversityPointersService {
  constructor(
    @InjectModel(UniversityPointer.name)
    private readonly pointers: Model<UniversityPointer>,
    @Inject(WORQNOW) private readonly worqnow: WorqNowClient,
  ) {}

  // Replaces each country's pointers with WorqNow's current list. A country
  // whose fetch or write fails keeps its previous list and is reported as
  // failed.
  async refresh(): Promise<UniversityPointerOutcome[]> {
    const outcomes: UniversityPointerOutcome[] = [];
    for (const country of POINTER_COUNTRIES) {
      try {
        const universities =
          await this.worqnow.universitiesWithScholarships(country);
        await this.replace(country, universities);
        outcomes.push({ country, result: 'ok' });
      } catch (err) {
        outcomes.push({
          country,
          result: 'failed',
          detail: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return outcomes;
  }

  // Writes the new list before removing the old one, so a failed write
  // leaves the country's previous list in place.
  private async replace(
    country: PointerCountry,
    universities: WorqNowUniversity[],
  ): Promise<void> {
    const old = await this.pointers.find({ country }, { _id: 1 }).lean();
    const fresh = universities.map((u) => ({
      _id: new Types.ObjectId(),
      country,
      code: u.code,
      name: u.name ?? nameFromCode(u.code),
    }));
    try {
      await this.pointers.insertMany(fresh);
    } catch (err) {
      await this.pointers.deleteMany({ _id: { $in: fresh.map((p) => p._id) } });
      throw err;
    }
    await this.pointers.deleteMany({ _id: { $in: old.map((p) => p._id) } });
  }

  // The pointers for a destination, or none when WorqNow doesn't cover it
  // or lists no universities there.
  async forDestination(
    destination: unknown,
  ): Promise<UniversityPointerGroup[]> {
    const country = POINTER_COUNTRIES.find((c) => c === destination);
    if (!country) return [];
    const found = await this.pointers.find({ country }).lean();
    if (found.length === 0) return [];
    return [
      {
        country,
        label: `Universities in ${COUNTRY_NAMES[country]} with international scholarships. Not checked against your profile; see their site for details.`,
        names: found.map((p) => p.name).sort((a, b) => a.localeCompare(b)),
      },
    ];
  }
}
