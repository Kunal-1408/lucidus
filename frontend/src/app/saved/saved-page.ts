import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api, SavedCard } from '../api';

@Component({
  selector: 'app-saved-page',
  imports: [DatePipe, RouterLink],
  templateUrl: './saved-page.html',
})
export class SavedPage {
  private readonly api = inject(Api);

  // Undefined until the list has loaded.
  protected readonly items = signal<SavedCard[] | undefined>(undefined);

  constructor() {
    this.api.saved().subscribe((items) => this.items.set(items));
  }

  protected remove(item: SavedCard): void {
    this.api.unsave(item.id).subscribe(() => {
      this.items.update((items) => items?.filter((i) => i.id !== item.id));
    });
  }
}
