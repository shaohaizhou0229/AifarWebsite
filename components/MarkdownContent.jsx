function isSafeHref(href = "") {
  return href.startsWith("/") || href.startsWith("#") || href.startsWith("https://") || href.startsWith("http://") || href.startsWith("mailto:");
}

function renderInline(text) {
  const parts = [];
  const pattern = /(!\[[^\]]*]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|~~[^~]+~~|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
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
    } else if (token.startsWith("~~")) {
      parts.push(<s key={parts.length}>{token.slice(2, -2)}</s>);
    } else if (token.startsWith("*")) {
      parts.push(<em key={parts.length}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("![")) {
      const image = /^!\[([^\]]*)]\(([^)]+)\)$/.exec(token);
      const src = image?.[2] || "";
      parts.push(
        <img className="markdown-inline-image" key={parts.length} src={isSafeHref(src) ? src : ""} alt={image?.[1] || ""} loading="lazy" />
      );
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

function normalizeHeadingText(value = "") {
  return String(value)
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/!\[([^\]]*)]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

function slugifyHeading(value = "") {
  return normalizeHeadingText(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function createHeadingId(content, headingCounts, fallbackIndex) {
  const base = slugifyHeading(content) || `section-${fallbackIndex + 1}`;
  const count = headingCounts.get(base) || 0;
  headingCounts.set(base, count + 1);
  return count ? `${base}-${count + 1}` : base;
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
  let table = null;
  const headingCounts = new Map();

  function flushList() {
    if (list?.items.length) blocks.push(list);
    list = null;
  }

  function flushTable() {
    if (table?.rows.length) blocks.push(table);
    table = null;
  }

  function isTableSeparator(value = "") {
    return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(value);
  }

  function parseTableRow(value) {
    return value
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((cell) => cell.trim());
  }

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    if (line.trim().startsWith("```")) {
      flushParagraph(blocks, paragraph);
      flushList();
      flushTable();
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
      flushTable();
      continue;
    }

    if (table) {
      if (line.includes("|")) {
        table.rows.push(parseTableRow(line));
        continue;
      }
      flushTable();
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph(blocks, paragraph);
      flushList();
      flushTable();
      blocks.push({
        type: "heading",
        level: heading[1].length,
        content: heading[2].trim(),
        id: createHeadingId(heading[2].trim(), headingCounts, blocks.length)
      });
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      flushParagraph(blocks, paragraph);
      flushList();
      flushTable();
      blocks.push({ type: "hr" });
      continue;
    }

    if (line.includes("|") && isTableSeparator(lines[lineIndex + 1])) {
      flushParagraph(blocks, paragraph);
      flushList();
      table = { type: "table", headers: parseTableRow(line), rows: [] };
      lineIndex += 1;
      continue;
    }

    if (isTableSeparator(line)) {
      continue;
    }

    const task = /^[-*]\s+\[( |x|X)\]\s+(.+)$/.exec(line);
    const unordered = /^[-*]\s+(.+)$/.exec(line);
    const ordered = /^\d+\.\s+(.+)$/.exec(line);
    if (task || unordered || ordered) {
      flushParagraph(blocks, paragraph);
      flushTable();
      const type = ordered ? "orderedList" : "unorderedList";
      if (!list || list.type !== type) {
        flushList();
        list = { type, items: [] };
      }
      list.items.push(task ? {
        content: task[2].trim(),
        checked: task[1].toLowerCase() === "x"
      } : {
        content: (unordered?.[1] || ordered?.[1] || "").trim()
      });
      continue;
    }

    const quote = /^>\s?(.+)$/.exec(line);
    if (quote) {
      flushParagraph(blocks, paragraph);
      flushList();
      flushTable();
      blocks.push({ type: "quote", content: quote[1].trim() });
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph(blocks, paragraph);
  flushList();
  flushTable();
  if (code) blocks.push({ type: "code", content: code.join("\n") });
  return blocks;
}

export function getMarkdownTableOfContents(content) {
  return parseMarkdown(content)
    .filter((block) => block.type === "heading" && (block.level === 2 || block.level === 3))
    .map((block) => ({
      id: block.id,
      level: block.level,
      title: normalizeHeadingText(block.content)
    }));
}

export function MarkdownContent({ content }) {
  const blocks = parseMarkdown(content);

  return (
    <article className="markdown-body">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const HeadingTag = `h${Math.min(Math.max(block.level, 2), 4)}`;
          return <HeadingTag id={block.id} key={index}>{renderInline(block.content)}</HeadingTag>;
        }
        if (block.type === "paragraph") {
          return <p key={index}>{renderInline(block.content)}</p>;
        }
        if (block.type === "unorderedList") {
          return <ul key={index}>{block.items.map((item, itemIndex) => (
            <li className={typeof item.checked === "boolean" ? "task-list-item" : ""} key={itemIndex}>
              {typeof item.checked === "boolean" ? <input checked={item.checked} readOnly type="checkbox" /> : null}
              <span>{renderInline(item.content)}</span>
            </li>
          ))}</ul>;
        }
        if (block.type === "orderedList") {
          return <ol key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item.content)}</li>)}</ol>;
        }
        if (block.type === "quote") {
          return <blockquote key={index}>{renderInline(block.content)}</blockquote>;
        }
        if (block.type === "code") {
          return <pre key={index}><code>{block.content}</code></pre>;
        }
        if (block.type === "table") {
          return (
            <div className="markdown-table-wrap" key={index}>
              <table>
                <thead>
                  <tr>{block.headers.map((header, cellIndex) => <th key={cellIndex}>{renderInline(header)}</th>)}</tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{renderInline(cell)}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return <hr key={index} />;
      })}
    </article>
  );
}
