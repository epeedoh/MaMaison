import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LocationService } from '../../../../core/services/location.service';
import { LocationDetail as LocationDetailModel, TypeLocationLabels } from '../../../../core/models/location.model';

@Component({
  selector: 'app-location-detail',
  imports: [RouterLink, DatePipe],
  templateUrl: './location-detail.html',
  styleUrl: './location-detail.scss'
})
export class LocationDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly locationService = inject(LocationService);

  location: LocationDetailModel | null = null;
  loading = true;
  error = false;
  readonly TypeLocationLabels = TypeLocationLabels;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.locationService.obtenirDetail(id).subscribe({
      next: l => { this.location = l; this.loading = false; },
      error: () => { this.error = true; this.loading = false; }
    });
  }

  formatPrix(prix: number) {
    return new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(prix);
  }
}
