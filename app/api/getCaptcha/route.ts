import { NextRequest, NextResponse } from "next/server";
import { getSiteKey } from "@/actions/getSiteKey";
import { rateLimit } from "@/lib/rate-limit";
import axios from "axios";

const limiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
});

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "URL parameter is required" },
        { status: 400 }
      );
    }

    const recaptchaToken = request.headers.get("x-recaptcha-token");

    if (!recaptchaToken) {
      return NextResponse.json(
        { error: "reCAPTCHA token is missing" },
        { status: 400 }
      );
    }

    // Verify reCAPTCHA token
    const recaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY;
    const recaptchaVerificationUrl =
      "https://www.google.com/recaptcha/api/siteverify";

    const params = new URLSearchParams();
    params.append("secret", recaptchaSecretKey);
    params.append("response", recaptchaToken);

    try {
      const recaptchaResponse = await axios.post(
        recaptchaVerificationUrl,
        params
      );

      if (
        !recaptchaResponse.data.success ||
        recaptchaResponse.data.score < 0.5
      ) {
        return NextResponse.json(
          { error: "Failed reCAPTCHA verification" },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to verify reCAPTCHA token" },
        { status: 500 }
      );
    }

    try {
      await limiter.check(request, 30, "CACHE_TOKEN");
    } catch {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    const result = await getSiteKey(url);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
