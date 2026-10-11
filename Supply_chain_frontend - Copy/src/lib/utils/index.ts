// Central utilities barrel export for Supply Connect
export { cn } from '@/components/ui/cn';
export {
  decodeEntities,
  parseImpact,
  truncate,
  relativeTime,
  uid,
} from '@/lib/text';
export {
  categorize,
  categoryMeta,
  imageFor,
  severityOf,
  bySeverityThenDate,
  articleLink,
  dedupe,
  shuffled,
  CATEGORIES,
  SEVERITY_ORDER,
  SEVERITY_RANK,
  SEVERITY_LABEL,
} from '@/lib/disruptions';
export {
  safeRedirectPath,
  isPublicPath,
  PUBLIC_PATHS,
} from '@/lib/redirect';
export {
  displayName,
  initials,
  signOut,
} from '@/lib/auth';
export {
  readJSON,
  writeJSON,
  STORAGE_KEYS,
} from '@/lib/storage';

