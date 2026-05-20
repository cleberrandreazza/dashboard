import PptxGenJS from "pptxgenjs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { DashboardSnapshot } from "@shared/types";

export interface SlideDefinition {
  type: string;
  title: string;
  content?: string;
}

export function buildSlidesFromDashboard(
  title: string,
  snapshot: DashboardSnapshot
): SlideDefinition[] {
  const slides: SlideDefinition[] = [
    { type: "cover", title, content: "Relatório executivo gerado automaticamente" },
    {
      type: "executive_summary",
      title: "Resumo Executivo",
      content: snapshot.insights
        .slice(0, 3)
        .map((i) => `• ${i.description}`)
        .join("\n"),
    },
  ];

  for (const kpi of snapshot.kpis.slice(0, 4)) {
    slides.push({
      type: "kpi",
      title: kpi.label,
      content: String(kpi.value),
    });
  }

  for (const insight of snapshot.insights) {
    slides.push({
      type: "insight",
      title: insight.title,
      content: insight.description,
    });
  }

  slides.push({
    type: "conclusion",
    title: "Conclusões",
    content:
      "Dados normalizados e analisados automaticamente. Revise insights e tendências para decisões estratégicas.",
  });

  return slides;
}

export async function generatePptxBlob(
  title: string,
  snapshot: DashboardSnapshot
): Promise<Blob> {
  const pptx = new PptxGenJS();
  pptx.author = "DataInsight SaaS";
  pptx.title = title;

  const slides = buildSlidesFromDashboard(title, snapshot);

  for (const slide of slides) {
    const s = pptx.addSlide();
    s.addText(slide.title, {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 1,
      fontSize: 28,
      bold: true,
      color: "1e3a5f",
    });
    if (slide.content) {
      s.addText(slide.content, {
        x: 0.5,
        y: 1.8,
        w: 9,
        h: 4,
        fontSize: 14,
        color: "334155",
      });
    }
  }

  const topCategory = snapshot.byCategory[0];
  if (topCategory) {
    const chartSlide = pptx.addSlide();
    chartSlide.addText("Distribuição por categoria", {
      x: 0.5,
      y: 0.4,
      w: 9,
      fontSize: 22,
      bold: true,
    });
    chartSlide.addChart(pptx.ChartType.bar, [
      {
        name: "Categorias",
        labels: snapshot.byCategory.map((c) => c.label),
        values: snapshot.byCategory.map((c) => c.value),
      },
    ], {
      x: 0.5,
      y: 1.2,
      w: 9,
      h: 4.5,
    });
  }

  const output = await pptx.write({ outputType: "blob" });
  return output as Blob;
}

export async function generatePdfBlob(
  title: string,
  snapshot: DashboardSnapshot
): Promise<Blob> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const slides = buildSlidesFromDashboard(title, snapshot);
  const pageWidth = 595;
  const pageHeight = 842;

  for (const slide of slides) {
    const page = pdf.addPage([pageWidth, pageHeight]);
    page.drawText(slide.title, {
      x: 50,
      y: pageHeight - 80,
      size: 22,
      font: fontBold,
      color: rgb(0.12, 0.23, 0.37),
    });
    if (slide.content) {
      const lines = slide.content.split("\n");
      let y = pageHeight - 130;
      for (const line of lines) {
        page.drawText(line.slice(0, 90), {
          x: 50,
          y,
          size: 11,
          font,
          color: rgb(0.2, 0.25, 0.33),
        });
        y -= 18;
        if (y < 80) break;
      }
    }
  }

  const bytes = await pdf.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
}
