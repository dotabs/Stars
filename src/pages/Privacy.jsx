import { Link } from 'react-router-dom';
import { ChevronLeft, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '@/components/ui-custom/BrandLogo';

const privacySections = [
    {
        title: 'Information Collected',
        body: 'We may collect basic information such as your name, email address, and general usage data, including pages visited and interactions on the site.',
    },
    {
        title: 'How We Use It',
        body: 'We use this information to improve the site, respond to users, maintain core features, and support the experience across the platform.',
    },
    {
        title: 'Cookies',
        body: 'We may use cookies or similar technologies to remember preferences, analyze usage, and enhance your experience.',
    },
    {
        title: 'Data Protection',
        body: 'We take reasonable administrative and technical steps to protect your information, but no method of transmission or storage is completely secure.',
    },
    {
        title: 'Your Rights',
        body: 'Where applicable, you may request access to your personal data or ask for it to be deleted.',
    },
];

export function Privacy() {
    return (
        <div className="relative min-h-screen overflow-hidden bg-background">
            <div className="absolute inset-0">
                <div
                    className="absolute inset-0 opacity-30"
                    style={{
                        background:
                            'radial-gradient(circle at 16% 14%, rgba(244,182,132,0.22) 0%, transparent 25%), radial-gradient(circle at 84% 18%, rgba(210,109,71,0.2) 0%, transparent 23%), radial-gradient(circle at 68% 84%, rgba(159,71,42,0.14) 0%, transparent 24%), linear-gradient(135deg, rgba(19,14,12,0.98) 0%, rgba(11,9,8,0.97) 38%, rgba(19,18,28,0.94) 100%)',
                        filter: 'blur(52px) saturate(118%)',
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/84 to-background" />
            </div>

            <div className="relative z-10 mx-auto max-w-4xl px-4 pb-10 pt-28 sm:px-6 sm:pb-12 sm:pt-32 lg:px-8">
                <div className="mb-8 flex items-center justify-between gap-4">
                    <Link
                        to="/signup"
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/70 transition-colors hover:border-white/20 hover:text-white"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Back to Signup
                    </Link>
                    <BrandLogo className="justify-end" markClassName="h-11 w-11" titleClassName="text-[1.9rem]" />
                </div>

                <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(24,18,15,0.95),rgba(10,9,9,0.98))] shadow-[0_38px_110px_-54px_rgba(0,0,0,1)]">
                    <div className="border-b border-white/10 px-6 py-8 sm:px-10">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-mono text-[11px] uppercase tracking-[0.22em] text-white/60">
                            <ShieldCheck className="h-3.5 w-3.5 text-[#f4b684]" />
                            Legal
                        </div>
                        <h1 className="heading-display mt-4 text-4xl sm:text-5xl">Privacy Policy</h1>
                        <p className="mt-4 max-w-2xl text-sm leading-7 text-white/62 sm:text-base">
                            We respect your privacy. Here&apos;s what we collect and how we use it.
                        </p>
                    </div>

                    <div className="space-y-4 px-6 py-8 sm:px-10 sm:py-10">
                        {privacySections.map((section) => (
                            <article
                                key={section.title}
                                className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                            >
                                <h2 className="text-lg font-semibold text-white">{section.title}</h2>
                                <p className="mt-2 text-sm leading-7 text-white/65 sm:text-[15px]">{section.body}</p>
                            </article>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}

