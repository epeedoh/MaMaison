import { FonctionnalitesService } from '../../core/services/fonctionnalites.service';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  readonly fonctionnalites = inject(FonctionnalitesService);
}
