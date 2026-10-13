import { useEffect } from 'react';
import { CheckCircleOutlined, CloseCircleOutlined, CloseOutlined, LoadingOutlined } from '@ant-design/icons';
import { $t } from '../../../i18n/i18nConfig';

export interface ExtractToastMessage {
    type: 'loading' | 'success' | 'error';
    message: string;
}

export default function ExtractToast({ toast, onClose }: {
    toast: ExtractToastMessage | null;
    onClose: () => void;
}) {
    useEffect(() => {
        if (!toast || toast.type === 'loading') return;
        const timer = window.setTimeout(onClose, 5000);
        return () => window.clearTimeout(timer);
    }, [toast, onClose]);

    if (!toast) return null;
    const Icon = toast.type === 'loading' ? LoadingOutlined :
        toast.type === 'error' ? CloseCircleOutlined : CheckCircleOutlined;
    return (
        <div className={`zip-toast zip-toast--${toast.type}`} role="status" aria-live="polite">
            <Icon className="zip-toast__icon" aria-hidden />
            <span className="zip-toast__message">{toast.message}</span>
            <button className="zip-toast__close" type="button" aria-label={$t('common.close')} onClick={onClose}>
                <CloseOutlined />
            </button>
        </div>
    );
}
