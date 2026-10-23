import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Profile } from '../api';
import { ProfileStore } from '../profile-store';

@Component({
  selector: 'app-profile-page',
  templateUrl: './profile-page.html',
})
export class ProfilePage {
  private readonly store = inject(ProfileStore);
  private readonly router = inject(Router);

  protected readonly classes = [9, 10, 11, 12] as const;
  protected readonly genders = [
    { value: 'female', label: 'Female' },
    { value: 'male', label: 'Male' },
    { value: 'other', label: 'Other' },
  ] as const;
  protected readonly profile = this.store.profile;

  protected setClass(value: string) {
    this.update({ class: value ? (Number(value) as Profile['class']) : undefined });
  }

  protected setGender(value: string) {
    this.update({ gender: (value || undefined) as Profile['gender'] });
  }

  protected findScholarships() {
    void this.router.navigate(['/results']);
  }

  private update(change: Partial<Profile>) {
    this.store.profile.update((p) => ({ ...p, ...change }));
  }
}
