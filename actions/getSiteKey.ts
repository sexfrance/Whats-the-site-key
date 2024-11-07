"use server";

import axios from "axios";
import * as cheerio from "cheerio";
import { URL } from "url";

interface CaptchaInfo {
  siteKey: string;
  captchaType: string;
  difficulty?: string;
  variant?: string;
  theme?: string;
  size?: string;
  action?: string;
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
    const captchaSet = new Set<string>(); // To track unique captchas

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
    const searchPatterns = (content: string): { type: string; key: string; difficulty?: string; variant?: string; theme?: string; size?: string; action?: string }[] => {
      const patterns = [
        // reCAPTCHA v2 patterns with extended attributes
        { 
          regex: /['"]?sitekey['"]?\s*[:=]\s*['"]([^'"]+)['"].*?data-size\s*=\s*['"]([^'"]+)['"].*?data-theme\s*=\s*['"]([^'"]+)['"]/gi,
          type: "reCAPTCHA v2",
          withAttributes: true
        },
        // reCAPTCHA v2 patterns
        { 
          regex: /['"]?sitekey['"]?\s*[:=]\s*['"]([^'"]+)['"]/gi, 
          type: "reCAPTCHA v2" 
        },
        { 
          regex: /data-sitekey\s*=\s*['"]([^'"]+)['"]/gi, 
          type: "reCAPTCHA v2" 
        },
        // reCAPTCHA v3 patterns
        { 
          regex: /grecaptcha\.execute\s*\(\s*['"]([^'"]+)['"]/gi, 
          type: "reCAPTCHA v3" 
        },
        { 
          regex: /recaptcha\/api\.js\?render=([^&'"]+)/gi, 
          type: "reCAPTCHA v3" 
        },
        // hCaptcha patterns
        { regex: /['"]?data-sitekey['"]?\s*=\\s*['"]([^'"]+)['"]/gi, type: "hCaptcha" },
        { regex: /sitekey\s*[:=]\s*['"]([^'"]+)['"]/gi, type: "hCaptcha" },
        { regex: /hcaptcha\.com\/\w+\?(?:.*&)?key=([^&'"]+)/gi, type: "hCaptcha" },
        
        // Turnstile patterns
        { regex: /turnstile\.render\(['"]([^'"]+)['"]\)/gi, type: "Cloudflare Turnstile" },
        { regex: /data-sitekey\s*=\s*['"]([^'"]+)['"]\s+(?:class|data-action)=['"]cf-turnstile/gi, type: "Cloudflare Turnstile" },
        
        // FriendlyCaptcha patterns
        { regex: /class="frc-captcha"[\s\w="']*data-sitekey="([^"]+)"/gi, type: "FriendlyCaptcha" },
        { regex: /FriendlyCaptcha\.start\(['"]([^'"]+)['"]\)/gi, type: "FriendlyCaptcha" },
        
        // BotDetect patterns
        { regex: /BotDetect\.Init\(['"]([^'"]+)['"]\)/gi, type: "BotDetect" },
        
        // KeyCaptcha patterns
        { regex: /s_s_c_user_id\s*[:=]\s*['"]([^'"]+)['"]/gi, type: "KeyCaptcha" },
        { regex: /keycaptcha-form.*?data-key=['"]([^'"]+)['"]/gi, type: "KeyCaptcha" },
        
        // GeeTest patterns
        { regex: /gt\s*[:=]\s*['"]([^'"]+)['"]/gi, type: "GeeTest" },
        { regex: /initGeetest\({[\s\S]*?gt\s*:\s*['"]([^'"]+)['"]/gi, type: "GeeTest" },
        
        // FunCaptcha patterns
        { regex: /data-pkey\s*=\s*['"]([^'"]+)['"]/gi, type: "FunCaptcha" },
        { regex: /funcaptcha\.com\/fc\/api\/\?pkey=([^&'"]+)/gi, type: "FunCaptcha" },
        
        // PerimeterX patterns
        { regex: /_pxCaptcha\s*=\s*['"]([^'"]+)['"]/gi, type: "PerimeterX" },
        { regex: /client\.perimeterx\.net\/captcha\/([^\/'"]+)/gi, type: "PerimeterX" },
        
        // Akamai Bot Manager patterns
        { regex: /abck=([^;]+)/gi, type: "Akamai Bot Manager" },
        
        // Distil Networks patterns
        { regex: /distil_r_captcha\s*=\s*['"]([^'"]+)['"]/gi, type: "Distil Networks" },
        
        // Imperva Incapsula patterns
        { regex: /incap_ses\s*=\s*['"]([^'"]+)['"]/gi, type: "Imperva Incapsula" },
        
        // Generic patterns
        { regex: /captcha(?:_?[kK]ey|ID|Token)\s*[:=]\s*['"]([^'"]+)['"]/gi, type: "Generic CAPTCHA" },
      ];

      const results: { type: string; key: string; difficulty?: string; variant?: string; theme?: string; size?: string; action?: string }[] = [];

      patterns.forEach(({ regex, type, withAttributes }) => {
        let match;
        const regExp = new RegExp(regex);
        while ((match = regExp.exec(content)) !== null) {
          const key = match[1].trim();
          if (key && !results.some((r) => r.key === key)) {
            if (key.length > 5 && !/^[<>{}]/.test(key)) {
              const result: any = { type, key };
              
              // Add additional attributes if available
              if (withAttributes) {
                if (match[2]) result.size = match[2];
                if (match[3]) result.theme = match[3];
              }
              
              results.push(result);
            }
          }
        }
      });

      return results;
    };

    // Search in all script tags and their sources
    const scriptPromises = $("script").map(async (_, elem) => {
      const content = $(elem).html() || "";
      const src = $(elem).attr("src");

      // Check inline script content
      const inlineResults = searchPatterns(content);
      inlineResults.forEach(({ type, key }) => {
        const uniqueKey = `${key}-${type}-Script Content`;
        if (!captchaSet.has(uniqueKey)) {
          captchaSet.add(uniqueKey);
          captchas.push({
            siteKey: key,
            captchaType: type,
            location: "Script Content",
            foundOn: url,
          });
        }
      });

      // Check external script content
      if (src) {
        try {
          const scriptUrl = new URL(src, url).toString();
          if (scriptUrl.includes("captcha") || scriptUrl.includes("security")) {
            const response = await axios.get(scriptUrl, { timeout: 5000 });
            const scriptContent = response.data;
            if (typeof scriptContent === "string") {
              const scriptResults = searchPatterns(scriptContent);
              scriptResults.forEach(({ type, key }) => {
                const uniqueKey = `${key}-${type}-External Script`;
                if (!captchaSet.has(uniqueKey)) {
                  captchaSet.add(uniqueKey);
                  captchas.push({
                    siteKey: key,
                    captchaType: type,
                    location: "External Script",
                    foundOn: url,
                  });
                }
              });
            }
          }
        } catch (error) {
          // Ignore external script errors
        }
      }
    }).get();

    await Promise.all(scriptPromises);

    // Enhanced HTML element search for reCAPTCHA
    $("[data-sitekey]").each((_, elem) => {
      const siteKey = $(elem).attr("data-sitekey");
      if (siteKey) {
        let type = "Unknown CAPTCHA";
        let difficulty;
        let theme;
        let size;
        let variant;

        if ($(elem).hasClass("g-recaptcha")) {
          type = "reCAPTCHA v2";
          size = $(elem).attr("data-size") || "normal";
          theme = $(elem).attr("data-theme") || "light";
          
          if (size === "invisible") {
            difficulty = "invisible";
            variant = "Invisible reCAPTCHA";
          } else {
            difficulty = "checkbox";
            variant = "Checkbox reCAPTCHA";
          }
        } else if ($(elem).hasClass("h-captcha")) {
          type = "hCaptcha";
          theme = $(elem).attr("data-theme") || "light";
          size = $(elem).attr("data-size") || "normal";
          variant = size === "invisible" ? "Invisible hCaptcha" : "Challenge hCaptcha";
        } else if ($(elem).hasClass("cf-turnstile")) {
          type = "Cloudflare Turnstile";
          theme = $(elem).attr("data-theme") || "light";
          size = $(elem).attr("data-size") || "normal";
          variant = $(elem).attr("data-appearance") || "Challenge";
        }

        const uniqueKey = `${siteKey}-${type}-HTML Element`;
        if (!captchaSet.has(uniqueKey)) {
          captchaSet.add(uniqueKey);
          captchas.push({
            siteKey,
            captchaType: type,
            difficulty,
            variant,
            theme,
            size,
            location: "HTML Element",
            foundOn: url,
          });
        }
      }
    });

    // Check for reCAPTCHA v3 script tags
    $("script[src*='recaptcha']").each((_, elem) => {
      const src = $(elem).attr("src") || "";
      if (src.includes("render=")) {
        const key = src.match(/render=([^&]+)/)?.[1];
        const action = src.match(/action=([^&]+)/)?.[1];
        const uniqueKey = `${key}-reCAPTCHA v3-Script Source`;
        if (key && !captchaSet.has(uniqueKey)) {
          captchaSet.add(uniqueKey);
          captchas.push({
            siteKey: key,
            captchaType: "reCAPTCHA v3",
            difficulty: "score-based",
            variant: "Invisible Score-based",
            action: action || "default",
            location: "Script Source",
            foundOn: url,
          });
        }
      }
    });

    // Check for enterprise reCAPTCHA
    if (html.includes("enterprise.js") || html.includes("enterprise/")) {
      captchas.forEach(captcha => {
        if (captcha.captchaType.includes("reCAPTCHA")) {
          captcha.captchaType += " Enterprise";
        }
      });
    }

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
