import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, Shield } from "lucide-react";
import FileUpload from "@/components/file-upload";
import AnalysisResults from "@/components/analysis-results";
import VehicleInfo from "@/components/vehicle-info";
import ConversionProcess from "@/components/conversion-process";
import type { FrmAnalysis } from "@shared/schema";

export default function FrmRepair() {
  const [repairId, setRepairId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<FrmAnalysis | null>(null);
  const [conversionStatus, setConversionStatus] = useState<'idle' | 'converting' | 'completed' | 'failed'>('idle');

  const handleFileUploaded = (id: string, analysisData: FrmAnalysis) => {
    setRepairId(id);
    setAnalysis(analysisData);
  };

  const handleConversionComplete = () => {
    setConversionStatus('completed');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200" data-testid="header-main">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <Car className="text-white text-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900" data-testid="title-main">BMW FRM Repair Tool</h1>
                <p className="text-sm text-gray-600">D-Flash to EEPROM Converter</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm font-medium text-slate-800">Professional Edition</div>
                <div className="text-xs text-gray-500">v2.1.4</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tool Overview */}
        <Card className="p-6 mb-8" data-testid="card-tool-overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Supported FRM Variants</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center" data-testid="variant-frm2">
                  <div className="font-mono font-semibold text-blue-600">FRM2</div>
                  <div className="text-xs text-gray-600 mt-1">E-Series</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center" data-testid="variant-frm3">
                  <div className="font-mono font-semibold text-blue-600">FRM3</div>
                  <div className="text-xs text-gray-600 mt-1">E-Series</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center" data-testid="variant-xeq384">
                  <div className="font-mono font-semibold text-blue-600">XEQ384</div>
                  <div className="text-xs text-gray-600 mt-1">MC9S12</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center" data-testid="variant-xet512">
                  <div className="font-mono font-semibold text-blue-600">XET512</div>
                  <div className="text-xs text-gray-600 mt-1">MC9S12</div>
                </div>
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Shield className="text-green-600 w-4 h-4" />
                </div>
                <h3 className="font-semibold text-green-800">Repair Success Rate</h3>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-2" data-testid="text-success-rate">92%</div>
              <p className="text-sm text-green-700">Based on 50,000+ successful repairs</p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="xl:col-span-2 space-y-6">
            <FileUpload onFileUploaded={handleFileUploaded} />
            
            {analysis && (
              <AnalysisResults 
                analysis={analysis} 
                repairId={repairId!}
                onConversionStatusChange={setConversionStatus}
              />
            )}
            
            {analysis && conversionStatus !== 'idle' && (
              <ConversionProcess 
                repairId={repairId!}
                analysis={analysis}
                status={conversionStatus}
                onComplete={handleConversionComplete}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {analysis && (
              <VehicleInfo 
                vehicleData={analysis.vehicleData}
                configurationData={analysis.configurationData}
              />
            )}

            {/* Programming Instructions */}
            <Card className="p-6" data-testid="card-programming-instructions">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Programming Instructions
              </h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                  <div>
                    <div className="font-medium text-slate-900">Download EEPROM file</div>
                    <div className="text-gray-600">Save the repaired 4KB EEPROM file</div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                  <div>
                    <div className="font-medium text-slate-900">Connect programmer</div>
                    <div className="text-gray-600">Use VVDI Prog, XProg, or Orange5</div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                  <div>
                    <div className="font-medium text-slate-900">Erase EEPROM partition</div>
                    <div className="text-gray-600">Clear corrupted data completely</div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</div>
                  <div>
                    <div className="font-medium text-slate-900">Write & verify</div>
                    <div className="text-gray-600">Program EEPROM and verify write</div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0l-5.898 6.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div className="text-xs text-yellow-800">
                    <strong>Note:</strong> No coding required after successful programming with original module repair.
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Footer Info */}
        <Card className="mt-8 p-6" data-testid="card-footer-info">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold text-slate-900 mb-3 flex items-center">
                <svg className="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Supported Hardware
              </h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div>• VVDI Prog (Recommended)</div>
                <div>• Yanhua Mini ACDP</div>
                <div>• XProg-M / Orange5</div>
                <div>• CGDI BMW Pro</div>
                <div>• AutoHex HexTag</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-slate-900 mb-3 flex items-center">
                <Shield className="w-4 h-4 text-blue-600 mr-2" />
                Success Factors
              </h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div>• D-Flash must be readable</div>
                <div>• No physical PCB damage</div>
                <div>• Microprocessor intact</div>
                <div>• Quality programming tool</div>
                <div>• Stable power supply</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-slate-900 mb-3 flex items-center">
                <svg className="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Important Notes
              </h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div>• Always backup original files</div>
                <div>• Verify programmer connections</div>
                <div>• Test all functions after repair</div>
                <div>• Clear fault codes with scanner</div>
                <div>• Professional use recommended</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
