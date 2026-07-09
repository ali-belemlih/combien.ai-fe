import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { RoamingService } from '../../services/roaming.service';
import { CompareService } from '../../services/compare.service';
import { RecommendService } from '../../services/recommend.service';
import { AuthService } from '../../services/auth.service';
import {
  Website, WebsiteCreate, Job, OffreInternet,
  Pays, PaysCreate, PaysUpdate,
  Currency, CurrencyCreate, CurrencyUpdate,
  Operateur, OperateurCreate, OperateurUpdate,
  FetchWebsiteRequest, FetchWebsiteResponse,
} from '../../models/admin.model';
import { OffreRoaming, RoamingJobCreate } from '../../models/roaming.model';
import { OffreVoix } from '../../models/voix.model';
import { UserProfile } from '../../models/compare.model';
import { QuestionOut, QuestionCreate } from '../../models/recommend.model';
import { DataTableComponent } from '../../ui/data-table/data-table.component';
import { TableColumn } from '../../ui/data-table/data-table.model';

export type AdminTab = 'websites' | 'jobs' | 'offres' | 'pays' | 'currencies' | 'operateurs' | 'roaming' | 'voix' | 'internet' | 'users' | 'questionnaire';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DataTableComponent],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent implements OnInit, OnDestroy {
  private readonly svc = inject(AdminService);
  private readonly roamingSvc = inject(RoamingService);
  private readonly compareSvc = inject(CompareService);
  private readonly recommendSvc = inject(RecommendService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);

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
    { key: 'drapeau',   label: '' },
    { key: 'label',     label: 'Nom',       filterable: true },
    { key: 'code_iso2', label: 'ISO',       filterable: true },
    { key: 'indicatif', label: 'Indicatif' },
    { key: 'region',    label: 'Région',    filterable: true },
    { key: '_actions',  label: 'Actions' },
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

  // ── Fetch Website ────────────────────────────────────────────────────────
  showFetchForm = false;
  fetchRequest: FetchWebsiteRequest = { url: '', js_enabled: false, max_length: 50000 };
  fetchResult: FetchWebsiteResponse | null = null;
  fetchLoading = false;
  fetchError: string | null = null;
  fetchShowFullHtml = false;

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

  // ── Questionnaire ─────────────────────────────────────────────────────────
  questions: QuestionOut[] = [];
  questionsLoading = false;
  questionsError: string | null = null;
  questionsSuccess: string | null = null;

  showAddQuestion = false;
  addingQuestion = false;
  newQuestion: QuestionCreate = {
    order: 1,
    text: '',
    field_key: '',
    input_type: 'select',
    condition: null,
    dynamic_options: null,
    options: [],
  };
  newOptionLabel = '';
  newOptionValue = '';

  // Condition helper
  newQuestionHasCondition = false;
  newQuestionConditionKey = '';
  newQuestionConditionValues = '';

  readonly questionColumns: TableColumn[] = [
    { key: 'order',      label: '#',           filterable: false },
    { key: 'text',       label: 'Question',    filterable: true  },
    { key: 'field_key',  label: 'Clé',         filterable: true  },
    { key: 'input_type', label: 'Type' },
    { key: 'options',    label: 'Options' },
    { key: 'condition',  label: 'Condition' },
    { key: '_actions',   label: 'Actions' },
  ];

  // ── Roaming ──────────────────────────────────────────────────────────────
  roamingOffres: OffreRoaming[] = [];
  roamingOffresLoading = false;
  roamingOffresError: string | null = null;

  showRoamingJobForm = false;
  roamingJobWebsiteId = '';
  roamingJobUrl = '';
  roamingJobJsEnabled = false;
  roamingJobSourceType: 'html' | 'pdf' = 'html';
  roamingJobLaunching = false;
  roamingJobSuccess: string | null = null;
  roamingJobError: string | null = null;

  roamingFilterOperator = '';

  readonly roamingOffreColumns: TableColumn[] = [
    { key: 'operator',       label: 'Opérateur',    filterable: true },
    { key: 'pays_destination', label: 'Pays',        filterable: true },
    { key: 'zone_operateur', label: 'Zone',          filterable: true },
    { key: 'tarif_appel',    label: 'Appel (FCFA)',  filterable: true },
    { key: 'tarif_sms',      label: 'SMS (FCFA)',    filterable: true },
    { key: 'tarif_data',     label: 'Data (FCFA)',   filterable: true },
    { key: 'unite_data',     label: 'Unité data' },
    { key: 'validite',       label: 'Validité' },
  ];

  // ── Voix ──────────────────────────────────────────────────────────────────
  voixOffres: OffreVoix[] = [];
  voixOffresLoading = false;
  voixOffresError: string | null = null;

  showVoixJobForm = false;
  voixJobWebsiteId = '';
  voixJobUrl = '';
  voixJobJsEnabled = false;
  voixJobPays = 'Bénin';
  voixJobLaunching = false;
  voixJobSuccess: string | null = null;
  voixJobError: string | null = null;
  voixFilterOperator = '';
  voixFilterPays = '';

  readonly voixOffreColumns: TableColumn[] = [
    { key: 'operator',    label: 'Opérateur',  filterable: true },
    { key: 'pays',        label: 'Pays',        filterable: true },
    { key: 'category',    label: 'Catégorie',   filterable: true },
    { key: 'plan_name',   label: 'Nom',         filterable: true },
    { key: 'price',       label: 'Prix (FCFA)', filterable: true },
    { key: 'volume_recu', label: 'Crédit reçu' },
    { key: 'ussd_code',   label: 'USSD' },
    { key: 'validity',    label: 'Validité' },
  ];

  // ── Users ──────────────────────────────────────────────────────────────────
  users: UserProfile[] = [];
  usersLoading = false;
  usersError: string | null = null;
  usersSyncMsg: string | null = null;
  usersSearchFilter = '';

  readonly userColumns: TableColumn[] = [
    { key: 'username',      label: 'Utilisateur',  filterable: true },
    { key: 'email',         label: 'Email',         filterable: true },
    { key: 'roles',         label: 'Rôles' },
    { key: 'is_active',     label: 'Statut' },
    { key: 'last_seen_at',  label: 'Dernière connexion' },
    { key: '_actions',      label: 'Actions' },
  ];

  get filteredUsers(): UserProfile[] {
    const q = this.usersSearchFilter.toLowerCase();
    if (!q) return this.users;
    return this.users.filter(u =>
      (u.username ?? '').toLowerCase().includes(q) ||
      (u.email ?? '').toLowerCase().includes(q) ||
      u.roles.some(r => r.toLowerCase().includes(q))
    );
  }

  get activeUsersCount(): number {
    return this.users.filter(u => u.enabled !== false).length;
  }

  get adminUsersCount(): number {
    return this.users.filter(u => u.roles.includes('admin')).length;
  }

  loadUsers(): void {
    this.usersLoading = true;
    this.usersError = null;
    this.compareSvc.getUsers().subscribe({
      next: (data) => { this.users = data; this.usersLoading = false; },
      error: (e: Error) => { this.usersError = e.message; this.usersLoading = false; },
    });
  }

  toggleUserActive(u: UserProfile): void {
    const action$ = u.enabled !== false
      ? this.compareSvc.deactivateUser(u.id)
      : this.compareSvc.activateUser(u.id);
    action$.subscribe({
      next: (updated) => { this.users = this.users.map(x => x.id === updated.id ? updated : x); },
      error: (e: Error) => { this.usersError = e.message; },
    });
  }

  syncUsers(): void {
    this.usersLoading = true;
    this.usersSyncMsg = null;
    this.compareSvc.syncAllUsers().subscribe({
      next: (res) => {
        this.usersSyncMsg = `✅ ${res.synced} utilisateurs synchronisés depuis Keycloak.`;
        this.usersLoading = false;
        this.loadUsers();
      },
      error: (e: Error) => { this.usersError = e.message; this.usersLoading = false; },
    });
  }

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
    // Lire le tab depuis les queryParams (ex: retour depuis add-question)
    const tab = this.route.snapshot.queryParamMap.get('tab') as AdminTab | null;
    if (tab) this.setTab(tab);
  }

  get sessionExpired(): boolean {
    return !this.auth.isAuthenticated();
  }

  goToLogin(): void {
    this.router.navigate(['/login'], { queryParams: { returnUrl: '/admin' } });
  }

  ngOnDestroy(): void {
    this._stopPolling();
  }

  setTab(tab: AdminTab): void {
    this.activeTab = tab;
    if (tab === 'offres' && this.offres.length === 0) this.loadAllOffres();
    if (tab === 'internet' && this.offres.length === 0) this.loadAllOffres();
    if (tab === 'pays' && this.paysList2.length === 0) this.loadPays();
    if (tab === 'currencies' && this.currencies.length === 0) this.loadCurrencies();
    if (tab === 'operateurs' && this.operateurs.length === 0) this.loadOperateurs();
    if (tab === 'roaming' && this.roamingOffres.length === 0) this.loadRoamingOffres();
    if (tab === 'voix' && this.voixOffres.length === 0) this.loadVoixOffres();
    if (tab === 'users' && this.users.length === 0) this.loadUsers();
    if (tab === 'questionnaire' && this.questions.length === 0) this.loadQuestions();
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

  // ── Fetch Website ─────────────────────────────────────────────────────────

  openFetchForm(url?: string): void {
    this.fetchRequest = { url: url ?? '', js_enabled: false, max_length: 50000 };
    this.fetchResult = null;
    this.fetchError = null;
    this.fetchShowFullHtml = false;
    this.showFetchForm = true;
  }

  closeFetchForm(): void {
    this.showFetchForm = false;
    this.fetchResult = null;
    this.fetchError = null;
  }

  runFetch(): void {
    if (!this.fetchRequest.url.trim()) { this.fetchError = 'URL requise.'; return; }
    this.fetchLoading = true;
    this.fetchError = null;
    this.fetchResult = null;

    this.svc.fetchWebsite(this.fetchRequest).subscribe({
      next: (res) => { this.fetchResult = res; this.fetchLoading = false; },
      error: (e: Error) => { this.fetchError = e.message; this.fetchLoading = false; },
    });
  }

  copyHtml(): void {
    if (!this.fetchResult) return;
    navigator.clipboard.writeText(this.fetchResult.html).catch(() => {});
  }

  prefillFetchFromWebsite(site: Website): void {
    this.openFetchForm(site.url);
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
    this.editingPaysForm = {
      label: p.label,
      code_iso2: p.code_iso2 ?? '',
      indicatif: p.indicatif ?? '',
      drapeau: p.drapeau ?? '',
      region: p.region ?? '',
    };
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

  // ── Roaming methods ──────────────────────────────────────────────────────

  get roamingOperators(): string[] {
    return [...new Set(this.roamingOffres.map(o => o.operator))].sort();
  }

  get filteredRoamingOffres(): OffreRoaming[] {
    if (!this.roamingFilterOperator) return this.roamingOffres;
    return this.roamingOffres.filter(o => o.operator === this.roamingFilterOperator);
  }

  loadRoamingOffres(): void {
    this.roamingOffresLoading = true;
    this.roamingOffresError = null;
    this.roamingSvc.getAll().subscribe({
      next: (data) => { this.roamingOffres = data; this.roamingOffresLoading = false; },
      error: (e: Error) => { this.roamingOffresError = e.message; this.roamingOffresLoading = false; },
    });
  }

  migrateRoamingTypes(): void {
    this.svc.migrateRoamingTypes().subscribe({
      next: (res: { updated: number; total: number }) => {
        this.roamingJobSuccess = `Migration terminée : ${res.updated} offres mises à jour sur ${res.total}.`;
        this.loadRoamingOffres();
      },
      error: (e: Error) => { this.roamingOffresError = e.message; },
    });
  }

  onRoamingWebsiteSelect(): void {
    const site = this.websites.find(w => w.id === this.roamingJobWebsiteId);
    if (site) this.roamingJobUrl = site.url;
  }

  launchRoamingJob(): void {
    const url = this.roamingJobWebsiteId
      ? this.websites.find(w => w.id === this.roamingJobWebsiteId)?.url ?? this.roamingJobUrl
      : this.roamingJobUrl;

    if (!url.trim()) { this.roamingJobError = 'URL requise.'; return; }

    this.roamingJobLaunching = true;
    this.roamingJobError = null;
    this.roamingJobSuccess = null;

    const payload: RoamingJobCreate = {
      website_id: this.roamingJobWebsiteId || undefined,
      target_url: url,
      js_enabled: this.roamingJobJsEnabled,
      source_type: this.roamingJobSourceType,
      extraction_rules: {},
    };

    this.roamingSvc.createJob(payload).subscribe({
      next: (job) => {
        this.jobs = [job, ...this.jobs];
        this.roamingJobLaunching = false;
        this.roamingJobSuccess = `Job roaming lancé (ID: ${job.id.slice(0, 8)}…) — statut : ${job.status}`;
        this.showRoamingJobForm = false;
        this._startPolling(job.id);
      },
      error: (e: Error) => { this.roamingJobError = e.message; this.roamingJobLaunching = false; },
    });
  }

  // ── Voix methods ──────────────────────────────────────────────────────────

  get voixOperators(): string[] {
    return [...new Set(this.voixOffres.map(o => o.operator))].sort();
  }

  get voixPays(): string[] {
    return [...new Set(this.voixOffres.map(o => o.pays))].sort();
  }

  get filteredVoixOffres(): OffreVoix[] {
    return this.voixOffres.filter(o =>
      (!this.voixFilterOperator || o.operator === this.voixFilterOperator) &&
      (!this.voixFilterPays || o.pays === this.voixFilterPays)
    );
  }

  loadVoixOffres(): void {
    this.voixOffresLoading = true;
    this.voixOffresError = null;
    this.svc.getAllVoixOffres().subscribe({
      next: (data) => { this.voixOffres = data; this.voixOffresLoading = false; },
      error: (e: Error) => { this.voixOffresError = e.message; this.voixOffresLoading = false; },
    });
  }

  onVoixWebsiteSelect(): void {
    const site = this.websites.find(w => w.id === this.voixJobWebsiteId);
    if (site) {
      this.voixJobUrl = site.url;
      if (site.pays) this.voixJobPays = site.pays;
    }
  }

  launchVoixJob(): void {
    const url = this.voixJobWebsiteId
      ? this.websites.find(w => w.id === this.voixJobWebsiteId)?.url ?? this.voixJobUrl
      : this.voixJobUrl;

    if (!url.trim()) { this.voixJobError = 'URL requise.'; return; }

    this.voixJobLaunching = true;
    this.voixJobError = null;
    this.voixJobSuccess = null;

    this.svc.createVoixJob({
      website_id: this.voixJobWebsiteId || undefined,
      target_url: url,
      js_enabled: this.voixJobJsEnabled,
      pays: this.voixJobPays,
      extraction_rules: {},
    }).subscribe({
      next: (job) => {
        this.jobs = [job, ...this.jobs];
        this.voixJobLaunching = false;
        this.voixJobSuccess = `Job voix lancé (ID: ${job.id.slice(0, 8)}…) — statut : ${job.status}`;
        this.showVoixJobForm = false;
        this._startPolling(job.id);
      },
      error: (e: Error) => { this.voixJobError = e.message; this.voixJobLaunching = false; },
    });
  }

  // ── Voix end ──────────────────────────────────────────────────────────────

  // ── Questionnaire methods ─────────────────────────────────────────────────

  goToAddQuestion(): void {
    this.router.navigate(['/admin/add-question']);
  }

  // ── Drag & drop questionnaire ─────────────────────────────────────────────
  draggedQuestionIndex: number | null = null;
  dragOverQuestionIndex: number | null = null;
  questionsOrderDirty = false;
  savingOrder = false;

  onQuestionDragStart(index: number): void {
    this.draggedQuestionIndex = index;
  }

  onQuestionDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    this.dragOverQuestionIndex = index;
  }

  onQuestionDrop(targetIndex: number): void {
    if (this.draggedQuestionIndex === null || this.draggedQuestionIndex === targetIndex) {
      this.draggedQuestionIndex = null;
      this.dragOverQuestionIndex = null;
      return;
    }
    const updated = [...this.questions];
    const [moved] = updated.splice(this.draggedQuestionIndex, 1);
    updated.splice(targetIndex, 0, moved);
    this.questions = updated.map((q, i) => ({ ...q, order: i + 1 }));
    this.questionsOrderDirty = true;
    this.draggedQuestionIndex = null;
    this.dragOverQuestionIndex = null;
  }

  onQuestionDragEnd(): void {
    this.draggedQuestionIndex = null;
    this.dragOverQuestionIndex = null;
  }

  saveQuestionsOrder(): void {
    if (!this.questionsOrderDirty || this.savingOrder) return;
    this.savingOrder = true;
    this.questionsError = null;

    // Envoyer un PATCH pour chaque question avec son nouvel ordre
    const calls = this.questions.map(q =>
      this.recommendSvc.updateQuestionOrder(q.id, q.order).toPromise()
    );

    Promise.all(calls).then(() => {
      this.savingOrder = false;
      this.questionsOrderDirty = false;
      this.questionsSuccess = '✅ Ordre enregistré avec succès.';
      setTimeout(() => { this.questionsSuccess = null; }, 3000);
    }).catch((err: Error) => {
      this.savingOrder = false;
      this.questionsError = `Erreur lors de la sauvegarde : ${err.message}`;
    });
  }

  loadQuestions(): void {
    this.questionsLoading = true;
    this.questionsError = null;
    this.recommendSvc.listQuestions().subscribe({
      next: (data) => { this.questions = data; this.questionsLoading = false; },
      error: (e: Error) => { this.questionsError = e.message; this.questionsLoading = false; },
    });
  }

  addOptionToNew(): void {
    if (!this.newOptionLabel.trim() || !this.newOptionValue.trim()) return;
    this.newQuestion.options = [
      ...this.newQuestion.options,
      { label: this.newOptionLabel.trim(), value: this.newOptionValue.trim() },
    ];
    this.newOptionLabel = '';
    this.newOptionValue = '';
  }

  removeOptionFromNew(index: number): void {
    this.newQuestion.options = this.newQuestion.options.filter((_, i) => i !== index);
  }

  addQuestion(): void {
    if (!this.newQuestion.text.trim() || !this.newQuestion.field_key.trim()) return;

    // Construire la condition si activée
    if (this.newQuestionHasCondition && this.newQuestionConditionKey.trim() && this.newQuestionConditionValues.trim()) {
      this.newQuestion.condition = {
        depends_on: this.newQuestionConditionKey.trim(),
        show_when: this.newQuestionConditionValues.split(',').map(v => v.trim()).filter(Boolean),
      };
    } else {
      this.newQuestion.condition = null;
    }

    this.addingQuestion = true;
    this.questionsError = null;
    this.recommendSvc.createQuestion(this.newQuestion).subscribe({
      next: (q) => {
        this.questions = [...this.questions, q].sort((a, b) => a.order - b.order);
        this.showAddQuestion = false;
        this.addingQuestion = false;
        this.questionsSuccess = `✅ Question "${q.text}" créée avec succès.`;
        this.resetNewQuestion();
        setTimeout(() => { this.questionsSuccess = null; }, 4000);
      },
      error: (e: Error) => { this.questionsError = e.message; this.addingQuestion = false; },
    });
  }

  deleteQuestion(id: string): void {
    if (!confirm('Supprimer cette question ? Les réponses associées seront perdues.')) return;
    this.recommendSvc.deleteQuestion(id).subscribe({
      next: () => {
        this.questions = this.questions.filter(q => q.id !== id);
        this.questionsSuccess = '✅ Question supprimée.';
        setTimeout(() => { this.questionsSuccess = null; }, 3000);
      },
      error: (e: Error) => { this.questionsError = e.message; },
    });
  }

  seedQuestions(): void {
    if (!confirm('Insérer les questions par défaut ? (Sans effet si des questions existent déjà)')) return;
    this.questionsLoading = true;
    this.recommendSvc.seedQuestions().subscribe({
      next: (res) => {
        this.questionsSuccess = res.count > 0
          ? `✅ ${res.count} questions créées.`
          : `ℹ️ ${res.message}`;
        this.questionsLoading = false;
        this.loadQuestions();
        setTimeout(() => { this.questionsSuccess = null; }, 5000);
      },
      error: (e: Error) => { this.questionsError = e.message; this.questionsLoading = false; },
    });
  }

  resetNewQuestion(): void {
    this.newQuestion = {
      order: this.questions.length + 1,
      text: '',
      field_key: '',
      input_type: 'select',
      condition: null,
      dynamic_options: null,
      options: [],
    };
    this.newOptionLabel = '';
    this.newOptionValue = '';
    this.newQuestionHasCondition = false;
    this.newQuestionConditionKey = '';
    this.newQuestionConditionValues = '';
  }

  questionConditionLabel(q: QuestionOut): string {
    if (!q.condition) return '—';
    return `Si ${q.condition.depends_on} = ${q.condition.show_when.join(', ')}`;
  }

  // ── Questionnaire end ─────────────────────────────────────────────────────

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
