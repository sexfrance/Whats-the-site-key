"use server";

import axios from "axios";
import * as cheerio from "cheerio";
import { URL } from "url";

interface CaptchaInfo {
  siteKey: string;
  captchaType: string;
  difficulty?: string;
  location: string;
  foundOn: string;
}

interface CaptchaResult {
  captchas: CaptchaInfo[];
  error?: string;
}

async function crawlPage(
  baseUrl: string,
  path: string,
  visited: Set<string>
): Promise<CaptchaInfo[]> {
  const url = new URL(path, baseUrl).toString();

  if (visited.has(url)) {
    return [];
  }

  visited.add(url);

  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      maxRedirects: 5,
      timeout: 10000,
    });

    const html = response.data;
    const $ = cheerio.load(html);
    const captchas: CaptchaInfo[] = [];

    // Function to clean and normalize URLs
    const normalizeUrl = (href: string) => {
      try {
        const normalized = new URL(href, baseUrl);
        return normalized.toString();
      } catch {
        return null;
      }
    };

    // Function to search for patterns in script tags and content
    const searchPatterns = (
      content: string
    ): { type: string; key: string }[] => {
      const patterns = [
        // reCAPTCHA patterns
        {
          regex: /['"]?sitekey['"]?\s*:\s*['"]([^'"]+)['"]/gi,
          type: "reCAPTCHA",
        },
        { regex: /render=([^&'"]+)/gi, type: "reCAPTCHA v3" },
        // hCaptcha patterns
        {
          regex: /['"]?data-sitekey['"]?\s*=\s*['"]([^'"]+)['"]/gi,
          type: "hCaptcha",
        },
        { regex: /sitekey:\s*['"]([^'"]+)['"]/gi, type: "hCaptcha" },
        // Turnstile patterns
        {
          regex: /turnstile\.render$$['"]([^'"]+)['"]$$/gi,
          type: "Cloudflare Turnstile",
        },
        { regex: /data-sitekey=['"]([^'"]+)['"]/gi, type: "Unknown CAPTCHA" },
        // Additional patterns for dynamic loading
        {
          regex: /captcha\.execute$$['"]([^'"]+)['"]$$/gi,
          type: "Dynamic CAPTCHA",
        },
        { regex: /loadCaptcha$$['"]([^'"]+)['"]$$/gi, type: "Dynamic CAPTCHA" },
        // FriendlyCaptcha patterns
        {
          regex: /class="frc-captcha"\s+data-sitekey="([^"]+)"/gi,
          type: "FriendlyCaptcha",
        },
        // GeeTest patterns
        { regex: /gt:\s*['"]([^'"]+)['"]/gi, type: "GeeTest" },
        // KeyCaptcha patterns
        { regex: /s_s_c_user_id:\s*['"]([^'"]+)['"]/gi, type: "KeyCaptcha" },
        // PerimeterX patterns
        { regex: /PX_[A-Z0-9]+:\s*['"]([^'"]+)['"]/gi, type: "PerimeterX" },
        // Generic configuration patterns
        {
          regex: /captcha_key['"]?\s*:\s*['"]([^'"]+)['"]/gi,
          type: "Generic CAPTCHA",
        },
        {
          regex: /captchaKey['"]?\s*:\s*['"]([^'"]+)['"]/gi,
          type: "Generic CAPTCHA",
        },
      ];

      const results: { type: string; key: string }[] = [];

      patterns.forEach(({ regex, type }) => {
        const matches = content.matchAll(new RegExp(regex));
        for (const match of matches) {
          if (match[1] && !results.some((r) => r.key === match[1])) {
            results.push({ type, key: match[1] });
          }
        }
      });

      return results;
    };

    // Search in all script tags
    $("script").each((_, elem) => {
      const content = $(elem).html() || "";
      const src = $(elem).attr("src");

      // Check inline script content
      const inlineResults = searchPatterns(content);
      inlineResults.forEach(({ type, key }) => {
        captchas.push({
          siteKey: key,
          captchaType: type,
          location: "Script Content",
          foundOn: url,
        });
      });

      // Check script src for API endpoints
      if (src) {
        if (src.includes("hcaptcha")) {
          const key = src.match(/sitekey=([^&]+)/)?.[1];
          if (key) {
            captchas.push({
              siteKey: key,
              captchaType: "hCaptcha",
              location: "Script Source",
              foundOn: url,
            });
          }
        } else if (src.includes("recaptcha")) {
          const key = src.match(/render=([^&]+)/)?.[1];
          if (key) {
            captchas.push({
              siteKey: key,
              captchaType: "reCAPTCHA v3",
              location: "Script Source",
              foundOn: url,
            });
          }
        }
      }
    });

    // Search in HTML attributes
    $("[data-sitekey]").each((_, elem) => {
      const siteKey = $(elem).attr("data-sitekey");
      if (siteKey) {
        const type = $(elem).hasClass("h-captcha")
          ? "hCaptcha"
          : $(elem).hasClass("g-recaptcha")
          ? "reCAPTCHA"
          : $(elem).hasClass("cf-turnstile")
          ? "Cloudflare Turnstile"
          : "Unknown CAPTCHA";

        captchas.push({
          siteKey,
          captchaType: type,
          location: "HTML Element",
          foundOn: url,
        });
      }
    });

    // Find and crawl relevant links (login, register, auth pages)
    const relevantPaths = new Set<string>();
    $("a").each((_, elem) => {
      const href = $(elem).attr("href");
      if (!href) return;

      const normalized = normalizeUrl(href);
      if (!normalized) return;

      // Only follow links that might lead to auth pages
      const relevantTerms = [
        "login",
        "signin",
        "sign-in",
        "register",
        "signup",
        "sign-up",
        "auth",
        "account",
        "verification",
        "verify",
        "captcha",
      ];

      if (
        normalized.startsWith(baseUrl) &&
        relevantTerms.some((term) => normalized.toLowerCase().includes(term))
      ) {
        relevantPaths.add(normalized);
      }
    });

    // Recursively crawl relevant paths
    for (const path of relevantPaths) {
      if (visited.size < 10) {
        // Limit crawl depth
        const nestedCaptchas = await crawlPage(baseUrl, path, visited);
        captchas.push(...nestedCaptchas);
      }
    }

    return captchas;
  } catch (error) {
    console.error(`Error crawling ${url}:`, error);
    return [];
  }
}

export async function getSiteKey(url: string): Promise<CaptchaResult> {
  try {
    const baseUrl = new URL(url).origin;
    const visited = new Set<string>();
    const captchas = await crawlPage(baseUrl, url, visited);

    // Deduplicate captchas while preserving location information
    const uniqueCaptchas = captchas.reduce((acc, current) => {
      const existing = acc.find((c) => c.siteKey === current.siteKey);
      if (!existing) {
        acc.push(current);
      }
      return acc;
    }, [] as CaptchaInfo[]);

    return {
      captchas: uniqueCaptchas,
    };
  } catch (error) {
    console.error("Error in getSiteKey:", error);
    return {
      captchas: [],
      error:
        "Failed to analyze the website. Please check the URL and try again.",
    };
  }
}
