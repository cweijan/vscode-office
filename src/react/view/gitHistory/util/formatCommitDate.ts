const ONE_DAY_SEC = 24 * 60 * 60;

const DATE_LOCALE = 'en-US';

const relativeTimeFormatter = new Intl.RelativeTimeFormat(DATE_LOCALE, { numeric: 'auto' });

function formatRelativeAgo(timestampSec: number, nowMs: number): string {
    const thenMs = timestampSec * 1000;
    const diffSec = Math.round((thenMs - nowMs) / 1000);
    const absDiffSec = Math.abs(diffSec);

    if (absDiffSec < 60) {
        return relativeTimeFormatter.format(diffSec, 'second');
    }

    const diffMin = Math.round(diffSec / 60);
    if (Math.abs(diffMin) < 60) {
        return relativeTimeFormatter.format(diffMin, 'minute');
    }

    const diffHour = Math.round(diffMin / 60);
    return relativeTimeFormatter.format(diffHour, 'hour');
}

export function formatCommitDate(timestampSec: number, nowMs: number = Date.now()): string {
    const thenMs = timestampSec * 1000;
    const ageSec = (nowMs - thenMs) / 1000;

    if (ageSec >= 0 && ageSec < ONE_DAY_SEC) {
        return formatRelativeAgo(timestampSec, nowMs);
    }

    return new Date(thenMs).toLocaleString(undefined, {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
    });
}
