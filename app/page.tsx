import SiteKeyForm from "@/components/SiteKeyForm";
import { getSiteKey } from "@/actions/getSiteKey";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center ">
      <SiteKeyForm getSiteKey={getSiteKey} />
    </main>
  );
}
