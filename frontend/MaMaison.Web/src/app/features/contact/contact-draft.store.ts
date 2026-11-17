import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ContactDraftStore {
  // Keep the login round trip in memory without persisting personal data.
  value: {
    email: string;
    sujet: string;
    message: string;
  } | null = null;
}
