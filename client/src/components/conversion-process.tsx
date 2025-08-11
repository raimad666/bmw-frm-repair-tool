import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Download, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { FrmAnalysis } from "@shared/schema";

interface ConversionProcessProps {
  repairId: string;
  analysis: FrmAnalysis;
  status: 'idle' | 'converting' | 'completed' | 'failed';
  onComplete: () => void;
}

interface ConversionStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  duration?: string;
}

export default function ConversionProcess({ repairId, analysis, status, onComplete }: ConversionProcessProps) {
  const [steps, setSteps] = useState<ConversionStep[]>([
    {
      id: 'validate',
      title: 'Validate D-Flash format',
      description: `${analysis.vehicleData.frmType} detected`,
      status: 'pending',
    },
    {
      id: 'extract',
      title: 'Extract vehicle data',
      description: 'VIN, mileage, and configuration recovered',
      status: 'pending',
    },
    {
      id: 'reconstruct',
      title: 'Reconstruct EEPROM',
      description: '4KB EEPROM structure rebuilt',
      status: 'pending',
    },
    {
      id: 'verify',
      title: 'Verify integrity',
      description: 'Checksums calculated and validated',
      status: 'pending',
    },
  ]);

  const { toast } = useToast();

  const downloadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/frm/${repairId}/download`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Download failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `frm_eeprom_repaired_${repairId.slice(-8)}.bin`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Download started",
        description: "EEPROM file downloaded successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Download failed",
        description: error.message || "Failed to download EEPROM file",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (status === 'converting') {
      // Simulate conversion steps
      const stepTimings = [500, 1300, 2100, 800]; // Duration for each step
      let totalTime = 0;
      
      steps.forEach((step, index) => {
        totalTime += stepTimings[index];
        
        setTimeout(() => {
          setSteps(prevSteps => 
            prevSteps.map((s, i) => 
              i === index 
                ? { ...s, status: 'processing' as const }
                : s
            )
          );
        }, totalTime - stepTimings[index]);
        
        setTimeout(() => {
          setSteps(prevSteps => 
            prevSteps.map((s, i) => 
              i === index 
                ? { 
                    ...s, 
                    status: 'completed' as const, 
                    duration: `${(stepTimings[index] / 1000).toFixed(1)}s`
                  }
                : s
            )
          );
          
          if (index === steps.length - 1) {
            setTimeout(onComplete, 100);
          }
        }, totalTime);
      });
    }
  }, [status, onComplete]);

  const getStepIcon = (stepStatus: ConversionStep['status']) => {
    switch (stepStatus) {
      case 'processing':
        return <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
      case 'completed':
        return <CheckCircle className="text-green-600 w-4 h-4" />;
      case 'failed':
        return <RotateCcw className="text-red-600 w-4 h-4" />;
      default:
        return <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />;
    }
  };

  const getStepBgColor = (stepStatus: ConversionStep['status']) => {
    switch (stepStatus) {
      case 'processing':
        return 'bg-blue-50 border-blue-200';
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStepTextColor = (stepStatus: ConversionStep['status']) => {
    switch (stepStatus) {
      case 'processing':
        return 'text-blue-800';
      case 'completed':
        return 'text-green-800';
      case 'failed':
        return 'text-red-800';
      default:
        return 'text-gray-800';
    }
  };

  const getStepDescColor = (stepStatus: ConversionStep['status']) => {
    switch (stepStatus) {
      case 'processing':
        return 'text-blue-600';
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Card className="p-6" data-testid="card-conversion-process">
      <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center">
        <RotateCcw className="text-blue-600 mr-3 w-5 h-5" />
        Conversion Process
      </h2>

      {/* Process Steps */}
      <div className="space-y-4 mb-6">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-center p-4 border rounded-lg ${getStepBgColor(step.status)}`}
            data-testid={`step-${step.id}`}
          >
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center mr-4 border">
              {getStepIcon(step.status)}
            </div>
            <div className="flex-1">
              <h4 className={`font-medium ${getStepTextColor(step.status)}`}>
                {step.title}
              </h4>
              <p className={`text-sm ${getStepDescColor(step.status)}`}>
                {step.description}
              </p>
            </div>
            {step.duration && (
              <div className={`text-xs font-mono ${getStepDescColor(step.status)}`}>
                {step.duration}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Download Section */}
      {status === 'completed' && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg" data-testid="section-download">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-800">Repaired EEPROM Ready</h4>
              <p className="text-sm text-gray-600">
                frm_eeprom_repaired_{repairId.slice(-8)}.bin (4,096 bytes)
              </p>
            </div>
            <Button
              onClick={() => downloadMutation.mutate()}
              disabled={downloadMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 flex items-center"
              data-testid="button-download-eeprom"
            >
              <Download className="mr-2 w-4 h-4" />
              {downloadMutation.isPending ? "Downloading..." : "Download"}
            </Button>
          </div>
        </div>
      )}

      {status === 'failed' && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <RotateCcw className="text-red-600 w-5 h-5" />
            <div className="text-sm text-red-800">
              <strong>Conversion Failed:</strong> Unable to convert D-Flash to EEPROM. 
              Please check file integrity and try again.
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
