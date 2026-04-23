import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  try {
    // Use DuckDuckGo HTML search
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }

    const html = await response.text();

    // Parse results from DuckDuckGo HTML
    const results: Array<{ title: string; url: string; snippet: string }> = [];

    // Match result blocks
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

    // Fallback: try simpler regex if no results
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

    return NextResponse.json({ results, query });
  } catch (error: any) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: error.message || "Search failed" },
      { status: 500 }
    );
  }
}
