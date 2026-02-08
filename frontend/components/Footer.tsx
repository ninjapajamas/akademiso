import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="bg-white border-t border-gray-100 pt-16 pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">

                    {/* Brand Column */}
                    <div className="col-span-1 md:col-span-1">
                        <Link href="/" className="flex items-center gap-2 mb-6">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                                A
                            </div>
                            <span className="font-bold text-xl tracking-tight">Akademiso</span>
                        </Link>
                        <p className="text-gray-500 text-sm leading-relaxed mb-6">
                            Akademiso adalah mitra terpercaya untuk pelatihan dan sertifikasi ISO di Indonesia, membantu organisasi mencapai standar global.
                        </p>
                        <div className="flex gap-4">
                            {/* Social placeholders */}
                            <div className="w-8 h-8 rounded-full bg-gray-100 hover:bg-blue-50 transition-colors"></div>
                            <div className="w-8 h-8 rounded-full bg-gray-100 hover:bg-blue-50 transition-colors"></div>
                            <div className="w-8 h-8 rounded-full bg-gray-100 hover:bg-blue-50 transition-colors"></div>
                        </div>
                    </div>

                    {/* Column 2: Layanan */}
                    <div>
                        <h3 className="font-bold text-gray-900 mb-6">Layanan</h3>
                        <ul className="space-y-4 text-sm text-gray-500">
                            <li><Link href="#" className="hover:text-blue-600 transition-colors">Public Training</Link></li>
                            <li><Link href="#" className="hover:text-blue-600 transition-colors">In-House Training</Link></li>
                            <li><Link href="#" className="hover:text-blue-600 transition-colors">Konsultasi ISO</Link></li>
                            <li><Link href="#" className="hover:text-blue-600 transition-colors">Audit Internal</Link></li>
                        </ul>
                    </div>

                    {/* Column 3: Perusahaan */}
                    <div>
                        <h3 className="font-bold text-gray-900 mb-6">Perusahaan</h3>
                        <ul className="space-y-4 text-sm text-gray-500">
                            <li><Link href="#" className="hover:text-blue-600 transition-colors">Tentang Kami</Link></li>
                            <li><Link href="#" className="hover:text-blue-600 transition-colors">Klien Kami</Link></li>
                            <li><Link href="#" className="hover:text-blue-600 transition-colors">Artikel ISO</Link></li>
                            <li><Link href="#" className="hover:text-blue-600 transition-colors">Kontak</Link></li>
                        </ul>
                    </div>

                    {/* Column 4: Legal */}
                    <div>
                        <h3 className="font-bold text-gray-900 mb-6">Legal</h3>
                        <ul className="space-y-4 text-sm text-gray-500">
                            <li><Link href="#" className="hover:text-blue-600 transition-colors">Syarat & Ketentuan</Link></li>
                            <li><Link href="#" className="hover:text-blue-600 transition-colors">Kebijakan Privasi</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-400">
                    <p>&copy; {new Date().getFullYear()} Akademiso ISO Center. Hak cipta dilindungi undang-undang.</p>
                    <div className="flex items-center gap-2 mt-4 md:mt-0">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span>Layanan Aktif</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
