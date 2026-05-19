import Link from "next/link";
import { Facebook, Twitter, Instagram, Youtube, Rss, Mail } from "lucide-react";

const categories = [
  { label: "Vijesti", href: "/kategorije/vijesti" },
  { label: "Politika", href: "/kategorije/politika" },
  { label: "Ekonomija", href: "/kategorije/ekonomija" },
  { label: "Sport", href: "/kategorije/sport" },
  { label: "Kultura", href: "/kategorije/kultura" },
  { label: "Tehnologija", href: "/kategorije/tehnologija" },
  { label: "Zdravlje", href: "/kategorije/zdravlje" },
  { label: "Regija", href: "/kategorije/regija" },
  { label: "Svijet", href: "/kategorije/svijet" },
];

const quickLinks = [
  { label: "O nama", href: "/o-nama" },
  { label: "Kontakt", href: "/kontakt" },
  { label: "Oglašavanje", href: "/oglasavanje" },
  { label: "Privatnost", href: "/privatnost" },
  { label: "Uslovi korištenja", href: "/uslovi" },
  { label: "Newsletter", href: "/newsletter" },
  { label: "RSS Feed", href: "/feed.xml" },
];

const socials = [
  { icon: Facebook, label: "Facebook", href: "#" },
  { icon: Twitter, label: "Twitter / X", href: "#" },
  { icon: Instagram, label: "Instagram", href: "#" },
  { icon: Youtube, label: "YouTube", href: "#" },
  { icon: Rss, label: "RSS", href: "/feed.xml" },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-neutral-950 text-neutral-400 mt-16">
      <div className="container-news py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="lg:col-span-1 space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-black text-base">K1</span>
              </div>
              <span className="text-white font-black text-2xl">
                K1<span className="text-brand-500">.ba</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-neutral-500">
              Najbrži i najmoderniji news portal u Bosni i Hercegovini. AI-powered
              vijesti, brzina i profesionalnost.
            </p>
            <div className="flex gap-3">
              {socials.map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  className="w-9 h-9 rounded-lg bg-neutral-800 hover:bg-brand-600 flex items-center justify-center transition-colors duration-200"
                  aria-label={label}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">
              Kategorije
            </h3>
            <ul className="space-y-2">
              {categories.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm hover:text-brand-500 transition-colors duration-200"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">
              Linkovi
            </h3>
            <ul className="space-y-2">
              {quickLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm hover:text-brand-500 transition-colors duration-200"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">
              Newsletter
            </h3>
            <p className="text-sm text-neutral-500 mb-4">
              Pretplatite se i dobijte najvažnije vijesti direktno u inbox.
            </p>
            <form
              action="/api/newsletter/subscribe"
              method="POST"
              className="space-y-2"
            >
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
                />
                <input
                  type="email"
                  name="email"
                  placeholder="vasa@email.ba"
                  className="w-full pl-9 pr-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                />
              </div>
              <button
                type="submit"
                className="w-full btn-primary justify-center py-3 text-sm"
              >
                Pretplati se
              </button>
            </form>
          </div>
        </div>

        <div className="border-t border-neutral-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-neutral-600">
            © {currentYear} K1.ba. Sva prava zadržana.
          </p>
          <p className="text-xs text-neutral-700">
            Powered by AI · Made in BiH 🇧🇦
          </p>
        </div>
      </div>
    </footer>
  );
}
