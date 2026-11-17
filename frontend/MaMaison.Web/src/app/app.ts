import { Component, ElementRef, HostListener, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from './core/services/auth.service';
import { SiteConfigService } from './core/services/site-config.service';
import { SearchBarComponent } from './shared/components/search-bar/search-bar.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { FonctionnalitesService } from './core/services/fonctionnalites.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SearchBarComponent, ToastComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss', './mobile-menu.scss', './footer.scss']
})
export class App implements OnDestroy {
  protected title = 'MaMaison';
  readonly auth = inject(AuthService);
  readonly fonctionnalites = inject(FonctionnalitesService);
  readonly siteConfig = inject(SiteConfigService);
  readonly menuMobileOuvert = signal(false);
  private readonly router = inject(Router);
  readonly rubriquePartenairesActive = signal(false);
  readonly achatActif = signal(false);
  @ViewChild('buyMenu') buyMenu?: ElementRef<HTMLDetailsElement>;
  @ViewChild('mobileMenu') mobileMenu!: ElementRef<HTMLDialogElement>;

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.fermerMenuMobile();
        this.rubriquePartenairesActive.set(/^\/(partenaires|devenir-apporteur)([/?#]|$)/.test(event.urlAfterRedirects));
        if (this.buyMenu) this.buyMenu.nativeElement.open = false;
        this.achatActif.set(/^\/(villas|terrains)([/?#]|$)/.test(event.urlAfterRedirects));
      }
    });
  }

  ouvrirMenuMobile() {
    if (this.mobileMenu.nativeElement.open) return;
    this.mobileMenu.nativeElement.showModal();
    this.menuMobileOuvert.set(true);
    document.body.classList.add('mobile-menu-open');
  }

  fermerMenuMobile() {
    if (this.mobileMenu?.nativeElement.open) this.mobileMenu.nativeElement.close();
    this.menuMobileOuvert.set(false);
    document.body.classList.remove('mobile-menu-open');
  }

  gererClicMenu(event: MouseEvent) {
    const cible = event.target as Element;
    if (cible.closest('a')) {
      // Close even when selecting the route that is already displayed.
      this.fermerMenuMobile();
      return;
    }
    const panneau = this.mobileMenu.nativeElement;
    if (cible !== panneau) return;
    const cadre = panneau.getBoundingClientRect();
    if (event.clientX < cadre.left || event.clientX > cadre.right || event.clientY < cadre.top || event.clientY > cadre.bottom) {
      this.fermerMenuMobile();
    }
  }

  gererClavierMenu(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    const panneau = this.mobileMenu.nativeElement;
    const elements = Array.from(panneau.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), summary'))
      .filter(element => element.getClientRects().length > 0);
    const premier = elements[0];
    const dernier = elements[elements.length - 1];
    if (!premier) return;
    if (event.shiftKey && (document.activeElement === premier || !panneau.contains(document.activeElement))) {
      event.preventDefault();
      dernier.focus();
    } else if (!event.shiftKey && (document.activeElement === dernier || !panneau.contains(document.activeElement))) {
      event.preventDefault();
      premier.focus();
    }
  }

  @HostListener('document:click', ['$event'])
  fermerAchatHorsMenu(event: MouseEvent) {
    const menu = this.buyMenu?.nativeElement;
    if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) menu.open = false;
  }

  fermerAchat() {
    if (!this.buyMenu) return;
    this.buyMenu.nativeElement.open = false;
    this.buyMenu.nativeElement.querySelector('summary')?.focus();
  }

  @HostListener('window:resize')
  adapterMenuAuViewport() {
    if (window.innerWidth > 800 && this.menuMobileOuvert()) this.fermerMenuMobile();
  }

  ngOnDestroy() { this.fermerMenuMobile(); }
}
