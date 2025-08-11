// BMW FRM D-Flash to EEPROM Conversion Service
// Based on automotive diagnostic algorithms for FRM repair

export interface ConversionResult {
  success: boolean;
  eepromData?: Uint8Array;
  error?: string;
  vehicleData?: {
    vin?: string;
    mileage?: number;
    model?: string;
  };
}

export class FrmConverter {
  private static readonly EEPROM_SIZE = 4096; // 4KB EEPROM
  private static readonly DFLASH_SIZE = 32768; // 32KB D-Flash
  
  // VIN extraction patterns for different FRM variants
  private static readonly VIN_PATTERNS = [
    { offset: 0x1000, length: 17 },
    { offset: 0x1500, length: 17 },
    { offset: 0x2000, length: 17 },
  ];

  // Mileage storage locations in D-Flash
  private static readonly MILEAGE_OFFSETS = [
    0x2100, 0x2200, 0x2300, 0x2400
  ];

  public static async convertDFlashToEEPROM(dflashData: Uint8Array): Promise<ConversionResult> {
    try {
      if (dflashData.length !== this.DFLASH_SIZE) {
        return {
          success: false,
          error: `Invalid D-Flash size. Expected ${this.DFLASH_SIZE} bytes, got ${dflashData.length} bytes`
        };
      }

      // Initialize EEPROM buffer
      const eepromData = new Uint8Array(this.EEPROM_SIZE);
      eepromData.fill(0xFF); // Initialize with 0xFF (typical EEPROM empty state)

      // Extract vehicle data from D-Flash
      const vehicleData = this.extractVehicleData(dflashData);
      
      // Build EEPROM structure
      this.writeEEPROMHeader(eepromData);
      this.writeVehicleData(eepromData, vehicleData);
      this.writeConfigurationData(eepromData, dflashData);
      this.calculateChecksums(eepromData);

      return {
        success: true,
        eepromData,
        vehicleData
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown conversion error'
      };
    }
  }

  private static extractVehicleData(dflashData: Uint8Array) {
    return {
      vin: this.extractVIN(dflashData),
      mileage: this.extractMileage(dflashData),
      model: this.extractModel(dflashData),
    };
  }

  private static extractVIN(dflashData: Uint8Array): string | undefined {
    for (const pattern of this.VIN_PATTERNS) {
      const vinBytes = dflashData.slice(pattern.offset, pattern.offset + pattern.length);
      const vin = new TextDecoder('ascii').decode(vinBytes);
      
      // Validate VIN format (17 alphanumeric characters, no I, O, Q)
      if (/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
        return vin;
      }
    }
    return undefined;
  }

  private static extractMileage(dflashData: Uint8Array): number | undefined {
    for (const offset of this.MILEAGE_OFFSETS) {
      if (offset + 4 <= dflashData.length) {
        // Try both little-endian and big-endian
        const mileageLE = new DataView(dflashData.buffer, offset, 4).getUint32(0, true);
        const mileageBE = new DataView(dflashData.buffer, offset, 4).getUint32(0, false);
        
        // Validate reasonable mileage range (0 to 1,000,000 miles)
        if (mileageLE > 0 && mileageLE < 1000000) {
          return mileageLE;
        }
        if (mileageBE > 0 && mileageBE < 1000000) {
          return mileageBE;
        }
      }
    }
    return undefined;
  }

  private static extractModel(dflashData: Uint8Array): string | undefined {
    // Model extraction based on VIN WMI (World Manufacturer Identifier)
    const vin = this.extractVIN(dflashData);
    if (!vin) return undefined;

    const wmi = vin.substring(0, 3);
    const modelMap: Record<string, string> = {
      'WBA': 'BMW 3 Series',
      'WBY': 'BMW X3',
      '5UX': 'BMW X3 (US)',
      'WBX': 'BMW X1',
      'WBS': 'BMW M Series',
      '4US': 'BMW (US Market)',
    };

    return modelMap[wmi] || 'BMW (Unknown Model)';
  }

