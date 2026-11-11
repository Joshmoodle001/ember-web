import PipelineWorkspace from "@/components/pipeline-workspace";
export default async function PipelinePage({searchParams}:{searchParams:Promise<{new?:string;stage?:string;assigned?:string;seed?:string}>}){const query=await searchParams;return <PipelineWorkspace initialQuery={query}/>;}
