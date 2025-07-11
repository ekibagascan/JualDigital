import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Order {
    id: string;
    order_number: string;
    total_amount: number;
    status: string;
    payment_method: string;
    payment_provider: string;
    invoice_url?: string;
    created_at: string;
}

export default function QRISPaymentPage({ params }: { params: { orderId: string } }) {
    const { orderId } = params;
    const router = useRouter();
    const [order, setOrder] = useState<Order | null>(null);
    const [qrString, setQrString] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch order and QR code info
    useEffect(() => {
        async function fetchOrder() {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/orders/${orderId}`);
                if (!res.ok) throw new Error('Order not found');
                const data = await res.json();
                setOrder(data.order);
                setQrString(data.order?.invoice_url || null);
            } catch (err: any) {
                setError(err.message || 'Failed to fetch order');
            } finally {
                setLoading(false);
            }
        }
        fetchOrder();
    }, [orderId]);

    // Poll for payment status
    useEffect(() => {
        if (!order) return;
        if (order.status === 'paid') return;
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/orders/${orderId}`);
                if (!res.ok) return;
                const data = await res.json();
                if (data.order?.status === 'paid') {
                    clearInterval(interval);
                    router.push('/payment/success');
                }
            } catch { }
        }, 4000);
        return () => clearInterval(interval);
    }, [order, orderId, router]);

    // Download QR code as image
    const handleDownload = () => {
        if (!qrString) return;
        const canvas = document.createElement('canvas');
        const qr = document.getElementById('qris-qr-img') as HTMLImageElement;
        if (!qr) return;
        canvas.width = qr.naturalWidth;
        canvas.height = qr.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(qr, 0, 0);
            const link = document.createElement('a');
            link.download = `qris-${orderId}.png`;
            link.href = canvas.toDataURL();
            link.click();
        }
    };

    if (loading) return <div className="flex justify-center items-center h-96">Memuat...</div>;
    if (error) return <div className="text-red-500 text-center mt-8">{error}</div>;
    if (!order || !qrString) return <div className="text-center mt-8">QRIS info tidak ditemukan.</div>;

    return (
        <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
            <h2 className="text-xl font-bold mb-4 text-center">Pembayaran QRIS</h2>
            <div className="flex flex-col items-center">
                <img
                    id="qris-qr-img"
                    src={qrString}
                    alt="QRIS QR Code"
                    className="w-64 h-64 border mb-4"
                />
                <button
                    onClick={handleDownload}
                    className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Download QR
                </button>
                <div className="mb-2">Order: <b>{order.order_number}</b></div>
                <div className="mb-2">Total: <b>Rp {order.total_amount.toLocaleString('id-ID')}</b></div>
                <div className="mb-2">Status: <b>{order.status}</b></div>
                <div className="text-gray-500 text-sm mt-4 text-center">
                    Silakan scan QRIS di atas menggunakan aplikasi e-wallet Anda untuk membayar.<br />
                    Setelah pembayaran berhasil, Anda akan diarahkan ke halaman file yang akan diunduh.
                </div>
            </div>
        </div>
    );
} 