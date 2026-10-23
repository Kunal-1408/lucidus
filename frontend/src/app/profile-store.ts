import { Injectable, signal } from '@angular/core';
import { Profile } from './api';

// The Student's Profile, held only in the browser.
@Injectable({ providedIn: 'root' })
export class ProfileStore {
  readonly profile = signal<Profile>({});
}
