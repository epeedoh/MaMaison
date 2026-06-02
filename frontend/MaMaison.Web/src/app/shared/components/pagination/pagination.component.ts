import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-pagination',
  imports: [],
  template: `
    @if (totalPages > 1) {
      <div class="pagination">
        <button class="page-btn" [disabled]="page <= 1" (click)="aller(page - 1)">
          ←
        </button>

        @for (p of pages; track p) {
          @if (p === -1) {
            <span class="page-sep">…</span>
          } @else {
            <button class="page-btn" [class.active]="p === page" (click)="aller(p)">
              {{ p }}
            </button>
          }
        }

        <button class="page-btn" [disabled]="page >= totalPages" (click)="aller(page + 1)">
          →
        </button>

        <span class="page-info">
          {{ (page - 1) * pageSize + 1 }}–{{ pageEnd }} sur {{ total }}
        </span>
      </div>
    }
  `,
  styles: [`
    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 24px 0 8px;
      flex-wrap: wrap;
    }
    .page-btn {
      min-width: 36px;
      height: 36px;
      padding: 0 10px;
      border-radius: 8px;
      border: 1.5px solid var(--border);
      background: white;
      color: var(--text-mid);
      font-size: .85rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: all .18s;
    }
    .page-btn:hover:not(:disabled) {
      background: var(--navy-mid);
      color: white;
      border-color: var(--navy-mid);
    }
    .page-btn.active {
      background: var(--navy-mid);
      color: white;
      border-color: var(--navy-mid);
    }
    .page-btn:disabled {
      opacity: .35;
      cursor: not-allowed;
    }
    .page-sep {
      width: 28px;
      text-align: center;
      color: var(--text-soft);
      font-size: .85rem;
    }
    .page-info {
      font-size: .75rem;
      color: var(--text-soft);
      margin-left: 8px;
    }
  `]
})
export class PaginationComponent {
  @Input() page      = 1;
  @Input() pageSize  = 12;
  @Input() total     = 0;
  @Input() totalPages = 0;
  @Output() pageChange = new EventEmitter<number>();

  get pages(): number[] {
    const pages: number[] = [];
    const delta = 2;
    for (let i = 1; i <= this.totalPages; i++) {
      if (i === 1 || i === this.totalPages ||
          (i >= this.page - delta && i <= this.page + delta)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== -1) {
        pages.push(-1);
      }
    }
    return pages;
  }

  get pageEnd(): number {
    return Math.min(this.page * this.pageSize, this.total);
  }

  aller(p: number) {
    if (p >= 1 && p <= this.totalPages) this.pageChange.emit(p);
  }
}
