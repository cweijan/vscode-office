// Treat a continuous stream of trackpad events (including inertia) as one gesture.
export function createBrowseWheelHandler() {
    let lastEvent: number | undefined;
    let distance = 0;
    let switched = false;
    return (event: Pick<WheelEvent, 'deltaY' | 'deltaMode'>, now: number): number => {
        if (!event.deltaY) return 0;
        if (lastEvent === undefined || now - lastEvent > 180) {
            distance = 0;
            switched = false;
        }
        lastEvent = now;
        if (switched) return 0;
        const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 800 : 1);
        if (distance && Math.sign(distance) !== Math.sign(delta)) distance = 0;
        distance += delta;
        if (Math.abs(distance) < 40) return 0;
        switched = true;
        return Math.sign(distance);
    };
}
