import { AboutSocial } from "@/components/AboutSocial";
import { BodyLock } from "@/components/BodyLock";
import { CategoryScroller } from "@/components/CategoryScroller";
import { ThemeToggle } from "@/components/ThemeToggle";
import { introText } from "@/lib/copy";
import type { Category, PortfolioItem } from "@/lib/portfolio";

type HomePageProps = {
  logoSrc: string;
  groups: Record<Category, PortfolioItem[]>;
};

export function HomePage({ groups }: HomePageProps) {
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[var(--page-bg)] text-[var(--page-fg)] transition-colors duration-300 max-sm:overflow-y-auto max-sm:h-auto">
      <BodyLock locked />
      <ThemeToggle />
      <section className="mx-auto flex w-full max-w-[292px] flex-col justify-between px-0 py-5 sm:h-dvh sm:max-w-[1128px] sm:overflow-hidden sm:px-8 lg:px-0 lg:py-5">
        <header className="mx-auto flex max-w-full shrink-0 flex-col items-center gap-2 text-center sm:gap-3">
          <div className="flex items-center justify-center gap-2 sm:gap-5">
            <span
              className="h-8 w-8 bg-[var(--page-fg)] [mask:url('/assets/figma-mark.svg')_center/contain_no-repeat] sm:h-12 sm:w-12 lg:h-[52px] lg:w-[52px]"
              aria-hidden="true"
            />
            <h1 className="font-display text-[30px] font-normal leading-none tracking-normal sm:text-[52px] lg:text-[56px]">
              Lyka Mimics
            </h1>
          </div>

          <p className="max-w-[232px] text-center font-display text-[8px] font-normal leading-[1.08] tracking-normal sm:max-w-[653px] sm:text-[17px]">
            {introText}
          </p>
        </header>

        <div className="my-1 grid shrink-1 items-start gap-7 sm:my-2 sm:gap-6 md:grid-cols-3 md:gap-5 lg:my-1 lg:gap-[31px]">
          <CategoryScroller category="design" items={groups.design} direction="up" />
          <CategoryScroller category="reviews" items={groups.reviews} direction="down" />
          <CategoryScroller category="sketches" items={groups.sketches} direction="up" />
        </div>

        <AboutSocial />
      </section>
    </main>
  );
}
