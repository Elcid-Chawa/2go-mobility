import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  ArrowDownRight,
  ArrowRight,
  Bike,
  CarFront,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Download,
  Fingerprint,
  Globe,
  KeyRound,
  MapPin,
  MessageCircle,
  Navigation,
  Package,
  Play,
  Share2,
  Shield,
  ShieldCheck,
  Siren,
  ShoppingBag,
  Smartphone,
  Sprout,
  Star,
  Store,
  Truck,
  Zap,
} from "lucide-react";

const heroImage =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAcj5rRBb_xw5d5ALIItS7NLz-JykqOSmNqla5u3RFtbrdyzkArgesLg9M9GiqUwC6WMbfg0ywvj3yW3XY4QOY6r6IDzPHAHJl8QiIz7YxMzxgpA5dmH-44TJNx5XcQSm1X7eNJAZJ2LCcVxCsaHY2y8WM4aMCL7s2AKGOlXHAQzI2eFJkO_SKP_vob30nBDy08S6j8MYX3z6uvIL2DwHQVkqdfRq-daapJNb7o6jL0DBvj0KXeeBN0Wg";

export const metadata: Metadata = {
  title: "2Go | Rides, delivery and everyday mobility",
  description:
    "Move around Kigali with 2Go. Request a ride, send a delivery, or join the driver network from one simple platform.",
  applicationName: "2Go",
  keywords: [
    "2Go",
    "Kigali rides",
    "Rwanda ride hailing",
    "Kigali delivery",
    "driver partner",
  ],
  openGraph: {
    type: "website",
    locale: "en_RW",
    siteName: "2Go",
    title: "2Go | Rides, delivery and everyday mobility",
    description:
      "Rides, deliveries and local mobility, connected in one platform for Kigali.",
    images: [{ url: heroImage, alt: "A modern electric car on a city street" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "2Go | Rides, delivery and everyday mobility",
    description:
      "Rides, deliveries and local mobility, connected in one platform for Kigali.",
    images: [heroImage],
  },
  robots: { index: true, follow: true },
};

const services = [
  {
    title: "2Go Rides: Urban Transit Redefined",
    description:
      "Pick & drop point navigation, fully electrified modern fleets, executive comfort for enterprise commuters, and transparent upfront fare calculations with zero hidden multipliers.",
    icon: CarFront,
    iconColor: "text-primary-container",
    linkColor: "text-primary-container",
    link: "Explore rides",
    details: ["Electric Priority", "Split Fares", "Fixed Quotes"],
  },
  {
    title: "Express Delivery",
    description:
      "15-minute door-to-door courier service for legal documents, sensitive hardware, parcels, and gifts with live precision map telemetry.",
    icon: Bike,
    iconColor: "text-secondary",
    linkColor: "text-secondary",
    link: "Book courier",
  },
  {
    title: "Shop 2Go Direct",
    description:
      "Flash grocery, late-night pharmacy essentials, organic markets, and boutique electronics delivered to your door in under 30 minutes.",
    icon: ShoppingBag,
    iconColor: "text-tertiary-container",
    linkColor: "text-tertiary-container",
    link: "Browse catalogs",
  },
  {
    title: "Relocation & Movers",
    description:
      "Heavy cargo vans, insured certified lifting crews, and scheduled flatbed moves for full apartment or office relocations.",
    icon: Truck,
    iconColor: "text-primary",
    linkColor: "text-primary",
    link: "Schedule truck",
  },
  {
    title: "Smart Car Rentals",
    description:
      "On-demand hourly self-drive EV rentals. Walk up, tap NFC with your phone, unlock instantly, and drop off at any approved city dock.",
    icon: KeyRound,
    iconColor: "text-primary-container",
    linkColor: "text-primary-container",
    link: "Find nearest EV",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#0a0f14] font-[family-name:var(--font-hanken-grotesk)] text-[#dee3ea]">
      <header className="fixed left-0 right-0 top-0 z-50 bg-surface-container-lowest/80 shadow-[0_4px_24px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-margin-desktop"
        >
          <Link
            href="#home"
            aria-label="2Go home"
            className="flex items-center gap-space-md"
          >
            <img
              alt="2Go"
              className="h-8 w-auto object-contain"
              src="https://lh3.googleusercontent.com/aida/AEtjO1VN-LCbS9pM3f5T3tAn4GxdWRPKNiUP4Fz4LM0N96hdRW1zg98MSp5XQKxclqfNa2h6J0vG_SG5xHQZ6zNQ3HE66M3fr5w2aSNOORsKTn1CsCot_MKfQUr7ABADufHvi9rn9bbXbEYIufLHa3NPdwAb83UMELEXWJWmNEeOi-LA3spgczt2rrIghfyB7HT_36vZet219LpQywRDlOWsptmEPNj2QhbX6oVwVQhw6M0ZnEx_3ZnJyIHZJkk"
            />
            <span className="font-headline-sm text-headline-sm tracking-tight text-on-surface">
              2Go
            </span>
          </Link>

          <div className="hidden items-center gap-space-sm rounded-full bg-surface-container-low/60 p-space-xs shadow-[0_2px_12px_rgba(0,0,0,0.25)] lg:flex">
            <Link
              aria-current="page"
              className="rounded-full bg-surface-container-high px-space-md py-space-xs font-label-md text-label-md text-on-surface transition-all"
              href="#services"
            >
              Services
            </Link>
            <Link
              className="rounded-full px-space-md py-space-xs font-label-md text-label-md text-on-surface-variant transition-all hover:bg-surface-container hover:text-on-surface"
              href="#download"
            >
              Rider App
            </Link>
            <Link
              className="rounded-full px-space-md py-space-xs font-label-md text-label-md text-on-surface-variant transition-all hover:bg-surface-container hover:text-on-surface"
              href="/onboarding"
            >
              Drive &amp; Earn
            </Link>
            <Link
              className="rounded-full px-space-md py-space-xs font-label-md text-label-md text-on-surface-variant transition-all hover:bg-surface-container hover:text-on-surface"
              href="#safety"
            >
              Safety
            </Link>
            <Link
              className="rounded-full px-space-md py-space-xs font-label-md text-label-md text-on-surface-variant transition-all hover:bg-surface-container hover:text-on-surface"
              href="#services"
            >
              Enterprise
            </Link>
          </div>

          <div className="flex items-center gap-space-md">
            <Link
              className="hidden font-label-md text-label-md text-on-surface-variant transition-colors hover:text-on-surface sm:inline-flex"
              href="/onboarding"
            >
              Driver Sign Up
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-xl bg-primary-container px-space-md font-label-lg text-label-lg text-on-primary-container shadow-[0_0_16px_rgba(0,229,255,0.25)] transition-all hover:bg-primary-fixed-dim"
              href="#download"
            >
              Download App
            </Link>
            <div className="flex items-center pl-space-xs">
              <img
                alt="Profile"
                className="size-8 rounded-full object-cover"
                src="https://lh3.googleusercontent.com/aida/AEtjO1XJKcEWV6ynTInCkvTn2y_4L6Sx-xvnFfzvYCTQudBotBof5k1cQGVgLDlxYNJZRTeTCqHjhLbNcvrNCqxjZtT_rvkWAPelzcFRjwN6QTNdUlUNUOVHCiBNmf2vHwg6XeH5pj8HBpHYaKzXuz5YXEryyAFVi0kQTsqQO1zR7hGSzd8UPk6PxCF_NtrbhfIjI0EUKr0N9xwimlXRqrLOhBYfgO7Enc4zYIXFu6AyJlPiLGuBc89Xe5TzQ0-h"
              />
            </div>
          </div>
        </nav>
      </header>

      <main id="home" className="pt-20">
        <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:pb-28 lg:pt-24">
          <div className="pointer-events-none absolute -right-48 top-0 -z-0 size-[34rem] rounded-full bg-cyan-300/[0.07] blur-[100px]" />
          <div className="relative z-10">
            <p className="mb-6 inline-flex items-center gap-2 text-xs font-bold uppercase text-emerald-300">
              <span className="size-2 rounded-full bg-emerald-300" />
              Kigali, Rwanda
            </p>
            <h1 className="max-w-3xl font-[var(--font-space-grotesk)] text-5xl font-bold leading-[1.04] text-white sm:text-6xl lg:text-[4.5rem]">
              Your city, <span className="text-cyan-300">in motion.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              One simple way to move, send, and get what you need. 2Go brings
              everyday city services together, right from your phone.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-cyan-300 px-5 font-bold text-[#0a2024] transition hover:bg-cyan-200"
                href="#services"
              >
                Explore services <ArrowDownRight aria-hidden="true" size={18} />
              </Link>
              <Link
                className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/20 px-5 font-semibold text-white transition hover:border-white/50 hover:bg-white/5"
                href="/onboarding"
              >
                Drive with 2Go <ArrowRight aria-hidden="true" size={17} />
              </Link>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-400">
              <span className="inline-flex items-center gap-2">
                <Check
                  aria-hidden="true"
                  className="text-emerald-300"
                  size={16}
                />{" "}
                Clear trip details
              </span>
              <span className="inline-flex items-center gap-2">
                <Check
                  aria-hidden="true"
                  className="text-emerald-300"
                  size={16}
                />{" "}
                Local driver network
              </span>
            </div>
          </div>

          <div className="relative z-10 mx-auto w-full max-w-xl lg:max-w-none">
            <div className="absolute -inset-5 -z-10 rounded-[2rem] border border-cyan-200/10" />
            <figure className="relative overflow-hidden rounded-xl border border-white/10 bg-[#171d22]">
              <img
                src={heroImage}
                alt="A modern electric vehicle travelling through a city"
                className="h-[360px] w-full object-cover sm:h-[440px]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f14]/90 via-transparent to-transparent" />
              <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-7">
                <div>
                  <p className="text-xs font-bold uppercase text-cyan-200">
                    Move through your day
                  </p>
                  <p className="mt-1 font-[var(--font-space-grotesk)] text-2xl font-semibold text-white">
                    The ride is just the start.
                  </p>
                </div>
                <span className="hidden size-11 shrink-0 items-center justify-center rounded-lg bg-cyan-300 text-[#0a2024] sm:flex">
                  <CarFront aria-hidden="true" size={22} />
                </span>
              </figcaption>
            </figure>
            <div className="absolute -bottom-5 left-4 flex items-center gap-3 rounded-lg border border-white/10 bg-[#171d22] px-4 py-3 shadow-xl sm:left-8">
              <span className="flex size-9 items-center justify-center rounded-md bg-emerald-300/10 text-emerald-300">
                <Clock3 aria-hidden="true" size={18} />
              </span>
              <span className="text-sm font-semibold text-white">
                Ready when you are
              </span>
            </div>
          </div>
        </section>

        <section
          className="w-full bg-surface-container-low py-10 shadow-inner"
          aria-label="2Go service metrics"
        >
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 text-center lg:px-margin-desktop md:grid-cols-4">
            {[
              [
                "4.2M+",
                "Completed Trips & Deliveries",
                "Global city operations",
                "text-primary-container",
              ],
              [
                "180+",
                "Transit Zones & Metro Hubs",
                "Seamless cross-city routing",
                "text-on-surface",
              ],
              [
                "< 3.2m",
                "Average Pickup ETA",
                "Algorithmic nearest matching",
                "text-secondary",
              ],
              [
                "99.8%",
                "On-Time Arrival Rate",
                "Predictive AI congestion avoidance",
                "text-tertiary-container",
              ],
            ].map(([value, label, note, color]) => (
              <div className="space-y-1" key={label}>
                <span
                  className={`font-display-lg text-display-lg font-bold ${color}`}
                >
                  {value}
                </span>
                <p className="font-body-md text-body-md font-medium text-on-surface">
                  {label}
                </p>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {note}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section
          id="services"
          className="mx-auto max-w-7xl px-6 py-20 lg:px-margin-desktop"
        >
          <div className="mb-12 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-surface-container-high px-3 py-1">
              <Package
                className="text-primary-container"
                size={16}
                aria-hidden="true"
              />
              <span className="font-label-sm text-label-sm uppercase text-primary">
                Ecosystem Architecture
              </span>
            </div>
            <h2 className="font-display-lg text-display-lg text-on-surface">
              One App. Infinite Possibilities.
            </h2>
            <p className="max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
              From passenger commute to heavy cargo transport and hyper-local
              shopping, tap into five modular transport services unified under
              single-click authentication.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {services.map(
              (
                {
                  title,
                  description,
                  icon: Icon,
                  iconColor,
                  linkColor,
                  link,
                  details,
                },
                index,
              ) => (
                <article
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-surface-container p-8 shadow-lg ${index === 0 ? "lg:col-span-2" : ""}`}
                  key={title}
                >
                  {index === 0 && (
                    <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-primary-container/10 blur-3xl transition-all group-hover:bg-primary-container/15" />
                  )}
                  <div className="relative z-10 space-y-4">
                    <div className="flex size-12 items-center justify-center rounded-xl bg-surface-container-high">
                      <Icon
                        className={iconColor}
                        size={28}
                        aria-hidden="true"
                      />
                    </div>
                    <h3 className="font-headline-lg text-headline-lg font-semibold text-on-surface">
                      {title}
                    </h3>
                    <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant">
                      {description}
                    </p>
                    {details && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {details.map((detail) => (
                          <span
                            className="rounded-md bg-surface-container-high px-2.5 py-1 font-label-sm text-label-sm text-on-surface"
                            key={detail}
                          >
                            {detail}
                          </span>
                        ))}
                      </div>
                    )}
                    {index === 0 && (
                      <div className="flex items-center gap-3 pt-2">
                        <div className="flex -space-x-2">
                          <span className="flex size-8 items-center justify-center rounded-full bg-primary-container/30 font-label-sm text-label-sm text-primary-container">
                            EV
                          </span>
                          <span className="flex size-8 items-center justify-center rounded-full bg-secondary/30 font-label-sm text-label-sm text-secondary">
                            XL
                          </span>
                          <span className="flex size-8 items-center justify-center rounded-full bg-surface-bright font-label-sm text-label-sm text-on-surface">
                            +3
                          </span>
                        </div>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          5 ride tiers ready
                        </span>
                      </div>
                    )}
                    {index === 1 && (
                      <div className="space-y-1 rounded-xl bg-surface-container-low p-3">
                        <div className="flex justify-between font-label-sm text-label-sm text-on-surface">
                          <span>Avg Courier Time</span>
                          <span className="font-semibold text-secondary">
                            14.8 mins
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
                          <div className="h-full w-[85%] rounded-full bg-secondary" />
                        </div>
                      </div>
                    )}
                    {index === 2 && (
                      <div className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
                        <Store
                          className="text-tertiary-container"
                          size={16}
                          aria-hidden="true"
                        />
                        <span>240+ verified local retailers</span>
                      </div>
                    )}
                    {index === 3 && (
                      <div className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
                        <BadgeCheck
                          className="text-secondary"
                          size={16}
                          aria-hidden="true"
                        />
                        <span>Up to $50,000 transit cargo protection</span>
                      </div>
                    )}
                    {index === 4 && (
                      <div className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
                        <Smartphone
                          className="text-primary-container"
                          size={16}
                          aria-hidden="true"
                        />
                        <span>Instant keyless Bluetooth unlock</span>
                      </div>
                    )}
                  </div>
                  <div
                    className={`mt-6 ${index === 0 ? "relative z-10 flex items-center justify-between border-t border-surface-variant pt-6" : ""}`}
                  >
                    <Link
                      className={`inline-flex items-center gap-1 font-label-md text-label-md hover:underline ${linkColor}`}
                      href={index === 0 ? "#download" : "/onboarding"}
                    >
                      <span>{link}</span>
                      <ChevronRight size={16} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              ),
            )}
          </div>
        </section>

        <section
          id="safety"
          className="w-full scroll-mt-8 bg-surface-container-low/70 py-20"
        >
          <div className="mx-auto max-w-7xl px-6 lg:px-margin-desktop">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-surface-container px-3 py-1">
                  <Shield
                    className="text-secondary"
                    size={16}
                    aria-hidden="true"
                  />
                  <span className="font-label-sm text-label-sm uppercase text-secondary">
                    Safety-First Protocol
                  </span>
                </div>
                <h2 className="font-display-lg text-display-lg text-on-surface">
                  Engineered for absolute rider peace of mind.
                </h2>
                <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant">
                  Every 2Go trip is protected by active telemetry, real-time
                  route deviation monitors, and mandatory multi-factor
                  confirmation before ignition.
                </p>
                <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
                  {[
                    [
                      "4-Digit Match PIN",
                      "Prevent vehicle mismatch. Driver motor will not engage until verified PIN is passed.",
                      Fingerprint,
                      "text-primary-container",
                    ],
                    [
                      "Live Journey Share",
                      "Broadcast live satellite route and ETA to designated trusted family contacts.",
                      Navigation,
                      "text-secondary",
                    ],
                    [
                      "24/7 Rapid SOS Line",
                      "Direct encrypted patch to regional emergency dispatchers with auto GPS relay.",
                      Siren,
                      "text-tertiary-container",
                    ],
                    [
                      "Biometric Checks",
                      "Continuous facial verification ensures only vetted registered drivers take the wheel.",
                      BadgeCheck,
                      "text-primary",
                    ],
                  ].map(([title, description, Icon, color]) => (
                    <article
                      className="space-y-2 rounded-xl bg-surface-container p-4"
                      key={title as string}
                    >
                      <div
                        className={`flex items-center gap-2 ${color as string}`}
                      >
                        <Icon size={20} aria-hidden="true" />
                        <h3 className="font-label-md text-label-md font-semibold text-on-surface">
                          {title as string}
                        </h3>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        {description as string}
                      </p>
                    </article>
                  ))}
                </div>
              </div>

              <div
                id="drivers"
                className="relative overflow-hidden rounded-3xl bg-surface-container p-8 shadow-2xl lg:p-10"
              >
                <div className="pointer-events-none absolute -bottom-20 -right-20 size-80 rounded-full bg-secondary/10 blur-3xl" />
                <div className="relative z-10 space-y-6">
                  <div className="inline-flex items-center gap-2 rounded-full bg-surface-container-high px-3 py-1">
                    <CircleDollarSign
                      className="text-secondary"
                      size={16}
                      aria-hidden="true"
                    />
                    <span className="font-label-sm text-label-sm uppercase text-secondary">
                      Drive &amp; Earn With 2Go
                    </span>
                  </div>
                  <h3 className="font-headline-lg text-headline-lg font-semibold text-on-surface">
                    Drive when you want. Earn on your terms.
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Keep more of what you make with industry-low commission
                    rates, daily automated cashouts, transparent surge bonuses,
                    and zero vehicle platform penalties.
                  </p>
                  <div className="grid grid-cols-2 gap-4 py-2">
                    <div className="rounded-xl bg-surface-container-low p-4">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        INSTANT CASHOUT
                      </span>
                      <p className="mt-0.5 font-headline-sm text-headline-sm font-bold text-on-surface">
                        $0.50 Fee
                      </p>
                      <span className="font-body-sm text-body-sm text-secondary">
                        Same-day bank deposits
                      </span>
                    </div>
                    <div className="rounded-xl bg-surface-container-low p-4">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        TIPS &amp; BONUSES
                      </span>
                      <p className="mt-0.5 font-headline-sm text-headline-sm font-bold text-on-surface">
                        100% Kept
                      </p>
                      <span className="font-body-sm text-body-sm text-secondary">
                        Zero company cut on tips
                      </span>
                    </div>
                  </div>
                  <form action="/onboarding" className="space-y-3 pt-2">
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        aria-label="Mobile phone number"
                        className="h-12 min-w-0 flex-1 rounded-xl bg-surface-container-low px-4 text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary-container"
                        placeholder="Enter your mobile phone number"
                        type="tel"
                      />
                      <button
                        className="h-12 whitespace-nowrap rounded-xl bg-secondary px-6 font-label-lg text-label-lg font-semibold text-on-secondary shadow-md transition-colors hover:bg-secondary-fixed"
                        type="submit"
                      >
                        Get Started
                      </button>
                    </div>
                    <span className="block font-body-sm text-body-sm text-on-surface-variant">
                      Requires valid driver&apos;s license and eligible vehicle
                      (EV or 2018+ combustion).
                    </span>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          aria-label="2Go in the city"
          className="mx-auto max-w-7xl px-6 py-16 lg:px-margin-desktop"
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              [
                heroImage,
                "A sleek modern electric vehicle driving through a vibrant futuristic city street at dusk, illuminated by glowing cyan neon signs, sharp street lighting, high dynamic range reflections on dark obsidian metallic car paint.",
                "Clean Transit",
                "Zero-Emission Commutes",
                "Quiet, smooth rides designed to make metropolitan commuting relaxing and eco-friendly.",
                "text-primary",
              ],
              [
                "https://lh3.googleusercontent.com/aida-public/AB6AXuAblQpsOdS0GpsjAknTKiZukkwk_AAuJdkfIfZdK6lIrLwglpF2-yQy4hn8Ik4wAD_nbe6YgtdXIGoXum79QOxW2M9nSZLCSxBLnJg-To0_GcaqgAF_-chJiPp-5NP2hqcLgNohHvg-oSfptohtEIkvKb-r7Wj--Xuj4ufE7h1EGI8WNKn9f3qb4gs0H12YYjIJBImWygkLaxqcDxI4aZqzTZEcTu6nO4_MLEha_IucLKAcGCeNMh7EHA",
                "A high-tech electric courier moped rider parked near a glass modern skyscraper at twilight, wearing minimalist black gear with subtle glowing cyan accents, carrying an aerodynamic thermal parcel backpack.",
                "Precision Logistics",
                "Flash Citywide Courier",
                "Guaranteed parcel delivery within 15 minutes across metropolitan central business districts.",
                "text-secondary",
              ],
              [
                "https://lh3.googleusercontent.com/aida-public/AB6AXuDU5uHme6ml3WdFT89z6EK1HOX0vlQQuf96AQWCTMWnnHcG1X4tv2G2WrNSwKej1lk_zR9n4AnQaqr5dwsuWDnjY8BWU1sOvZF0LeSCz8bOX-2XWEL-0e8w4ysVXNJHiKfKyDlB7JqsHwRsXBk_dcsC0uxcu-CMuXJH9LFERCrGGgoF_-zI0KY3YupvZQtTQJovzSuk0fspma6e7-nmiVVS7NgiF_yzwuUVfWE9IUSDkk1KfUx_lXDRFg",
                "A professional young person holding an iPhone displaying a luminous cyan transport app map in a luxury vehicle passenger seat looking out at glowing city night lights through tinted windows.",
                "Frictionless Experience",
                "Effortless Tap & Go",
                "Automated biometric payment settlements and seamless ride history synchronisation.",
                "text-tertiary-container",
              ],
            ].map(([image, alt, category, title, description, color]) => (
              <article
                className="group overflow-hidden rounded-2xl bg-surface-container shadow-lg"
                key={title}
              >
                <div className="h-56 overflow-hidden">
                  <img
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    alt={alt}
                    src={image}
                  />
                </div>
                <div className="space-y-2 p-6">
                  <span
                    className={`font-label-sm text-label-sm uppercase ${color}`}
                  >
                    {category}
                  </span>
                  <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                    {title}
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          id="download"
          className="mx-auto max-w-7xl px-6 pb-24 lg:px-margin-desktop"
        >
          <div className="relative overflow-hidden rounded-3xl bg-surface-container p-8 shadow-2xl sm:p-14">
            <div className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full bg-primary-container/20 blur-[100px]" />
            <div className="pointer-events-none absolute -bottom-32 -right-32 size-96 rounded-full bg-secondary/15 blur-[100px]" />
            <div className="relative z-10 grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
              <div className="space-y-6 lg:col-span-8">
                <div className="inline-flex items-center gap-2 rounded-full bg-surface-container-high px-3 py-1">
                  <Download
                    className="text-primary-container"
                    size={16}
                    aria-hidden="true"
                  />
                  <span className="font-label-sm text-label-sm uppercase text-primary">
                    Download 2Go Mobile
                  </span>
                </div>
                <h2 className="font-display-lg text-display-lg text-on-surface">
                  Ready to upgrade how you move across the city?
                </h2>
                <p className="max-w-xl font-body-lg text-body-lg text-on-surface-variant">
                  Join over 4 million urban riders and package senders enjoying
                  zero surge guarantees, prompt electric pickups, and total
                  transit control.
                </p>
                <div className="flex flex-wrap items-center gap-2 text-tertiary-container">
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star
                      className="fill-current"
                      key={index}
                      size={20}
                      aria-hidden="true"
                    />
                  ))}
                  <span className="ml-2 font-label-md text-label-md font-semibold text-on-surface">
                    4.9 Rating
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    · 150K+ reviews across platforms
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Link
                    className="inline-flex items-center gap-3.5 rounded-xl bg-surface-container-lowest px-6 py-3.5 shadow-lg transition-colors hover:bg-surface-container-high"
                    href="#download"
                  >
                    <Smartphone
                      className="text-on-surface"
                      size={28}
                      aria-hidden="true"
                    />
                    <span className="flex flex-col text-left">
                      <span className="font-label-sm text-label-sm uppercase text-on-surface-variant">
                        Download on the
                      </span>
                      <span className="font-label-lg text-label-lg font-semibold text-on-surface">
                        App Store
                      </span>
                    </span>
                  </Link>
                  <Link
                    className="inline-flex items-center gap-3.5 rounded-xl bg-surface-container-lowest px-6 py-3.5 shadow-lg transition-colors hover:bg-surface-container-high"
                    href="#download"
                  >
                    <Play
                      className="fill-current text-secondary"
                      size={24}
                      aria-hidden="true"
                    />
                    <span className="flex flex-col text-left">
                      <span className="font-label-sm text-label-sm uppercase text-on-surface-variant">
                        GET IT ON
                      </span>
                      <span className="font-label-lg text-label-lg font-semibold text-on-surface">
                        Google Play
                      </span>
                    </span>
                  </Link>
                </div>
              </div>
              <div className="flex justify-center lg:col-span-4 lg:justify-end">
                <div className="w-64 space-y-3 rounded-2xl bg-surface-container-lowest p-6 text-center shadow-xl">
                  <div className="mx-auto flex size-40 items-center justify-center rounded-xl bg-surface-container-high p-3">
                    <svg
                      aria-label="QR code graphic"
                      className="size-full text-primary-container"
                      fill="currentColor"
                      role="img"
                      viewBox="0 0 24 24"
                    >
                      <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 0h4v2h-4v-2zm-4-2h2v4h-2v-4zm2 6h4v2h-4v-2zm2-4h2v2h-2v-2zm-6 2h2v4h-2v-4zm0-4h2v2h-2v-2zm-2 2h2v2h-2v-2z" />
                    </svg>
                  </div>
                  <div>
                    <span className="block font-label-md text-label-md font-semibold text-on-surface">
                      Scan with camera
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      Instant mobile app onboard
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full bg-surface-container-low text-on-surface-variant">
        <div className="mx-auto max-w-7xl px-6 pb-space-lg pt-space-xl lg:px-margin-desktop">
          <div className="grid grid-cols-1 gap-space-xl border-b border-outline-variant/40 pb-space-xl md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-space-md lg:col-span-2">
              <Link href="#home" className="flex items-center gap-space-sm">
                <span className="flex size-8 items-center justify-center rounded-md bg-primary-container font-black text-on-primary-container">
                  2G
                </span>
                <span className="font-headline-sm text-headline-sm text-on-surface">
                  2Go
                </span>
              </Link>
              <p className="max-w-sm font-body-md text-body-md text-on-surface-variant">
                High-performance urban mobility, swift parcel delivery, and
                connected transit network engineered for frictionless real-time
                city transport.
              </p>
              <div className="pt-space-xs">
                <span className="mb-space-sm block font-label-sm text-label-sm uppercase text-on-surface-variant">
                  Available Platforms
                </span>
                <div className="flex flex-wrap gap-space-sm">
                  <Link
                    className="inline-flex h-11 items-center gap-space-sm rounded-xl bg-surface-container-high px-space-md text-on-surface transition-colors hover:bg-surface-container-highest"
                    href="#download"
                  >
                    <Smartphone
                      className="text-primary-container"
                      size={20}
                      aria-hidden="true"
                    />
                    <span className="flex flex-col text-left">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        Download on
                      </span>
                      <span className="font-label-md text-label-md leading-none text-on-surface">
                        App Store
                      </span>
                    </span>
                  </Link>
                  <Link
                    className="inline-flex h-11 items-center gap-space-sm rounded-xl bg-surface-container-high px-space-md text-on-surface transition-colors hover:bg-surface-container-highest"
                    href="#download"
                  >
                    <Play
                      className="text-secondary"
                      size={20}
                      aria-hidden="true"
                    />
                    <span className="flex flex-col text-left">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        Get it on
                      </span>
                      <span className="font-label-md text-label-md leading-none text-on-surface">
                        Google Play
                      </span>
                    </span>
                  </Link>
                </div>
              </div>
            </div>
            {[
              [
                "Platform",
                "Urban Rides",
                "Express Courier",
                "Rider App",
                "Enterprise Fleets",
                "Safety Protocols",
              ],
              [
                "Drive & Earn",
                "Driver Requirements",
                "Vehicle Inspection",
                "Fast Payouts",
                "Fleet Management",
                "Driver Protection",
              ],
            ].map(([heading, ...items]) => (
              <div key={heading}>
                <h3 className="mb-space-md font-label-lg text-label-lg uppercase text-on-surface">
                  {heading}
                </h3>
                <ul className="space-y-space-sm font-body-md text-body-md">
                  {items.map((item) => (
                    <li key={item}>
                      <Link
                        className="transition-colors hover:text-on-surface"
                        href={
                          item === "Safety Protocols" ||
                          item === "Driver Protection"
                            ? "#safety"
                            : item.startsWith("Driver")
                              ? "/onboarding"
                              : "#services"
                        }
                      >
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div>
              <h3 className="mb-space-md font-label-lg text-label-lg uppercase text-on-surface">
                Metro Coverage
              </h3>
              <ul className="space-y-space-sm font-body-sm text-body-sm">
                {[
                  "London Metro Area",
                  "Berlin & Potsdam",
                  "Paris Grand Hub",
                  "Tokyo Bay Metropolitan",
                  "Singapore Central",
                ].map((city) => (
                  <li key={city}>
                    <span className="text-on-surface">{city}</span>
                  </li>
                ))}
              </ul>
              <Link
                className="mt-space-md inline-flex items-center gap-space-xs font-label-sm text-label-sm text-primary-container hover:underline"
                href="#services"
              >
                View all 48 cities
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-space-md pt-space-lg font-body-sm text-body-sm md:flex-row">
            <div className="flex flex-wrap items-center gap-space-md text-on-surface-variant">
              <p>
                © 2025 2Go Urban Mobility Technologies Inc. All rights reserved.
              </p>
              <Link
                className="transition-colors hover:text-on-surface"
                href="#legal"
              >
                Privacy Policy
              </Link>
              <Link
                className="transition-colors hover:text-on-surface"
                href="#legal"
              >
                Terms of Service
              </Link>
              <Link
                className="transition-colors hover:text-on-surface"
                href="#legal"
              >
                Trust &amp; Compliance
              </Link>
            </div>
            <div className="flex items-center gap-space-md">
              <Link
                aria-label="Global Network"
                className="flex size-8 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-on-surface"
                href="#services"
              >
                <Globe size={16} aria-hidden="true" />
              </Link>
              <Link
                aria-label="Notifications"
                className="flex size-8 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-on-surface"
                href="#safety"
              >
                <MessageCircle size={16} aria-hidden="true" />
              </Link>
              <Link
                aria-label="Transit Hub"
                className="flex size-8 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-on-surface"
                href="#services"
              >
                <Share2 size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
