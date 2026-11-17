import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Role } from '../../core/models/auth.model';
import { InscriptionDemarcheurComponent } from './inscription-demarcheur.component';

describe('Broker candidacy', () => {
  const user = signal<any>(null);
  beforeEach(() => {
    user.set(null);
    TestBed.configureTestingModule({imports:[InscriptionDemarcheurComponent],providers:[
      provideHttpClient(),provideHttpClientTesting(),provideRouter([]),
      {provide:AuthService,useValue:{user,estConnecte:()=>!!user(),estAdmin:()=>false}},
    ]});
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  for(const role of [null,Role.Locataire]) {
    it('blocks submissions and shows the correct next step for '+role, () => {
      user.set(role === null ? null : {role,nom:'Fixture',telephone:'0700000000'});
      const f=TestBed.createComponent(InscriptionDemarcheurComponent);
      f.detectChanges();
      f.componentInstance.zoneActivite='Cocody';
      f.componentInstance.soumettre();
      TestBed.inject(HttpTestingController).expectNone('/api/demarcheurs/inscrire');
      expect(f.nativeElement.querySelector('form')).toBeNull();
      expect(f.nativeElement.textContent).toContain(role === null ? 'Se connecter' : 'Contacter MaMaison');
    });
  }
  it('uses account identity and prevents duplicate requests', () => {
    user.set({role:Role.Demarcheur,nom:'Fixture',telephone:'0700000000'});
    const c=TestBed.createComponent(InscriptionDemarcheurComponent).componentInstance;
    c.zoneActivite=' Cocody ';
    c.soumettre(); c.soumettre();
    const req=TestBed.inject(HttpTestingController).expectOne('/api/demarcheurs/inscrire');
    expect(req.request.body).toEqual({nom:'Fixture',telephone:'0700000000',zoneActivite:'Cocody'});
    req.flush({});
    expect(c.etat()).toBe('succes');
  });
  it('retains the zone and explains expired sessions', () => {
    user.set({role:Role.Demarcheur,nom:'Fixture',telephone:'0700000000'});
    const c=TestBed.createComponent(InscriptionDemarcheurComponent).componentInstance;
    c.zoneActivite='Cocody'; c.soumettre();
    TestBed.inject(HttpTestingController).expectOne('/api/demarcheurs/inscrire').flush({}, {status:401,statusText:'Unauthorized'});
    expect(c.zoneActivite).toBe('Cocody');
    expect(c.erreurMsg).toContain('session a expiré');
  });
});
