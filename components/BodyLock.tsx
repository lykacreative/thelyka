"use client";

import { useEffect } from "react";

type BodyLockProps = {
  locked: boolean;
};

export function BodyLock({ locked }: BodyLockProps) {
  useEffect(() => {
    if (!locked) return;

    const body = document.body;
    const mql = window.matchMedia("(min-width: 640px)");

    function apply() {
      if (mql.matches) {
        body.classList.add("lyka-no-scroll");
      } else {
        body.classList.remove("lyka-no-scroll");
      }
    }

    apply();
    mql.addEventListener("change", apply);
    return () => {
      body.classList.remove("lyka-no-scroll");
      mql.removeEventListener("change", apply);
    };
  }, [locked]);

  return null;
}
