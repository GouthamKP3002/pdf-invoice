import fetch from "node-fetch";

/**
 * Try pdf-parse locally (optional).
 * In production (Vercel), pdf-parse is unstable because of missing test files.
 */
async function extractWithPDFParse(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = await import("pdf-parse");
    const data = await pdfParse.default(buffer);
    return data.text;
  } catch (error) {
    console.warn("⚠️ pdf-parse failed or unavailable:", error);
    return "";
  }
}

/**
 * Extract text using PDF.js (stable in Node + Vercel).
 */
async function extractWithPDFJS(buffer: Buffer): Promise<string> {
  try {
    // ✅ Use the legacy build for Node.js
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.js");

    // Disable worker in Node.js
    if (pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = "";
    }

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      disableFontFace: true,
      isEvalSupported: false,
    });

    const pdf = await loadingTask.promise;
    let fullText = "";

    console.log(`📄 PDF has ${pdf.numPages} pages`);

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        const pageText = textContent.items
          .map((item: any) => ("str" in item ? item.str : ""))
          .join(" ");

        fullText += `Page ${pageNum}:\n${pageText}\n\n`;
        console.log(
          `📄 Extracted text from page ${pageNum}: ${pageText.length} characters`
        );
      } catch (pageError) {
        console.warn(
          `⚠️ Failed to extract text from page ${pageNum}:`,
          pageError
        );
      }
    }

    return fullText.trim();
  } catch (error) {
    console.error("❌ PDF.js extraction failed:", error);
    throw new Error(
      `PDF.js extraction failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Main function: fetch from URL and extract text.
 */
export async function extractTextFromPDF(fileUrl: string): Promise<string> {
  console.log(`📄 Fetching PDF from URL: ${fileUrl}`);

  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch PDF: ${response.status} ${response.statusText}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const dataBuffer = Buffer.from(arrayBuffer);

  console.log(`📄 Downloaded PDF buffer: ${dataBuffer.length} bytes`);

  // First try pdf-parse (local dev convenience)
  let extractedText = await extractWithPDFParse(dataBuffer);

  // If empty, fallback to PDF.js
  if (!extractedText || extractedText.trim().length === 0) {
    extractedText = await extractWithPDFJS(dataBuffer);
  }

  if (!extractedText || extractedText.trim().length === 0) {
    throw new Error("No text content found in PDF");
  }

  console.log(
    `📄 Successfully extracted ${extractedText.length} characters from PDF`
  );
  return extractedText;
}

/**
 * Variant: extract directly from buffer (no fetch).
 */
export async function extractTextFromPDFBuffer(buffer: Buffer): Promise<string> {
  console.log(`📄 Processing PDF buffer: ${buffer.length} bytes`);

  let extractedText = await extractWithPDFParse(buffer);

  if (!extractedText || extractedText.trim().length === 0) {
    extractedText = await extractWithPDFJS(buffer);
  }

  if (!extractedText || extractedText.trim().length === 0) {
    throw new Error("No text content found in PDF");
  }

  console.log(
    `📄 Successfully extracted ${extractedText.length} characters from PDF`
  );
  return extractedText;
}
