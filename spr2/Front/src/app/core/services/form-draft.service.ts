import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class FormDraftService {

  private readonly drafts = new Map<string, Record<string, any>>();
  private static readonly SENSITIVE_FRAGMENTS = [
    'password',
    'passwd',
    'pwd',
  ];

  save(key: string, value: Record<string, any>): void {
    if (!key || value == null) {
      return;
    }
    const sanitized = this.sanitize(value);
    this.drafts.set(key, sanitized);
  }

  get(key: string): Record<string, any> | null {
    const draft = this.drafts.get(key);
    return draft ? this.clone(draft) : null;
  }

  has(key: string): boolean {
    return this.drafts.has(key);
  }

  clear(key: string): void {
    this.drafts.delete(key);
  }

  clearAll(): void {
    this.drafts.clear();
  }
  private sanitize(value: any): any {
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item));
    }

    if (value !== null && typeof value === 'object') {
      const result: Record<string, any> = {};
      for (const [k, v] of Object.entries(value)) {
        if (this.isSensitiveKey(k)) {
          continue;
        }
        result[k] = this.sanitize(v);
      }
      return result;
    }

    return value;
  }

  private isSensitiveKey(key: string): boolean {
    const lower = key.toLowerCase();
    return FormDraftService.SENSITIVE_FRAGMENTS.some((frag) =>
      lower.includes(frag),
    );
  }

  private clone(value: any): any {
    try {
      return structuredClone(value);
    } catch {
      return structuredClone(value);
    }
  }
}
