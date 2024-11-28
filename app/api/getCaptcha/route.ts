import { NextRequest, NextResponse } from "next/server";
import { getSiteKey } from "@/actions/getSiteKey";
import { rateLimit } from "@/lib/rate-limit";
import { sign, verify } from "@/lib/signature";
import axios from "axios";

const limiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
});

async function verifyApiKey(apiKey: string): Promise<boolean> {
  // Check if API key matches any valid keys
  const validKeys = process.env.VALID_API_KEYS?.split(",") || [];
  return validKeys.includes(apiKey);
}

async function verifyRecaptcha(token: string) {
  try {
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`
    );
    return response.data.success && response.data.score >= 0.5;
  } catch (error) {
    console.error("reCAPTCHA verification failed:", error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get("url");
    const apiKey = request.headers.get("x-api-key");
    const recaptchaToken = request.headers.get("x-recaptcha-token");
    const timestamp = request.headers.get("x-timestamp");
    const signature = request.headers.get("x-signature");

    // API Key authentication
    if (apiKey) {
      const isValidKey = await verifyApiKey(apiKey);
      if (!isValidKey) {
        return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
      }
    } else {
      // If no API key, verify reCAPTCHA and other security measures
      if (!recaptchaToken) {
        return NextResponse.json(
          { error: "reCAPTCHA verification required" },
          { status: 400 }
        );
      }

      const isValidRecaptcha = await verifyRecaptcha(recaptchaToken);
      if (!isValidRecaptcha) {
        return NextResponse.json(
          { error: "reCAPTCHA verification failed" },
          { status: 400 }
        );
      }

      // Verify request signature if no API key
      if (timestamp && signature) {
        const data = `${url}-${timestamp}`;
        const isValidSignature = await verify(data, signature);
        if (!isValidSignature) {
          return NextResponse.json(
            { error: "Invalid request signature" },
            { status: 401 }
          );
        }
      }

      try {
        await limiter.check(request, 30, "CACHE_TOKEN");
      } catch {
        return NextResponse.json(
          { error: "Rate limit exceeded" },
          { status: 429 }
        );
      }
    }

    if (!url) {
      return NextResponse.json(
        { error: "URL parameter is required" },
        { status: 400 }
      );
    }

    const result = await getSiteKey(url);

    // Add usage tracking or logging here if needed
    console.log(`API Request: ${url} - ${apiKey ? "API Key" : "Public"}`);

    return NextResponse.json(result);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
