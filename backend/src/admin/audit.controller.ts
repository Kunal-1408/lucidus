import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, type Types } from 'mongoose';
import {
  type AuditProblem,
  criterionProblem,
} from '../scholarships/criterion-audit.js';
import { Scholarship } from '../scholarships/scholarship.schema.js';
import { AdminTokenGuard } from './admin-token.guard.js';

// A stored Criterion no valid Profile could ever satisfy, with its
// Scholarship and the sentence it came from. The Scholarship's name and
// source URL are the key an Override for it is written under.
export interface AuditEntry {
  scholarshipId: string;
  scholarshipName: string;
  sourceUrl: string;
  field: string;
  value: unknown;
  sourceText: string;
  problem: AuditProblem;
}

// The operator's check of live data, run by hand through the admin script
// (`scripts/admin.mjs audit`), never in CI: every listed Scholarship's
// Criteria with an unknown field, a value outside the fixed lists, or an
// unsupported scale or currency.
@Controller('admin/audit')
@UseGuards(AdminTokenGuard)
export class AuditController {
  constructor(
    @InjectModel(Scholarship.name)
    private readonly scholarships: Model<Scholarship>,
  ) {}

  @Get()
  async audit(): Promise<AuditEntry[]> {
    const listed = await this.scholarships
      .find({ status: 'active' })
      .sort({ sourceUrl: 1, schemeName: 1 })
      .lean<(Scholarship & { _id: Types.ObjectId })[]>();
    return listed.flatMap((scholarship) =>
      scholarship.criteria.flatMap((criterion) => {
        const problem = criterionProblem(criterion);
        if (!problem) return [];
        return [
          {
            scholarshipId: scholarship._id.toHexString(),
            scholarshipName: scholarship.name,
            sourceUrl: scholarship.sourceUrl,
            field: criterion.field,
            value: criterion.value,
            sourceText: criterion.sourceText,
            problem,
          },
        ];
      }),
    );
  }
}
