export default function assert(value: unknown, message?: string) {
    if (!value) {
        throw new Error(message ?? 'Assertion failed');
    }
}
