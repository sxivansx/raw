import { NextResponse } from "next/server";

import connectToDatabase from "../../../../lib/db";
import Note from "../../../../models/Note";

export async function PATCH(request, { params }) {
  try {
    const id =
      params?.id || request.nextUrl?.pathname?.split("/").filter(Boolean).pop();
    if (!id) {
      return NextResponse.json({ error: "Missing note id" }, { status: 400 });
    }

    const body = await request.json();
    const { title, content, tags, pinned, archived } = body || {};

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const note = await Note.findByIdAndUpdate(
      id,
      {
        title: title.trim(),
        content: typeof content === "string" ? content.trim() : "",
        ...(Array.isArray(tags) ? { tags } : {}),
        ...(typeof pinned === "boolean" ? { pinned } : {}),
        ...(typeof archived === "boolean" ? { archived } : {}),
      },
      { new: true, runValidators: true }
    ).lean();

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json({ note }, { status: 200 });
  } catch (error) {
    console.error("Failed to update note:", error);
    return NextResponse.json(
      { error: "Failed to update note" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const id =
      params?.id || request.nextUrl?.pathname?.split("/").filter(Boolean).pop();
    if (!id) {
      return NextResponse.json({ error: "Missing note id" }, { status: 400 });
    }

    await connectToDatabase();

    const note = await Note.findByIdAndDelete(id).lean();
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete note:", error);
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    );
  }
}
