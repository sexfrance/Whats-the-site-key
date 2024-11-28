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
    const searchPatterns = (
      content: string
    ): {
      type: string;
      key: string;
      difficulty?: string;
      variant?: string;
      theme?: string;
      size?: string;
      action?: string;
    }[] => {
      const patterns = [
        // Cloudflare Turnstile patterns - Put these first for priority
        {
          regex: /turnstile\.render\s*\(\s*['"]([^'"]+)['"]/gi,
          type: "Cloudflare Turnstile",
        },
        {
          regex: /data-cf-turnstile=["']([^'"]+)["']/gi,
          type: "Cloudflare Turnstile",
        },
        {
          regex: /data-turnstile-key=["']([^'"]+)["']/gi,
          type: "Cloudflare Turnstile",
        },
        {
          regex:
            /data-sitekey=["']([^'"]+)["'](?:[^>]*class=["'][^"']*cf-turnstile|[^>]*data-action)/gi,
          type: "Cloudflare Turnstile",
        },
        {
          regex:
            /class=["'][^"']*cf-turnstile[^"']*["'][^>]*data-sitekey=["']([^'"]+)["']/gi,
          type: "Cloudflare Turnstile",
        },
        {
          regex: /turnstile\.getResponse\s*\(\s*['"]([^'"]+)['"]\)/gi,
          type: "Cloudflare Turnstile",
        },

        // reCAPTCHA patterns - Move these after Turnstile patterns
        {
          regex:
            /class=["']g-recaptcha["'][^>]*data-sitekey=["']([^'"]+)["']/gi,
          type: "reCAPTCHA v2",
        },
        {
          regex: /grecaptcha\.render\s*\(\s*['"]([^'"]+)['"]/gi,
          type: "reCAPTCHA v2",
        },
        // ... other patterns ...
      ];

      const results: {
        type: string;
        key: string;
        difficulty?: string;
        variant?: string;
        theme?: string;
        size?: string;
        action?: string;
      }[] = [];

      patterns.forEach(({ regex, type }) => {
        let match;
        const regExp = new RegExp(regex);
        while ((match = regExp.exec(content)) !== null) {
          const key = match[1].trim();
          if (key && !results.some((r) => r.key === key)) {
            if (key.length > 5 && !/^[<>{}]/.test(key)) {
              const result: any = { type, key };
              // Add additional attributes if available
              if (match[2]) result.size = match[2];
              if (match[3]) result.theme = match[3];

              results.push(result);
            }
          }
        }
      });

      return results;
    };

    // Search in all script tags and their sources
    const scriptPromises = $("script")
      .map(async (_, elem) => {
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
            if (
              scriptUrl.includes("captcha") ||
              scriptUrl.includes("security")
            ) {
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
      })
      .get();

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
          variant =
            size === "invisible" ? "Invisible hCaptcha" : "Challenge hCaptcha";
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
      captchas.forEach((captcha) => {
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

    // Add additional HTML element search
    $(
      "[data-pkey], [data-px-appid], [data-arkose-public-key], [data-mtcaptcha-sitekey]"
    ).each((_, elem) => {
      let siteKey;
      let type;

      if ($(elem).attr("data-pkey")) {
        siteKey = $(elem).attr("data-pkey");
        type = "FunCaptcha";
      } else if ($(elem).attr("data-px-appid")) {
        siteKey = $(elem).attr("data-px-appid");
        type = "PerimeterX";
      } else if ($(elem).attr("data-arkose-public-key")) {
        siteKey = $(elem).attr("data-arkose-public-key");
        type = "Arkose Enterprise";
      } else if ($(elem).attr("data-mtcaptcha-sitekey")) {
        siteKey = $(elem).attr("data-mtcaptcha-sitekey");
        type = "MTCaptcha";
      }

      if (siteKey) {
        const uniqueKey = `${siteKey}-${type}-HTML Element`;
        if (!captchaSet.has(uniqueKey)) {
          captchaSet.add(uniqueKey);
          captchas.push({
            siteKey: siteKey!, // Assert siteKey is non-null since we check above
            captchaType: type!, // Assert type is non-null since it's set with siteKey
            location: "HTML Element",
            foundOn: url,
          });
        }
      }
    });

    // Add script source checking for additional CAPTCHA types
    $(
      "script[src*='arkoselabs'], script[src*='perimeterx'], script[src*='datadome'], script[src*='mtcaptcha']"
    ).each((_, elem) => {
      const src = $(elem).attr("src") || "";
      let key;
      let type;

      if (src.includes("arkoselabs.com")) {
        const match = src.match(/public_key=([^&]+)/);
        if (match) {
          key = match[1];
          type = src.includes("/v2/") ? "Arkose Enterprise" : "FunCaptcha";
        }
      } else if (src.includes("perimeterx")) {
        const match = src.match(/px-cdn\.net\/([^/]+)/);
        if (match) {
          key = match[1];
          type = "PerimeterX";
        }
      } else if (src.includes("datadome")) {
        const match = src.match(/initialCid=([^&]+)/);
        if (match) {
          key = match[1];
          type = "DataDome";
        }
      } else if (src.includes("mtcaptcha")) {
        const match = src.match(/sitekey=([^&]+)/);
        if (match) {
          key = match[1];
          type = "MTCaptcha";
        }
      }

      if (key) {
        const uniqueKey = `${key}-${type}-Script Source`;
        if (!captchaSet.has(uniqueKey)) {
          captchaSet.add(uniqueKey);
          captchas.push({
            siteKey: key!, // Assert key is non-null since we check above
            captchaType: type!, // Assert type is non-null since it's set with key
            location: "Script Source",
            foundOn: url,
          });
        }
      }
    });

    // Enhanced FunCaptcha (Arkose Labs) patterns
    const patterns = [
      // ... other existing patterns ...

      // Arkose Labs specific patterns
      {
        regex:
          /[?&]key=([A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12})/i,
        type: "FunCaptcha",
      },
      {
        regex:
          /enforcement\.arkoselabs\.com\/[^/]+\/([A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12})/i,
        type: "FunCaptcha",
      },
      {
        regex:
          /data-arkose-key\s*=\s*['"]([A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12})['"]/i,
        type: "FunCaptcha",
      },
    ];

    // Add this to the HTML element search section
    $(
      "iframe[src*='funcaptcha'], iframe[src*='arkoselabs'], div[data-pkey], div[class*='funcaptcha'], div[class*='arkoselabs']"
    ).each((_, elem) => {
      let siteKey;
      const src = $(elem).attr("src") || "";
      const pkey = $(elem).attr("data-pkey");

      // Check for pkey in data attribute
      if (pkey) {
        siteKey = pkey;
      }
      // Check for pkey in src URL
      else if (src) {
        const pkeyMatch = src.match(/(?:public_key|pkey)=([^&]+)/);
        if (pkeyMatch) {
          siteKey = pkeyMatch[1];
        }
      }

      if (siteKey) {
        const uniqueKey = `${siteKey}-FunCaptcha-Element`;
        if (!captchaSet.has(uniqueKey)) {
          captchaSet.add(uniqueKey);
          captchas.push({
            siteKey,
            captchaType: "FunCaptcha",
            location: "HTML Element",
            foundOn: url,
          });
        }
      }
    });

    // Add this to the script source checking section
    $("script").each((_, elem) => {
      const content = $(elem).html() || "";
      const src = $(elem).attr("src") || "";

      // Check for FunCaptcha initialization in inline scripts
      if (content.includes("arkose") || content.includes("funcaptcha")) {
        const matches = content.match(
          /(?:public_key|pkey)\s*[:=]\s*['"]([^'"]+)['"]/gi
        );
        if (matches) {
          matches.forEach((match) => {
            const key = match.match(/['"]([^'"]+)['"]/)?.[1];
            if (key) {
              const uniqueKey = `${key}-FunCaptcha-Script`;
              if (!captchaSet.has(uniqueKey)) {
                captchaSet.add(uniqueKey);
                captchas.push({
                  siteKey: key,
                  captchaType: "FunCaptcha",
                  location: "Script Content",
                  foundOn: url,
                });
              }
            }
          });
        }
      }

      // Check for FunCaptcha in external scripts
      if (src.includes("funcaptcha") || src.includes("arkoselabs")) {
        const pkeyMatch = src.match(/(?:public_key|pkey)=([^&]+)/);
        if (pkeyMatch) {
          const key = pkeyMatch[1];
          const uniqueKey = `${key}-FunCaptcha-External`;
          if (!captchaSet.has(uniqueKey)) {
            captchaSet.add(uniqueKey);
            captchas.push({
              siteKey: key,
              captchaType: "FunCaptcha",
              location: "External Script",
              foundOn: url,
            });
          }
        }
      }
    });

    // Add URL parameter check
    try {
      const urlParams = new URL(url).searchParams;
      const keyParam = urlParams.get("key");
      if (
        keyParam &&
        /^[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}$/i.test(
          keyParam
        )
      ) {
        const uniqueKey = `${keyParam}-FunCaptcha-URL`;
        if (!captchaSet.has(uniqueKey)) {
          captchaSet.add(uniqueKey);
          captchas.push({
            siteKey: keyParam,
            captchaType: "FunCaptcha",
            location: "URL Parameter",
            foundOn: url,
          });
        }
      }
    } catch (error) {
      console.error("Error parsing URL parameters:", error);
    }

    // Enhanced HTML element search for Turnstile
    $(
      "[class*='cf-turnstile'], [data-turnstile-key], [data-cf-turnstile], [data-widget='turnstile']"
    ).each((_, elem) => {
      const $elem = $(elem);
      const siteKey =
        $elem.attr("data-sitekey") ||
        $elem.attr("data-turnstile-key") ||
        $elem.attr("data-cf-turnstile");

      if (siteKey) {
        const uniqueKey = `${siteKey}-Cloudflare Turnstile-HTML Element`;
        if (!captchaSet.has(uniqueKey)) {
          captchaSet.add(uniqueKey);
          captchas.push({
            siteKey,
            captchaType: "Cloudflare Turnstile",
            location: "HTML Element",
            foundOn: url,
            theme: $elem.attr("data-theme") || "light",
            size: $elem.attr("data-size") || "normal",
            action: $elem.attr("data-action"),
            variant: $elem.attr("data-appearance") || "Challenge",
          });
        }
      }
    });

    // Enhanced script source checking for Turnstile
    $(
      "script[src*='turnstile'], script[src*='cloudflare'], script[src*='challenges']"
    ).each((_, elem) => {
      const src = $(elem).attr("src") || "";
      const content = $(elem).html() || "";

      // Check for Turnstile in script source
      const srcMatches = [
        src.match(/sitekey=([^&'"]+)/),
        src.match(/render=([^&'"]+)/),
        src.match(/key=([^&'"]+)/),
      ];

      for (const match of srcMatches) {
        if (match) {
          const key = match[1];
          const uniqueKey = `${key}-Cloudflare Turnstile-Script Source`;
          if (!captchaSet.has(uniqueKey)) {
            captchaSet.add(uniqueKey);
            captchas.push({
              siteKey: key,
              captchaType: "Cloudflare Turnstile",
              location: "Script Source",
              foundOn: url,
            });
          }
        }
      }

      // Check for Turnstile configuration in inline scripts
      const configMatches = content.match(
        /turnstile\.render\s*\(\s*{[\s\S]*?sitekey\s*:\s*['"]([^'"]+)['"]/gi
      );
      if (configMatches) {
        configMatches.forEach((match) => {
          const key = match.match(/['"]([^'"]+)['"]/)?.[1];
          if (key) {
            const uniqueKey = `${key}-Cloudflare Turnstile-Script Content`;
            if (!captchaSet.has(uniqueKey)) {
              captchaSet.add(uniqueKey);
              captchas.push({
                siteKey: key,
                captchaType: "Cloudflare Turnstile",
                location: "Script Content",
                foundOn: url,
              });
            }
          }
        });
      }
    });

    // Enhanced element search
    const elementSearchPatterns = [
      {
        selector:
          "[class*='cf-turnstile'], [data-turnstile-key], [data-cf-turnstile]",
        attributeCheck: (elem: any) => {
          const $elem = $(elem);
          const sitekey =
            $elem.attr("data-turnstile-key") ||
            $elem.attr("data-cf-turnstile") ||
            $elem.attr("data-sitekey");

          if (!sitekey) return null;

          // If element has Turnstile-related classes or attributes, prioritize Turnstile detection
          if (
            $elem.attr("class")?.includes("cf-turnstile") ||
            $elem.attr("data-turnstile-key") ||
            $elem.attr("data-cf-turnstile")
          ) {
            return {
              siteKey: sitekey,
              type: "Cloudflare Turnstile",
            };
          }
          return null;
        },
      },
      {
        selector: ".g-recaptcha, [data-sitekey]",
        attributeCheck: (elem: any) => {
          const $elem = $(elem);
          const sitekey = $elem.attr("data-sitekey");
          if (!sitekey) return null;

          // Only identify as reCAPTCHA if it explicitly has g-recaptcha class
          if ($elem.hasClass("g-recaptcha")) {
            return {
              siteKey: sitekey,
              type: "reCAPTCHA v2",
            };
          }
          return null;
        },
      },
    ];

    // Apply element search patterns
    elementSearchPatterns.forEach(({ selector, attributeCheck }) => {
      $(selector).each((_, elem) => {
        const result = attributeCheck(elem);
        if (result) {
          const uniqueKey = `${result.siteKey}-${result.type}-HTML Element`;
          if (!captchaSet.has(uniqueKey)) {
            captchaSet.add(uniqueKey);
            captchas.push({
              siteKey: result.siteKey,
              captchaType: result.type,
              location: "HTML Element",
              foundOn: url,
              theme: $(elem).attr("data-theme"),
              size: $(elem).attr("data-size"),
              action: $(elem).attr("data-action"),
            });
          }
        }
      });
    });

    // Enhanced script content search
    $("script").each((_, elem) => {
      const content = $(elem).html() || "";
      const src = $(elem).attr("src") || "";

      // Check both inline content and src attributes
      [content, src].forEach((text) => {
        if (!text) return;

        // Search for initialization patterns
        const initPatterns = [
          {
            regex:
              /turnstile\.render\s*\(\s*['"](.*?)['"]\s*,\s*{[\s\S]*?sitekey:\s*['"](.*?)['"]/gi,
            type: "Cloudflare Turnstile",
          },
          {
            regex:
              /grecaptcha\.render\s*\(\s*['"](.*?)['"]\s*,\s*{[\s\S]*?sitekey:\s*['"](.*?)['"]/gi,
            type: "reCAPTCHA v2",
          },
        ];

        initPatterns.forEach(({ regex, type }) => {
          let match;
          while ((match = regex.exec(text)) !== null) {
            const siteKey = match[2];
            if (siteKey) {
              const uniqueKey = `${siteKey}-${type}-Script`;
              if (!captchaSet.has(uniqueKey)) {
                captchaSet.add(uniqueKey);
                captchas.push({
                  siteKey,
                  captchaType: type,
                  location: "Script Content",
                  foundOn: url,
                });
              }
            }
          }
        });
      });
    });

    // Add specific script source checking for Turnstile
    $("script").each((_, elem) => {
      const src = $(elem).attr("src") || "";
      const content = $(elem).html() || "";

      // Check for Turnstile-specific patterns in script sources
      if (
        src.includes("turnstile") ||
        src.includes("cloudflare") ||
        content.includes("turnstile")
      ) {
        const turnstilePatterns = [
          /sitekey['"]\s*:\s*['"]([^'"]+)['"]/i,
          /data-sitekey=["']([^'"]+)["']/i,
          /turnstile\.render\s*\(\s*['"]([^'"]+)['"]/i,
          /data-cf-turnstile=["']([^'"]+)["']/i,
        ];

        turnstilePatterns.forEach((pattern) => {
          const match = (src + content).match(pattern);
          if (match && match[1]) {
            const uniqueKey = `${match[1]}-Cloudflare Turnstile-Script`;
            if (!captchaSet.has(uniqueKey)) {
              captchaSet.add(uniqueKey);
              captchas.push({
                siteKey: match[1],
                captchaType: "Cloudflare Turnstile",
                location: "Script Content",
                foundOn: url,
              });
            }
          }
        });
      }
    });

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
