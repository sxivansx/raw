import { NextResponse } from "next/server";

import connectToDatabase from "../../../lib/db";
import Note from "../../../models/Note";

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .filter((tag) => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, content, tags, pinned, archived } = body || {};

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const note = await Note.create({
      title: title.trim(),
      content: typeof content === "string" ? content.trim() : undefined,
      tags: normalizeTags(tags),
      pinned: Boolean(pinned),
      archived: Boolean(archived),
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error("Failed to create note:", error);
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectToDatabase();

    const notes = await Note.find({})
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({ notes }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 }
    );
  }
}
