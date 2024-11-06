import "./globals.css";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Metadata } from "next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://whatsthesitekey.com"),
  title: "What's the Site Key? | CAPTCHA Site Key Finder",
  description:
    "Free tool to find CAPTCHA site keys on any website. Supports reCAPTCHA, hCaptcha, Turnstile, and more. Instantly detect and copy CAPTCHA implementations.",
  keywords: [
    "CAPTCHA site key",
    "reCAPTCHA finder",
    "hCaptcha detector",
    "Turnstile key finder",
    "CAPTCHA implementation",
    "site key detector",
    "web security tools",
    "CAPTCHA analysis",
    "automation tools",
    "web scraping",
  ].join(", "),
  authors: [{ name: "Sexfrance" }],
  creator: "Sexfrance",
  publisher: "Sexfrance",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://whatsthesitekey.com",
    title: "What's the Site Key? | CAPTCHA Site Key Finder",
    description:
      "Free tool to find CAPTCHA site keys on any website. Supports reCAPTCHA, hCaptcha, Turnstile, and more. Instantly detect and copy CAPTCHA implementations.",
    siteName: "What's the Site Key?",
    images: [
      {
        url: "https://whatsthesitekey.com/og-image.png", // Make sure to create and add this image
        width: 1200,
        height: 630,
        alt: "What's the Site Key? - CAPTCHA Site Key Finder",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "What's the Site Key? | CAPTCHA Site Key Finder",
    description:
      "Free tool to find CAPTCHA site keys on any website. Supports reCAPTCHA, hCaptcha, Turnstile, and more.",
    images: ["https://whatsthesitekey.com/og-image.png"], // Same as OG image
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// Add JSON-LD structured data
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "What's the Site Key?",
  description:
    "Free tool to find CAPTCHA site keys on any website. Supports reCAPTCHA, hCaptcha, Turnstile, and more. Instantly detect and copy CAPTCHA implementations.",
  url: "https://whatsthesitekey.com",
  applicationCategory: "WebApplication",
  operatingSystem: "Any",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  author: {
    "@type": "Person",
    name: "Sexfrance",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <link rel="canonical" href="https://whatsthesitekey.com" />
        <meta
          name="theme-color"
          content="#ffffff"
          media="(prefers-color-scheme: light)"
        />
        <meta
          name="theme-color"
          content="#000000"
          media="(prefers-color-scheme: dark)"
        />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <script
          src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`}
        />
      </head>
      <body className={`${inter.className} transition-colors duration-300`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <div className="flex justify-center min-h-screen items-start relative">
            <div className="fixed left-5 top-1/2 transform -translate-y-1/2 sm:left-5 sm:top-1/2 md:left-10 md:top-1/2">
              <script
                type="text/javascript"
                dangerouslySetInnerHTML={{
                  __html: `
                      atOptions = {
                        'key' : 'ca77b3919db22954fff14719a4e43fcb',
                        'format' : 'iframe',
                        'height' : 600,
                        'width' : 160,
                        'params' : {}
                      };
                    `,
                }}
              ></script>
              <script
                type="text/javascript"
                src="//www.highperformanceformat.com/ca77b3919db22954fff14719a4e43fcb/invoke.js"
              ></script>
            </div>
            <div className="flex-grow flex justify-center items-center px-4 sm:px-6 lg:px-8">
              {children}
            </div>
            <div className="fixed right-5 top-1/2 transform -translate-y-1/2 sm:right-5 sm:top-1/2 md:right-10 md:top-1/2">
              <script
                type="text/javascript"
                dangerouslySetInnerHTML={{
                  __html: `
                      atOptions = {
                        'key' : 'ca77b3919db22954fff14719a4e43fcb',
                        'format' : 'iframe',
                        'height' : 600,
                        'width' : 160,
                        'params' : {}
                      };
                    `,
                }}
              ></script>
              <script
                type="text/javascript"
                src="//www.highperformanceformat.com/ca77b3919db22954fff14719a4e43fcb/invoke.js"
              ></script>
            </div>
          </div>
          <div className="flex justify-center fixed w-full sm:bottom-5 md:bottom-10">
            <script
              type="text/javascript"
              dangerouslySetInnerHTML={{
                __html: `
                  atOptions = {
                    'key' : '2aa5dd87245064af79eff4d487110df0',
                    'format' : 'iframe',
                    'height' : 90,
                    'width' : 728,
                    'params' : {}
                  };
                `,
              }}
            ></script>
            <script
              type="text/javascript"
              src="//www.highperformanceformat.com/2aa5dd87245064af79eff4d487110df0/invoke.js"
            ></script>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
