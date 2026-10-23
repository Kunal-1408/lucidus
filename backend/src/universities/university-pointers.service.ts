import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UniversityPointer } from './university-pointer.schema.js';
import {
  POINTER_COUNTRIES,
  type PointerCountry,
  WORQNOW,
  type WorqNowClient,
} from './worqnow.js';

// One destination's pointers as Match returns them: names only, under a
// label saying they were not checked against the Profile.
export interface PointerGroup {
  country: PointerCountry;
  label: string;
  names: string[];
}

export interface PointerRefreshFailure {
  country: PointerCountry;
  detail: string;
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
  // whose fetch fails keeps its previous list and is returned as a failure.
  async refresh(): Promise<PointerRefreshFailure[]> {
    const failures: PointerRefreshFailure[] = [];
    for (const country of POINTER_COUNTRIES) {
      try {
        const universities =
          await this.worqnow.universitiesWithScholarships(country);
        await this.pointers.deleteMany({ country });
        await this.pointers.insertMany(
          universities.map((u) => ({
            country,
            code: u.code,
            name: u.name ?? nameFromCode(u.code),
          })),
        );
      } catch (err) {
        failures.push({
          country,
          detail: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return failures;
  }

  // The pointers for a destination, or none when WorqNow doesn't cover it.
  async forDestination(destination: unknown): Promise<PointerGroup[]> {
    const country = POINTER_COUNTRIES.find((c) => c === destination);
    if (!country) return [];
    const found = await this.pointers.find({ country }).lean();
    return [
      {
        country,
        label: `Universities in ${COUNTRY_NAMES[country]} with international scholarships. Not checked against your profile; see their site for details.`,
        names: found.map((p) => p.name).sort((a, b) => a.localeCompare(b)),
      },
    ];
  }
}
