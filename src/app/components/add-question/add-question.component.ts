import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RecommendService } from '../../services/recommend.service';
import { QuestionCreate } from '../../models/recommend.model';

@Component({
  selector: 'app-add-question',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-question.component.html',
  styleUrl: './add-question.component.scss',
})
export class AddQuestionComponent implements OnInit {
  private readonly recommendSvc = inject(RecommendService);
  private readonly router = inject(Router);

  saving = false;
  error: string | null = null;
  success: string | null = null;

  question: QuestionCreate = {
    order: 1,
    text: '',
    field_key: '',
    input_type: 'select',
    condition: null,
    dynamic_options: null,
    options: [],
  };

  // option en cours de saisie
  newOptionLabel = '';
  newOptionValue = '';

  // condition de branchement
  hasCondition = false;
  conditionKey = '';
  conditionValues = '';

  ngOnInit(): void {
    // Pré-remplir l'ordre avec le prochain disponible si on veut (optionnel)
  }

  addOption(): void {
    if (!this.newOptionLabel.trim() || !this.newOptionValue.trim()) return;
    this.question.options = [
      ...this.question.options,
      { label: this.newOptionLabel.trim(), value: this.newOptionValue.trim() },
    ];
    this.newOptionLabel = '';
    this.newOptionValue = '';
  }

  removeOption(index: number): void {
    this.question.options = this.question.options.filter((_, i) => i !== index);
  }

  get canSubmit(): boolean {
    return !!this.question.text.trim() && !!this.question.field_key.trim() && !this.saving;
  }

  submit(): void {
    if (!this.canSubmit) return;

    if (this.hasCondition && this.conditionKey.trim() && this.conditionValues.trim()) {
      this.question.condition = {
        depends_on: this.conditionKey.trim(),
        show_when: this.conditionValues.split(',').map(v => v.trim()).filter(Boolean),
      };
    } else {
      this.question.condition = null;
    }

    this.saving = true;
    this.error = null;

    this.recommendSvc.createQuestion(this.question).subscribe({
      next: (q) => {
        this.saving = false;
        this.success = `Question "${q.text}" créée avec succès.`;
        setTimeout(() => this.router.navigate(['/admin'], { queryParams: { tab: 'questionnaire' } }), 1200);
      },
      error: (e: Error) => {
        this.error = e.message;
        this.saving = false;
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/admin'], { queryParams: { tab: 'questionnaire' } });
  }
}
