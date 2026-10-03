import Script from "next/script";

/**
 * Applies the stored or system theme before first paint so there is no flash.
 * Runs before hydration via next/script; must stay dependency-free.
 */
const script = `
(function () {
  try {
    var stored = localStorage.getItem("payslip.theme");
    var system = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    var theme = stored === "light" || stored === "dark" ? stored : system;
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return (
    <Script id="payslip-theme" strategy="beforeInteractive">
      {script}
    </Script>
  );
}
