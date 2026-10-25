import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { COUNTRIES, REGIONS } from '../countries';
import { CURRENCIES } from '../currencies';
import {
  BOARDS,
  CATEGORIES,
  CITIZENSHIPS,
  CLASSES,
  EXAMS,
  FieldOfStudyGroup,
  FIELDS_OF_STUDY,
  GENDERS,
  INCOME_BANDS,
  IncomeAmount,
  PARENT_OCCUPATIONS,
  Profile,
  RESIDENCE_STATUSES,
  RESULT_SCALES,
  ResultScale,
  SCHOOL_TYPES,
  STATES,
  STREAMS,
} from '../profile-fields';
import {
  applyChange,
  applyScaleChange,
  BOARD_MARKS_FIELDS,
  BoardMarksQuestion,
  boardMarksLabel,
  checkAnswer,
  findSubjects,
  incomeCurrency,
  readResult,
  resultScale,
  shownResult,
  SLOT_SCALES,
  subjectAnswer,
  TEST_SCORE_RANGES,
  subjectNote,
  TestScoreField,
  visibleQuestions,
} from '../profile-rules';
import { ProfileStore } from '../profile-store';

// Profile fields answered by picking one option from a fixed list.
type ChoiceField =
  | 'countryOfResidence'
  | 'region'
  | 'homeState'
  | 'residenceStatus'
  | 'citizenshipCountry'
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
type MultiField = 'parentOccupation' | 'examsQualified';

// The test scores, each asked as a number in its range.
const TEST_SCORES = (
  [
    ['atar', 'ATAR', 0.05],
    ['sat', 'SAT score', 10],
  ] as const
).map(([question, label, step]) => {
  const [min, max] = TEST_SCORE_RANGES[question];
  return { question, label, step, min, max };
});

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
  protected readonly parentOccupations = PARENT_OCCUPATIONS;
  protected readonly exams = EXAMS;
  protected readonly countries = COUNTRIES;
  protected readonly residenceStatuses = RESIDENCE_STATUSES;
  protected readonly currencies = CURRENCIES;
  protected readonly boardMarksQuestions = BOARD_MARKS_FIELDS;
  protected readonly boardMarksLabel = boardMarksLabel;
  protected readonly testScores = TEST_SCORES;
  // Why the last score typed into a test score field was not saved.
  protected readonly scoreErrors = signal<Partial<Record<TestScoreField, string>>>({});

  protected readonly profile = this.store.profile;
  protected readonly shown = computed(() => visibleQuestions(this.profile()));
  // The states or regions of the country the Student lives in.
  protected readonly regions = computed(
    () => REGIONS[this.profile().countryOfResidence ?? ''] ?? [],
  );
  // Why the last answer typed into a Board marks field was not saved.
  protected readonly marksErrors = signal<Partial<Record<BoardMarksQuestion, string>>>({});
  // The scale the Student picked for each Board marks question, if any.
  private readonly pickedScales = signal<Partial<Record<BoardMarksQuestion, ResultScale>>>({});
  protected readonly shownResult = shownResult;
  // The currency of the family income amount: one picked before any amount
  // is typed, else the answer's, else the country's own.
  private readonly pickedCurrency = signal<string | undefined>(undefined);
  protected readonly incomeCurrency = computed(
    () => this.pickedCurrency() ?? incomeCurrency(this.profile()),
  );
  // Why the last amount typed was not saved.
  protected readonly incomeError = signal<string | undefined>(undefined);
  // What the Student has typed into the subject search so far.
  protected readonly subjectQuery = signal('');
  protected readonly subjectOptions = computed(() => findSubjects(this.subjectQuery()));
  protected readonly subjectNote = computed(() => subjectNote(this.profile()));

  protected groupLabel(group: FieldOfStudyGroup): string {
    return FIELDS_OF_STUDY.find((option) => option.value === group)?.label ?? '';
  }

  // A listed subject sets its group; any other subject counts as Other.
  protected setSubject(value: string) {
    this.subjectQuery.set('');
    this.update(subjectAnswer(value));
  }

  protected setClass(value: string) {
    this.update({ class: value ? (Number(value) as Profile['class']) : undefined });
  }

  protected setChoice(field: ChoiceField, value: string) {
    // A new country offers its own currency again.
    if (field === 'countryOfResidence') this.pickedCurrency.set(undefined);
    this.update({ [field]: value || undefined });
  }

  protected setIncomeCurrency(currency: string) {
    this.pickedCurrency.set(currency || undefined);
    const amount = this.profile().incomeAmount;
    if (amount !== undefined) this.setIncomeAmount(String(amount.value));
  }

  // An empty field clears the answer; an amount that can't be saved isn't,
  // and the field says why.
  protected setIncomeAmount(value: string) {
    const answer: IncomeAmount | undefined =
      value.trim() === ''
        ? undefined
        : { currency: this.incomeCurrency() ?? '', value: Number(value) };
    const error = answer === undefined ? undefined : checkAnswer('incomeAmount', answer);
    this.incomeError.set(error);
    if (!error) this.update({ incomeAmount: answer });
  }

  protected yesNo(field: YesNoField): '' | 'yes' | 'no' {
    const answer = this.profile()[field];
    return answer === undefined ? '' : answer ? 'yes' : 'no';
  }

  protected setYesNo(field: YesNoField, value: string) {
    this.update({ [field]: value === '' ? undefined : value === 'yes' });
  }

  // The scale each Board marks question is answered on (see resultScale).
  protected scaleOf(question: BoardMarksQuestion): ResultScale {
    return resultScale(question, this.profile(), this.pickedScales()[question]);
  }

  protected scalesFor(question: BoardMarksQuestion) {
    return RESULT_SCALES.filter((option) => SLOT_SCALES[question].includes(option.value));
  }

  // The rules clear a result on the old scale (applyScaleChange).
  protected setScale(question: BoardMarksQuestion, value: string) {
    const scale = value as ResultScale;
    this.pickedScales.update((picked) => ({ ...picked, [question]: scale }));
    this.marksErrors.update((errors) => ({ ...errors, [question]: undefined }));
    this.store.profile.update((p) => applyScaleChange(p, question, scale));
  }

  // A change of board resets the scales to the new board's presets (the
  // rules clear the results).
  protected setBoard(value: string) {
    this.pickedScales.set({});
    this.setChoice('board', value);
  }

  // An empty field clears the answer; an answer out of range is not saved and
  // the field says why.
  protected setMarks(question: BoardMarksQuestion, typed: string) {
    const result = readResult(this.scaleOf(question), typed);
    const error = result === undefined ? undefined : checkAnswer(question, result);
    this.marksErrors.update((errors) => ({ ...errors, [question]: error }));
    if (!error) this.update({ [question]: result });
  }

  // An empty field clears the score; a score out of range is not saved and
  // the field says why.
  protected setTestScore(question: TestScoreField, typed: string) {
    const score = typed.trim() === '' ? undefined : Number(typed);
    const error = score === undefined ? undefined : checkAnswer(question, score);
    this.scoreErrors.update((errors) => ({ ...errors, [question]: error }));
    if (!error) this.update({ [question]: score });
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
