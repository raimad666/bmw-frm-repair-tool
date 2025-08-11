import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Search, CheckCircle, XCircle, AlertTriangle, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { FrmAnalysis } from "@shared/schema";

interface AnalysisResultsProps {
  analysis: FrmAnalysis;
  repairId: string;
  onConversionStatusChange: (status: 'idle' | 'converting' | 'completed' | 'failed') => void;
}

export default function AnalysisResults({ analysis, repairId, onConversionStatusChange }: AnalysisResultsProps) {
  const { toast } = useToast();

  const convertMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/frm/${repairId}/convert`);
      return await response.json();
    },
    onMutate: () => {
      onConversionStatusChange('converting');
    },
    onSuccess: () => {
      toast({
        title: "Conversion completed",
        description: "EEPROM file is ready for download",
      });
      onConversionStatusChange('completed');
    },
    onError: (error: any) => {
      toast({
        title: "Conversion failed",
        description: error.message || "Failed to convert D-Flash to EEPROM",
        variant: "destructive",
      });
      onConversionStatusChange('failed');
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'corrupted': return 'red';
      case 'readable': return 'green';
      case 'partial': return 'orange';
      default: return 'blue';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'corrupted': return <XCircle className="text-red-600 w-5 h-5" />;
      case 'readable': return <CheckCircle className="text-green-600 w-5 h-5" />;
      case 'partial': return <AlertTriangle className="text-orange-600 w-5 h-5" />;
      default: return <Settings className="text-blue-600 w-5 h-5" />;
    }
  };

  const eepromStatus = analysis.corruptionLevel < 50 ? 'corrupted' : 'readable';
  const dflashStatus = analysis.recoverableSectors > 20 ? 'readable' : 'partial';
  const integrityStatus = analysis.corruptionLevel > 70 ? 'readable' : 'partial';

  return (
    <Card className="p-6" data-testid="card-analysis-results">
      <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center">
        <Search className="text-blue-600 mr-3 w-5 h-5" />
        Corruption Analysis
      </h2>

      {/* Analysis Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-800">Analysis Progress</span>
          <span className="text-sm text-gray-600" data-testid="text-analysis-progress">100%</span>
        </div>
        <Progress value={100} className="w-full" />
      </div>

      {/* Analysis Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className={`bg-red-50 border border-red-200 rounded-lg p-4`} data-testid="status-eeprom">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-red-800">EEPROM Status</h4>
            {getStatusIcon('corrupted')}
          </div>
          <p className="text-sm text-red-700">Corrupted - Cannot read vehicle data</p>
          <div className="mt-2 text-xs font-mono text-red-600">Error: 0x4A2F</div>
        </div>

        <div className={`bg-green-50 border border-green-200 rounded-lg p-4`} data-testid="status-dflash">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-green-800">D-Flash Status</h4>
            {getStatusIcon('readable')}
          </div>
          <p className="text-sm text-green-700">
            Readable - Configuration data found
          </p>
          <div className="mt-2 text-xs font-mono text-green-600">32KB Valid</div>
        </div>

        <div className={`bg-orange-50 border border-orange-200 rounded-lg p-4`} data-testid="status-integrity">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-orange-800">Data Integrity</h4>
            {getStatusIcon('partial')}
          </div>
          <p className="text-sm text-orange-700">
            {analysis.corruptionLevel}% recoverable sectors
          </p>
          <div className="mt-2 text-xs font-mono text-orange-600">
            {analysis.recoverableSectors}/{analysis.totalSectors} sectors
          </div>
        </div>

        <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4`} data-testid="status-recovery">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-blue-800">Recovery Method</h4>
            {getStatusIcon('method')}
          </div>
          <p className="text-sm text-blue-700">D-Flash to EEPROM conversion</p>
          <div className="mt-2 text-xs font-mono text-blue-600">Algorithm v2.1</div>
        </div>
      </div>

      {/* Convert Button */}
      {analysis.corruptionLevel > 50 && (
        <div className="flex justify-center">
          <Button
            onClick={() => convertMutation.mutate()}
            disabled={convertMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 px-8"
            data-testid="button-start-conversion"
          >
            {convertMutation.isPending ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Converting...
              </>
            ) : (
              "Start Conversion"
            )}
          </Button>
        </div>
      )}

      {analysis.corruptionLevel <= 50 && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <XCircle className="text-red-600 w-5 h-5" />
            <div className="text-sm text-red-800">
              <strong>Repair Not Possible:</strong> D-Flash corruption level too high ({analysis.corruptionLevel}% corrupted). 
              Physical repair or replacement required.
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
