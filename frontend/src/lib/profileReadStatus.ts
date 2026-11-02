export type ProfileReadStatus = {
  state: 'loading' | 'success' | 'error';
  environment: string;
  folder: string;
  folderId?: string;
  error?: string;
  userCount?: number;
};
let current: ProfileReadStatus | null = null;
const listeners = new Set<() => void>();
export const getProfileReadStatus = () => current;
export function subscribeProfileReadStatus(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function setProfileReadStatus(status: ProfileReadStatus) {
  current = status;
  console.info('[Drive profiles]', JSON.stringify(status));
  listeners.forEach(listener => listener());
}
