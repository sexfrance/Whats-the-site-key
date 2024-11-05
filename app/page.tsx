import SiteKeyForm from "@/components/SiteKeyForm";
import { getSiteKey } from "@/actions/getSiteKey";

export default function Home() {
  return (
    <html>
      <body>
        <main className="flex min-h-screen flex-col items-center justify-center ">
          <SiteKeyForm getSiteKey={getSiteKey} />
        </main>
        <footer>
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
        </footer>
      </body>
    </html>
  );
}
