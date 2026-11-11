import PipelineWorkspace from "@/components/pipeline-workspace";
export default async function ProjectsPage({searchParams}:{searchParams:Promise<{new?:string;stage?:string;assigned?:string;seed?:string}>}){const query=await searchParams;return <PipelineWorkspace allocatedOnly initialQuery={query}/>;}
