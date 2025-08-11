import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { insertFrmRepairSchema } from "@shared/schema";
import { frmConverter } from "../client/src/services/frm-converter";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 64 * 1024, // 64KB max
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.bin', '.hex', '.eep'];
    const hasValidExtension = allowedExtensions.some(ext => 
      file.originalname.toLowerCase().endsWith(ext)
    );
    
    if (hasValidExtension) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .bin, .hex, and .eep files are allowed.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Upload and analyze FRM D-Flash dump
  app.post("/api/frm/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const fileBuffer = req.file.buffer;
      
      // Validate file size (should be 32KB for D-Flash)
      if (fileBuffer.length !== 32768) {
        return res.status(400).json({ 
          error: `Invalid file size. Expected 32KB D-Flash dump, got ${fileBuffer.length} bytes` 
        });
      }

      // Create initial repair record
      const repairData = {
        filename: req.file.originalname,
        fileSize: fileBuffer.length,
        frmType: "Unknown", // Will be determined during analysis
        repairStatus: "analyzing" as const,
        originalData: fileBuffer,
        repairedData: null,
        analysisData: null,
        vin: null,
        mileage: null,
      };

      const repair = await storage.createFrmRepair(repairData);

      // Perform analysis
      const analysis = await analyzeDFlash(fileBuffer);
      
      // Update repair record with analysis results
      const updatedRepair = await storage.updateFrmRepair(repair.id, {
        frmType: analysis.vehicleData.frmType,
        vin: analysis.vehicleData.vin || null,
        mileage: analysis.vehicleData.mileage || null,
        analysisData: JSON.stringify(analysis),
        repairStatus: analysis.corruptionLevel > 95 ? "failed" : "analyzed",
      });

      res.json({
        repairId: repair.id,
        analysis,
      });

    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(500).json({ error: error.message || "Failed to process file" });
    }
  });

  // Convert D-Flash to EEPROM
  app.post("/api/frm/:id/convert", async (req, res) => {
    try {
      const { id } = req.params;
      const repair = await storage.getFrmRepair(id);
      
      if (!repair) {
        return res.status(404).json({ error: "Repair not found" });
      }

      if (!repair.originalData) {
        return res.status(400).json({ error: "No original data available for conversion" });
      }

      // Perform D-Flash to EEPROM conversion
      const conversionResult = await convertDFlashToEEPROM(Buffer.from(repair.originalData));
      
      if (!conversionResult.success) {
        await storage.updateFrmRepair(id, { repairStatus: "failed" });
        return res.status(400).json({ error: conversionResult.error });
      }

      // Update repair record with repaired data
      await storage.updateFrmRepair(id, {
        repairedData: conversionResult.eepromData,
        repairStatus: "completed",
      });

      res.json({
        success: true,
        message: "Conversion completed successfully",
        eepromSize: conversionResult.eepromData.length,
      });

    } catch (error: any) {
      console.error("Conversion error:", error);
      res.status(500).json({ error: error.message || "Failed to convert file" });
    }
  });

  // Download repaired EEPROM file
  app.get("/api/frm/:id/download", async (req, res) => {
    try {
      const { id } = req.params;
      const repair = await storage.getFrmRepair(id);
      
      if (!repair || !repair.repairedData) {
        return res.status(404).json({ error: "Repaired file not found" });
      }

      const filename = repair.filename.replace(/\.(bin|hex|eep)$/i, '_repaired.bin');
      
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', repair.repairedData.length);
      
      res.send(Buffer.from(repair.repairedData));

    } catch (error: any) {
      console.error("Download error:", error);
      res.status(500).json({ error: error.message || "Failed to download file" });
    }
  });

  // Get repair status
  app.get("/api/frm/:id", async (req, res) => {
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
        createdAt: repair.createdAt,
      });

    } catch (error: any) {
      console.error("Status error:", error);
      res.status(500).json({ error: error.message || "Failed to get repair status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// D-Flash analysis function
async function analyzeDFlash(data: Buffer): Promise<any> {
  try {
    // Check for FRM type based on data patterns
    const frmType = detectFrmType(data);
    
    // Extract vehicle data from D-Flash
    const vehicleData = extractVehicleData(data, frmType);
    
    // Calculate corruption level
    const corruptionAnalysis = analyzeCorruption(data);
    
    return {
      corruptionLevel: corruptionAnalysis.corruptionLevel,
      recoverableSectors: corruptionAnalysis.recoverableSectors,
      totalSectors: 32, // 32KB = 32 sectors of 1KB each
      vehicleData: {
        ...vehicleData,
        frmType,
      },
      configurationData: extractConfigurationData(data),
    };
  } catch (error) {
    console.error("Analysis error:", error);
    throw new Error("Failed to analyze D-Flash data");
  }
}

// D-Flash to EEPROM conversion function
async function convertDFlashToEEPROM(dflashData: Buffer): Promise<{success: boolean, eepromData?: Buffer, error?: string}> {
  try {
    // Initialize 4KB EEPROM buffer
    const eepromData = Buffer.alloc(4096);
    
    // Extract VIN from D-Flash
    const vin = extractVin(dflashData);
    if (vin) {
      // Write VIN to EEPROM at standard offset (0x10)
      eepromData.write(vin, 0x10, 'ascii');
    }
    
    // Extract mileage from D-Flash
    const mileage = extractMileage(dflashData);
    if (mileage !== null) {
      // Write mileage to EEPROM at standard offset (0x30)
      eepromData.writeUInt32LE(mileage, 0x30);
    }
    
    // Extract configuration data
    const config = extractConfigurationFromDFlash(dflashData);
    if (config) {
      // Write configuration to EEPROM starting at offset 0x100
      const configBuffer = Buffer.from(JSON.stringify(config));
      configBuffer.copy(eepromData, 0x100, 0, Math.min(configBuffer.length, 1024));
    }
    
    // Calculate and write checksums
    calculateEepromChecksums(eepromData);
    
    return {
      success: true,
      eepromData,
    };
  } catch (error: any) {
    console.error("Conversion error:", error);
    return {
      success: false,
      error: error.message || "Failed to convert D-Flash to EEPROM",
    };
  }
}

// Helper functions for FRM data processing
function detectFrmType(data: Buffer): string {
  // Look for specific patterns that identify FRM variants
  const signature1 = data.subarray(0x100, 0x110);
  const signature2 = data.subarray(0x200, 0x210);
  
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

function extractVehicleData(data: Buffer, frmType: string): any {
  return {
    vin: extractVin(data),
    model: extractModel(data),
    year: extractYear(data),
    mileage: extractMileage(data),
  };
}

function extractVin(data: Buffer): string | null {
  // VIN is typically stored at offset 0x1000-0x1010 in D-Flash
  for (let offset = 0x1000; offset < 0x2000; offset += 16) {
    const potential = data.subarray(offset, offset + 17).toString('ascii');
    if (/^[A-HJ-NPR-Z0-9]{17}$/.test(potential)) {
      return potential;
    }
  }
  return null;
}

function extractModel(data: Buffer): string | null {
  // Model info is usually near VIN data
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

function extractYear(data: Buffer): number | null {
  const vin = extractVin(data);
  if (vin) {
    const yearChar = vin.charAt(9);
    const yearMap: { [key: string]: number } = {
      '1': 2001, '2': 2002, '3': 2003, '4': 2004, '5': 2005,
      '6': 2006, '7': 2007, '8': 2008, '9': 2009, 'A': 2010,
      'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014, 'F': 2015,
    };
    return yearMap[yearChar] || null;
  }
  return null;
}

function extractMileage(data: Buffer): number | null {
  // Mileage is typically stored as a 32-bit value
  for (let offset = 0x2000; offset < 0x3000; offset += 4) {
    const value = data.readUInt32LE(offset);
    if (value > 0 && value < 1000000) { // Reasonable mileage range
      return value;
    }
  }
  return null;
}

function extractConfigurationData(data: Buffer): any {
  return {
    xenonHeadlights: (data[0x500] & 0x01) !== 0,
    angelEyes: (data[0x500] & 0x02) !== 0,
    autoWipers: (data[0x501] & 0x01) !== 0,
    comfortAccess: (data[0x501] & 0x02) !== 0,
    followMeHome: data[0x502] || 0,
  };
}

function extractConfigurationFromDFlash(data: Buffer): any {
  return extractConfigurationData(data);
}

function analyzeCorruption(data: Buffer): { corruptionLevel: number, recoverableSectors: number } {
  let corruptedBytes = 0;
  let recoverableSectors = 0;
  
  // Analyze in 1KB sectors
  for (let sector = 0; sector < 32; sector++) {
    const start = sector * 1024;
    const end = start + 1024;
    const sectorData = data.subarray(start, end);
    
    // Check for empty sectors (all 0xFF or 0x00)
    const allFF = sectorData.every(byte => byte === 0xFF);
    const all00 = sectorData.every(byte => byte === 0x00);
    
    if (allFF || all00) {
      corruptedBytes += 1024;
    } else {
      recoverableSectors++;
    }
  }
  
  const corruptionLevel = (corruptedBytes / data.length) * 100;
  
  return {
    corruptionLevel: Math.round(100 - corruptionLevel), // Invert to show recovery percentage
    recoverableSectors,
  };
}

function calculateEepromChecksums(eepromData: Buffer): void {
  // Calculate simple checksum for EEPROM integrity
  let checksum = 0;
  for (let i = 0; i < eepromData.length - 4; i++) {
    checksum += eepromData[i];
  }
  
  // Write checksum to last 4 bytes
  eepromData.writeUInt32LE(checksum & 0xFFFFFFFF, eepromData.length - 4);
}
