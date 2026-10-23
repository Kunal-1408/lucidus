import { HttpInterceptorFn } from '@angular/common/http';

const STORAGE_KEY = 'scholarship-finder.visitor-id';
export const VISITOR_ID_HEADER = 'x-visitor-id';

let current: string | undefined;

// The anonymous Visitor's ID: generated once per browser and kept in local
// storage. If storage is blocked it lasts for this visit only.
export function visitorId(): string {
  if (current) return current;
  try {
    current = localStorage.getItem(STORAGE_KEY) ?? undefined;
  } catch {
    // Storage blocked: generate one below.
  }
  if (!current) {
    current = crypto.randomUUID();
    try {
      localStorage.setItem(STORAGE_KEY, current);
    } catch {
      // Keep it in memory only.
    }
  }
  return current;
}

// Sends the Visitor ID as a header on every API call.
export const visitorIdInterceptor: HttpInterceptorFn = (req, next) =>
  req.url.startsWith('/api/')
    ? next(req.clone({ setHeaders: { [VISITOR_ID_HEADER]: visitorId() } }))
    : next(req);
