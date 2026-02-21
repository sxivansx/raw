import { NextResponse } from "next/server";

import connectToDatabase from "../../../lib/db";
import {
  getUserIdFromRequest,
  missingUserIdResponse,
} from "../../../lib/user";
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
    const userId = getUserIdFromRequest(request);
    if (!userId) return missingUserIdResponse();

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
      userId,
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

export async function GET(request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return missingUserIdResponse();

    await connectToDatabase();

    const notes = await Note.find({ userId })
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

export async function DELETE(request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return missingUserIdResponse();

    const id = request.nextUrl?.searchParams?.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing note id" }, { status: 400 });
    }

    await connectToDatabase();

    const note = await Note.findOneAndDelete({ _id: id, userId }).lean();
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
