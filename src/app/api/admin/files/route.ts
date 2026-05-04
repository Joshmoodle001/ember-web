import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");

    let query = supabaseAdmin
      .from("project_files")
      .select("*")
      .order("created_at", { ascending: false });

    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json({ files: data || [] });
  } catch (error) {
    console.error("Files fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { project_id, filename, file_url, file_type, file_size, uploaded_by } = body;

    if (!project_id || !filename || !file_url) {
      return NextResponse.json({ error: "project_id, filename, and file_url are required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("project_files")
      .insert([{
        project_id,
        filename,
        file_url,
        file_type: file_type || null,
        file_size: file_size || null,
        uploaded_by: uploaded_by || null,
      }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ file: data }, { status: 201 });
  } catch (error) {
    console.error("File upload create error:", error);
    return NextResponse.json({ error: "Failed to create file record" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "File ID is required" }, { status: 400 });
    }

    const { data: fileData } = await supabaseAdmin
      .from("project_files")
      .select("file_url")
      .eq("id", id)
      .single();

    if (fileData?.file_url) {
      const urlPath = fileData.file_url.split("/storage/v1/object/public/")[1];
      if (urlPath) {
        const [bucket, ...pathParts] = urlPath.split("/");
        await supabaseAdmin.storage.from(bucket).remove([pathParts.join("/")]);
      }
    }

    const { error } = await supabaseAdmin.from("project_files").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("File delete error:", error);
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}