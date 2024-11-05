import "./globals.css";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "What's the Site Key?",
  description: "Find CAPTCHA site keys for various websites",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
          <div className="flex justify-center mt-5">
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
