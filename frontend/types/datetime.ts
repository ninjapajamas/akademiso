function pad(value: number) {
    return value.toString().padStart(2, '0');
}

export function formatApiDateTimeForInput(value?: string | null) {
    if (!value) {
        return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return [
        date.getFullYear(),
        pad(date.getMonth() + 1),
        pad(date.getDate())
    ].join('-') + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function normalizeDateTimeInputToStartOfDay(value?: string | null) {
    if (!value) {
        return '';
    }

    const [datePart] = value.split('T');
    if (!datePart) {
        return '';
    }

    return `${datePart}T00:00`;
}

export function createTodayDateTimeInputAtStartOfDay(referenceDate = new Date()) {
    if (Number.isNaN(referenceDate.getTime())) {
        return '';
    }

    return [
        referenceDate.getFullYear(),
        pad(referenceDate.getMonth() + 1),
        pad(referenceDate.getDate())
    ].join('-') + 'T00:00';
}

export function formatInputDateTimeForApi(value?: string | null) {
    if (!value) {
        return null;
    }

    const [datePart, timePart] = value.split('T');
    if (!datePart || !timePart) {
        return null;
    }

    const [year, month, day] = datePart.split('-');
    const [hour, minute] = timePart.split(':');

    if (!year || !month || !day || !hour || !minute) {
        return null;
    }

    const localDate = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute)
    );

    if (Number.isNaN(localDate.getTime())) {
        return null;
    }

    const offsetMinutes = -localDate.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absoluteOffset = Math.abs(offsetMinutes);
    const offsetHour = pad(Math.floor(absoluteOffset / 60));
    const offsetMinute = pad(absoluteOffset % 60);

    return `${year}-${month}-${day}T${hour}:${minute}:00${sign}${offsetHour}:${offsetMinute}`;
}

export function formatApiDateTimeForDisplay(value?: string | null) {
    if (!value) {
        return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '-';
    }

    return date.toLocaleString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatApiDateTimeRangeForDisplay(start?: string | null, end?: string | null) {
    if (!start && !end) {
        return 'Jadwal belum ditentukan';
    }

    const startLabel = formatApiDateTimeForDisplay(start);
    const endLabel = formatApiDateTimeForDisplay(end);

    if (start && end) {
        return `${startLabel} - ${endLabel}`;
    }

    return start ? `Mulai ${startLabel}` : `Sampai ${endLabel}`;
}

export function formatSlotDateForDisplay(dateValue?: string | null) {
    if (!dateValue) {
        return '-';
    }

    const date = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
        return '-';
    }

    return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

export function formatSlotTimeRangeForDisplay(startTime?: string | null, endTime?: string | null) {
    const startLabel = startTime ? startTime.slice(0, 5) : '--:--';
    const endLabel = endTime ? endTime.slice(0, 5) : '--:--';
    return `${startLabel} - ${endLabel} WIB`;
}
