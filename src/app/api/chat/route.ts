import { NextRequest, NextResponse } from "next/server";
import { mistral } from "@/lib/mistral";

async function performSearch(query: string) {
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) return [];

    const html = await response.text();
    const results: Array<{ title: string; url: string; snippet: string }> = [];

    const resultBlocks = html.match(/<a rel="nofollow" class="result__a"[^>]*>.*?<\/a>.*?<a[^>]*class="result__snippet"[^>]*>.*?<\/a>/gs);

    if (resultBlocks) {
      for (const block of resultBlocks.slice(0, 5)) {
        const titleMatch = block.match(/<a rel="nofollow" class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/s);
        const snippetMatch = block.match(/<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/s);

        if (titleMatch && snippetMatch) {
          const title = titleMatch[2].replace(/<[^>]+>/g, "").trim();
          const url = titleMatch[1].trim();
          const snippet = snippetMatch[1].replace(/<[^>]+>/g, "").trim();
          results.push({
            title,
            url: url.startsWith("http") ? url : `https://duckduckgo.com${url}`,
            snippet,
          });
        }
      }
    }

    if (results.length === 0) {
      const links = html.matchAll(/<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gs);
      const snippets = html.matchAll(/<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/gs);
      const linkArr = Array.from(links).slice(0, 5);
      const snippetArr = Array.from(snippets).slice(0, 5);

      for (let i = 0; i < linkArr.length; i++) {
        const title = linkArr[i][2].replace(/<[^>]+>/g, "").trim();
        const url = linkArr[i][1].trim();
        const snippet = snippetArr[i]?.[1]?.replace(/<[^>]+>/g, "").trim() || "";
        results.push({
          title,
          url: url.startsWith("http") ? url : `https://duckduckgo.com${url}`,
          snippet,
        });
      }
    }

    return results;
  } catch (e) {
    console.error("Search error:", e);
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const tools = [
      {
        type: "function" as const,
        function: {
          name: "web_search",
          description:
            "Search the web for current information, news, facts, or anything that requires up-to-date knowledge. Use this when the user asks about recent events, current data, weather, sports results, stock prices, or anything time-sensitive.",
          parameters: {
            type: "object" as const,
            properties: {
              query: {
                type: "string",
                description: "The search query to look up",
              },
            },
            required: ["query"],
          },
        },
      },
    ];

    const response = await mistral.chat.complete({
      model: "mistral-small-2603",
      messages: [
        {
          role: "system",
          content: `You are a helpful, concise voice assistant. Keep responses brief and natural, as if speaking. Avoid long paragraphs. Use conversational language. Be warm and engaging.

Today's date is ${today}. You have access to web search for real-time information. When the user asks about recent events, current news, weather, sports, stock prices, or anything time-sensitive, use the web_search tool to get accurate, up-to-date information. Cite sources briefly.`,
        },
        ...messages,
      ],
      temperature: 0.7,
      maxTokens: 600,
      tools,
      toolChoice: "auto",
    });

    const choice = response.choices?.[0];
    const message = choice?.message;

    // Handle tool calls
    if (message?.toolCalls && message.toolCalls.length > 0) {
      const toolCall = message.toolCalls[0];
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments as string);

      if (functionName === "web_search") {
        const searchResults = await performSearch(args.query);

        const searchResultsText =
          searchResults
            .slice(0, 3)
            .map(
              (r: any, i: number) =>
                `[${i + 1}] ${r.title}: ${r.snippet} (${r.url})`
            )
            .join("\n") || "No results found.";

        const followUp = await mistral.chat.complete({
          model: "mistral-small-2603",
          messages: [
            {
              role: "system",
              content: `You are a helpful, concise voice assistant. Today's date is ${today}. Keep responses brief and natural, as if speaking.`,
            },
            ...messages,
            {
              role: "assistant",
              content: message.content || "",
              toolCalls: message.toolCalls,
            },
            {
              role: "tool",
              content: searchResultsText,
              toolCallId: toolCall.id,
              name: "web_search",
            },
          ],
          temperature: 0.7,
          maxTokens: 600,
        });

        const content =
          followUp.choices?.[0]?.message?.content ||
          "I found some information but couldn't summarize it.";
        return NextResponse.json({ content });
      }
    }

    const content = message?.content || "I didn't catch that.";

    return NextResponse.json({ content });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate response" },
      { status: 500 }
    );
  }
}
