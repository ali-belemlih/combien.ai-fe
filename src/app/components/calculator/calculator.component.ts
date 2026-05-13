import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SliderModule } from 'primeng/slider';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { Operator } from '../../models/operator.model';
import { OperatorService } from '../../services/operator.service';

@Component({
  selector: 'app-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule, SliderModule, ButtonModule, CardModule, TagModule],
  templateUrl: './calculator.component.html',
  styleUrl: './calculator.component.scss',
})
export class CalculatorComponent implements OnChanges {
  @Input() operators: Operator[] = [];

  monthlyMo = 1000;
  sliderMin = 50;
  sliderMax = 10000;
  sliderStep = 50;
  presets: { label: string; mo: number }[] = [];

  result: { plan: any; operatorName: string; operatorColor: string } | null = null;

  constructor(private svc: OperatorService) {}

  ngOnChanges(): void {
    this._buildPresetsFromData();
    this.compute();
  }

  get displayValue(): string {
    return this.monthlyMo >= 1000
      ? `${(this.monthlyMo / 1000).toFixed(this.monthlyMo % 1000 === 0 ? 0 : 1)} Go`
      : `${this.monthlyMo} Mo`;
  }

  setPreset(mo: number): void {
    this.monthlyMo = mo;
    this.compute();
  }

  compute(): void {
    this.result = this.svc.recommend(this.monthlyMo, this.operators);
  }

  /** Construit les presets à partir des vraies données mensuelles disponibles */
  private _buildPresetsFromData(): void {
    const monthlyPlans = this.operators
      .flatMap(op => op.plans.filter(p => p.duration === 'monthly'))
      .map(p => p.data)
      .sort((a, b) => a - b);

    // Valeurs uniques
    const unique = [...new Set(monthlyPlans)];

    // Slider max = plus grand forfait mensuel
    if (unique.length > 0) {
      this.sliderMax = unique[unique.length - 1];
      this.sliderMin = unique[0];
    }

    // Presets = jusqu'à 6 valeurs représentatives
    const step = Math.max(1, Math.floor(unique.length / 6));
    const selected = unique.filter((_, i) => i % step === 0).slice(0, 6);

    this.presets = selected.map(mo => ({
      mo,
      label: mo >= 1000
        ? `${mo % 1000 === 0 ? mo / 1000 : (mo / 1000).toFixed(1)} Go`
        : `${mo} Mo`,
    }));

    // S'assurer que monthlyMo est dans la plage
    if (this.monthlyMo < this.sliderMin) this.monthlyMo = this.sliderMin;
    if (this.monthlyMo > this.sliderMax) this.monthlyMo = this.sliderMax;
  }
}
