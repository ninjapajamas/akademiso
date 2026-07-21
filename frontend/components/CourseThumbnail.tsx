'use client';

interface CourseThumbnailProps {
    imageUrl?: string | null;
    title: string;
    className?: string;
    imageClassName?: string;
    compact?: boolean;
}

export default function CourseThumbnail({
    imageUrl,
    title,
    className = '',
    imageClassName = '',
    compact = false,
}: CourseThumbnailProps) {
    if (imageUrl) {
        return (
            <img
                src={imageUrl}
                alt={title}
                className={`h-full w-full object-cover ${imageClassName}`}
            />
        );
    }

    return (
        <div
            className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-5 text-center ${className}`}
            role="img"
            aria-label={`Gambar default ${title}`}
        >
            <span className={`line-clamp-3 max-w-[90%] text-balance font-black leading-snug text-white drop-shadow-sm ${compact ? 'text-[8px] sm:text-[9px]' : 'text-base sm:text-lg'}`}>
                {title}
            </span>
        </div>
    );
}
