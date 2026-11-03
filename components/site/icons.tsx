// The little hand-drawn icons the site reuses (stickers, confetti, buttons).

export const ICONS: Record<string, string> = {
  smile:
    '<circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="5.8" cy="6.6" r="1" fill="currentColor"/><circle cx="10.2" cy="6.6" r="1" fill="currentColor"/><path d="M5 9.4q3 3 6 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  ox: '<circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5.2 5.2l5.6 5.6M10.8 5.2l-5.6 5.6" stroke="currentColor" stroke-width="1.6"/>',
  sq: '<rect x="2.5" y="2.5" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.9"/>',
  sqx: '<rect x="2.5" y="2.5" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3 3l10 10M13 3 3 13" stroke="currentColor" stroke-width="1.3"/>',
  star: '<path d="M8 1l1.6 5.4L15 8l-5.4 1.6L8 15l-1.6-5.4L1 8l5.4-1.6z" fill="currentColor"/>',
  dot: '<circle cx="8" cy="8" r="4.6" fill="currentColor"/>',
  plus: '<path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2.6"/>',
  flower:
    '<g fill="currentColor"><circle cx="8" cy="4" r="2.6"/><circle cx="12" cy="7" r="2.6"/><circle cx="10.5" cy="12" r="2.6"/><circle cx="5.5" cy="12" r="2.6"/><circle cx="4" cy="7" r="2.6"/></g><circle cx="8" cy="8.4" r="2" fill="#ffc933"/>'
};

export const ICON_KEYS = Object.keys(ICONS);

export function Ico({ name, className = "ico", hidden = true }: { name: string; className?: string; hidden?: boolean }) {
  return <svg className={className} viewBox="0 0 16 16" aria-hidden={hidden || undefined} dangerouslySetInnerHTML={{ __html: ICONS[name] ?? "" }} />;
}

export function ArrowLeft() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M12.5 4 6.5 10l6 6" fill="none" stroke="currentColor" strokeWidth="2.6" />
    </svg>
  );
}

export function ArrowRight() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M7.5 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.6" />
    </svg>
  );
}

export function BackArrow() {
  return (
    <svg className="ico" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="2.4" />
    </svg>
  );
}

export function TelegramIcon() {
  return (
    <svg className="ico" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M1.5 7.4 14.2 2.2c.6-.2 1.1.2.9.9l-2.2 10.3c-.1.6-.8.9-1.3.5L8.3 11.5l-1.6 1.6c-.2.2-.6.1-.6-.2l.1-2.6 5.2-4.8-6.6 4L2 8.4c-.6-.2-.6-.8-.5-1z"
        fill="currentColor"
      />
    </svg>
  );
}

export const TELEGRAM_URL = "https://t.me/lykamimics";
