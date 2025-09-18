declare module "pdf-parse/lib/pdf-parse.js" {
  import { Buffer } from "buffer";
  export default function (dataBuffer: Buffer): Promise<{ text: string }>;
}
