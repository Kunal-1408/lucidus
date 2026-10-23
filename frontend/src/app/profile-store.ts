import { effect, Injectable, signal } from '@angular/core';
import { Profile } from './profile-fields';

const STORAGE_KEY = 'scholarship-finder.profile';

// The Student's Profile, held only in the browser: remembered in local storage
// between visits and never sent anywhere except inside a Match request.
@Injectable({ providedIn: 'root' })
export class ProfileStore {
  readonly profile = signal<Profile>(load());

  constructor() {
    effect(() => save(this.profile()));
  }
}

function load(): Profile {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = saved ? JSON.parse(saved) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Profile)
      : {};
  } catch {
    return {};
  }
}

function save(profile: Profile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Storage blocked (private mode, quota): the Profile lasts for this visit only.
  }
}
