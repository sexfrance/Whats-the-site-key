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
            <div className="fixed top-1/2 transform -translate-y-1/2 sm:right-5 sm:top-1/2 md:right-10 md:top-1/2">
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
