import PipelineWorkspace from "@/components/pipeline-workspace";
export default async function ProjectCard({params}:{params:Promise<{id:string}>}){return <PipelineWorkspace initialProjectId={(await params).id}/>;}
