import Link from 'next/link';
import {
  FaInstagram,
  FaPinterestP,
  FaTelegram,
  FaXTwitter,
  FaYoutube,
} from 'react-icons/fa6';
import { aboutText } from '@/lib/copy';

const iconMap = {
  Instagram: FaInstagram,
  Telegram: FaTelegram,
  YouTube: FaYoutube,
  Pinterest: FaPinterestP,
  X: FaXTwitter,
};

const socialLinks = [
 { label: 'Telegram', href: 'https://t.me/Lykamimics' },
{ label: 'Instagram', href: 'https://www.instagram.com/Lykamimics/' },
{ label: 'YouTube', href: 'https://www.youtube.com/@Lykamimics' },
{ label: 'Pinterest', href: 'https://www.pinterest.com/Lykamimics/' },
{ label: 'X', href: 'https://x.com/Lykamimics' },
] as const;

export function AboutSocial() {
  return (
    <footer className='shrink-0 w-full bg-transparent px-0 pt-3 text-center text-[var(--page-fg)] sm:px-8 sm:pt-2 lg:pt-3'>
      <div className='mx-auto flex max-w-[854px] flex-col items-center'>
        <h2 className='w-full text-center font-display text-[18px] font-normal leading-none tracking-normal sm:text-[28px] lg:text-[30px]'>
          About Me
        </h2>
        <p className='mx-auto mt-2 max-w-[320px] text-center font-display text-[11px] font-medium leading-[1.15] tracking-normal sm:max-w-[1120px] sm:text-[13px] sm:leading-[1.2] lg:text-[14px]'>
          {aboutText}
        </p>

        <Link
          href='/blogs'
          className='mt-4 inline-flex items-center gap-2 border border-[var(--frame)] bg-transparent px-4 py-1.5 font-sans text-[11px] font-medium uppercase tracking-normal text-[var(--page-fg)] transition hover:bg-[var(--panel-bg)] hover:text-[var(--panel-fg)] sm:mt-5'
        >
          Blog
        </Link>

        <div className='mt-3 flex w-full flex-wrap justify-center gap-3 sm:mt-4 sm:gap-6 lg:mt-4'>
          {socialLinks.map((social) => {
            const Icon = iconMap[social.label as keyof typeof iconMap];
            if (!Icon) return null;

            return (
              <a
                key={social.label}
                href={social.href}
                target='_blank'
                rel='noopener noreferrer'
                className='grid h-5 w-5 place-items-center rounded-full text-[17px] text-[var(--page-fg)] transition hover:-translate-y-1 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)] sm:h-8 sm:w-8 sm:text-[30px]'
                aria-label={social.label}
              >
                <Icon aria-hidden='true' />
              </a>
            );
          })}
        </div>
      </div>
    </footer>
  );
}
