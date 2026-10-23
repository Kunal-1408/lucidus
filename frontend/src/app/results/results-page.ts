import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Api, Card } from '../api';
import { ProfileStore } from '../profile-store';

@Component({
  selector: 'app-results-page',
  imports: [DatePipe, NgTemplateOutlet, RouterLink],
  templateUrl: './results-page.html',
})
export class ResultsPage {
  private readonly api = inject(Api);
  private readonly store = inject(ProfileStore);

  protected readonly result = toSignal(this.api.match(this.store.profile()));

  protected missingLabels(card: Card): string {
    const labels = card.missing.map((m) => m.label);
    if (labels.length <= 1) return labels.join('');
    return `${labels.slice(0, -1).join(', ')} and ${labels.at(-1)}`;
  }
}
