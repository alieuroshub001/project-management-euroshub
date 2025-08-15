// app/api/auth/delete-account/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";
import type { IApiResponse } from "@/types";

/** Minimal shape we rely on from NextAuth's session.user */
type SessionUserShape = {
  id?: string;
  email?: string | null;
};

/** Type guard: does the value look like a user object with a string id? */
function hasStringId(u: unknown): u is { id: string } {
  if (typeof u !== "object" || u === null) return false;
  const maybe = u as { id?: unknown };
  return typeof maybe.id === "string" && maybe.id.length > 0;
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json<IApiResponse>(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectToDatabase();

    // Build a safe query without using `any`
    let query: Record<string, unknown>;
    if (hasStringId(session.user)) {
      query = { _id: session.user.id };
    } else if ((session.user as SessionUserShape).email) {
      query = { email: (session.user as SessionUserShape).email as string };
    } else {
      return NextResponse.json<IApiResponse>(
        { success: false, message: "Unable to resolve user identifier" },
        { status: 400 }
      );
    }

    const user = await User.findOne(query);
    if (!user) {
      return NextResponse.json<IApiResponse>(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const userId = user._id.toString();

    // Delete the user document
    await User.deleteOne({ _id: userId });

    // Client should call next-auth's signOut to clear cookies/redirect
    return NextResponse.json<IApiResponse>(
      { success: true, message: "Account deleted" },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE /api/auth/delete-account error:", error);
    return NextResponse.json<IApiResponse>(
      {
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
