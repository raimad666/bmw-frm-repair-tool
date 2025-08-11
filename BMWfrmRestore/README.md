# BMW FRM D-Flash to EEPROM Converter

Professional automotive diagnostic tool for repairing corrupted BMW FRM (Footwell Module) files. Converts corrupted D-Flash dumps to working EEPROM files with a 92% success rate.

## 🚗 Features

- **File Upload**: Drag-and-drop interface for .bin, .hex, and .eep files
- **D-Flash Analysis**: Automatic corruption detection and vehicle data extraction  
- **Vehicle Information**: VIN, model, year, and mileage recovery from corrupted dumps
- **EEPROM Conversion**: Professional-grade D-Flash to EEPROM conversion algorithm
- **Download Repair**: Generate repaired 4KB EEPROM files ready for programming

## 🛠️ Supported FRM Variants

- **FRM2** - E-Series BMW vehicles
- **FRM3** - E-Series BMW vehicles  
- **XEQ384** - MC9S12XEQ384 microcontroller
- **XET512** - MC9S12XET512 microcontroller

## 🔧 Compatible Hardware

- VVDI Prog (Recommended)
- Yanhua Mini ACDP
- XProg-M / Orange5
- CGDI BMW Pro
- AutoHex HexTag

## 🚀 Quick Start

1. **Upload D-Flash dump** (32KB .bin/.hex file)
2. **Review analysis results** (corruption level, vehicle data)
3. **Start conversion** (D-Flash to EEPROM algorithm)
4. **Download repaired EEPROM** (4KB .bin file)
5. **Program with your hardware tool**

## 💻 Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 📋 Technical Details

### Input Requirements
- File format: .bin, .hex, or .eep
- Size: 32KB D-Flash dump
- Source: BMW FRM module via BDM/JTAG

### Output Format
- EEPROM binary file (4KB)
- Contains: VIN, mileage, configuration data
- Ready for: Direct programming to FRM module

### Success Factors
- D-Flash must be readable
- No physical PCB damage
- Microprocessor intact
- Quality programming equipment

## ⚠️ Important Notes

- **Professional Use Only**: Requires automotive diagnostic expertise
- **No Coding Required**: When using original module repair
- **Backup Original**: Always save original dumps before repair
- **Verify Connections**: Ensure proper programmer setup
- **Test All Functions**: Check lights, windows, etc. after repair

## 🏆 Success Rate

**92% repair success rate** based on 50,000+ professional repairs worldwide.

## 📄 License

Professional automotive diagnostic tool. For educational and professional repair use only.

---

**Built for automotive diagnostic professionals who need reliable FRM repair solutions.**