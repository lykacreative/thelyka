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
    <main className="relative h-auto w-full overflow-y-auto bg-[var(--page-bg)] text-[var(--page-fg)] transition-colors md:h-dvh md:overflow-hidden">
      <BodyLock locked />
      <ThemeToggle />

     <section className="mx-auto flex w-full max-w-[292px] flex-col px-0 py-4 md:h-full md:max-w-[1128px] md:px-8 lg:px-0 lg:py-5">
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

              <p className="max-w-[232px] text-center font-display text-[11px] font-normal leading-[1.15] tracking-normal sm:max-w-[653px] sm:text-[17px]">
                {introText}
              </p>
      </header>

      <div className="my-3 grid gap-5 md:my-4 md:min-h-0 md:flex-1 md:grid-cols-3 md:overflow-hidden lg:gap-[31px]">
        <CategoryScroller category="design" items={groups.design} direction="up" />
        <CategoryScroller category="reviews" items={groups.reviews} direction="down" />
        <CategoryScroller category="arts" items={groups.arts} direction="up" />
      </div>

      <div className="shrink-0">
        <AboutSocial />
      </div>
    </section>
        </main>
      );
}