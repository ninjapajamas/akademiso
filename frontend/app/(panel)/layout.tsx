import { redirect } from 'next/navigation';

export default function PanelLayout({ children }: { children: React.ReactNode }) {
    void children;
    redirect('/akuntan');
}
