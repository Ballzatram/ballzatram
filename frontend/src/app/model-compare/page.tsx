import { WorkflowPage } from "@/components/WorkflowPage";
import { workflowBySlug } from "@/lib/workflows";

export default function Page() {
  return <WorkflowPage workflow={workflowBySlug["model-compare"]} />;
}
