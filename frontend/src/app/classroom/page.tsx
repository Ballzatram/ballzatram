import { Layout } from "@/components/Layout";
import { AssumptionPanel, KPI, MiniChart } from "@/components/WorkflowPanels";
const data = [{name:"t1",value:1},{name:"t2",value:3},{name:"t3",value:2},{name:"t4",value:4}];
export default function Page(){return <Layout><h2 className="mb-4 text-2xl font-semibold">classroom</h2><div className="grid gap-3 md:grid-cols-3"><KPI label="Signal" value="0.82"/><KPI label="Risk" value="Medium"/><KPI label="Coverage" value="24m"/></div><div className="my-4"><MiniChart data={data}/></div><AssumptionPanel/></Layout>}
