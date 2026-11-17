import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from '../../app';
import { FonctionnalitesService } from '../../core/services/fonctionnalites.service';
import { SiteConfigService } from '../../core/services/site-config.service';
import { AuthService } from '../../core/services/auth.service';

@Component({ template: '' })
class RouteStub {}

describe('Pilot navigation shell', () => {
  let fixture: ComponentFixture<App>;
  let terrainsActifs: ReturnType<typeof signal<boolean>>;
  let demo3dEnabled: ReturnType<typeof signal<boolean>>;
  let estConnecte: ReturnType<typeof signal<boolean>>;
  let peutPublier: ReturnType<typeof signal<boolean>>;
  let estAdmin: ReturnType<typeof signal<boolean>>;
  const links = (path: string) => fixture.nativeElement.querySelectorAll(`a[href="${path}"]`);

  beforeEach(async () => {
    terrainsActifs = signal(false);
    demo3dEnabled = signal(false);
    estConnecte = signal(false);
    peutPublier = signal(false);
    estAdmin = signal(false);
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([{ path: '**', component: RouteStub }]),
        provideHttpClient(), provideHttpClientTesting(),
        { provide: FonctionnalitesService, useValue: { terrainsActifs } },
        { provide: SiteConfigService, useValue: { demo3dEnabled, demo3dUrl: '/viewer-3d/index.html' } },
        { provide: AuthService, useValue: { estConnecte, peutPublier, estAdmin, user: signal(null) } }]
    }).compileComponents();
    fixture = TestBed.createComponent(App);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('gates terrains in desktop, mobile menu and footer with the current feature service', () => {
    expect(links('/terrains').length).toBe(0);
    terrainsActifs.set(true);
    fixture.detectChanges();
    expect(links('/terrains').length).toBe(3);
    terrainsActifs.set(false);
    fixture.detectChanges();
    expect(links('/terrains').length).toBe(0);
  });

  it('has no comparison route and only shows the configured demo when enabled', () => {
    expect(links('/comparer').length).toBe(0);
    expect(fixture.nativeElement.querySelector('app-comparison-tray')).toBeNull();
    expect(links('/viewer-3d/index.html').length).toBe(0);
    demo3dEnabled.set(true);
    fixture.detectChanges();
    expect(links('/viewer-3d/index.html').length).toBe(1);
  });

  it('keeps account, publisher and admin affordances aligned with current auth signals', () => {
    expect(links('/publier').length).toBe(0);
    expect(links('/admin').length).toBe(0);
    expect(fixture.nativeElement.querySelector('.mobile-tabs a:last-child').getAttribute('href')).toBe('/login');
    estConnecte.set(true);
    peutPublier.set(true);
    fixture.detectChanges();
    expect(links('/publier').length).toBe(4);
    expect(links('/admin').length).toBe(0);
    expect(fixture.nativeElement.querySelector('.mobile-tabs a:last-child').getAttribute('href')).toBe('/profil');
    estAdmin.set(true);
    fixture.detectChanges();
    expect(links('/admin').length).toBe(3);
  });

  it('opens a modal dialog, exposes expanded state and releases the scroll lock on close', () => {
    fixture.componentInstance.ouvrirMenuMobile();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('dialog').open).toBeTrue();
    expect(fixture.nativeElement.querySelector('.mobile-menu-toggle').getAttribute('aria-expanded')).toBe('true');
    expect(document.body.classList.contains('mobile-menu-open')).toBeTrue();
    fixture.componentInstance.fermerMenuMobile();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('dialog').open).toBeFalse();
    expect(document.body.classList.contains('mobile-menu-open')).toBeFalse();
  });

  it('closes the menu on navigation and marks terrain detail as part of Acheter', async () => {
    fixture.componentInstance.ouvrirMenuMobile();
    await TestBed.inject(Router).navigateByUrl('/terrains/terrain-1');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('dialog').open).toBeFalse();
    expect(fixture.nativeElement.querySelector('.mobile-tabs a[href="/villas"]').getAttribute('aria-current')).toBe('page');
  });

  it('closes a same-route menu link and removes scroll locking when destroyed', () => {
    fixture.componentInstance.ouvrirMenuMobile();
    const link = fixture.nativeElement.querySelector('.mobile-menu a');
    fixture.componentInstance.gererClicMenu({ target: link } as MouseEvent);
    expect(fixture.nativeElement.querySelector('dialog').open).toBeFalse();
    fixture.componentInstance.ouvrirMenuMobile();
    fixture.destroy();
    expect(document.body.classList.contains('mobile-menu-open')).toBeFalse();
  });
});
