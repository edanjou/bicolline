import jsPDF from "jspdf";
import { autoTable, type CellInput } from "jspdf-autotable";
import type { ActivityChapter } from "@/lib/activity-chapters";
import type { MarechalTask } from "@/lib/marechal-tasks";
import type { Marechal, MarechalActivityStatus } from "@/lib/marechaux";

const PAGE_MARGIN = 36;

export async function exportTasksGridToPdf(input: {
  activityName: string;
  chapters: ActivityChapter[];
  rows: Marechal[];
  statuses: MarechalActivityStatus[];
  tasks: MarechalTask[];
  firstCampaignTeamIndex: number;
  marechalDisplayName: (m: Marechal) => string;
}): Promise<Blob> {
  const {
    activityName,
    chapters,
    rows,
    statuses,
    tasks,
    firstCampaignTeamIndex,
    marechalDisplayName,
  } = input;

  const slotDefault = (
    slot: "briefing_7h45" | "homologation_8h9h" | "homologation_9h10h" | "briefing_17h",
  ): string =>
    slot === "briefing_7h45" || slot === "briefing_17h" ? "2e du garage" : "";

  const slotValue = (
    marechalId: string,
    slot: "briefing_7h45" | "homologation_8h9h" | "homologation_9h10h" | "briefing_17h",
  ): string =>
    statuses.find((s) => s.marechal_id === marechalId)?.[slot] ??
    slotDefault(slot);

  const cellValue = (marechalId: string, chapterId: string): string =>
    tasks
      .filter(
        (t) => t.assigned_marechal_id === marechalId && t.chapter_id === chapterId,
      )
      .map((t) => t.label)
      .join(", ");

  const head: CellInput[][] = [
    [
      "Maréchal",
      "Briefing\n2e du garage",
      "Homologation\n8h-9h",
      "Homologation\n9h-10h",
      ...chapters.map((c) =>
        [
          c.title,
          ...(c.start_time ? [c.start_time] : []),
          ...c.battlefields.map((b) => b.name),
        ].join("\n"),
      ),
      "Debriefing\n2e du garage",
    ],
  ];
  const columnCount = head[0].length;

  const body: CellInput[][] = [];
  rows.forEach((m, index) => {
    if (index === firstCampaignTeamIndex && firstCampaignTeamIndex > 0) {
      body.push([
        {
          content: "Équipe campagne",
          colSpan: columnCount,
          styles: { fillColor: "#f2f2f2", fontStyle: "bold" },
        },
      ]);
    }
    body.push([
      marechalDisplayName(m),
      slotValue(m.id, "briefing_7h45"),
      slotValue(m.id, "homologation_8h9h"),
      slotValue(m.id, "homologation_9h10h"),
      ...chapters.map((c) => cellValue(m.id, c.id)),
      slotValue(m.id, "briefing_17h"),
    ]);
  });

  const buildDoc = (fontSize: number, cellPadding: number): jsPDF => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "tabloid",
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`Tâches — ${activityName}`, PAGE_MARGIN, PAGE_MARGIN);

    autoTable(doc, {
      head,
      body,
      startY: PAGE_MARGIN + 16,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, bottom: PAGE_MARGIN },
      theme: "grid",
      styles: {
        fontSize,
        cellPadding,
        valign: "middle",
        lineWidth: 0.5,
        lineColor: "#999999",
      },
      headStyles: { fillColor: "#e5e5e5", textColor: "#000000", fontStyle: "bold" },
      alternateRowStyles: { fillColor: "#f2f6fb" },
      columnStyles: { 0: { fontStyle: "bold" } },
    });

    return doc;
  };

  // Réduit progressivement la police pour tenter de tout faire tenir sur
  // une seule page, sans descendre sous une taille lisible.
  let fontSize = 8;
  let cellPadding = 4;
  let doc = buildDoc(fontSize, cellPadding);
  while (doc.getNumberOfPages() > 1 && fontSize > 5) {
    fontSize -= 0.5;
    cellPadding = Math.max(1.5, cellPadding - 0.5);
    doc = buildDoc(fontSize, cellPadding);
  }

  return doc.output("blob");
}
