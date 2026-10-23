import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Api } from '../api';
import { ProfileStore } from '../profile-store';

@Component({
  selector: 'app-results-page',
  imports: [DatePipe, RouterLink],
  templateUrl: './results-page.html',
})
export class ResultsPage {
  private readonly api = inject(Api);
  private readonly store = inject(ProfileStore);

  protected readonly result = toSignal(this.api.match(this.store.profile()));
}
