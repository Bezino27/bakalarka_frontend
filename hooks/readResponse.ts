function getErrorMessage(data: unknown): string | null {
    if (!data || typeof data !== 'object') return null;

    const record = data as Record<string, unknown>;
    const value = record.detail ?? record.error ?? record.message;

    return typeof value === 'string' && value.trim() ? value : null;
}

export async function readJsonOrThrow<T>(
    res: Response,
    fallbackMessage = 'Nepodarilo sa načítať dáta.'
): Promise<T> {
    const rawText = await res.text();
    let parsed: unknown;

    if (rawText.trim()) {
        try {
            parsed = JSON.parse(rawText);
        } catch {
            parsed = undefined;
        }
    }

    if (!res.ok) {
        const parsedMessage = getErrorMessage(parsed);
        if (parsedMessage) throw new Error(parsedMessage);

        const text = rawText.trim();
        if (text && !text.startsWith('<')) throw new Error(text);

        throw new Error(fallbackMessage);
    }

    if (parsed === undefined) {
        throw new Error(fallbackMessage);
    }

    return parsed as T;
}

export async function readJsonArrayOrThrow<T>(
    res: Response,
    fallbackMessage = 'Nepodarilo sa načítať dáta.'
): Promise<T[]> {
    const data = await readJsonOrThrow<unknown>(res, fallbackMessage);
    return Array.isArray(data) ? (data as T[]) : [];
}
