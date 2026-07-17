import Image from 'next/image';

type BrandMarkProps = {
    className?: string;
    priority?: boolean;
};

export default function BrandMark({ className = 'h-9 w-9', priority = false }: BrandMarkProps) {
    return (
        <Image
            src="/brand/akademiso-mark.png"
            alt="Logo Akademiso"
            width={512}
            height={512}
            priority={priority}
            className={`shrink-0 object-contain ${className}`}
        />
    );
}
