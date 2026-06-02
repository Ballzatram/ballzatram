import { BallzatramDailyPage } from "@/components/newspaper/BallzatramDailyPage";
import { pageMetadata } from "@/lib/pageMetadata";

export const metadata = pageMetadata({
  title: "Ballzatram Daily Archive | Ballzatram",
  description:
    "Archived newspaper shell with demo stories and department rails, kept secondary to the tool launchpad.",
  path: "/daily",
});

export default function DailyPage() {
  return <BallzatramDailyPage />;
}
