import type { Metadata } from "next";
import { BallzatramDailyPage } from "@/components/newspaper/BallzatramDailyPage";

export const metadata: Metadata = {
  title: "Ballzatram Daily | Ballzatram",
  description:
    "The Ballzatram Daily newspaper shell: demo stories, department rails, and links back to the tools behind the stories.",
};

export default function DailyPage() {
  return <BallzatramDailyPage />;
}
