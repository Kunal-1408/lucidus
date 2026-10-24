import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Profile } from './profile-fields';
import { profileForMatch } from './profile-rules';

// Request and response types, duplicated from the backend on purpose:
// there is no shared types package.

export type { Profile } from './profile-fields';

// A condition no Profile field answers, with its source sentence.
export interface ExtraRequirement {
  text: string;
  sourceText: string;
}

export interface Card {
  id: string;
  name: string;
  provider: string;
  amountText: string;
  officialUrl: string;
  deadline?: string;
  deadlineStatus: 'open' | 'closing_soon' | 'closed' | 'not_announced';
  lastVerified: string;
  // Medium cards carry a "verify on the official site" warning.
  confidence: 'high' | 'medium' | 'low';
  // Shown as "Also requires: …", never matched.
  extraRequirements: ExtraRequirement[];
  // What would turn a Within reach card Eligible; empty in other buckets.
  goals: string[];
  // Profile fields left empty that this scholarship checks.
  missing: { field: string; label: string }[];
}

export interface MatchResult {
  prompts: unknown[];
  eligible: Card[];
  withinReach: Card[];
  tellUsMore: Card[];
  // At most one group, for a destination WorqNow covers.
  universityPointers: UniversityPointerGroup[];
}

// Universities listed by name only, never checked against the Profile.
export interface UniversityPointerGroup {
  country: 'uk' | 'usa' | 'canada' | 'australia';
  label: string;
  names: string[];
}

// Why a Saved card shows what it shows: the live scholarship (possibly
// updated since it was saved), or the snapshot taken when it was saved.
export type SavedState = 'live' | 'updated' | 'no_longer_listed' | 'being_rechecked';

export interface SavedCard {
  id: string;
  scholarshipId: string;
  savedAt: string;
  state: SavedState;
  card: Pick<
    Card,
    | 'name'
    | 'provider'
    | 'amountText'
    | 'officialUrl'
    | 'deadline'
    | 'deadlineStatus'
    | 'lastVerified'
    | 'confidence'
    | 'extraRequirements'
  >;
}

@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);

  // The only call that ever carries the Profile off the device.
  match(profile: Profile): Observable<MatchResult> {
    return this.http.post<MatchResult>('/api/match', profileForMatch(profile));
  }

  // Saved scholarships are keyed by the Visitor ID header the interceptor adds.
  saved(): Observable<SavedCard[]> {
    return this.http.get<SavedCard[]>('/api/saved');
  }

  save(scholarshipId: string): Observable<SavedCard> {
    return this.http.post<SavedCard>('/api/saved', { scholarshipId });
  }

  unsave(savedId: string): Observable<void> {
    return this.http.delete<void>(`/api/saved/${savedId}`);
  }
}
