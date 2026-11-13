import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/** Print palette used inside invoice / payslip documents (hex only: html2canvas can't parse oklch). */
export const DOC = {
  ink: '#1b1916',
  body: '#4a443c',
  muted: '#8a8174',
  line: '#e6e0d6',
  wash: '#f6f2ec',
  accent: '#a8692a',
};

/**
 * Render a DOM node to an A4 PDF and download it.
 * Tailwind v4 emits oklch() colours which html2canvas cannot read, so the clone is
 * flattened to hex before capture.
 */
export async function downloadElementAsPdf(element: HTMLElement, cloneId: string, fileName: string) {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    onclone: clonedDoc => {
      const cloned = clonedDoc.getElementById(cloneId);
      if (cloned) {
        cloned.style.width = '800px';
        cloned.style.padding = '48px';
        cloned.style.margin = '0';
        cloned.style.minHeight = '1131px'; // 800px wide × A4 ratio (297/210)
        cloned.style.boxShadow = 'none';
      }
      for (const tag of Array.from(clonedDoc.getElementsByTagName('style'))) {
        try {
          tag.innerHTML = tag.innerHTML.replace(/oklch\([^)]+\)/g, DOC.muted);
        } catch { /* ignore unreadable style tags */ }
      }
      for (const el of Array.from(clonedDoc.getElementsByTagName('*')) as HTMLElement[]) {
        if (!el.style) continue;
        const cs = window.getComputedStyle(el);
        if (cs.color.includes('oklch')) el.style.setProperty('color', DOC.ink, 'important');
        if (cs.backgroundColor.includes('oklch')) el.style.setProperty('background-color', '#ffffff', 'important');
        if (cs.borderColor.includes('oklch')) el.style.setProperty('border-color', DOC.line, 'important');
      }
    },
  });

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const imgH = (canvas.height * pageW) / canvas.width;
  // JPEG keeps a full-page A4 around a few hundred KB (PNG was ~10 MB).
  const img = canvas.toDataURL('image/jpeg', 0.92);
  // One A4 page per 297mm slice; long invoices continue onto extra pages.
  for (let offset = 0, page = 0; offset < imgH - 1; offset += pageH, page++) {
    if (page > 0) pdf.addPage();
    pdf.addImage(img, 'JPEG', 0, -offset, pageW, imgH, undefined, 'FAST');
  }

  const url = URL.createObjectURL(pdf.output('blob'));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
