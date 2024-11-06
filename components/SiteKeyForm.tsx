"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, CheckCircle2, Search, Moon, Sun } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTheme } from "next-themes";

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

interface SiteKeyFormProps {
  getSiteKey: (url: string) => Promise<CaptchaResult>;
}

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

export default function Component({ getSiteKey }: SiteKeyFormProps) {
  const [url, setUrl] = React.useState("");
  const [result, setResult] = React.useState<CaptchaResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);
    setCopiedKey(null);

    let processedUrl = url.trim();
    if (!/^https?:\/\//i.test(processedUrl)) {
      processedUrl = `https://${processedUrl}`;
    }

    try {
      const clientToken = btoa(crypto.randomUUID() + Date.now());
      
      const recaptchaToken = await new Promise<string>((resolve, reject) => {
        window.grecaptcha.ready(async () => {
          try {
            const token = await window.grecaptcha.execute(
              process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!, 
              { action: 'submit' }
            );
            resolve(token);
          } catch (error) {
            reject(error);
          }
        });
      });

      const response = await fetch(`/api/getCaptcha?url=${encodeURIComponent(processedUrl)}`, {
        method: 'GET',
        headers: {
          'x-client-token': clientToken,
          'x-requested-with': 'XMLHttpRequest',
          'Accept': 'application/json',
          'x-recaptcha-token': recaptchaToken,
        },
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setResult(result);
    } catch (error) {
      setResult({
        captchas: [],
        error: "An error occurred while analyzing the website.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (siteKey: string) => {
    navigator.clipboard.writeText(siteKey);
    setCopiedKey(siteKey);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-3xl shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">
              What's the Site Key?
            </CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setTheme(theme === "light" ? "dark" : "light")
                    }
                    className="h-9 w-9"
                  >
                    {theme === "light" ? (
                      <Moon className="h-4 w-4" />
                    ) : (
                      <Sun className="h-4 w-4" />
                    )}
                    <span className="sr-only">Toggle theme</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Toggle theme</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <CardDescription>
            Enter a website URL to find CAPTCHA implementations and their site
            keys
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex space-x-2">
              <div className="relative flex-grow">
                <Input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="example.com"
                  required
                  className="pr-10"
                />
                <Search
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={20}
                />
              </div>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing
                  </>
                ) : (
                  "Find Keys"
                )}
              </Button>
            </div>
          </form>

          {result && (
            <ScrollArea className="mt-6 h-[400px] rounded-md border p-4">
              {result.error ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-destructive">{result.error}</p>
                </div>
              ) : result.captchas.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    Found {result.captchas.length} CAPTCHA implementation(s):
                  </h3>
                  {result.captchas.map((captcha, index) => (
                    <Card key={index} className="overflow-hidden">
                      <CardContent className="space-y-2 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">
                            {captcha.captchaType}
                          </Badge>
                          <Badge variant="outline">{captcha.location}</Badge>
                        </div>
                        {captcha.foundOn !== url && (
                          <p className="text-sm text-muted-foreground">
                            Found on: {captcha.foundOn}
                          </p>
                        )}
                        <div className="flex items-center justify-between break-all rounded bg-muted p-2 font-mono text-sm">
                          <code className="mr-2">{captcha.siteKey}</code>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleCopy(captcha.siteKey)}
                                  className="h-8 w-8"
                                >
                                  {copiedKey === captcha.siteKey ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                  <span className="sr-only">Copy site key</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {copiedKey === captcha.siteKey
                                    ? "Copied!"
                                    : "Copy site key"}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="rounded-lg border p-4 text-center">
                    <p className="font-semibold">
                      No CAPTCHA implementations found.
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Note: Some CAPTCHAs may only appear during specific
                      actions or on certain pages.
                    </p>
                  </div>
                </div>
              )}
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
