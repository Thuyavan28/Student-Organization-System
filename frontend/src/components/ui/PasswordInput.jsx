import { useState } from 'react';
import { LuEye, LuEyeOff, LuLock } from 'react-icons/lu';
import Input from './Input';

// Password field with a show/hide toggle.
export default function PasswordInput(props) {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      icon={LuLock}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="rounded-lg p-2 text-cf-muted transition-colors hover:bg-cf-hover hover:text-cf-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-fg"
        >
          {visible ? <LuEyeOff className="h-4 w-4" /> : <LuEye className="h-4 w-4" />}
        </button>
      }
    />
  );
}
