// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import { randomUUID } from "crypto";
var MemStorage = class {
  users;
  frmRepairs;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.frmRepairs = /* @__PURE__ */ new Map();
  }
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(insertUser) {
    const id = randomUUID();
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  async getFrmRepair(id) {
    return this.frmRepairs.get(id);
  }
  async createFrmRepair(insertRepair) {
    const id = randomUUID();
    const repair = {
      ...insertRepair,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.frmRepairs.set(id, repair);
    return repair;
  }
  async updateFrmRepair(id, updates) {
    const existing = this.frmRepairs.get(id);
    if (!existing) return void 0;
    const updated = { ...existing, ...updates };
    this.frmRepairs.set(id, updated);
    return updated;
  }
  async getFrmRepairsByStatus(status) {
    return Array.from(this.frmRepairs.values()).filter(
      (repair) => repair.repairStatus === status
    );
  }
};
var storage = new MemStorage();

// server/routes.ts
import multer from "multer";
var upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 64 * 1024
    // 64KB max
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = [".bin", ".hex", ".eep"];
    const hasValidExtension = allowedExtensions.some(
      (ext) => file.originalname.toLowerCase().endsWith(ext)
    );
    if (hasValidExtension) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only .bin, .hex, and .eep files are allowed."));
    }
  }
});
async function registerRoutes(app2) {
  app2.post("/api/frm/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const fileBuffer = req.file.buffer;
      if (fileBuffer.length !== 32768) {
        return res.status(400).json({
          error: `Invalid file size. Expected 32KB D-Flash dump, got ${fileBuffer.length} bytes`
        });
      }
      const repairData = {
        filename: req.file.originalname,
        fileSize: fileBuffer.length,
        frmType: "Unknown",
        // Will be determined during analysis
        repairStatus: "analyzing",
        originalData: fileBuffer,
        repairedData: null,
        analysisData: null,
        vin: null,
        mileage: null
      };
      const repair = await storage.createFrmRepair(repairData);
      const analysis = await analyzeDFlash(fileBuffer);
      const updatedRepair = await storage.updateFrmRepair(repair.id, {
        frmType: analysis.vehicleData.frmType,
        vin: analysis.vehicleData.vin || null,
        mileage: analysis.vehicleData.mileage || null,
        analysisData: JSON.stringify(analysis),
        repairStatus: analysis.corruptionLevel > 95 ? "failed" : "analyzed"
      });
      res.json({
        repairId: repair.id,
        analysis
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: error.message || "Failed to process file" });
    }
  });
  app2.post("/api/frm/:id/convert", async (req, res) => {
    try {
      const { id } = req.params;
      const repair = await storage.getFrmRepair(id);
      if (!repair) {
        return res.status(404).json({ error: "Repair not found" });
      }
      if (!repair.originalData) {
        return res.status(400).json({ error: "No original data available for conversion" });
      }
      const conversionResult = await convertDFlashToEEPROM(Buffer.from(repair.originalData));
      if (!conversionResult.success) {
        await storage.updateFrmRepair(id, { repairStatus: "failed" });
        return res.status(400).json({ error: conversionResult.error });
      }
      await storage.updateFrmRepair(id, {
        repairedData: conversionResult.eepromData,
        repairStatus: "completed"
      });
      res.json({
        success: true,
        message: "Conversion completed successfully",
        eepromSize: conversionResult.eepromData.length
      });
    } catch (error) {
      console.error("Conversion error:", error);
      res.status(500).json({ error: error.message || "Failed to convert file" });
    }
  });
  app2.get("/api/frm/:id/download", async (req, res) => {
    try {
      const { id } = req.params;
      const repair = await storage.getFrmRepair(id);
      if (!repair || !repair.repairedData) {
        return res.status(404).json({ error: "Repaired file not found" });
      }
      const filename = repair.filename.replace(/\.(bin|hex|eep)$/i, "_repaired.bin");
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", repair.repairedData.length);
      res.send(Buffer.from(repair.repairedData));
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ error: error.message || "Failed to download file" });
    }
  });
  app2.get("/api/frm/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const repair = await storage.getFrmRepair(id);
      if (!repair) {
        return res.status(404).json({ error: "Repair not found" });
      }
      res.json({
        id: repair.id,
        filename: repair.filename,
        fileSize: repair.fileSize,
        frmType: repair.frmType,
        vin: repair.vin,
        mileage: repair.mileage,
        repairStatus: repair.repairStatus,
        analysisData: repair.analysisData ? JSON.parse(repair.analysisData) : null,
        createdAt: repair.createdAt
      });
    } catch (error) {
      console.error("Status error:", error);
      res.status(500).json({ error: error.message || "Failed to get repair status" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}
async function analyzeDFlash(data) {
  try {
    const frmType = detectFrmType(data);
    const vehicleData = extractVehicleData(data, frmType);
    const corruptionAnalysis = analyzeCorruption(data);
    return {
      corruptionLevel: corruptionAnalysis.corruptionLevel,
      recoverableSectors: corruptionAnalysis.recoverableSectors,
      totalSectors: 32,
      // 32KB = 32 sectors of 1KB each
      vehicleData: {
        ...vehicleData,
        frmType
      },
      configurationData: extractConfigurationData(data)
    };
  } catch (error) {
    console.error("Analysis error:", error);
    throw new Error("Failed to analyze D-Flash data");
  }
}
async function convertDFlashToEEPROM(dflashData) {
  try {
    const eepromData = Buffer.alloc(4096);
    const vin = extractVin(dflashData);
    if (vin) {
      eepromData.write(vin, 16, "ascii");
    }
    const mileage = extractMileage(dflashData);
    if (mileage !== null) {
      eepromData.writeUInt32LE(mileage, 48);
    }
    const config = extractConfigurationFromDFlash(dflashData);
    if (config) {
      const configBuffer = Buffer.from(JSON.stringify(config));
      configBuffer.copy(eepromData, 256, 0, Math.min(configBuffer.length, 1024));
    }
    calculateEepromChecksums(eepromData);
    return {
      success: true,
      eepromData
    };
  } catch (error) {
    console.error("Conversion error:", error);
    return {
      success: false,
      error: error.message || "Failed to convert D-Flash to EEPROM"
    };
  }
}
function detectFrmType(data) {
  const signature1 = data.subarray(256, 272);
  const signature2 = data.subarray(512, 528);
  if (signature1.includes(Buffer.from("XEQ384", "ascii"))) {
    return "FRM3 XEQ384";
  } else if (signature1.includes(Buffer.from("XET512", "ascii"))) {
    return "FRM3 XET512";
  } else if (data.length === 32768) {
    return "FRM3 Unknown";
  } else {
    return "FRM2";
  }
}
function extractVehicleData(data, frmType) {
  return {
    vin: extractVin(data),
    model: extractModel(data),
    year: extractYear(data),
    mileage: extractMileage(data)
  };
}
function extractVin(data) {
  for (let offset = 4096; offset < 8192; offset += 16) {
    const potential = data.subarray(offset, offset + 17).toString("ascii");
    if (/^[A-HJ-NPR-Z0-9]{17}$/.test(potential)) {
      return potential;
    }
  }
  return null;
}
function extractModel(data) {
  const vin = extractVin(data);
  if (vin) {
    const wmi = vin.substring(0, 3);
    const vds = vin.substring(3, 8);
    if (wmi === "WBA") return "BMW 3 Series";
    if (wmi === "WBY") return "BMW X3";
    if (wmi === "5UX") return "BMW X3 US";
  }
  return null;
}
function extractYear(data) {
  const vin = extractVin(data);
  if (vin) {
    const yearChar = vin.charAt(9);
    const yearMap = {
      "1": 2001,
      "2": 2002,
      "3": 2003,
      "4": 2004,
      "5": 2005,
      "6": 2006,
      "7": 2007,
      "8": 2008,
      "9": 2009,
      "A": 2010,
      "B": 2011,
      "C": 2012,
      "D": 2013,
      "E": 2014,
      "F": 2015
    };
    return yearMap[yearChar] || null;
  }
  return null;
}
function extractMileage(data) {
  for (let offset = 8192; offset < 12288; offset += 4) {
    const value = data.readUInt32LE(offset);
    if (value > 0 && value < 1e6) {
      return value;
    }
  }
  return null;
}
function extractConfigurationData(data) {
  return {
    xenonHeadlights: (data[1280] & 1) !== 0,
    angelEyes: (data[1280] & 2) !== 0,
    autoWipers: (data[1281] & 1) !== 0,
    comfortAccess: (data[1281] & 2) !== 0,
    followMeHome: data[1282] || 0
  };
}
function extractConfigurationFromDFlash(data) {
  return extractConfigurationData(data);
}
function analyzeCorruption(data) {
  let corruptedBytes = 0;
  let recoverableSectors = 0;
  for (let sector = 0; sector < 32; sector++) {
    const start = sector * 1024;
    const end = start + 1024;
    const sectorData = data.subarray(start, end);
    const allFF = sectorData.every((byte) => byte === 255);
    const all00 = sectorData.every((byte) => byte === 0);
    if (allFF || all00) {
      corruptedBytes += 1024;
    } else {
      recoverableSectors++;
    }
  }
  const corruptionLevel = corruptedBytes / data.length * 100;
  return {
    corruptionLevel: Math.round(100 - corruptionLevel),
    // Invert to show recovery percentage
    recoverableSectors
  };
}
function calculateEepromChecksums(eepromData) {
  let checksum = 0;
  for (let i = 0; i < eepromData.length - 4; i++) {
    checksum += eepromData[i];
  }
  eepromData.writeUInt32LE(checksum & 4294967295, eepromData.length - 4);
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
