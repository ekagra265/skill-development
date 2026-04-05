import { Sprout, Twitter, Linkedin, Github, Instagram } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { t } from "@/lib/types";

const socialLinks = [
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Github, href: "#", label: "GitHub" },
  { icon: Instagram, href: "#", label: "Instagram" },
];

export function Footer() {
  const { lang, isHindi } = useLang();

  return (
    <footer className="border-t border-white/10 bg-[#071510] text-white/70">
      <div className="container py-12">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="flex max-w-xs flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25">
                <Sprout className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-display font-bold text-white">
                Agri<span className="text-green-400">Pulse</span>
              </span>
            </div>

            <p className={`text-sm leading-relaxed text-white/55 ${isHindi ? "font-devanagari" : ""}`}>
              {t(lang, "footer_tagline")}
            </p>

            <div className="flex items-center gap-2">
              {socialLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    aria-label={item.label}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 transition-all hover:border-primary/40 hover:bg-primary/20 hover:text-white hover:shadow-md hover:shadow-primary/20"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-8">
            {[
              {
                headKey: "footer_product" as const,
                links: [
                  { label: t(lang, "nav_dashboard"), href: "/dashboard" },
                  { label: t(lang, "nav_forecast"), href: "/forecast" },
                  { label: t(lang, "nav_best_mandi"), href: "/best-mandi" },
                ],
              },
              {
                headKey: "footer_resources" as const,
                links: [
                  { label: t(lang, "nav_insights"), href: "/insights" },
                  { label: t(lang, "nav_faq"), href: "/faq" },
                  { label: t(lang, "footer_api_docs"), href: "#" },
                ],
              },
              {
                headKey: "footer_company" as const,
                links: [
                  { label: t(lang, "footer_about"), href: "#" },
                  { label: t(lang, "footer_contact"), href: "#" },
                  { label: t(lang, "footer_privacy"), href: "#" },
                ],
              },
            ].map(({ headKey, links }) => (
              <div key={headKey} className="flex flex-col gap-3">
                <h4 className={`text-xs font-semibold uppercase tracking-wider text-white/40 ${isHindi ? "font-devanagari" : ""}`}>
                  {t(lang, headKey)}
                </h4>
                {links.map((link) => (
                  <a
                    key={link.href + link.label}
                    href={link.href}
                    className={`text-sm text-white/55 transition-colors hover:text-white ${isHindi ? "font-devanagari" : ""}`}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className={`mt-10 border-t border-white/10 pt-6 text-center text-xs text-white/30 ${isHindi ? "font-devanagari" : ""}`}>
          {t(lang, "footer_copy")}
        </div>
      </div>
    </footer>
  );
}
