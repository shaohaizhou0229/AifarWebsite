function isSafeHref(href = "") {
  return href.startsWith("/") || href.startsWith("#") || href.startsWith("https://") || href.startsWith("http://") || href.startsWith("mailto:");
}

function renderInline(text) {
  const parts = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith("`")) {
      parts.push(<code key={parts.length}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("**")) {
      parts.push(<strong key={parts.length}>{token.slice(2, -2)}</strong>);
    } else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      const href = link?.[2] || "#";
      parts.push(
        <a key={parts.length} href={isSafeHref(href) ? href : "#"}>
          {link?.[1] || token}
        </a>
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function flushParagraph(blocks, paragraph) {
  const content = paragraph.join(" ").trim();
  if (content) {
    blocks.push({ type: "paragraph", content });
  }
  paragraph.length = 0;
}

function parseMarkdown(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  const blocks = [];
  const paragraph = [];
  let list = null;
  let code = null;

  function flushList() {
    if (list?.items.length) blocks.push(list);
    list = null;
  }

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      flushParagraph(blocks, paragraph);
      flushList();
      if (code) {
        blocks.push({ type: "code", content: code.join("\n") });
        code = null;
      } else {
        code = [];
      }
      continue;
    }

    if (code) {
      code.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph(blocks, paragraph);
      flushList();
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph(blocks, paragraph);
      flushList();
      blocks.push({ type: "heading", level: heading[1].length, content: heading[2].trim() });
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      flushParagraph(blocks, paragraph);
      flushList();
      blocks.push({ type: "hr" });
      continue;
    }

    const unordered = /^[-*]\s+(.+)$/.exec(line);
    const ordered = /^\d+\.\s+(.+)$/.exec(line);
    if (unordered || ordered) {
      flushParagraph(blocks, paragraph);
      const type = ordered ? "orderedList" : "unorderedList";
      if (!list || list.type !== type) {
        flushList();
        list = { type, items: [] };
      }
      list.items.push((unordered?.[1] || ordered?.[1] || "").trim());
      continue;
    }

    const quote = /^>\s?(.+)$/.exec(line);
    if (quote) {
      flushParagraph(blocks, paragraph);
      flushList();
      blocks.push({ type: "quote", content: quote[1].trim() });
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph(blocks, paragraph);
  flushList();
  if (code) blocks.push({ type: "code", content: code.join("\n") });
  return blocks;
}

export function MarkdownContent({ content }) {
  const blocks = parseMarkdown(content);

  return (
    <article className="markdown-body">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const HeadingTag = `h${Math.min(Math.max(block.level, 2), 4)}`;
          return <HeadingTag key={index}>{renderInline(block.content)}</HeadingTag>;
        }
        if (block.type === "paragraph") {
          return <p key={index}>{renderInline(block.content)}</p>;
        }
        if (block.type === "unorderedList") {
          return <ul key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>)}</ul>;
        }
        if (block.type === "orderedList") {
          return <ol key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>)}</ol>;
        }
        if (block.type === "quote") {
          return <blockquote key={index}>{renderInline(block.content)}</blockquote>;
        }
        if (block.type === "code") {
          return <pre key={index}><code>{block.content}</code></pre>;
        }
        return <hr key={index} />;
      })}
    </article>
  );
}
