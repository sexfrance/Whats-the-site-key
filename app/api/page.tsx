"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTheme } from "next-themes";
import Editor from "@monaco-editor/react";

const EXAMPLE_CODE = {
  python: `import requests
import base64
import uuid
import time

def get_captcha(url):
    # Generate client token
    client_token = base64.b64encode(
        f"{uuid.uuid4()}{int(time.time())}".encode()
    ).decode()
    
    headers = {
        'x-client-token': client_token,
        'x-requested-with': 'XMLHttpRequest',
        'Accept': 'application/json'
    }
    
    response = requests.get(
        f"https://www.whatsthesitekey.com/api/getCaptcha?url={url}",
        headers=headers
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Request failed with status {response.status_code}")

# Example usage
try:
    result = get_captcha("https://example.com")
    print(result)
except Exception as e:
    print(f"Error: {e}")`,
  javascript: `async function getCaptcha(url) {
  // Generate client token
  const clientToken = btoa(crypto.randomUUID() + Date.now());
  
  const response = await fetch(
    \`https://www.whatsthesitekey.com/api/getCaptcha?url=\${encodeURIComponent(url)}\`, 
    {
      headers: {
        'x-client-token': clientToken,
        'x-requested-with': 'XMLHttpRequest',
        'Accept': 'application/json'
      }
    }
  );
  
  return await response.json();
}

// Example usage
const result = await getCaptcha("https://example.com");
console.log(result);`,
  rust: `use reqwest::header::{HeaderMap, HeaderValue};
use base64::{Engine as _, general_purpose::STANDARD};
use uuid::Uuid;
use std::time::{SystemTime, UNIX_EPOCH};

async fn get_captcha(url: &str) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
    let client_token = STANDARD.encode(format!(
        "{}{}",
        Uuid::new_v4(),
        SystemTime::now()
            .duration_since(UNIX_EPOCH)?
            .as_secs()
    ));

    let mut headers = HeaderMap::new();
    headers.insert("x-client-token", HeaderValue::from_str(&client_token)?);
    headers.insert("x-requested-with", HeaderValue::from_static("XMLHttpRequest"));
    headers.insert("Accept", HeaderValue::from_static("application/json"));

    let client = reqwest::Client::new();
    let response = client
        .get(format!("https://www.whatsthesitekey.com/api/getCaptcha?url={}", url))
        .headers(headers)
        .send()
        .await?;

    Ok(response.json().await?)
}`,
  go: `package main

import (
    "encoding/base64"
    "encoding/json"
    "fmt"
    "net/http"
    "time"
    "github.com/google/uuid"
)

func getCaptcha(url string) (map[string]interface{}, error) {
    // Generate client token
    clientToken := base64.StdEncoding.EncodeToString(
        []byte(fmt.Sprintf("%s%d", 
        uuid.New().String(), 
        time.Now().Unix()))
    )

    req, err := http.NewRequest(
        "GET",
        fmt.Sprintf("https://www.whatsthesitekey.com/api/getCaptcha?url=%s", url),
        nil,
    )
    if err != nil {
        return nil, err
    }

    req.Header.Set("x-client-token", clientToken)
    req.Header.Set("x-requested-with", "XMLHttpRequest")
    req.Header.Set("Accept", "application/json")

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)
    return result, nil
}`
};

const EXAMPLE_RESPONSE = {
  captchas: [
    {
      siteKey: "example_key",
      captchaType: "reCAPTCHA v2",
      difficulty: "checkbox",
      variant: "Checkbox reCAPTCHA",
      theme: "light",
      size: "normal",
      location: "HTML Element",
      foundOn: "https://example.com",
    },
  ],
};

const AUTH_HEADERS = {
  "x-client-token": "your-generated-token",
  "x-requested-with": "XMLHttpRequest",
  Accept: "application/json",
};

export default function ApiDocs() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background w-full">
      <div className="max-w-[90rem] mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-4xl font-bold">API Documentation</h1>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                >
                  {theme === "light" ? (
                    <Moon className="h-5 w-5" />
                  ) : (
                    <Sun className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle theme</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">Authentication</h2>
          <p className="mb-4">
            All requests must include the following headers:
          </p>
          <div className="rounded-lg border">
            <Editor
              height="150px"
              defaultLanguage="json"
              defaultValue={JSON.stringify(AUTH_HEADERS, null, 2)}
              theme={theme === "light" ? "light" : "vs-dark"}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">Endpoint</h2>
          <code className="rounded-lg bg-muted p-2 block">
            GET /api/getCaptcha?url=https://example.com
          </code>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">Response Format</h2>
          <div className="rounded-lg border">
            <Editor
              height="300px"
              defaultLanguage="json"
              defaultValue={JSON.stringify(EXAMPLE_RESPONSE, null, 2)}
              theme={theme === "light" ? "light" : "vs-dark"}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                formatOnPaste: true,
                formatOnType: true,
              }}
            />
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">Rate Limiting</h2>
          <p>The API is limited to 30 requests per minute per IP address.</p>
        </section>

        <section className="mb-8 w-full">
          <h2 className="mb-4 text-2xl font-semibold">
            Implementation Examples
          </h2>
          <Tabs defaultValue="python" className="w-full">
            <TabsList>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="rust">Rust</TabsTrigger>
              <TabsTrigger value="go">Go</TabsTrigger>
            </TabsList>
            <div className="mt-4">
              <TabsContent value="python" className="mt-0">
                <div className="rounded-lg border">
                  <Editor
                    height="600px"
                    defaultLanguage="python"
                    defaultValue={EXAMPLE_CODE.python}
                    theme={theme === "light" ? "light" : "vs-dark"}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                    }}
                  />
                </div>
              </TabsContent>
              <TabsContent value="javascript" className="mt-0">
                <div className="rounded-lg border">
                  <Editor
                    height="600px"
                    defaultLanguage="javascript"
                    defaultValue={EXAMPLE_CODE.javascript}
                    theme={theme === "light" ? "light" : "vs-dark"}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                    }}
                  />
                </div>
              </TabsContent>
              <TabsContent value="rust" className="mt-0">
                <div className="rounded-lg border">
                  <Editor
                    height="600px"
                    defaultLanguage="rust"
                    defaultValue={EXAMPLE_CODE.rust}
                    theme={theme === "light" ? "light" : "vs-dark"}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                    }}
                  />
                </div>
              </TabsContent>
              <TabsContent value="go" className="mt-0">
                <div className="rounded-lg border">
                  <Editor
                    height="600px"
                    defaultLanguage="go"
                    defaultValue={EXAMPLE_CODE.go}
                    theme={theme === "light" ? "light" : "vs-dark"}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                    }}
                  />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </section>
      </div>
    </div>
  );
}
