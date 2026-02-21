import { NextResponse } from "next/server";

const USER_ID_MAX_LENGTH = 128;
const USER_ID_REGEX = /^[a-zA-Z0-9._:-]+$/;

export function getUserIdFromRequest(request) {
  const userId = request.headers.get("x-user-id")?.trim();
  if (!userId) return null;
  if (userId.length > USER_ID_MAX_LENGTH) return null;
  if (!USER_ID_REGEX.test(userId)) return null;
  return userId;
}

export function missingUserIdResponse() {
  return NextResponse.json(
    { error: "Missing or invalid user id" },
    { status: 400 }
  );
}
