import { useEffect, useRef, useState } from 'react';
import { IconEye, IconEyeOff } from '../icons';

interface PasswordModalProps {
    open: boolean;
    action: string;
    error?: string;
    onSubmit: (password: string) => void;
    onCancel: () => void;
}

export default function PasswordModal({ open, action, error, onSubmit, onCancel }: PasswordModalProps) {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!open) {
            setPassword('');
            setShowPassword(false);
            return;
        }
        inputRef.current?.focus();
    }, [open]);

    if (!open) return null;

    const submit = () => onSubmit(password);

    return (
        <div className="zip-modal-overlay" onClick={onCancel}>
            <div className="zip-modal" role="dialog" aria-modal="true" aria-labelledby="zip-password-title"
                onClick={(e) => e.stopPropagation()}>
                <h3 id="zip-password-title" className="zip-modal-title">Password Required</h3>
                <p className="zip-modal-desc">This archive is password protected. Enter the password to {action}.</p>
                {error ? <p className="zip-modal-error">{error}</p> : null}
                <div className="zip-modal-password">
                    <input
                        ref={inputRef}
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        placeholder="Password"
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') submit();
                            if (e.key === 'Escape') onCancel();
                        }}
                    />
                    <button
                        type="button"
                        className="zip-modal-password-toggle"
                        title={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword(v => !v)}
                    >
                        {showPassword ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                    </button>
                </div>
                <div className="zip-modal-actions">
                    <button type="button" className="zip-btn" onClick={onCancel}>Cancel</button>
                    <button type="button" className="zip-btn zip-btn-primary" onClick={submit}>Confirm</button>
                </div>
            </div>
        </div>
    );
}
