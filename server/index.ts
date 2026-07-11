import express from "express";
import multer from "multer";
import path from "node:path";
import next from "next";
import { parseCsv } from "./csv.js";
import { extractCrmRecords } from "./extractor.js";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 4000);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }
});

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/import", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "CSV file is required." });
      return;
    }
    if (!req.file.originalname.toLowerCase().endsWith(".csv")) {
      res.status(400).json({ error: "Please upload a valid CSV file." });
      return;
    }

    const rows = parseCsv(req.file.buffer);
    const result = await extractCrmRecords(rows);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Unable to import CSV." });
  }
});

async function start() {
  if (dev) {
    app.listen(port, () => console.log(`API ready on http://localhost:${port}`));
    return;
  }

  const nextApp = next({ dev: false, dir: path.resolve(".") });
  const handler = nextApp.getRequestHandler();
  await nextApp.prepare();
  app.all("*", (req, res) => handler(req, res));
  app.listen(port, () => console.log(`App ready on http://localhost:${port}`));
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
