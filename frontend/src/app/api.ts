import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Profile, profileForMatch } from './profile-fields';

// Request and response types, duplicated from the backend on purpose:
// there is no shared types package.

export type { Profile } from './profile-fields';

export interface Card {
  id: string;
  name: string;
  provider: string;
  amountText: string;
  officialUrl: string;
  deadline?: string;
  lastVerified: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface MatchResult {
  prompts: unknown[];
  eligible: Card[];
  withinReach: Card[];
  tellUsMore: Card[];
  universityPointers: unknown[];
}

@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);

  // The only call that ever carries the Profile off the device.
  match(profile: Profile): Observable<MatchResult> {
    return this.http.post<MatchResult>('/api/match', profileForMatch(profile));
  }
}
