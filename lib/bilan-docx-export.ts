import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

const COLORS = {
  ink: "1A1A1A",
  primary: "0D4EA6",
  muted: "6B7280",
  border: "D1D5DB",
  headerShade: "F1F5F9",
};

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const CELL_BORDER = { style: BorderStyle.SINGLE, size: 4, color: COLORS.border };

type RunStyle = {
  bold?: boolean;
  italics?: boolean;
  underline?: Record<string, never>;
  strike?: boolean;
};

function collectRuns(node: Element, style: RunStyle): TextRun[] {
  const runs: TextRun[] = [];
  node.childNodes.forEach((child) => {
    if (child.nodeType === 3) {
      const text = child.textContent ?? "";
      if (text) runs.push(new TextRun({ text, ...style }));
      return;
    }
    if (child.nodeType !== 1) return;
    const el = child as Element;
    const tag = el.tagName.toLowerCase();
    if (tag === "br") {
      runs.push(new TextRun({ text: "", break: 1 }));
      return;
    }
    const nextStyle: RunStyle = { ...style };
    if (tag === "strong" || tag === "b") nextStyle.bold = true;
    if (tag === "em" || tag === "i") nextStyle.italics = true;
    if (tag === "u") nextStyle.underline = {};
    if (tag === "s" || tag === "strike" || tag === "del") nextStyle.strike = true;
    runs.push(...collectRuns(el, nextStyle));
  });
  return runs;
}

function paragraphOf(el: Element, baseStyle: RunStyle = {}): Paragraph {
  const runs = collectRuns(el, baseStyle);
  return new Paragraph({
    children: runs.length ? runs : [new TextRun({ text: "", ...baseStyle })],
    spacing: { after: 120 },
  });
}

function headingOf(el: Element, level: 1 | 2 | 3 | 4): Paragraph {
  const runs = collectRuns(el, { bold: true });
  const HEADING_LEVEL = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
    4: HeadingLevel.HEADING_4,
  } as const;
  return new Paragraph({
    heading: HEADING_LEVEL[level],
    spacing: { before: 200, after: 120 },
    children: runs.length ? runs : [new TextRun({ text: "", bold: true })],
  });
}

function listParagraphs(
  el: Element,
  ordered: boolean,
  baseStyle: RunStyle = {},
): Paragraph[] {
  return Array.from(el.children)
    .filter((li) => li.tagName.toLowerCase() === "li")
    .map((li, index) => {
      const runs = collectRuns(li, baseStyle);
      return new Paragraph({
        indent: { left: 360, hanging: 260 },
        spacing: { after: 80 },
        children: [
          new TextRun({ text: ordered ? `${index + 1}. ` : "•  ", ...baseStyle }),
          ...runs,
        ],
      });
    });
}

function cellContentBlocks(el: Element, baseStyle: RunStyle = {}): (Paragraph | Table)[] {
  const blocks = Array.from(el.children).flatMap((child) =>
    elementToBlocks(child, baseStyle),
  );
  return blocks.length
    ? blocks
    : [new Paragraph({ children: [new TextRun({ text: "", ...baseStyle })] })];
}

function tableCellOf(
  el: Element,
  widthPercent: number,
  isHeader: boolean,
): TableCell {
  const colSpan = Number(el.getAttribute("colspan") ?? "1") || 1;
  const rowSpan = Number(el.getAttribute("rowspan") ?? "1") || 1;
  const blocks = cellContentBlocks(el, isHeader ? { bold: true } : {});
  return new TableCell({
    width: { size: widthPercent * colSpan, type: WidthType.PERCENTAGE },
    columnSpan: colSpan > 1 ? colSpan : undefined,
    rowSpan: rowSpan > 1 ? rowSpan : undefined,
    shading: isHeader ? { fill: COLORS.headerShade } : undefined,
    margins: { top: 100, bottom: 100, left: 140, right: 140 },
    borders: {
      top: CELL_BORDER,
      bottom: CELL_BORDER,
      left: CELL_BORDER,
      right: CELL_BORDER,
    },
    children: blocks,
  });
}

