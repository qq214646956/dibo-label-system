import { StickerLayout, StickerElement, StickerData, ImageFormat } from "../layout/schema";
import { generateQR } from "../qr/generator";
import { generateBarcode } from "../barcode/generator";
import type { PdfDoc } from "../pdf";

export interface DataUrlOptions {
    format?: ImageFormat;
    quality?: number;
    canvas?: HTMLCanvasElement;
    scale?: number;
}

export class StickerPrinter {

    // Helper to convert units to Pixels (Canvas) and Points (PDF)
    // We'll use 96 dpi for screen/canvas calculations
    private toPx(value: number, unit: string): number {
        switch (unit) {
            case "mm": return (value * 96) / 25.4;
            case "cm": return (value * 96) / 2.54;
            case "in": return value * 96;
            case "px": default: return value;
        }
    }

    // Parse variable content like "{{name}}"
    private generateRandom(min: number, max: number, decimals: number, step: number): string {
        const steps = Math.round((max - min) / step);
        const val = min + Math.round(Math.random() * steps) * step;
        return val.toFixed(decimals);
    }

    private parseContent(content: string, data: StickerData, separator?: string): string {
        let processed = content;
        if (separator) {
            processed = processed.replace(/\}\}\s*\{\{/g, `}}${separator}{{`);
        }
        // Handle {{_SEQ:start,step,digits}} or {{_SEQ}}
        processed = processed.replace(/\{\{_SEQ(?::(\d+),(\d+),(\d+))?\}\}/g, (_m, start, step, digits) => {
            const s = start !== undefined ? parseInt(start) : 1;
            const p = step !== undefined ? parseInt(step) : 1;
            const d = digits !== undefined ? parseInt(digits) : 3;
            const idx = Number((data as any)['_IDX'] ?? 0);
            return String(s + idx * p).padStart(d, '0');
        });
        // Handle {{_RANDOM:min,max,dec,step}} or {{_RANDOM}}
        processed = processed.replace(/\{\{_RANDOM(?::(-?[\d.]+),(-?[\d.]+),(\d+),(-?[\d.]+))?\}\}/g, (_m, m, x, d, s) => {
            const min = m !== undefined ? parseFloat(m) : 0;
            const max = x !== undefined ? parseFloat(x) : 100;
            const dec = d !== undefined ? parseInt(d) : 0;
            const step = s !== undefined ? parseFloat(s) : 1;
            return this.generateRandom(min, max, dec, step);
        });
        // Handle regular {{variable}}
        return processed.replace(/\{\{(.*?)\}\}/g, (_2, key) => {
            const trimmedKey = key.trim();
            return data[trimmedKey] !== undefined ? String(data[trimmedKey]) : "";
        });
    }

    // --- HTML Canvas Renderer (Preview & Image Export) ---

