"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AssessmentOption } from "@/lib/syllabus-state";

type FactCardProps =
  | { fact: "definition"; definition: string }
  | { fact: "unit"; unit: string }
  | { fact: "formula"; words: string; expression?: string };

function FactCard(props: FactCardProps) {
  const label = { definition: "Definition", unit: "Unit", formula: "Formula" }[props.fact];
  return (
    <Card size="sm" className="bg-muted/50">
      <CardHeader>
        <CardTitle className="text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        {props.fact === "definition" && <p>{props.definition}</p>}
        {props.fact === "unit" && <p>{props.unit}</p>}
        {props.fact === "formula" && (
          <p>
            {props.words}
            {props.expression ? ` (${props.expression})` : ""}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function ChatPanel() {
  const [input, setInput] = useState("");
  const [sessionId] = useState(() => crypto.randomUUID());
  const [answeredMcqIds, setAnsweredMcqIds] = useState<Set<string>>(new Set());
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { sessionId },
    }),
  });
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  const isBusy = status === "submitted" || status === "streaming";

  async function handleMcqClick(mcqId: string, optionId: string, optionLabel: string) {
    if (answeredMcqIds.has(mcqId) || isBusy) return;
    setAnsweredMcqIds((prev) => new Set(prev).add(mcqId));
    const res = await fetch("/api/mcq-answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, optionId }),
    });
    if (!res.ok) {
      setAnsweredMcqIds((prev) => {
        const next = new Set(prev);
        next.delete(mcqId);
        return next;
      });
      return;
    }
    sendMessage({ text: `I chose: ${optionLabel}` });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isBusy) return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  return (
    <Card className="flex h-[80vh] w-full max-w-2xl flex-col">
      <CardHeader>
        <CardTitle>Arya</CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full pr-4">
          <div
            role="log"
            aria-live="polite"
            aria-atomic="false"
            className="flex flex-col gap-4"
          >
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Send a message to start the conversation.
              </p>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-2 ${
                  message.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                <Avatar size="sm">
                  <AvatarFallback>
                    {message.role === "user" ? "U" : "AI"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-2 rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-wrap">
                  {message.parts.map((part, index) => {
                    if (part.type === "text") {
                      return <span key={index}>{part.text}</span>;
                    }

                    if (part.type === "tool-presentFact" && part.state === "output-available") {
                      const output = part.output as { error: string } | FactCardProps;
                      if ("error" in output) {
                        return (
                          <p key={index} className="text-sm italic text-muted-foreground">
                            {output.error}
                          </p>
                        );
                      }
                      return <FactCard key={index} {...output} />;
                    }

                    if (
                      part.type === "tool-getAssessmentProblem" &&
                      part.state === "output-available"
                    ) {
                      const output = part.output as
                        | { error: string }
                        | { problemText: string; options: AssessmentOption[] };
                      if ("error" in output) {
                        return (
                          <p key={index} className="text-sm italic text-muted-foreground">
                            {output.error}
                          </p>
                        );
                      }
                      const mcqId = part.toolCallId;
                      return (
                        <div key={index} className="flex flex-col gap-2">
                          <p className="font-medium">{output.problemText}</p>
                          {output.options.map((option) => (
                            <Button
                              key={option.id}
                              variant="outline"
                              disabled={answeredMcqIds.has(mcqId) || isBusy}
                              onClick={() => handleMcqClick(mcqId, option.id, option.label)}
                            >
                              {option.id}) {option.label}
                            </Button>
                          ))}
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              </div>
            ))}

            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="flex-col items-stretch gap-2">
        {error && (
          <p className="text-sm text-destructive" role="alert">
            Something went wrong. Please try again.
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <label htmlFor="chat-input" className="sr-only">
            Message
          </label>
          <Input
            id="chat-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask a physics question..."
            disabled={isBusy}
            autoComplete="off"
          />
          <Button type="submit" disabled={isBusy || !input.trim()}>
            Send
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
