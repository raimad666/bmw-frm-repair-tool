export class FileUtils {
  /**
   * Validates if uploaded file is a valid BMW FRM D-Flash dump
   */
  static validateFRMFile(file: File): { isValid: boolean; error?: string } {
    // Check file extension
    const validExtensions = ['.bin', '.hex', '.eep'];
    const hasValidExtension = validExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );
    
    if (!hasValidExtension) {
      return {
        isValid: false,
        error: 'Invalid file extension. Only .bin, .hex, and .eep files are supported.'
      };
    }
    
    // Check file size (32KB for D-Flash, allow some tolerance)
    if (file.size < 30000 || file.size > 64000) {
      return {
        isValid: false,
        error: `Invalid file size. Expected ~32KB D-Flash dump, got ${file.size} bytes.`
      };
    }
    
    return { isValid: true };
  }

  /**
   * Reads file as ArrayBuffer
   */
  static async readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result instanceof ArrayBuffer) {
          resolve(e.target.result);
        } else {
          reject(new Error('Failed to read file as ArrayBuffer'));
        }
      };
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Converts hex file content to binary data
   */
  static parseHexFile(hexContent: string): Uint8Array {
    const lines = hexContent.split('\n').filter(line => line.trim().startsWith(':'));
    const data: number[] = [];
    
    for (const line of lines) {
      if (line.length < 11) continue; // Minimum Intel HEX record length
      
      const byteCount = parseInt(line.substring(1, 3), 16);
      const recordType = parseInt(line.substring(7, 9), 16);
      
      // Only process data records (type 00)
      if (recordType === 0x00) {
        for (let i = 0; i < byteCount; i++) {
          const bytePos = 9 + (i * 2);
          if (bytePos + 1 < line.length) {
            const byte = parseInt(line.substring(bytePos, bytePos + 2), 16);
            data.push(byte);
          }
        }
      }
    }
    
    return new Uint8Array(data);
  }

  /**
   * Creates download link for binary data
   */
  static downloadBinaryFile(data: Uint8Array, filename: string): void {
    const blob = new Blob([data], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Formats file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Detects file format based on content
   */
  static detectFileFormat(data: Uint8Array): 'binary' | 'hex' | 'unknown' {
    // Check if it's a hex file (starts with ':' and contains hex characters)
    const textContent = new TextDecoder('ascii', { fatal: false }).decode(data.slice(0, 100));
    if (textContent.startsWith(':') && /^[:\r\n0-9A-Fa-f\s]+$/.test(textContent)) {
      return 'hex';
    }
    
    // Check if it's binary (contains non-printable characters)
    const printableChars = textContent.split('').filter(char => {
      const code = char.charCodeAt(0);
      return code >= 32 && code <= 126;
    });
    
    if (printableChars.length < textContent.length * 0.7) {
      return 'binary';
    }
    
    return 'unknown';
  }

  /**
   * Validates BMW VIN format
   */
  static validateVIN(vin: string): boolean {
    // BMW VIN validation: 17 characters, no I, O, Q
    return /^[A-HJ-NPR-Z0-9]{17}$/.test(vin);
  }

  /**
   * Extracts year from VIN
   */
  static getYearFromVIN(vin: string): number | null {
    if (!this.validateVIN(vin)) return null;
    
    const yearChar = vin.charAt(9);
    const yearMap: { [key: string]: number } = {
      '1': 2001, '2': 2002, '3': 2003, '4': 2004, '5': 2005,
      '6': 2006, '7': 2007, '8': 2008, '9': 2009, 'A': 2010,
      'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014, 'F': 2015,
      'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019, 'L': 2020,
      'M': 2021, 'N': 2022, 'P': 2023, 'R': 2024, 'S': 2025,
    };
    
    return yearMap[yearChar] || null;
  }
}
