import { useEffect, useState, type ReactNode } from 'react';
import type { FormField, PromptStep, PromptSubmitValue } from '../util/gitActionPromptFlow';
import type { PopupAnchor } from '../util/commitDetailPopup';
import { AnchoredDialog, AnchoredDialogActions } from './AnchoredDialog';
import DialogOverlay from './DialogOverlay';

interface ActionDialogProps {
    step: PromptStep;
    anchored?: boolean;
    anchor?: PopupAnchor | null;
    onCancel: () => void;
    onSubmit: (value: PromptSubmitValue) => void;
}

function abbrevHash(hash: string): string {
    return hash === '*' ? '*' : hash.substring(0, 8);
}

function buildInitialFormValues(fields: FormField[]): Record<string, string> {
    const initial: Record<string, string> = {};
    for (const field of fields) {
        if (field.type === 'text') {
            initial[field.id] = field.defaultValue ?? '';
        } else if (field.type === 'select') {
            initial[field.id] = field.defaultValue ?? field.options[0]?.value ?? '';
        } else {
            initial[field.id] = field.defaultValue ? 'yes' : 'no';
        }
    }
    return initial;
}

function renderFieldInfo(info?: string) {
    if (!info) {
        return null;
    }
    return (
        <span className="git-graph-anchored-dialog-info" title={info}>
            <span className="codicon codicon-info" aria-hidden />
        </span>
    );
}

