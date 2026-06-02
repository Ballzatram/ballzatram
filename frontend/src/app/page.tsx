import { BallzatramDailyPage } from "@/components/newspaper/BallzatramDailyPage";
import { pageMetadata } from "@/lib/pageMetadata";

export const metadata = pageMetadata({
  title: "Ballzatram Daily | Ballzatram",
  description:
    "The Ballzatram Daily newspaper shell: demo stories, department rails, and links back to the tools behind the stories.",
  path: "/",
});

export default function Home() {
  return <BallzatramDailyPage />;
}
