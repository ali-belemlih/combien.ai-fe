import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';

/**
 * Champ de recherche générique avec debounce intégré.
 * Usage :
 *   <ui-search-input placeholder="Rechercher..." (search)="onSearch($event)" />
 */
@Component({
  selector: 'ui-search-input',
  standalone: true,
  imports: [FormsModule, InputTextModule, ButtonModule],
  templateUrl: './search-input.component.html',
  styleUrl: './search-input.component.scss',
})
export class SearchInputComponent {
  @Input() placeholder = 'Rechercher...';
  @Output() search = new EventEmitter<string>();

  value = '';
  private _timer: ReturnType<typeof setTimeout> | null = null;

  onInput(val: string): void {
    if (this._timer) clearTimeout(this._timer);
    this._timer = setTimeout(() => this.search.emit(val), 300);
  }

  clear(): void {
    this.value = '';
    this.search.emit('');
  }
}
