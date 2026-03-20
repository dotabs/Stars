import { Link } from 'react-router-dom';
import { ChevronLeft, FileText } from 'lucide-react';
import { BrandLogo } from '@/components/ui-custom/BrandLogo';

const termsSections = [
    {
        title: 'Content',
        body: 'All reviews and content are provided for informational purposes only. STARS does not guarantee that any content on the site is complete, current, or accurate.',
    },
    {
        title: 'User Behavior',
        body: 'You may not post, upload, or share content that is harmful, illegal, abusive, fraudulent, or otherwise violates applicable laws or the rights of others.',
    },
    {
        title: 'Accounts',
        body: 'If account features are available, you are responsible for maintaining the security of your account and for all activity that happens under it.',
    },
    {
        title: 'Intellectual Property',
        body: 'Unless otherwise stated, all site content, branding, and design belong to STARS and may not be copied, reproduced, or redistributed without permission.',
    },
    {
        title: 'Changes',
        body: 'STARS may update, suspend, remove, or change any content, features, or functionality on the site at any time without prior notice.',
    },
    {
        title: 'Termination',
        body: 'We may suspend, restrict, or ban users who violate these terms or misuse the platform.',
    },
];

export function Terms() {
    return (
        <div className="relative min-h-screen overflow-hidden bg-background">
            <div className="absolute inset-0">
                <div
                    className="absolute inset-0 opacity-30"
                    style={{
                        background:
                            'radial-gradient(circle at 12% 16%, rgba(244,182,132,0.22) 0%, transparent 25%), radial-gradient(circle at 80% 12%, rgba(210,109,71,0.2) 0%, transparent 23%), radial-gradient(circle at 72% 82%, rgba(159,71,42,0.14) 0%, transparent 24%), linear-gradient(135deg, rgba(19,14,12,0.98) 0%, rgba(11,9,8,0.97) 38%, rgba(19,18,28,0.94) 100%)',
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
                            <FileText className="h-3.5 w-3.5 text-[#f4b684]" />
                            Legal
                        </div>
                        <h1 className="heading-display mt-4 text-4xl sm:text-5xl">Terms of Use</h1>
                        <p className="mt-4 max-w-2xl text-sm leading-7 text-white/62 sm:text-base">
                            By using this website, you agree to follow these rules.
                        </p>
                    </div>

                    <div className="space-y-4 px-6 py-8 sm:px-10 sm:py-10">
                        {termsSections.map((section) => (
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

