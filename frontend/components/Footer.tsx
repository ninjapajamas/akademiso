import Link from 'next/link';
import BrandMark from './BrandMark';

function IconWhatsApp() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
    );
}

export default function Footer() {
    const socialLinks = [
        { href: 'https://wa.me/6281390012014', icon: <IconWhatsApp />, label: 'WhatsApp', color: 'hover:bg-green-500 hover:text-white hover:border-green-500' },
    ];

    return (
        <footer className="bg-white border-t border-gray-100 pt-16 pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">

                    {/* Brand Column */}
                    <div className="col-span-1 md:col-span-1">
                        <Link href="/" className="flex items-center gap-2 mb-6">
                            <BrandMark className="h-10 w-10" />
                            <span className="font-bold text-xl tracking-tight text-gray-900">Akademiso</span>
                        </Link>
                        <p className="text-gray-500 text-sm leading-relaxed mb-6">
                            Akademiso adalah mitra terpercaya untuk pelatihan dan sertifikasi ISO di Indonesia, membantu organisasi mencapai standar global.
                        </p>
                        <div className="flex gap-3">
                            {socialLinks.map(({ href, icon, label, color }) => (
                                <a
                                    key={label}
                                    href={href}
                                    aria-label={label}
                                    className={`w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 transition-all duration-200 ${color}`}
                                >
                                    {icon}
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Column 2: Layanan */}
                    <div>
                        <h3 className="font-bold text-gray-900 mb-6">Layanan</h3>
                        <ul className="space-y-4 text-sm text-gray-500">
                            <li><Link href="/courses" className="hover:text-blue-600 transition-colors">Public Training</Link></li>
                            <li><Link href="/courses" className="hover:text-blue-600 transition-colors">In-House Training</Link></li>
                            <li><a href="https://wa.me/6281390012014?text=Saya%20ingin%20konsultasi%20ISO" className="hover:text-blue-600 transition-colors">Konsultasi ISO</a></li>
                            <li><a href="https://wa.me/6281390012014?text=Saya%20ingin%20informasi%20audit%20internal" className="hover:text-blue-600 transition-colors">Audit Internal</a></li>
                        </ul>
                    </div>

                    {/* Column 3: Perusahaan */}
                    <div>
                        <h3 className="font-bold text-gray-900 mb-6">Perusahaan</h3>
                        <ul className="space-y-4 text-sm text-gray-500">
                            <li><Link href="/" className="hover:text-blue-600 transition-colors">Tentang Kami</Link></li>
                            <li><Link href="/" className="hover:text-blue-600 transition-colors">Klien Kami</Link></li>
                            <li><Link href="/courses" className="hover:text-blue-600 transition-colors">Program ISO</Link></li>
                            <li><a href="https://wa.me/6281390012014" className="hover:text-blue-600 transition-colors">Kontak</a></li>
                        </ul>
                    </div>

                    {/* Column 4: Legal */}
                    <div>
                        <h3 className="font-bold text-gray-900 mb-6">Legal</h3>
                        <ul className="space-y-4 text-sm text-gray-500">
                            <li><Link href="/terms" className="hover:text-blue-600 transition-colors">Syarat &amp; Ketentuan</Link></li>
                            <li><Link href="/privacy" className="hover:text-blue-600 transition-colors">Kebijakan Privasi</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-400">
                    <p>&copy; {new Date().getFullYear()} Akademiso ISO Center. Hak cipta dilindungi undang-undang.</p>
                    <div className="flex items-center gap-2 mt-4 md:mt-0">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span>Layanan Aktif</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
