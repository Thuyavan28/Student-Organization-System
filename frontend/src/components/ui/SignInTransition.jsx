import { LuZap } from 'react-icons/lu';

const DESTINATION = {
  ADMIN: 'admin dashboard',
  TREASURER: 'finance dashboard',
  VOLUNTEER: 'check-in desk',
  MEMBER: 'member area',
};

// Full-screen "signing you in" screen shown between a successful login and the first dashboard page.
export default function SignInTransition({ name, role }) {
  const firstName = (name ?? '').trim().split(' ')[0];
  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-8 bg-white px-6 text-center" role="status" aria-live="polite">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-cf-divider border-t-cf-fg" aria-hidden="true" />
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cf-fg text-white">
          <LuZap className="h-8 w-8" aria-hidden="true" />
        </span>
      </div>

      <div>
        <h1 className="text-page-title text-cf-fg">{firstName ? `Welcome, ${firstName}` : 'Welcome'}</h1>
        <p className="mt-2 text-sm text-cf-muted">Opening your {DESTINATION[role] ?? 'dashboard'}...</p>
      </div>

      <div className="h-1.5 w-56 overflow-hidden rounded-full bg-cf-divider" aria-hidden="true">
        <div className="signin-bar h-full w-1/3 rounded-full bg-cf-fg" />
      </div>
    </div>
  );
}
