import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FilterOption } from '../../models/operator.model';

/**
 * Barre de filtres générique — réutilisable dans n'importe quelle interface.
 * Usage :
 *   <ui-filter-bar [options]="myOptions" [active]="current" (change)="onFilter($event)" />
 */
@Component({
  selector: 'ui-filter-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './filter-bar.component.html',
  styleUrl: './filter-bar.component.scss',
})
export class FilterBarComponent {
  @Input() options: FilterOption[] = [];
  @Input() active: string = '';
  @Input() label: string = '';
  @Output() change = new EventEmitter<string>();
}
