/** 连续输入时 debounce 会被不断重置；超过 maxWait 后强制入栈 */
const HISTORY_MAX_WAIT_FACTOR = 3;

export const getHistoryRecordWait = (lastRecordAt: number, undoDelay: number): number => {
    if (!lastRecordAt) {
        return undoDelay;
    }
    const maxWait = undoDelay * HISTORY_MAX_WAIT_FACTOR;
    return Date.now() - lastRecordAt >= maxWait ? 0 : undoDelay;
};