function renderAnchoredFormFields(
    fields: FormField[],
    formValues: Record<string, string>,
    onFormValuesChange: (values: Record<string, string>) => void,
    onSubmit: () => void,
    submitWhenEnter?: () => boolean,
) {
    return (
        <table className="git-graph-anchored-dialog-form">
            <tbody>
                {fields.map((field) => {
                    if (field.type === 'text') {
                        return (
                            <tr key={field.id}>
                                <th scope="row">{field.label}:</th>
                                <td>
                                    <input
                                        type="text"
                                        className="git-graph-anchored-dialog-input"
                                        placeholder={field.placeholder}
                                        value={formValues[field.id] ?? ''}
                                        autoFocus={field.id === fields[0]?.id}
                                        onChange={(e) => {
                                            onFormValuesChange({
                                                ...formValues,
                                                [field.id]: e.target.value,
                                            });
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && (!submitWhenEnter || submitWhenEnter())) {
                                                e.preventDefault();
                                                onSubmit();
                                            }
                                        }}
                                    />
                                    {renderFieldInfo(field.info)}
                                </td>
                            </tr>
                        );
                    }
                    if (field.type === 'select') {
                        return (
                            <tr key={field.id}>
                                <th scope="row">{field.label}:</th>
                                <td>
                                    <select
                                        className="git-graph-anchored-dialog-select"
                                        value={formValues[field.id] ?? ''}
                                        onChange={(e) => {
                                            onFormValuesChange({
                                                ...formValues,
                                                [field.id]: e.target.value,
                                            });
                                        }}
                                    >
                                        {field.options.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    {renderFieldInfo(field.info)}
                                </td>
                            </tr>
                        );
                    }
                    return (
                        <tr key={field.id}>
                            <th scope="row">{field.label}:</th>
                            <td>
                                <label className="git-graph-anchored-dialog-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={formValues[field.id] === 'yes'}
                                        onChange={(e) => {
                                            onFormValuesChange({
                                                ...formValues,
                                                [field.id]: e.target.checked ? 'yes' : 'no',
                                            });
                                        }}
                                    />
                                </label>
                                {renderFieldInfo(field.info)}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

function renderAnchoredCheckboxList(
    fields: FormField[],
    formValues: Record<string, string>,
    onFormValuesChange: (values: Record<string, string>) => void,
    centered = false,
) {
    return (
        <div className={`git-graph-anchored-dialog-checkbox-list${centered ? ' centered' : ''}`}>
            {fields.map((field) => {
                if (field.type !== 'checkbox') {
                    return null;
                }
                return (
                    <label key={field.id} className="git-graph-anchored-dialog-checkbox-item">
                        <input
                            type="checkbox"
                            checked={formValues[field.id] === 'yes'}
                            onChange={(e) => {
                                onFormValuesChange({
                                    ...formValues,
                                    [field.id]: e.target.checked ? 'yes' : 'no',
                                });
                            }}
                        />
                        <span>{field.label}</span>
                        {renderFieldInfo(field.info)}
                    </label>
                );
            })}
        </div>
    );
}

function getPickAccentClass(variant?: string): string | null {
    switch (variant) {
        case 'resetMode':
            return 'accent-reset';
        case 'pushRemote':
            return 'accent-push';
        case 'openRemote':
            return 'accent-remote';
        default:
            return null;
    }
}

function renderAnchoredOptionList(
    options: { value: string; label: string; description?: string }[],
    pickValue: string,
    onPick: (value: string) => void,
    groupLabel: string,
    accentClass?: string | null,
    onDoublePick?: (value: string) => void,
) {
    const listClass = accentClass
        ? `git-graph-anchored-dialog-option-list accent-mode ${accentClass}`
        : 'git-graph-anchored-dialog-option-list';
    return (
        <div className={listClass} role="radiogroup" aria-label={groupLabel}>
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={pickValue === option.value}
                    className={`git-graph-anchored-dialog-option${pickValue === option.value ? ' selected' : ''}`}
                    onClick={() => onPick(option.value)}
                    onDoubleClick={onDoublePick
                        ? () => onDoublePick(option.value)
                        : undefined}
                >
                    <span className="git-graph-anchored-dialog-option-label">{option.label}</span>
                    {option.description && (
                        <span className="git-graph-anchored-dialog-option-desc">{option.description}</span>
                    )}
                </button>
            ))}
        </div>
    );
}

export default function ActionDialog({
    step, anchored = false, anchor, onCancel, onSubmit,
}: ActionDialogProps) {
    const [inputValue, setInputValue] = useState('');
    const [pickValue, setPickValue] = useState('');
    const [formValues, setFormValues] = useState<Record<string, string>>({});

    useEffect(() => {
        if (step.kind === 'input') {
            setInputValue(step.defaultValue ?? '');
        } else if (step.kind === 'pick') {
            setPickValue(step.options[0]?.value ?? '');
            if (step.fields) {
                setFormValues(buildInitialFormValues(step.fields));
            } else {
                setFormValues({});
            }
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

    let primaryLabel = 'OK';
    let primaryDisabled = false;
    let repositionDeps: unknown[] = [];
    let message: ReactNode = null;
    let body: ReactNode = null;

    if (step.kind === 'confirm') {
        primaryLabel = step.confirmLabel;
        if (anchored && step.variant === 'revertCommit' && step.commitHash) {
            message = (
                <>
                    Are you sure you want to revert commit{' '}
                    <strong><em>{abbrevHash(step.commitHash)}</em></strong>?
                </>
            );
        } else {
            message = step.message;
        }
        if (!anchored) {
            body = <p className="git-graph-dialog-message">{step.message}</p>;
        }
        repositionDeps = [step.message, step.variant, step.commitHash];
    } else if (step.kind === 'input') {
        primaryLabel = 'Continue';
        primaryDisabled = !step.optional && !inputValue.trim();
        if (anchored) {
            message = step.title;
            body = (
                <table className="git-graph-anchored-dialog-form">
                    <tbody>
                        <tr>
                            <th scope="row">{step.label}:</th>
                            <td>
                                <input
                                    type="text"
                                    className="git-graph-anchored-dialog-input"
                                    placeholder={step.placeholder}
                                    value={inputValue}
                                    autoFocus
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && (!primaryDisabled || step.optional)) {
                                            e.preventDefault();
                                            onSubmit(inputValue);
                                        }
                                    }}
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            );
        } else {
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
                            if (e.key === 'Enter' && (!primaryDisabled || step.optional)) {
                                e.preventDefault();
                                onSubmit(inputValue);
                            }
                        }}
                    />
                </label>
            );
        }
        repositionDeps = [inputValue, step.label];
    } else if (step.kind === 'form') {
        primaryLabel = step.submitLabel;
        if (step.variant === 'addTag') {
            primaryDisabled = !formValues.tagName?.trim();
        } else if (step.variant === 'deleteBranch' || step.variant === 'merge') {
            primaryDisabled = false;
        } else {
            primaryDisabled = step.fields.some((field) => {
                if (field.type !== 'text') {
                    return false;
                }
                return !formValues[field.id]?.trim();
            });
        }
        if (anchored) {
            if (step.variant === 'createBranch') {
                message = (
                    <>
                        Create branch at commit <em>{abbrevHash(step.commitHash ?? '')}</em>:
                    </>
                );
                body = renderAnchoredFormFields(
                    step.fields,
                    formValues,
                    setFormValues,
                    () => onSubmit(formValues),
                    () => Boolean(formValues.branchName?.trim()),
                );
            } else if (step.variant === 'addTag') {
                message = (
                    <>
                        Add tag to commit <strong><em>{abbrevHash(step.commitHash ?? '')}</em></strong>:
                    </>
                );
                body = renderAnchoredFormFields(
                    step.fields,
                    formValues,
                    setFormValues,
                    () => onSubmit(formValues),
                    () => Boolean(formValues.tagName?.trim()),
                );
            } else if (step.variant === 'deleteBranch') {
                message = (
                    <>
                        Are you sure you want to delete the branch{' '}
                        <strong><em>{step.branchName}</em></strong>?
                    </>
                );
                body = renderAnchoredCheckboxList(step.fields, formValues, setFormValues, true);
            } else if (step.variant === 'merge') {
                message = (
                    <>
                        Are you sure you want to merge {step.mergeOn}{' '}
                        <strong><em>{step.mergeTarget}</em></strong> into{' '}
                        {step.branchName ? (
                            <>
                                <strong><em>{step.branchName}</em></strong> (the current branch)
                            </>
                        ) : (
                            'the current branch'
                        )}
                        ?
                    </>
                );
                body = renderAnchoredCheckboxList(step.fields, formValues, setFormValues);
            } else if (step.variant === 'cherryPick') {
                message = (
                    <>
                        Are you sure you want to cherry pick commit{' '}
                        <strong><em>{abbrevHash(step.commitHash ?? '')}</em></strong>?
                    </>
                );
                body = (
                    <>
                        {step.fields.some((field) => field.type === 'select') && (
                            <table className="git-graph-anchored-dialog-form">
                                <tbody>
                                    {step.fields.map((field) => {
                                        if (field.type !== 'select') {
                                            return null;
                                        }
                                        return (
                                            <tr key={field.id}>
                                                <th scope="row">{field.label}:</th>
                                                <td>
                                                    <select
                                                        className="git-graph-anchored-dialog-select"
                                                        value={formValues[field.id] ?? ''}
                                                        onChange={(e) => {
                                                            setFormValues((prev) => ({
                                                                ...prev,
                                                                [field.id]: e.target.value,
                                                            }));
                                                        }}
                                                    >
                                                        {field.options.map((option) => (
                                                            <option key={option.value} value={option.value}>
                                                                {option.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {renderFieldInfo(field.info)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                        {renderAnchoredCheckboxList(step.fields, formValues, setFormValues)}
                    </>
                );
            } else {
                if (step.message) {
                    message = step.message;
                } else {
                    message = step.title;
                }
                body = (
                    <table className="git-graph-anchored-dialog-form">
                        <tbody>
                            {step.fields.map((field) => {
                                if (field.type === 'text') {
                                    return (
                                        <tr key={field.id}>
                                            <th scope="row">{field.label}:</th>
                                            <td>
                                                <input
                                                    type="text"
                                                    className="git-graph-anchored-dialog-input"
                                                    placeholder={field.placeholder}
                                                    value={formValues[field.id] ?? ''}
                                                    autoFocus={field.id === step.fields[0]?.id}
                                                    onChange={(e) => {
                                                        setFormValues((prev) => ({
                                                            ...prev,
                                                            [field.id]: e.target.value,
                                                        }));
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && formValues.branchName?.trim()) {
                                                            e.preventDefault();
                                                            onSubmit(formValues);
                                                        }
                                                    }}
                                                />
                                            </td>
                                        </tr>
                                    );
                                }
                                if (field.type === 'select') {
                                    return null;
                                }
                                return (
                                    <tr key={field.id}>
                                        <th scope="row">{field.label}:</th>
                                        <td>
                                            <label className="git-graph-anchored-dialog-checkbox">
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
                                            </label>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                );
            }
        } else {
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
                                        autoFocus={field.id === step.fields[0]?.id}
                                        onChange={(e) => {
                                            setFormValues((prev) => ({ ...prev, [field.id]: e.target.value }));
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !primaryDisabled) {
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
        }
        repositionDeps = [formValues, step.message, step.variant];
    } else {
        primaryLabel = step.submitLabel ?? 'Continue';
        primaryDisabled = step.options.length > 0 && !pickValue;
        if (step.variant === 'pushRemote') {
            primaryLabel = step.submitLabel ?? 'Push';
        } else if (step.variant === 'openRemote') {
            primaryLabel = step.submitLabel ?? 'Open';
        }
        const submitPick = (value: string) => {
            if (step.fields?.length) {
                onSubmit({ [step.id]: value, ...formValues });
                return;
            }
            onSubmit(value);
        };
        const pickDoubleSubmit = step.variant === 'pushRemote' || step.variant === 'openRemote'
            ? submitPick
            : undefined;
        const pickExtras = step.fields
            ? renderAnchoredCheckboxList(step.fields, formValues, setFormValues)
            : null;
        if (anchored && step.variant === 'resetMode') {
            primaryLabel = step.submitLabel ?? 'Reset';
            message = (
                <>
                    Are you sure you want to reset{' '}
                    {step.branchName ? (
                        <>
                            <strong><em>{step.branchName}</em></strong> (the current branch)
                        </>
                    ) : (
                        'the current branch'
                    )}
                    {' '}to commit <strong><em>{abbrevHash(step.commitHash ?? '')}</em></strong>?
                </>
            );
            body = renderAnchoredOptionList(
                step.options,
                pickValue,
                setPickValue,
                step.title,
                getPickAccentClass(step.variant),
                pickDoubleSubmit,
            );
        } else if (anchored) {
            message = step.message ?? step.title;
            body = (
                <>
                    {step.options.length > 0 && renderAnchoredOptionList(
                        step.options,
                        pickValue,
                        setPickValue,
                        step.title,
                        getPickAccentClass(step.variant),
                        pickDoubleSubmit,
                    )}
                    {pickExtras}
                </>
            );
        } else {
            body = (
                <div className="git-graph-dialog-pick">
                    {step.message && <p className="git-graph-dialog-message">{step.message}</p>}
                    {step.options.length > 0 && renderAnchoredOptionList(
                        step.options,
                        pickValue,
                        setPickValue,
                        step.title,
                        getPickAccentClass(step.variant),
                        pickDoubleSubmit,
                    )}
                    {pickExtras}
                </div>
            );
        }
        repositionDeps = [pickValue, formValues, step.message, step.options.length, step.variant, step.branchName, step.commitHash];
    }

    const handlePrimary = () => {
        if (step.kind === 'confirm') {
            onSubmit('confirm');
        } else if (step.kind === 'input') {
            onSubmit(inputValue);
        } else if (step.kind === 'form') {
            onSubmit(formValues);
        } else if (step.fields?.length) {
            onSubmit({ [step.id]: pickValue, ...formValues });
        } else {
            onSubmit(pickValue);
        }
    };

    if (anchored) {
        const compact = step.kind === 'pick'
            && (step.variant === 'pushRemote' || step.variant === 'openRemote');
        return (
            <DialogOverlay onCancel={onCancel} anchored>
                <AnchoredDialog
                    anchor={anchor}
                    ariaLabel={step.title}
                    repositionDeps={repositionDeps}
                    compact={compact}
                >
                    {message && (
                        <p className="git-graph-anchored-dialog-message">{message}</p>
                    )}
                    {body}
                    <AnchoredDialogActions
                        primaryLabel={primaryLabel}
                        primaryDisabled={primaryDisabled}
                        onPrimary={handlePrimary}
                        onCancel={onCancel}
                    />
                </AnchoredDialog>
            </DialogOverlay>
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
                        className="git-graph-dialog-btn primary"
                        disabled={primaryDisabled}
                        onClick={handlePrimary}
                    >
                        {primaryLabel}
                    </button>
                </div>
            </div>
        </DialogOverlay>
    );
}
