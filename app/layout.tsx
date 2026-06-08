import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'ADHD Accountability Bot',
    description: 'An ADHD-friendly AI accountability partner',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
