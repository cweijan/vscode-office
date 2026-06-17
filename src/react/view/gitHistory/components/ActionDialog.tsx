import { useEffect, useState, type ReactNode } from 'react';
import type { FormField, PromptStep, PromptSubmitValue } from '../util/gitActionPromptFlow';
import DialogOverlay from './DialogOverlay';

interface ActionDialogProps {
    step: PromptStep;
    onCancel: () => void;
    onSubmit: (value: PromptSubmitValue) => void;
}

function buildInitialFormValues(fields: FormField[]): Record<string, string> {
    const initial: Record<string, string> = {};
    for (const field of fields) {
        if (field.type === 'text') {
            initial[field.id] = field.defaultValue ?? '';
        } else {
            initial[field.id] = field.defaultValue ? 'yes' : 'no';
        }
    }
    return initial;
}

export default function ActionDialog({ step, onCancel, onSubmit }: ActionDialogProps) {
    const [inputValue, setInputValue] = useState('');
    const [pickValue, setPickValue] = useState('');
    const [formValues, setFormValues] = useState<Record<string, string>>({});

    useEffect(() => {
        if (step.kind === 'input') {
            setInputValue(step.defaultValue ?? '');
        } else if (step.kind === 'pick') {
            setPickValue(step.options[0]?.value ?? '');
        } else if (step.kind === 'form') {
            setFormValues(buildInitialFormValues(step.fields));
        }
    }, [step]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onCancel();
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onCancel]);

    let body: ReactNode;
    let confirmLabel = 'OK';
    let danger = false;
    let confirmDisabled = false;

    if (step.kind === 'confirm') {
        confirmLabel = step.confirmLabel;
        danger = Boolean(step.danger);
        body = <p className="git-graph-dialog-message">{step.message}</p>;
    } else if (step.kind === 'input') {
        confirmLabel = 'Continue';
        confirmDisabled = !step.optional && !inputValue.trim();
        body = (
            <label className="git-graph-dialog-field">
                <span className="git-graph-dialog-label">{step.label}</span>
                <input
                    type="text"
                    className="vscode-input"
                    placeholder={step.placeholder}
                    value={inputValue}
                    autoFocus
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && (!confirmDisabled || step.optional)) {
                            e.preventDefault();
                            onSubmit(inputValue);
                        }
                    }}
                />
            </label>
        );
    } else if (step.kind === 'form') {
        confirmLabel = step.submitLabel;
        confirmDisabled = step.fields.some((field) => {
            if (field.type !== 'text') {
                return false;
            }
            return !formValues[field.id]?.trim();
        });
        body = (
            <>
                {step.message && <p className="git-graph-dialog-message">{step.message}</p>}
                {step.fields.map((field) => {
                    if (field.type === 'text') {
                        return (
                            <label key={field.id} className="git-graph-dialog-field">
                                <span className="git-graph-dialog-label">{field.label}</span>
                                <input
                                    type="text"
                                    className="vscode-input"
                                    placeholder={field.placeholder}
                                    value={formValues[field.id] ?? ''}
                                    autoFocus={field.id === 'branchName'}
                                    onChange={(e) => {
                                        setFormValues((prev) => ({ ...prev, [field.id]: e.target.value }));
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && formValues.branchName?.trim()) {
                                            e.preventDefault();
                                            onSubmit(formValues);
                                        }
                                    }}
                                />
                            </label>
                        );
                    }
                    return (
                        <label key={field.id} className="git-graph-dialog-checkbox">
                            <input
                                type="checkbox"
                                checked={formValues[field.id] === 'yes'}
                                onChange={(e) => {
                                    setFormValues((prev) => ({
                                        ...prev,
                                        [field.id]: e.target.checked ? 'yes' : 'no',
                                    }));
                                }}
                            />
                            <span>{field.label}</span>
                        </label>
                    );
                })}
            </>
        );
    } else {
        confirmLabel = 'Continue';
        confirmDisabled = !pickValue;
        body = (
            <div className="git-graph-dialog-pick">
                {step.message && <p className="git-graph-dialog-message">{step.message}</p>}
                <div className="git-graph-dialog-options" role="listbox">
                    {step.options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            role="option"
                            aria-selected={pickValue === option.value}
                            className={`git-graph-dialog-option${pickValue === option.value ? ' selected' : ''}`}
                            onClick={() => setPickValue(option.value)}
                            onDoubleClick={() => onSubmit(option.value)}
                        >
                            <span className="git-graph-dialog-option-label">{option.label}</span>
                            {option.description && (
                                <span className="git-graph-dialog-option-desc">{option.description}</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <DialogOverlay onCancel={onCancel}>
            <div
                className="git-graph-dialog"
                role="dialog"
                aria-modal="true"
                aria-label={step.title}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="git-graph-dialog-header">
                    <h2>{step.title}</h2>
                    <button type="button" className="git-graph-icon-btn" title="Cancel" onClick={onCancel}>
                        <span className="codicon codicon-close" aria-hidden />
                    </button>
                </div>
                <div className="git-graph-dialog-body">{body}</div>
                <div className="git-graph-dialog-footer">
                    <button type="button" className="git-graph-dialog-btn" onClick={onCancel}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className={`git-graph-dialog-btn primary${danger ? ' danger' : ''}`}
                        disabled={confirmDisabled}
                        onClick={() => {
                            if (step.kind === 'confirm') {
                                onSubmit('confirm');
                            } else if (step.kind === 'input') {
                                onSubmit(inputValue);
                            } else if (step.kind === 'form') {
                                onSubmit(formValues);
                            } else {
                                onSubmit(pickValue);
                            }
                        }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </DialogOverlay>
    );
}
