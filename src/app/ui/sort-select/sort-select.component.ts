import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SortOption } from '../../models/operator.model';

/**
 * Sélecteur de tri générique.
 * Usage :
 *   <ui-sort-select [options]="sortOptions" [active]="currentSort" (change)="onSort($event)" />
 */
@Component({
  selector: 'ui-sort-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sort-select.component.html',
  styleUrl: './sort-select.component.scss',
})
export class SortSelectComponent {
  @Input() options: SortOption[] = [];
  @Input() active: string = '';
  @Input() label: string = 'Trier :';
  @Output() change = new EventEmitter<string>();
}
