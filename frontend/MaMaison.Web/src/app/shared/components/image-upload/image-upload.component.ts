import { Component, Output, EventEmitter, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-image-upload',
  imports: [],
  template: `
    <div class="upload-zone"
         [class.uploading]="etat() === 'upload'"
         [class.success]="etat() === 'succes'"
         (dragover)="$event.preventDefault()"
         (drop)="onDrop($event)"
         (click)="fileInput.click()">

      @if (etat() === 'idle') {
        <div class="upload-content">
          <span class="upload-icon">📷</span>
          <p class="upload-label">Glissez une photo ou <strong>cliquez pour parcourir</strong></p>
          <p class="upload-hint">JPEG, PNG, WebP — max 5 MB</p>
        </div>
      }
      @if (etat() === 'upload') {
        <div class="upload-content">
          <div class="spinner"></div>
          <p class="upload-label">Upload en cours…</p>
        </div>
      }
      @if (etat() === 'succes' && urlResult()) {
        <img [src]="urlResult()" alt="Aperçu" class="upload-preview">
        <button class="upload-change" (click)="$event.stopPropagation(); reset()">✕ Changer</button>
      }
      @if (etat() === 'erreur') {
        <div class="upload-content">
          <span class="upload-icon" style="color:#E53E3E">⚠️</span>
          <p class="upload-label" style="color:#E53E3E">{{ erreur() }}</p>
          <p class="upload-hint">Cliquez pour réessayer</p>
        </div>
      }

      <input #fileInput type="file" accept="image/jpeg,image/png,image/webp"
             style="display:none" (change)="onFile($event)">
    </div>
  `,
  styles: [`
    .upload-zone {
      border: 2px dashed var(--border);
      border-radius: var(--r-lg);
      padding: 32px 24px;
      text-align: center;
      cursor: pointer;
      transition: all .2s;
      background: var(--cream);
      position: relative;
      overflow: hidden;
    }
    .upload-zone:hover, .upload-zone.uploading { border-color: var(--navy-mid); background: var(--navy-soft); }
    .upload-zone.success { border-color: var(--success); padding: 0; }
    .upload-content { display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .upload-icon { font-size: 2rem; }
    .upload-label { font-size: .88rem; font-weight: 600; color: var(--text-mid); }
    .upload-hint { font-size: .72rem; color: var(--text-soft); }
    .upload-preview { width: 100%; height: 220px; object-fit: cover; border-radius: var(--r-lg); display: block; }
    .upload-change { position: absolute; top: 10px; right: 10px; background: rgba(5,13,26,.75); color: white; border: none; border-radius: 20px; padding: 5px 12px; font-size: .75rem; cursor: pointer; }
    .spinner { width: 28px; height: 28px; border: 3px solid var(--border); border-top-color: var(--navy-mid); border-radius: 50%; animation: spin .7s linear infinite; }
  `]
})
export class ImageUploadComponent {
  @Output() uploaded = new EventEmitter<string>();

  private readonly http = inject(HttpClient);

  etat      = signal<'idle' | 'upload' | 'succes' | 'erreur'>('idle');
  urlResult = signal<string | null>(null);
  erreur    = signal('');

  onFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.uploader(file);
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer?.files[0];
    if (file) this.uploader(file);
  }

  uploader(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      this.erreur.set('Fichier trop volumineux (max 5 MB)');
      this.etat.set('erreur');
      return;
    }
    this.etat.set('upload');
    const form = new FormData();
    form.append('file', file);
    this.http.post<{ url: string }>(`${environment.apiUrl}/upload/image`, form).subscribe({
      next: r => {
        this.urlResult.set(`http://localhost:5121${r.url}`);
        this.etat.set('succes');
        this.uploaded.emit(r.url);
      },
      error: () => { this.erreur.set('Erreur upload. Vérifiez votre connexion.'); this.etat.set('erreur'); }
    });
  }

  reset() { this.etat.set('idle'); this.urlResult.set(null); }
}
