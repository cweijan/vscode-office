import {
    cloneElement,
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type ReactElement,
    type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

const SHOW_DELAY_MS = 250;

interface ToolbarTooltipProps {
    content?: ReactNode;
    children: ReactElement;
}

export default function ToolbarTooltip({ content, children }: ToolbarTooltipProps) {
    const [visible, setVisible] = useState(false);
    const [positioned, setPositioned] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const anchorRef = useRef<HTMLSpanElement | null>(null);
    const tooltipRef = useRef<HTMLDivElement | null>(null);
    const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearShowTimer = useCallback(() => {
        if (showTimerRef.current !== null) {
            clearTimeout(showTimerRef.current);
            showTimerRef.current = null;
        }
    }, []);

    const hide = useCallback(() => {
        clearShowTimer();
        setVisible(false);
        setPositioned(false);
    }, [clearShowTimer]);

    const updatePosition = useCallback(() => {
        const anchor = anchorRef.current;
        const tooltipEl = tooltipRef.current;
        if (!anchor || !tooltipEl) {
            return;
        }
        const rect = anchor.getBoundingClientRect();
        const tooltipWidth = tooltipEl.offsetWidth;
        const tooltipHeight = tooltipEl.offsetHeight;
        const gap = 6;
        let top = rect.bottom + gap;
        let left = rect.left + rect.width / 2 - tooltipWidth / 2;
        left = Math.max(8, Math.min(left, window.innerWidth - tooltipWidth - 8));
        if (top + tooltipHeight > window.innerHeight - 8) {
            top = rect.top - tooltipHeight - gap;
        }
        setPosition({ top, left });
    }, []);

    const show = useCallback(() => {
        if (!content) {
            return;
        }
        clearShowTimer();
        showTimerRef.current = setTimeout(() => {
            setVisible(true);
        }, SHOW_DELAY_MS);
    }, [clearShowTimer, content]);

    useLayoutEffect(() => {
        if (!visible) {
            return;
        }
        updatePosition();
        setPositioned(true);
    }, [visible, content, updatePosition]);

    useEffect(() => {
        if (!visible) {
            return;
        }
        const onScroll = () => hide();
        const onResize = () => updatePosition();
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', onResize);
        };
    }, [visible, hide, updatePosition]);

    useEffect(() => () => clearShowTimer(), [clearShowTimer]);

    const ariaLabel = typeof content === 'string' ? content : undefined;

    return (
        <>
            <span
                ref={anchorRef}
                className="git-graph-toolbar-tooltip-anchor"
                onMouseEnter={show}
                onMouseLeave={hide}
                onMouseDown={hide}
            >
                {cloneElement(children, {
                    ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
                    title: undefined,
                })}
            </span>
            {visible && content && createPortal(
                <div
                    ref={tooltipRef}
                    className={`git-graph-toolbar-tooltip${positioned ? ' is-visible' : ''}`}
                    role="tooltip"
                    style={{ top: position.top, left: position.left }}
                >
                    {content}
                </div>,
                document.body,
            )}
        </>
    );
}
