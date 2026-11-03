// Runs in <head> before the first paint (app/layout.tsx), so the page never flashes the wrong theme.
// A saved choice wins ("lyka-theme": "day" / "night"; the old site's "light" / "dark" still count);
// otherwise the system theme.
export const THEME_KEY = "lyka-theme";

export const THEME_SCRIPT = `(function(){var d=document.documentElement,t=null,m;try{t=localStorage.getItem("${THEME_KEY}")}catch(e){}if(t==="dark")t="night";else if(t==="light")t="day";if(t!=="night"&&t!=="day")t=matchMedia("(prefers-color-scheme: dark)").matches?"night":"day";d.setAttribute("data-theme",t);m=document.querySelector('meta[name="color-scheme"]');if(m)m.content=t==="night"?"dark":"light"})()`;
