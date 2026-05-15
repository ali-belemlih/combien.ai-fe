import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { Website, WebsiteCreate, Job, OffreInternet } from '../../models/admin.model';

export type AdminTab = 'websites' | 'jobs' | 'offres';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent implements OnInit {
  private readonly svc = inject(AdminService);

  // ─── Onglet actif ─────────────────────────────────────────────────────────
  activeTab: AdminTab = 'websites';

  // ─── Websites ─────────────────────────────────────────────────────────────
  websites: Website[] = [];
  websitesLoading = false;
  websitesError: string | null = null;

  showAddWebsite = false;
  newWebsite: WebsiteCreate = { operator: '', pays: '', url: '' };
  addingWebsite = false;
  autoFillingPays = false;

  // Édition inline du pays
  editingPaysId: string | null = null;
  editingPaysValue = '';

  // ─── Jobs ─────────────────────────────────────────────────────────────────
  jobs: Job[] = [];
  jobsLoading = false;
  jobsError: string | null = null;

  // Formulaire lancement scraping
  showScrapeForm = false;
  scrapeWebsiteId = '';
  scrapeUrl = '';
  scrapeJsEnabled = false;
  scraping = false;
  scrapeSuccess: string | null = null;
  scrapeError: string | null = null;

  // ─── Offres ───────────────────────────────────────────────────────────────
  offres: OffreInternet[] = [];
  offresLoading = false;
  offresError: string | null = null;
  selectedJobId: string | null = null;
  offresJobLabel = '';

  // ─── Polling job en cours ─────────────────────────────────────────────────
  private _pollingTimer: ReturnType<typeof setInterval> | null = null;

  // ─── Computed ─────────────────────────────────────────────────────────────
  get activeWebsites(): Website[] {
    return this.websites.filter(w => w.is_active);
  }

  get jobsByDate(): Job[] {
    return [...this.jobs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  get runningJobs(): Job[] {
    return this.jobs.filter(j => j.status === 'RUNNING');
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadWebsites();
    this.loadJobs();
  }

  ngOnDestroy(): void {
    this._stopPolling();
  }

  // ─── Navigation onglets ───────────────────────────────────────────────────
  setTab(tab: AdminTab): void {
    this.activeTab = tab;
    if (tab === 'offres' && this.offres.length === 0) {
      this.loadAllOffres();
    }
  }

  // ─── Websites ─────────────────────────────────────────────────────────────
  loadWebsites(): void {
    this.websitesLoading = true;
    this.websitesError = null;
    this.svc.getWebsites().subscribe({
      next: (data) => { this.websites = data; this.websitesLoading = false; },
      error: (e: Error) => { this.websitesError = e.message; this.websitesLoading = false; },
    });
  }

  addWebsite(): void {
    if (!this.newWebsite.operator.trim() || !this.newWebsite.url.trim()) return;
    this.addingWebsite = true;
    this.svc.createWebsite(this.newWebsite).subscribe({
      next: (w) => {
        this.websites = [...this.websites, w];
        this.newWebsite = { operator: '', pays: '', url: '' };
        this.showAddWebsite = false;
        this.addingWebsite = false;
      },
      error: (e: Error) => { this.websitesError = e.message; this.addingWebsite = false; },
    });
  }

  toggleWebsiteActive(w: Website): void {
    this.svc.updateWebsite(w.id, { is_active: !w.is_active }).subscribe({
      next: (updated) => {
        this.websites = this.websites.map(x => x.id === updated.id ? updated : x);
      },
      error: (e: Error) => { this.websitesError = e.message; },
    });
  }

  autoFillPays(): void {
    this.autoFillingPays = true;
    this.svc.autoFillPays().subscribe({
      next: (updated) => {
        this.websites = updated;
        this.autoFillingPays = false;
      },
      error: (e: Error) => { this.websitesError = e.message; this.autoFillingPays = false; },
    });
  }

  startEditPays(site: Website): void {
    this.editingPaysId = site.id;
    this.editingPaysValue = site.pays ?? '';
  }

  savePays(site: Website): void {
    if (!this.editingPaysValue.trim()) { this.cancelEditPays(); return; }
    this.svc.updateWebsite(site.id, { pays: this.editingPaysValue.trim() }).subscribe({
      next: (updated) => {
        this.websites = this.websites.map(x => x.id === updated.id ? updated : x);
        this.editingPaysId = null;
      },
      error: (e: Error) => { this.websitesError = e.message; },
    });
  }

  cancelEditPays(): void {
    this.editingPaysId = null;
    this.editingPaysValue = '';
  }

  deleteWebsite(id: string): void {
    if (!confirm('Supprimer ce site ? Les jobs associés seront conservés.')) return;
    this.svc.deleteWebsite(id).subscribe({
      next: () => { this.websites = this.websites.filter(w => w.id !== id); },
      error: (e: Error) => { this.websitesError = e.message; },
    });
  }

  // ─── Jobs ─────────────────────────────────────────────────────────────────
  loadJobs(): void {
    this.jobsLoading = true;
    this.jobsError = null;
    this.svc.getJobs().subscribe({
      next: (data) => { this.jobs = data; this.jobsLoading = false; },
      error: (e: Error) => { this.jobsError = e.message; this.jobsLoading = false; },
    });
  }

  launchScrape(): void {
    const url = this.scrapeWebsiteId
      ? this.websites.find(w => w.id === this.scrapeWebsiteId)?.url ?? this.scrapeUrl
      : this.scrapeUrl;

    if (!url.trim()) { this.scrapeError = 'URL requise.'; return; }

    this.scraping = true;
    this.scrapeError = null;
    this.scrapeSuccess = null;

    this.svc.createJob({
      website_id: this.scrapeWebsiteId || undefined,
      target_url: url,
      js_enabled: this.scrapeJsEnabled,
      extraction_rules: {},
      schema_definition: {},
    }).subscribe({
      next: (job) => {
        this.jobs = [job, ...this.jobs];
        this.scraping = false;
        this.scrapeSuccess = `Job lancé (ID: ${job.id.slice(0, 8)}…) — statut : ${job.status}`;
        this.showScrapeForm = false;
        this._startPolling(job.id);
      },
      error: (e: Error) => { this.scrapeError = e.message; this.scraping = false; },
    });
  }

  rerunJob(id: string): void {
    this.svc.rerunJob(id).subscribe({
      next: (job) => {
        this.jobs = this.jobs.map(j => j.id === job.id ? job : j);
        this._startPolling(job.id);
      },
      error: (e: Error) => { this.jobsError = e.message; },
    });
  }

  deleteJob(id: string): void {
    if (!confirm('Supprimer ce job et toutes ses offres ?')) return;
    this.svc.deleteJob(id).subscribe({
      next: () => { this.jobs = this.jobs.filter(j => j.id !== id); },
      error: (e: Error) => { this.jobsError = e.message; },
    });
  }

  viewJobOffres(job: Job): void {
    this.selectedJobId = job.id;
    const site = this.websites.find(w => w.id === job.website_id);
    this.offresJobLabel = site ? `${site.operator} — ${job.id.slice(0, 8)}…` : job.id.slice(0, 8) + '…';
    this.offresLoading = true;
    this.offresError = null;
    this.activeTab = 'offres';
    this.svc.getJobOffres(job.id).subscribe({
      next: (data) => { this.offres = data; this.offresLoading = false; },
      error: (e: Error) => { this.offresError = e.message; this.offresLoading = false; },
    });
  }

  // ─── Offres ───────────────────────────────────────────────────────────────
  loadAllOffres(): void {
    this.offresLoading = true;
    this.offresError = null;
    this.selectedJobId = null;
    this.offresJobLabel = 'Toutes les offres';
    this.svc.getAllOffres().subscribe({
      next: (data) => { this.offres = data; this.offresLoading = false; },
      error: (e: Error) => { this.offresError = e.message; this.offresLoading = false; },
    });
  }

  // ─── Polling statut job ───────────────────────────────────────────────────
  private _startPolling(jobId: string): void {
    this._stopPolling();
    this._pollingTimer = setInterval(() => {
      this.svc.getJob(jobId).subscribe({
        next: (job) => {
          this.jobs = this.jobs.map(j => j.id === job.id ? job : j);
          if (job.status === 'SUCCESS' || job.status === 'FAILED') {
            this._stopPolling();
          }
        },
      });
    }, 3000);
  }

  private _stopPolling(): void {
    if (this._pollingTimer) {
      clearInterval(this._pollingTimer);
      this._pollingTimer = null;
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  statusClass(status: string): string {
    switch (status) {
      case 'SUCCESS': return 'badge badge--success';
      case 'RUNNING': return 'badge badge--running';
      case 'FAILED':  return 'badge badge--failed';
      default:        return 'badge badge--pending';
    }
  }

  statusIcon(status: string): string {
    switch (status) {
      case 'SUCCESS': return '✅';
      case 'RUNNING': return '⏳';
      case 'FAILED':  return '❌';
      default:        return '🕐';
    }
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  websiteName(id: string | null): string {
    if (!id) return '—';
    const site = this.websites.find(w => w.id === id);
    if (!site) return id.slice(0, 8) + '…';
    const pays = site.pays ? ` (${site.pays})` : '';
    return `${site.operator}${pays}`;
  }

  onWebsiteSelect(): void {
    const site = this.websites.find(w => w.id === this.scrapeWebsiteId);
    if (site) this.scrapeUrl = site.url;
  }
}
