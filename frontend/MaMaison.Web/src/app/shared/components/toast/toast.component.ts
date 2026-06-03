import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  imports: [],
  template: `
    <div class="toast-stack">
      @for (toast of toastSvc.toasts(); track toast.id) {
        <div class="toast" [class]="'toast-' + toast.type" (click)="toastSvc.retirer(toast.id)">
          <span class="toast-icon">{{ icons[toast.type] }}</span>
          <span class="toast-msg">{{ toast.message }}</span>
          <button class="toast-close">✕</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-stack {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    }
    .toast {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border-radius: 12px;
      font-size: .86rem;
      font-weight: 600;
      min-width: 280px;
      max-width: 380px;
      box-shadow: 0 8px 32px rgba(5,13,26,.2);
      backdrop-filter: blur(12px);
      cursor: pointer;
      pointer-events: all;
      animation: toastIn .3s cubic-bezier(.16,1,.3,1) both;
    }
    @keyframes toastIn {
      from { opacity:0; transform:translateX(24px) scale(.95); }
      to   { opacity:1; transform:translateX(0) scale(1); }
    }
    .toast-succes       { background:rgba(5,150,105,.95);  color:white; }
    .toast-erreur       { background:rgba(185,28,28,.95);   color:white; }
    .toast-info         { background:rgba(15,31,61,.95);    color:white; }
    .toast-avertissement{ background:rgba(146,64,14,.95);   color:white; }
    .toast-icon  { font-size:1.1rem; flex-shrink:0; }
    .toast-msg   { flex:1; line-height:1.4; }
    .toast-close { background:none; border:none; color:rgba(255,255,255,.6); cursor:pointer; font-size:.8rem; padding:0 2px; }
    .toast-close:hover { color:white; }
  `]
})
export class ToastComponent {
  readonly toastSvc = inject(ToastService);
  readonly icons: Record<string, string> = {
    succes: '✅', erreur: '❌', info: 'ℹ️', avertissement: '⚠️'
  };
}
