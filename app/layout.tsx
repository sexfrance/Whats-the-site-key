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
      <body className={`${inter.className} bg-black`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <div className="flex flex-col min-h-screen">
            <div className="flex-grow flex justify-center items-start relative">
              <div className="fixed left-0 top-0 h-screen flex items-center z-10">
                <div className="w-40 h-full">
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

              {/* Main Content */}
              <div className="flex-grow flex justify-center items-center">
                {children}
              </div>

              {/* Right Ad Container */}
              <div className="fixed right-0 top-0 h-screen flex items-center z-10">
                <div className="w-40 h-full">
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
            </div>

          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