  private static writeEEPROMHeader(eepromData: Uint8Array): void {
    // EEPROM header structure for BMW FRM
    const header = new Uint8Array([
      0xAA, 0x55, 0xFF, 0x00, // Magic bytes
      0x01, 0x00, 0x00, 0x00, // Version
      0x00, 0x10, 0x00, 0x00, // Data offset
      0x00, 0x00, 0x00, 0x00, // Reserved
    ]);
    
    eepromData.set(header, 0);
  }

  private static writeVehicleData(eepromData: Uint8Array, vehicleData: any): void {
    const dataView = new DataView(eepromData.buffer);
    
    // Write VIN at offset 0x10
    if (vehicleData.vin) {
      const vinBytes = new TextEncoder().encode(vehicleData.vin);
      eepromData.set(vinBytes, 0x10);
    }
    
    // Write mileage at offset 0x30 (32-bit little-endian)
    if (vehicleData.mileage) {
      dataView.setUint32(0x30, vehicleData.mileage, true);
    }
  }

  private static writeConfigurationData(eepromData: Uint8Array, dflashData: Uint8Array): void {
    // Extract and write configuration data from D-Flash
    const configOffset = 0x100; // Configuration starts at 0x100 in EEPROM
    
    // Common FRM configuration flags
    const configData = new Uint8Array([
      dflashData[0x500] || 0x00, // Light configuration 1
      dflashData[0x501] || 0x00, // Light configuration 2  
      dflashData[0x502] || 0x1E, // Follow-me-home timer (30 seconds default)
      dflashData[0x503] || 0x00, // Comfort access settings
      // Add more configuration bytes as needed
    ]);
    
    eepromData.set(configData, configOffset);
  }

  private static calculateChecksums(eepromData: Uint8Array): void {
    // Calculate primary checksum for first 4092 bytes
    let checksum = 0;
    for (let i = 0; i < this.EEPROM_SIZE - 4; i++) {
      checksum += eepromData[i];
      checksum = checksum & 0xFFFFFFFF; // Keep 32-bit
    }
    
    // Write checksum to last 4 bytes (little-endian)
    const dataView = new DataView(eepromData.buffer);
    dataView.setUint32(this.EEPROM_SIZE - 4, checksum, true);
  }

  public static detectFRMType(dflashData: Uint8Array): string {
    // Look for FRM type signatures in D-Flash
    const signatures = [
      { pattern: 'XEQ384', type: 'FRM3 XEQ384' },
      { pattern: 'XET512', type: 'FRM3 XET512' },
      { pattern: 'FRM2', type: 'FRM2' },
    ];
    
    const dataString = new TextDecoder('ascii', { fatal: false }).decode(dflashData);
    
    for (const sig of signatures) {
      if (dataString.includes(sig.pattern)) {
        return sig.type;
      }
    }
    
    return 'FRM3 Unknown';
  }

  public static analyzeDFlashCorruption(dflashData: Uint8Array): {
    corruptionLevel: number;
    recoverableSectors: number;
    totalSectors: number;
  } {
    const sectorSize = 1024; // 1KB sectors
    const totalSectors = Math.floor(dflashData.length / sectorSize);
    let recoverableSectors = 0;
    
    for (let sector = 0; sector < totalSectors; sector++) {
      const start = sector * sectorSize;
      const end = Math.min(start + sectorSize, dflashData.length);
      const sectorData = dflashData.slice(start, end);
      
      // Check if sector contains meaningful data (not all 0x00 or 0xFF)
      const allZeros = sectorData.every(byte => byte === 0x00);
      const allOnes = sectorData.every(byte => byte === 0xFF);
      
      if (!allZeros && !allOnes) {
        recoverableSectors++;
      }
    }
    
    const corruptionLevel = Math.round((recoverableSectors / totalSectors) * 100);
    
    return {
      corruptionLevel,
      recoverableSectors,
      totalSectors
    };
  }
}

export const frmConverter = FrmConverter;
