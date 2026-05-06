import AccessClaimContent from './AccessClaimContent';

export default async function StudentAccessClaimPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    return <AccessClaimContent token={token} />;
}
