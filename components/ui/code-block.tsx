"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { getHighlighter, Highlighter } from "shiki";
import { useTheme } from "next-themes";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CodeBlockProps {
  code: string;
  language: string;
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const { theme } = useTheme();
  const [highlighter, setHighlighter] = React.useState<Highlighter | null>(
    null
  );
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const initializeHighlighter = async () => {
      try {
        const highlighter = await getHighlighter({
          themes: ["github-light", "dark-plus"],
          langs: [
            "javascript",
            "typescript",
            "python",
            "go",
            "rust",
            "tsx",
            "jsx",
            "json",
            "bash",
            "shell",
          ],
        });
        setHighlighter(highlighter);
      } catch (err) {
        console.error("Failed to initialize syntax highlighter:", err);
        setError("Failed to initialize syntax highlighting");
      }
    };

    initializeHighlighter();
  }, []);

  const onCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!highlighter) {
    return (
      <pre className="relative">
        <code className="block overflow-x-auto rounded-lg bg-muted p-4">
          {code}
        </code>
      </pre>
    );
  }

  const normalizedLang = language.toLowerCase();
  const html = highlighter.codeToHtml(code, {
    lang: normalizedLang,
    theme: theme === 'light' ? 'github-light' : 'dark-plus',
  });

  // Add line numbers and preserve whitespace
  const codeWithLineNumbers = code.split('\n').map((line, i) => 
    `<span class="line-number">${i + 1}</span>${line}`
  ).join('\n');

  return (
    <div className="relative">
      <style jsx global>{`
        pre {
          background: ${theme === 'light' ? '#ffffff' : '#1e1e1e'} !important;
          padding: 1rem !important;
          border-radius: 0.5rem !important;
          border: 1px solid ${theme === 'light' ? '#e5e7eb' : '#2d2d2d'} !important;
        }
        .line-number {
          display: inline-block;
          width: 2em;
          color: ${theme === 'light' ? '#a1a1aa' : '#6e7681'};
          text-align: right;
          margin-right: 1em;
          padding-right: 0.5em;
          border-right: 1px solid ${theme === 'light' ? '#e5e7eb' : '#2d2d2d'};
          user-select: none;
        }
        code {
          counter-reset: line;
          padding: 0 !important;
        }
        code > div {
          padding: 0 !important;
        }
      `}</style>
      <div
        className="overflow-x-auto rounded-lg"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onCopy}
              className="absolute right-4 top-4 rounded-md p-2 hover:bg-muted"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span className="sr-only">Copy code</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{copied ? "Copied!" : "Copy code"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
