import { useCallback, useState } from 'react';
import type { PromptStep, PromptSubmitValue } from '../util/gitActionPromptFlow';
import type { PopupAnchor } from '../util/commitDetailPopup';
import {
    getFollowUpSteps,
    getPromptSteps,
    resolveGitActionPayload,
    type GitActionRequest,
} from '../util/gitActionPromptFlow';

interface PromptState {
    base: GitActionRequest;
    steps: PromptStep[];
    stepIndex: number;
    answers: Record<string, string>;
    anchor?: PopupAnchor;
}

interface PromptContext {
    remotes: string[];
}

export function useGitActionPrompt(
    onExecute: (payload: GitActionRequest) => void,
) {
    const [prompt, setPrompt] = useState<PromptState | null>(null);

    const cancelPrompt = useCallback(() => {
        setPrompt(null);
    }, []);

    const requestAction = useCallback((
        payload: GitActionRequest,
        ctx: PromptContext,
        anchor?: PopupAnchor,
    ) => {
        const steps = getPromptSteps(payload, ctx);
        if (!steps || steps.length === 0) {
            onExecute(payload);
            return;
        }
        setPrompt({ base: payload, steps, stepIndex: 0, answers: {}, anchor });
    }, [onExecute]);

    const submitStep = useCallback((value: PromptSubmitValue) => {
        setPrompt((current) => {
            if (!current) return null;
            const step = current.steps[current.stepIndex];
            if (!step) return null;

            if (step.kind === 'form') {
                const formValues = typeof value === 'string' ? {} : value;
                const answers = { ...current.answers, ...formValues };
                const resolved = resolveGitActionPayload(current.base, answers);
                if (resolved) {
                    onExecute(resolved);
                }
                return null;
            }

            const stringValue = typeof value === 'string' ? value : '';
            const answers = { ...current.answers, [step.id]: stringValue };
            const followUp = getFollowUpSteps(current.base, step, stringValue);
            if (followUp.length > 0) {
                const nextSteps = [...current.steps];
                nextSteps.splice(current.stepIndex + 1, 0, ...followUp);
                return { ...current, steps: nextSteps, stepIndex: current.stepIndex + 1, answers };
            }

            const nextIndex = current.stepIndex + 1;
            if (nextIndex < current.steps.length) {
                return { ...current, stepIndex: nextIndex, answers };
            }

            const resolved = resolveGitActionPayload(current.base, answers);
            if (resolved) {
                onExecute(resolved);
            }
            return null;
        });
    }, [onExecute]);

    const currentStep = prompt ? prompt.steps[prompt.stepIndex] ?? null : null;
    const promptAnchor = prompt?.anchor ?? null;

    return {
        currentStep,
        promptAnchor,
        requestAction,
        submitStep,
        cancelPrompt,
    };
}
