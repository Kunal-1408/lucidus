import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

// Request and response types, duplicated from the backend on purpose:
// there is no shared types package.

// Every field is optional; more fields arrive with the full Profile form.
export interface Profile {
  class?: 9 | 10 | 11 | 12;
  gender?: 'female' | 'male' | 'other';
}

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

  match(profile: Profile): Observable<MatchResult> {
    return this.http.post<MatchResult>('/api/match', profile);
  }
}
