import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import {
  Website, WebsiteCreate, Job, OffreInternet,
  Pays, PaysCreate, PaysUpdate,
  Currency, CurrencyCreate, CurrencyUpdate,
  Operateur, OperateurCreate, OperateurUpdate,
} from '../../models/admin.model';
import { DataTableComponent } from '../../ui/data-table/data-table.component';
import { TableColumn } from '../../ui/data-table/data-table.model';

export type AdminTab = 'websites' | 'jobs' | 'offres' | 'pays' | 'currencies' | 'operateurs';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DataTableComponent],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent implements OnInit, OnDestroy {
  private readonly svc = inject(AdminService);

  activeTab: AdminTab = 'websites';

  readonly websiteColumns: TableColumn[] = [
    { key: 'operator',   label: 'Opérateur', filterable: true },
    { key: 'pays',       label: 'Pays',       filterable: true },
    { key: 'url',        label: 'URL',        filterable: true },
    { key: 'is_active',  label: 'Statut' },
    { key: 'created_at', label: 'Ajouté le' },
    { key: '_actions',   label: 'Actions' },
  ];

  readonly jobColumns: TableColumn[] = [
    { key: 'id',          label: 'ID' },
    { key: 'website_id',  label: 'Site',        filterable: true },
    { key: 'target_url',  label: 'URL',         filterable: true },
    { key: 'js_enabled',  label: 'JS' },
    { key: 'status',      label: 'Statut',      filterable: true },
    { key: '_offres',     label: 'Offres' },
    { key: 'created_at',  label: 'Créé le' },
    { key: 'updated_at',  label: 'Mis à jour' },
    { key: '_actions',    label: 'Actions' },
  ];

  readonly offreColumns: TableColumn[] = [
    { key: 'operator',   label: 'Opérateur', filterable: true },
    { key: 'categorie',  label: 'Catégorie', filterable: true },
    { key: 'plan_name',  label: 'Nom',       filterable: true },
    { key: 'volume',     label: 'Volume',    filterable: true },
    { key: 'bonus',      label: 'Bonus',     filterable: true },
    { key: 'tarif_fcfa', label: 'Tarif (FCFA)', filterable: true },
    { key: 'validite',   label: 'Validité',  filterable: true },
    { key: 'actif',      label: 'Actif' },
    { key: 'scraped_at', label: 'Scrapé le' },
  ];

  readonly paysColumns: TableColumn[] = [
    { key: 'label',    label: 'Nom',     filterable: true },
    { key: '_actions', label: 'Actions' },
  ];

  readonly currencyColumns: TableColumn[] = [
    { key: 'label',    label: 'Nom',     filterable: true },
    { key: '_actions', label: 'Actions' },
  ];

  readonly operateurColumns: TableColumn[] = [
    { key: 'label',    label: 'Opérateur', filterable: true },
    { key: '_actions', label: 'Actions'    },
  ];

  websites: Website[] = [];
  websitesLoading = false;
  websitesError: string | null = null;
  showAddWebsite = false;
  newWebsite: WebsiteCreate = { operator: '', pays: '', url: '' };
  addingWebsite = false;
  autoFillingPays = false;
  editingPaysId: string | null = null;
  editingPaysValue = '';

  readonly PAYS_LISTE = [
    'Bénin', 'Burkina Faso', 'Cameroun', 'Côte d\'Ivoire', 'Gabon',
    'Ghana', 'Guinée', 'Mali', 'Maroc', 'Mauritanie', 'Niger',
    'Nigeria', 'République du Congo', 'RDC', 'Sénégal', 'Togo', 'Tunisie',
  ];

  jobs: Job[] = [];
  jobsLoading = false;
  jobsError: string | null = null;
  showScrapeForm = false;
  scrapeWebsiteId = '';
  scrapeUrl = '';
  scrapeJsEnabled = false;
  scraping = false;
  scrapeSuccess: string | null = null;
  scrapeError: string | null = null;

  offres: OffreInternet[] = [];
  offresLoading = false;
  offresError: string | null = null;
  selectedJobId: string | null = null;
  offresJobLabel = '';

  filterPays = '';
  filterJobStatus = '';
  filterOffreOperator = '';

  paysList2: Pays[] = [];
  paysLoading = false;
  paysError: string | null = null;
  showAddPays = false;
  newPays: PaysCreate = { label: '' };
  addingPays = false;
  editingPays: Pays | null = null;
  editingPaysForm: PaysUpdate = { label: '' };

  currencies: Currency[] = [];
  currenciesLoading = false;
  currenciesError: string | null = null;
  showAddCurrency = false;
  newCurrency: CurrencyCreate = { label: '' };
  addingCurrency = false;
  editingCurrency: Currency | null = null;
  editingCurrencyForm: CurrencyUpdate = { label: '' };

  operateurs: Operateur[] = [];
  operateursLoading = false;
  operateursError: string | null = null;
  showAddOperateur = false;
  newOperateur: OperateurCreate = { label: '' };
  addingOperateur = false;
  editingOperateur: Operateur | null = null;
  editingOperateurForm: OperateurUpdate = { label: '' };

  jobOffresCount = new Map<string, number>();
  private _pollingTimer: ReturnType<typeof setInterval> | null = null;

  get activeOffreFiltersCount(): number { return 0; }

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

  get paysList(): string[] {
    return [...new Set(this.websites.map(w => w.pays).filter((p): p is string => !!p))].sort();
  }

  get allPaysList(): string[] {
    const fromWebsites = this.websites.map(w => w.pays).filter((p): p is string => !!p);
    return [...new Set([...this.PAYS_LISTE, ...fromWebsites])].sort((a, b) => a.localeCompare(b, 'fr'));
  }

  get activeWebsitesByPays(): { pays: string; sites: Website[] }[] {
    const grouped = new Map<string, Website[]>();
    for (const site of this.activeWebsites) {
      const key = site.pays || 'Autre';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(site);
    }
    return [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([pays, sites]) => ({ pays, sites }));
  }

  get filteredWebsites(): Website[] {
    if (!this.filterPays) return this.websites;
    return this.websites.filter(w => w.pays === this.filterPays);
  }

  get filteredJobs(): Job[] {
    const sorted = this.jobsByDate;
    if (!this.filterJobStatus) return sorted;
    return sorted.filter(j => j.status === this.filterJobStatus);
  }

  get offresOperators(): string[] {
    return [...new Set(this.offres.map(o => o.operator).filter(Boolean))].sort();
  }

  ngOnInit(): void {
    this.loadWebsites();
    this.loadJobs();
  }

  ngOnDestroy(): void {
    this._stopPolling();
  }

  setTab(tab: AdminTab): void {
    this.activeTab = tab;
    if (tab === 'offres' && this.offres.length === 0) this.loadAllOffres();
    if (tab === 'pays' && this.paysList2.length === 0) this.loadPays();
    if (tab === 'currencies' && this.currencies.length === 0) this.loadCurrencies();
    if (tab === 'operateurs' && this.operateurs.length === 0) this.loadOperateurs();
  }

  toggleOffrePopover(_col: string, _event: Event): void {}
  closeAllOffrePopovers(_event?: Event): void {}
  clearOffreFilters(): void {}

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
      next: (updated) => { this.websites = this.websites.map(x => x.id === updated.id ? updated : x); },
      error: (e: Error) => { this.websitesError = e.message; },
    });
  }

  autoFillPays(): void {
    this.autoFillingPays = true;
    this.svc.autoFillPays().subscribe({
      next: (updated) => { this.websites = updated; this.autoFillingPays = false; },
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

  loadJobs(): void {
    this.jobsLoading = true;
    this.jobsError = null;
    this.svc.getJobs().subscribe({
      next: (data) => {
        this.jobs = data;
        this.jobsLoading = false;
        this._loadJobOffresCounts();
      },
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

  onWebsiteSelect(): void {
    const site = this.websites.find(w => w.id === this.scrapeWebsiteId);
    if (site) this.scrapeUrl = site.url;
  }

  loadPays(): void {
    this.paysLoading = true;
    this.paysError = null;
    this.svc.getPays().subscribe({
      next: (data) => { this.paysList2 = data; this.paysLoading = false; },
      error: (e: Error) => { this.paysError = e.message; this.paysLoading = false; },
    });
  }

  addPays(): void {
    if (!this.newPays.label.trim()) return;
    this.addingPays = true;
    this.svc.createPays(this.newPays).subscribe({
      next: (p) => {
        this.paysList2 = [...this.paysList2, p];
        this.newPays = { label: '' };
        this.showAddPays = false;
        this.addingPays = false;
      },
      error: (e: Error) => { this.paysError = e.message; this.addingPays = false; },
    });
  }

  startEditPaysItem(p: Pays): void {
    this.editingPays = p;
    this.editingPaysForm = { label: p.label };
  }

  saveEditPays(): void {
    if (!this.editingPays) return;
    this.svc.updatePays(this.editingPays.id, this.editingPaysForm).subscribe({
      next: (updated) => {
        this.paysList2 = this.paysList2.map(x => x.id === updated.id ? updated : x);
        this.editingPays = null;
      },
      error: (e: Error) => { this.paysError = e.message; },
    });
  }

  togglePaysActive(p: Pays): void {
    this.svc.updatePays(p.id, { label: p.label }).subscribe({
      next: (updated) => { this.paysList2 = this.paysList2.map(x => x.id === updated.id ? updated : x); },
      error: (e: Error) => { this.paysError = e.message; },
    });
  }

  deletePays(id: number): void {
    if (!confirm('Supprimer ce pays ?')) return;
    this.svc.deletePays(id).subscribe({
      next: () => { this.paysList2 = this.paysList2.filter(p => p.id !== id); },
      error: (e: Error) => { this.paysError = e.message; },
    });
  }

  loadCurrencies(): void {
    this.currenciesLoading = true;
    this.currenciesError = null;
    this.svc.getCurrencies().subscribe({
      next: (data) => { this.currencies = data; this.currenciesLoading = false; },
      error: (e: Error) => { this.currenciesError = e.message; this.currenciesLoading = false; },
    });
  }

  addCurrency(): void {
    if (!this.newCurrency.label.trim()) return;
    this.addingCurrency = true;
    this.svc.createCurrency(this.newCurrency).subscribe({
      next: (c) => {
        this.currencies = [...this.currencies, c];
        this.newCurrency = { label: '' };
        this.showAddCurrency = false;
        this.addingCurrency = false;
      },
      error: (e: Error) => { this.currenciesError = e.message; this.addingCurrency = false; },
    });
  }

  startEditCurrency(c: Currency): void {
    this.editingCurrency = c;
    this.editingCurrencyForm = { label: c.label };
  }

  saveEditCurrency(): void {
    if (!this.editingCurrency) return;
    this.svc.updateCurrency(this.editingCurrency.id, this.editingCurrencyForm).subscribe({
      next: (updated) => {
        this.currencies = this.currencies.map(x => x.id === updated.id ? updated : x);
        this.editingCurrency = null;
      },
      error: (e: Error) => { this.currenciesError = e.message; },
    });
  }

  toggleCurrencyActive(c: Currency): void {
    this.svc.updateCurrency(c.id, { label: c.label }).subscribe({
      next: (updated) => { this.currencies = this.currencies.map(x => x.id === updated.id ? updated : x); },
      error: (e: Error) => { this.currenciesError = e.message; },
    });
  }

  deleteCurrency(id: number): void {
    if (!confirm('Supprimer cette devise ?')) return;
    this.svc.deleteCurrency(id).subscribe({
      next: () => { this.currencies = this.currencies.filter(c => c.id !== id); },
      error: (e: Error) => { this.currenciesError = e.message; },
    });
  }

  loadOperateurs(): void {
    this.operateursLoading = true;
    this.operateursError = null;
    this.svc.getOperateurs().subscribe({
      next: (data) => { this.operateurs = data; this.operateursLoading = false; },
      error: (e: Error) => { this.operateursError = e.message; this.operateursLoading = false; },
    });
  }

  addOperateur(): void {
    if (!this.newOperateur.label.trim()) return;
    this.addingOperateur = true;
    this.svc.createOperateur(this.newOperateur).subscribe({
      next: (op) => {
        this.operateurs = [...this.operateurs, op];
        this.newOperateur = { label: '' };
        this.showAddOperateur = false;
        this.addingOperateur = false;
      },
      error: (e: Error) => { this.operateursError = e.message; this.addingOperateur = false; },
    });
  }

  startEditOperateur(op: Operateur): void {
    this.editingOperateur = op;
    this.editingOperateurForm = { label: op.label };
  }

  saveEditOperateur(): void {
    if (!this.editingOperateur) return;
    this.svc.updateOperateur(this.editingOperateur.id, this.editingOperateurForm).subscribe({
      next: (updated) => {
        this.operateurs = this.operateurs.map(x => x.id === updated.id ? updated : x);
        this.editingOperateur = null;
      },
      error: (e: Error) => { this.operateursError = e.message; },
    });
  }

  toggleOperateurActive(op: Operateur): void {
    this.svc.updateOperateur(op.id, { label: op.label }).subscribe({
      next: (updated) => { this.operateurs = this.operateurs.map(x => x.id === updated.id ? updated : x); },
      error: (e: Error) => { this.operateursError = e.message; },
    });
  }

  deleteOperateur(id: number): void {
    if (!confirm('Supprimer cet opérateur ?')) return;
    this.svc.deleteOperateur(id).subscribe({
      next: () => { this.operateurs = this.operateurs.filter(op => op.id !== id); },
      error: (e: Error) => { this.operateursError = e.message; },
    });
  }

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
    return `${site.operator}${site.pays ? ` (${site.pays})` : ''}`;
  }

  private _loadJobOffresCounts(): void {
    for (const job of this.jobs) {
      if (job.status === 'SUCCESS' && !this.jobOffresCount.has(job.id)) {
        this.svc.getJobOffres(job.id).subscribe({
          next: (data) => this.jobOffresCount.set(job.id, data.length),
        });
      }
    }
  }

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
}