    public async renderToCanvas(
        layout: StickerLayout,
        data: StickerData,
        canvas: HTMLCanvasElement,
        scale: number = 1
    ): Promise<void> {
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context not available");
        const s = scale;

        const pad = Math.round(this.toPx(2, 'mm') * s); // 2mm padding so borders don't clip

        // Setup Canvas Size (× scale + padding)
        canvas.width = Math.round(this.toPx(layout.width, layout.unit) * s) + pad * 2;
        canvas.height = Math.round(this.toPx(layout.height, layout.unit) * s) + pad * 2;

        // Clear & Background
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (layout.backgroundColor) {
            ctx.fillStyle = layout.backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        if (layout.backgroundImage) {
            await this.drawImage(ctx, layout.backgroundImage, pad, pad, canvas.width - pad * 2, canvas.height - pad * 2);
        }

        // Render Elements
        for (const element of layout.elements) {
            const x = this.toPx(element.x, layout.unit) * s + pad;
            const y = this.toPx(element.y, layout.unit) * s + pad;
            const w = this.toPx(element.w, layout.unit) * s;
            const h = this.toPx(element.h, layout.unit) * s;

            const filledContent = this.parseContent(
                element.content,
                data,
                element.type === "qr" ? element.qrSeparator : undefined
              );

            if (element.type === "qr") {
                if (filledContent) {
                    const qrUrl = await generateQR(filledContent);
                    await this.drawImage(ctx, qrUrl, x, y, w, h);
                }
            } else if (element.type === "barcode") {
                if (filledContent) {
                    const barcodeUrl = await generateBarcode(filledContent, element.barcodeFormat || "CODE128");
                    await this.drawImage(ctx, barcodeUrl, x, y, w, h);
                }
            } else if (element.type === "image") {
                if (element.content) {
                    await this.drawImage(ctx, element.content, x, y, w, h);
                }
            } else if (element.type === "text") {
                this.drawText(ctx, element, filledContent, x, y, w, h, s);
            }
            // Border rendering
            const st = element.style || {};
            if (st.borderWidth && st.borderWidth > 0) {
                ctx.save();
                ctx.strokeStyle = st.borderColor || "#000000";
                ctx.lineWidth = st.borderWidth * s;
                if (st.borderStyle === "dashed") {
                    ctx.setLineDash([6 * s, 4 * s]);
                } else if (st.borderStyle === "dotted") {
                    ctx.setLineDash([2 * s, 3 * s]);
                }
                ctx.strokeRect(x, y, w, h);
                ctx.restore();
            }
        }
    }

    public async renderToDataURL(
        layout: StickerLayout,
        data: StickerData,
        options?: DataUrlOptions
    ): Promise<string> {
        const format = (options?.format || "png").toLowerCase() as ImageFormat;
        const mime = format === "jpg" ? "image/jpeg" : `image/${format}`;
        const canvas = options?.canvas || this.createCanvas();
        await this.renderToCanvas(layout, data, canvas, options?.scale || 1);
        return canvas.toDataURL(mime, options?.quality);
    }

    public async exportImages(
        layout: StickerLayout,
        dataList: StickerData[],
        options?: DataUrlOptions
    ): Promise<string[]> {
        const results: string[] = [];
        for (const data of dataList) {
            results.push(await this.renderToDataURL(layout, data, options));
        }
        return results;
    }

    private drawText(ctx: CanvasRenderingContext2D, el: StickerElement, text: string, x: number, y: number, w: number, h: number, scale: number = 1) {
        const style = el.style || {};
        const fontSize = (style.fontSize || 12) * scale;
        const fontFamily = style.fontFamily || "sans-serif";
        const fontWeight = style.fontWeight || "normal";

        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.fillStyle = style.color || "#000";
        ctx.textAlign = (style.textAlign as CanvasTextAlign) || "left";
        ctx.textBaseline = "top";

        const lines = text.split('\n');
        const lineHeight = fontSize * 1.3;
        const totalTextH = lines.length * lineHeight;

        // Vertical alignment offset for multi-line text
        const vAlign = style.verticalAlign || "top";
        let startY = y;
        if (vAlign === "middle") startY = y + (h - totalTextH) / 2;
        else if (vAlign === "bottom") startY = y + h - totalTextH;

        for (let li = 0; li < lines.length; li++) {
            let drawX = x;
            if (style.textAlign === "center") drawX = x + w / 2;
            if (style.textAlign === "right") drawX = x + w;

            ctx.fillText(lines[li], drawX, startY + li * lineHeight);
        }
    }

    private drawImage(ctx: CanvasRenderingContext2D, url: string, x: number, y: number, w: number, h: number): Promise<void> {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                ctx.drawImage(img, x, y, w, h);
                resolve();
            };
            img.onerror = () => resolve(); // Don't block if image fails
            img.src = url;
        });
    }

    private createCanvas(): HTMLCanvasElement {
        if (typeof document === "undefined") {
            throw new Error("Canvas creation requires a DOM environment. Pass a canvas explicitly when rendering server-side.");
        }
        return document.createElement("canvas");
    }

    // --- PDF Exporter ---

    public async exportToPDF(
        layout: StickerLayout,
        dataList: Record<string, any>[]
    ): Promise<PdfDoc> {
        try {
            const { exportToPDF } = await import("../pdf");
            return await exportToPDF(layout, dataList);
        } catch (err) {
            throw new Error("PDF export requires optional dependency 'jspdf'. Install it to use exportToPDF().");
        }
    }

    // --- ZPL Exporter ---

    public exportToZPL(
        layout: StickerLayout,
        dataList: Record<string, any>[]
    ): string[] {
        const dpi = 203; // Standard Zebra DPI
        const dpmm = 8;  // dots per mm

        // Helper to convert to dots
        const toDots = (val: number, unit: string) => {
            let mm = 0;
            switch (unit) {
                case "mm": mm = val; break;
                case "cm": mm = val * 10; break;
                case "in": mm = val * 25.4; break;
                case "px": mm = val * (25.4 / 96); break;
                default: mm = val;
            }
            return Math.round(mm * dpmm);
        };

        const results: string[] = [];

        for (const data of dataList) {
            let zpl = "^XA\n"; // Start Format

            // Label Length (optional but good practice)
            // ^LL<length in dots>
            const heightDots = toDots(layout.height, layout.unit);
            const widthDots = toDots(layout.width, layout.unit);
            zpl += `^PW${widthDots}\n`;
            zpl += `^LL${heightDots}\n`;

            for (const element of layout.elements) {
                const filledContent = this.parseContent(
                    element.content,
                    data,
                    element.type === "qr" ? element.qrSeparator : undefined
                  );
                const x = toDots(element.x, layout.unit);
                const y = toDots(element.y, layout.unit);

                zpl += `^FO${x},${y}`;

                if (element.type === "text") {
                    const style = element.style || {};
                    const fontSizePt = style.fontSize || 12;
                    const fontHeightDots = Math.round(fontSizePt * 2.8);

                    zpl += `^A0N,${fontHeightDots},${fontHeightDots}`;
                    zpl += `^FD${filledContent}^FS\n`;
                }
                else if (element.type === "image") {
                    // ZPL image embedding not supported — skip
                }
                else if (element.type === "barcode") {
                    const h = toDots(element.h, layout.unit);
                    zpl += `^BY2,2.0,${h}`;
                    zpl += `^BCN,,N,N,N,N`;
                    zpl += `^FD${filledContent}^FS\n`;
                }
                else if (element.type === "qr") {
                    // ^BQN,2,height
                    // ZPL QR codes are controlled by magnification factor mostly.
                    const w = toDots(element.w, layout.unit);
                    // Mag factor 1-10. Approximate based on width? 
                    // Let's assume a reasonable default magnification or calculate roughly.
                    // ^BQa,b,c,d,e
                    // ^BQN,2,height
                    let mag = 2;
                    if (w > 100) mag = 4;
                    if (w > 200) mag = 6;

                    zpl += `^BQN,2,${mag}`;
                    zpl += `^FDQA,${filledContent}^FS\n`;
                }
                // Images are very hard in pure ZPL text (need hex conversion), skipping for simple implementation
            }

            zpl += "^XZ"; // End Format
            results.push(zpl);
        }

        return results;
    }

}