function tableBlock(el: Element): Table | null {
  const head = el.querySelector(":scope > thead");
  const body = el.querySelector(":scope > tbody");
  const rowEls = [
    ...(head ? Array.from(head.children) : []),
    ...(body ? Array.from(body.children) : []),
    ...(!head && !body
      ? Array.from(el.children).filter((c) => c.tagName.toLowerCase() === "tr")
      : []),
  ].filter((r) => r.tagName.toLowerCase() === "tr");
  if (rowEls.length === 0) return null;

  const columnCount = Math.max(
    ...rowEls.map((row) =>
      Array.from(row.children).reduce(
        (sum, cell) => sum + (Number(cell.getAttribute("colspan") ?? "1") || 1),
        0,
      ),
    ),
  );
  const widthPercent = 100 / columnCount;

  const rows = rowEls.map((row) => {
    const cells = Array.from(row.children).filter((c) =>
      ["td", "th"].includes(c.tagName.toLowerCase()),
    );
    const isHeaderRow =
      row.parentElement?.tagName.toLowerCase() === "thead" ||
      cells.every((c) => c.tagName.toLowerCase() === "th");
    return new TableRow({
      tableHeader: isHeaderRow,
      children: cells.map((cell) =>
        tableCellOf(cell, widthPercent, isHeaderRow),
      ),
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });
}

function elementToBlocks(el: Element, baseStyle: RunStyle = {}): (Paragraph | Table)[] {
  const tag = el.tagName.toLowerCase();
  if (tag === "table") {
    const table = tableBlock(el);
    return table ? [table] : [];
  }
  if (tag === "ul") return listParagraphs(el, false, baseStyle);
  if (tag === "ol") return listParagraphs(el, true, baseStyle);
  if (tag === "blockquote") {
    return [
      new Paragraph({
        border: {
          left: { style: BorderStyle.SINGLE, color: COLORS.primary, size: 18, space: 8 },
        },
        indent: { left: 40 },
        spacing: { before: 80, after: 120 },
        children: collectRuns(el, { ...baseStyle, italics: true }),
      }),
    ];
  }
  if (/^h[1-6]$/.test(tag)) {
    const level = Number(tag[1]);
    const heading: 1 | 2 | 3 | 4 = level <= 4 ? (level as 1 | 2 | 3 | 4) : 4;
    return [headingOf(el, heading)];
  }
  return [paragraphOf(el, baseStyle)];
}

function htmlToBlocks(html: string | null | undefined): (Paragraph | Table)[] {
  if (!html) return [];
  const parsed = new DOMParser().parseFromString(html, "text/html");
  return Array.from(parsed.body.children).flatMap((el) => elementToBlocks(el));
}

function sectionHeading(text: string, level: 2 | 3): Paragraph {
  return new Paragraph({
    heading: level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
    border:
      level === 2
        ? { bottom: { style: BorderStyle.SINGLE, color: COLORS.primary, size: 6, space: 4 } }
        : undefined,
    spacing: { before: 320, after: 160 },
    children: [
      new TextRun({
        text,
        bold: true,
        color: level === 2 ? COLORS.primary : COLORS.ink,
      }),
    ],
  });
}

function statsTable(stats: { label: string; value: string }[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: NO_BORDER,
      bottom: NO_BORDER,
      left: NO_BORDER,
      right: NO_BORDER,
      insideHorizontal: NO_BORDER,
      insideVertical: NO_BORDER,
    },
    rows: [
      new TableRow({
        children: stats.map(
          (stat) =>
            new TableCell({
              width: { size: 100 / stats.length, type: WidthType.PERCENTAGE },
              shading: { fill: COLORS.headerShade },
              margins: { top: 140, bottom: 140, left: 160, right: 160 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: stat.value, bold: true, size: 30, color: COLORS.primary })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: stat.label, size: 16, color: COLORS.muted })],
                }),
              ],
            }),
        ),
      }),
    ],
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportBilanToDocx(input: {
  title: string;
  stats: { label: string; value: string }[];
  sections: { title: string; heading?: string; html: string }[];
}): Promise<Blob> {
  const { title, stats, sections } = input;

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: "Duché de Bicolline",
          allCaps: true,
          characterSpacing: 30,
          color: COLORS.muted,
          size: 16,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 260 },
      children: [new TextRun({ text: title, bold: true, size: 48, color: COLORS.ink })],
    }),
    statsTable(stats),
    new Paragraph({ spacing: { after: 200 }, children: [] }),
  ];

  sections.forEach((section) => {
    if (section.heading) children.push(sectionHeading(section.heading, 2));
    children.push(sectionHeading(section.title, 3));
    const blocks = htmlToBlocks(section.html);
    children.push(
      ...(blocks.length
        ? blocks
        : [
            new Paragraph({
              children: [new TextRun({ text: "—", color: COLORS.muted })],
            }),
          ]),
    );
  });

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Aptos", size: 22, color: COLORS.ink },
        },
      },
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 900, bottom: 900, left: 900, right: 900 } },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}
