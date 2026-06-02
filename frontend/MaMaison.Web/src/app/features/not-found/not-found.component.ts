import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <section class="hero" style="min-height:100vh;justify-content:center;padding:40px">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="hero-content">
        <div style="font-size:5rem;margin-bottom:16px;opacity:.15;font-family:var(--font-disp);font-weight:700;color:white;line-height:1">404</div>
        <div class="hero-eyebrow">Page introuvable</div>
        <h1 class="hero-title" style="font-size:2.2rem;margin-bottom:12px">
          Cette page n'existe pas
        </h1>
        <p class="hero-sub" style="margin-bottom:32px">
          Le bien que vous cherchez a peut-être été retiré ou l'URL est incorrecte.
        </p>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;position:relative;z-index:2">
          <a routerLink="/" class="btn btn-gold" style="height:48px;padding:0 24px">← Accueil</a>
          <a routerLink="/villas" class="btn" style="height:48px;padding:0 24px;background:rgba(255,255,255,.1);color:white;border:1.5px solid rgba(255,255,255,.2)">🏠 Villas</a>
          <a routerLink="/locations" class="btn" style="height:48px;padding:0 24px;background:rgba(255,255,255,.1);color:white;border:1.5px solid rgba(255,255,255,.2)">🔑 Locations</a>
        </div>
      </div>
    </section>
  `
})
export class NotFoundComponent {}
