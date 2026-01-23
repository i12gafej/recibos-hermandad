import JSZip from "jszip";
import { saveAs } from "file-saver";

export async function exportZip(
  files: { name: string; blob: Blob }[],
  zipName: string
) {
  const zip = new JSZip();
  files.forEach((file) => {
    zip.file(file.name, file.blob);
  });
  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, zipName);
}
