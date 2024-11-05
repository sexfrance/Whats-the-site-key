import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api")) {
    const clientToken = request.headers.get("x-client-token");
    const requestedWith = request.headers.get("x-requested-with");

    if (!clientToken || requestedWith !== "XMLHttpRequest") {
      return new NextResponse(
        JSON.stringify({
          error: "Unauthorized",
          details: "Missing required headers",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const response = NextResponse.next();
    response.headers.set("x-frame-options", "DENY");
    response.headers.set("x-content-type-options", "nosniff");
    response.headers.set("x-xss-protection", "1; mode=block");

    return response;
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/api/getCaptcha", // Update matcher to match new route
};
