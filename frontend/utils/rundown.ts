export interface RundownAgendaEntry {
    id: string;
    order: number;
    label: string;
    text: string;
    block: number;
    timeLabel: string | null;
}

export function buildRundownLine(text: string, startTime?: string, endTime?: string) {
    const normalizedText = String(text || '').trim();
    const normalizedStart = String(startTime || '').trim();
    const normalizedEnd = String(endTime || '').trim();

    if (!normalizedText) {
        return '';
    }

    if (normalizedStart && normalizedEnd) {
        return `${normalizedStart} - ${normalizedEnd} | ${normalizedText}`;
    }

    if (normalizedStart) {
        return `${normalizedStart} | ${normalizedText}`;
    }

    return normalizedText;
}

function toRundownArray(items: unknown): string[] {
    if (Array.isArray(items)) {
        return items.map((item) => String(item ?? ''));
    }

    if (typeof items === 'string') {
        try {
            const parsed = JSON.parse(items);
            if (Array.isArray(parsed)) {
                return parsed.map((item) => String(item ?? ''));
            }
        } catch {
            return items.split('\n');
        }
    }

    return [];
}

function extractTimeLabel(item: string) {
    const match = item.match(/^\s*((?:[01]?\d|2[0-3])[:.][0-5]\d(?:\s*(?:-|–)\s*(?:[01]?\d|2[0-3])[:.][0-5]\d)?)\s*(?:\||:|-)?\s*(.*)$/);
    if (!match) {
        return {
            timeLabel: null,
            text: item,
        };
    }

    const [, rawTimeLabel, rawText] = match;
    return {
        timeLabel: rawTimeLabel.replace(/\./g, ':').replace(/\s*(?:-|–)\s*/, ' - '),
        text: rawText.trim() || item,
    };
}

export function normalizeRundownLines(items: unknown = []) {
    const normalized = toRundownArray(items).map((item) => String(item ?? '').replace(/\r/g, '').trimEnd());

    while (normalized.length > 0 && normalized[0] === '') {
        normalized.shift();
    }

    while (normalized.length > 0 && normalized[normalized.length - 1] === '') {
        normalized.pop();
    }

    return normalized;
}

export function parseRundownText(value: string) {
    return normalizeRundownLines(value.split('\n'));
}

export function serializeRundownText(items: unknown = []) {
    return normalizeRundownLines(items).join('\n');
}

export function getRundownAgendaEntries(items: unknown = []) {
    const normalized = normalizeRundownLines(items);
    let order = 0;
    let block = 0;

    return normalized.flatMap((item, index) => {
        if (!item.trim()) {
            block += 1;
            return [];
        }

        order += 1;
        const parsedEntry = extractTimeLabel(item);
        return [{
            id: `rundown-${index}-${order}`,
            order,
            label: `Sesi ${String(order).padStart(2, '0')}`,
            text: parsedEntry.text,
            block,
            timeLabel: parsedEntry.timeLabel,
        }];
    });
}
