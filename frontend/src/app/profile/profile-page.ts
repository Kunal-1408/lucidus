import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  BOARDS,
  CATEGORIES,
  CITIZENSHIPS,
  CLASSES,
  DESTINATIONS,
  EXAMS,
  FIELDS_OF_STUDY,
  GENDERS,
  INCOME_BANDS,
  PARENT_OCCUPATIONS,
  Profile,
  SCHOOL_TYPES,
  STATES,
  STREAMS,
} from '../profile-fields';
import { applyChange, checkAnswer, visibleQuestions } from '../profile-rules';
import { ProfileStore } from '../profile-store';

// Profile fields answered by picking one option from a fixed list.
type ChoiceField =
  | 'domicileState'
  | 'schoolState'
  | 'schoolType'
  | 'citizenship'
  | 'board'
  | 'stream'
  | 'fieldOfStudy'
  | 'destination'
  | 'incomeBand'
  | 'gender'
  | 'category';
type YesNoField = 'boardsUpcoming' | 'minority' | 'disability' | 'singleGirlChild';
type MarksField = 'class10Marks' | 'latestMarks';
type MultiField = 'parentOccupation' | 'examsQualified';

@Component({
  selector: 'app-profile-page',
  templateUrl: './profile-page.html',
})
export class ProfilePage {
  private readonly store = inject(ProfileStore);
  private readonly router = inject(Router);

  protected readonly classes = CLASSES;
  protected readonly states = STATES;
  protected readonly genders = GENDERS;
  protected readonly categories = CATEGORIES;
  protected readonly incomeBands = INCOME_BANDS;
  protected readonly schoolTypes = SCHOOL_TYPES;
  protected readonly citizenships = CITIZENSHIPS;
  protected readonly boards = BOARDS;
  protected readonly streams = STREAMS;
  protected readonly fieldsOfStudy = FIELDS_OF_STUDY;
  protected readonly destinations = DESTINATIONS;
  protected readonly parentOccupations = PARENT_OCCUPATIONS;
  protected readonly exams = EXAMS;

  protected readonly profile = this.store.profile;
  protected readonly shown = computed(() => visibleQuestions(this.profile()));
  // Why the last answer typed into a marks field was not saved.
  protected readonly marksErrors = signal<Partial<Record<MarksField, string>>>({});
  // School state defaults to the domicile state until the Student changes it.
  protected readonly schoolState = computed(
    () => this.profile().schoolState ?? this.profile().domicileState,
  );

  protected setClass(value: string) {
    this.update({ class: value ? (Number(value) as Profile['class']) : undefined });
  }

  protected setChoice(field: ChoiceField, value: string) {
    this.update({ [field]: value || undefined });
  }

  protected yesNo(field: YesNoField): '' | 'yes' | 'no' {
    const answer = this.profile()[field];
    return answer === undefined ? '' : answer ? 'yes' : 'no';
  }

  protected setYesNo(field: YesNoField, value: string) {
    this.update({ [field]: value === '' ? undefined : value === 'yes' });
  }

  // An empty field clears the answer; an answer out of range is not saved and
  // the field says why.
  protected setMarks(field: MarksField, value: string) {
    const marks = value.trim() === '' ? undefined : Number(value);
    const error = marks === undefined ? undefined : checkAnswer(field, marks);
    this.marksErrors.update((errors) => ({ ...errors, [field]: error }));
    if (!error) this.update({ [field]: marks });
  }

  protected isPicked(field: MultiField, value: string): boolean {
    return (this.profile()[field] as string[] | undefined)?.includes(value) ?? false;
  }

  protected togglePicked(field: MultiField, value: string, picked: boolean) {
    const current = (this.profile()[field] as string[] | undefined) ?? [];
    let next = picked ? [...new Set([...current, value])] : current.filter((v) => v !== value);
    // "None of these" and a real occupation can't both be true.
    if (picked && field === 'parentOccupation') {
      next = value === 'none' ? ['none'] : next.filter((v) => v !== 'none');
    }
    this.update({ [field]: next.length ? next : undefined });
  }

  protected findScholarships() {
    void this.router.navigate(['/results']);
  }

  private update(change: Partial<Record<keyof Profile, unknown>>) {
    this.store.profile.update((p) => applyChange(p, change as Partial<Profile>));
  }
}
