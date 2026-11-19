import { AfterViewInit, Component, DestroyRef, ElementRef, HostListener, Input, Output, EventEmitter, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DemandeVisiteService } from '../../../core/services/demande-visite.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';

export type ModalMode = 'rappel' | 'visite' | '3d';

@Component({
  selector: 'app-demande-visite-modal',
  imports: [FormsModule, RouterLink],
  templateUrl: './demande-visite-modal.component.html',
  styleUrl: './demande-visite-modal.component.scss',
})
export class DemandeVisiteModalComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() bienId = '';
  @Input() titreBien = '';
  @Input() mode: ModalMode = 'visite';
  @Output() fermer = new EventEmitter<void>();

  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly service = inject(DemandeVisiteService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private previousOverflow = '';
  private previousFocus: HTMLElement | null = null;
  private sessionExpiree = false;
  readonly compte = signal<{ nom: string; telephone: string } | null>(null);
  readonly compteLoading = signal(false);
  dateSouhaitee = '';
  commentaire = '';
  etat = signal<'form' | 'chargement' | 'succes' | 'erreur' | 'connexion'>('form');
  messageErreur = '';
  get today(): string {
    const date = new Date();
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  }

  get titre(): string {
    return { rappel: 'Demander un rappel', visite: 'Planifier une visite', '3d': 'Demander une visite 3D' }[this.mode];
  }

  ngOnInit() {
    this.previousOverflow = document.body.style.overflow;
    this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    if (!this.sessionValide()) {
      this.demanderConnexion(!!this.auth.user());
    } else {
      this.chargerCompte();
    }
  }

  ngAfterViewInit() {
    this.element.nativeElement.querySelector<HTMLButtonElement>('.modal-close')?.focus();
  }

  ngOnDestroy() {
    document.body.style.overflow = this.previousOverflow;
    this.previousFocus?.focus();
  }

  @HostListener('keydown', ['$event'])
  clavier(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.fermerModal();
    }
    if (event.key !== 'Tab') return;
    const focusables = Array.from(this.element.nativeElement.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled)'))
      .filter(element => element.getClientRects().length > 0);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }

  fermerModal() {
    if (this.etat() === 'chargement') return;
    document.body.style.overflow = this.previousOverflow;
    this.fermer.emit();
  }

  chargerCompte() {
    if (this.compteLoading()) return;
    this.compteLoading.set(true);
    this.etat.set('form');
    this.messageErreur = '';
    this.http.get<{ nom: string; telephone: string }>(environment.apiUrl + '/profil').pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: compte => { this.compte.set(compte); this.compteLoading.set(false); },
      error: (e: HttpErrorResponse) => { this.compteLoading.set(false); this.afficherErreur(e); },
    });
  }

  seConnecter() {
    void this.router.navigate(['/login'], {
      queryParams: { returnUrl: this.router.url, reason: this.sessionExpiree ? 'session-expiree' : 'visite' },
    }).then(success => { if (success) this.fermerModal(); });
  }

  private sessionValide(): boolean {
    const user = this.auth.user();
    return !!user && !!this.auth.getToken() && Date.parse(user.expiration) > Date.now();
  }

  private demanderConnexion(expiree: boolean) {
    this.sessionExpiree = expiree;
    this.messageErreur = expiree ? 'Votre session a expiré. Reconnectez-vous avant d’envoyer votre demande.'
      : 'Connectez-vous pour envoyer une demande liée à votre compte.';
    this.etat.set('connexion');
  }

  soumettre() {
    if (this.etat() === 'chargement' || this.etat() === 'succes') return;
    if (!this.sessionValide()) { this.demanderConnexion(true); return; }
    const compte = this.compte();
    if (!compte || !this.bienId) return;
    if (this.mode !== 'rappel' && this.dateSouhaitee && this.dateSouhaitee < this.today) {
      this.messageErreur = 'Choisissez une date à partir d’aujourd’hui.';
      this.etat.set('erreur');
      return;
    }
    this.messageErreur = '';
    this.etat.set('chargement');
    this.service.soumettre({
      bienId: this.bienId, nature: this.mode,
      nom: compte.nom,
      telephone: compte.telephone,
      dateSouhaitee: this.mode === 'rappel' ? undefined : this.dateSouhaitee || undefined,
      commentaire: this.commentaire.trim() || undefined,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.etat.set('succes'); this.toast.succes('Votre demande a été enregistrée.'); },
      error: (e: HttpErrorResponse) => this.afficherErreur(e),
    });
  }

  private afficherErreur(error: HttpErrorResponse) {
    if (error.status === 401) { this.demanderConnexion(true); return; }
    this.messageErreur = error.status === 0 ? 'Le serveur est injoignable. Vérifiez votre connexion avant de réessayer.'
      : error.status === 403 ? 'Votre compte n’est pas autorisé à envoyer cette demande.'
      : error.status === 400 ? 'La demande n’a pas été acceptée. Vérifiez la date et le message.'
      : error.status === 404 ? 'Le compte ou le bien demandé est indisponible.'
      : error.status === 429 ? 'Trop de demandes. Patientez avant de réessayer.'
      : 'Impossible de confirmer l’enregistrement. Consultez vos demandes avant de réessayer.';
    this.etat.set('erreur');
  }
}
