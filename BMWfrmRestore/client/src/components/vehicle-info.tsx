import { Card } from "@/components/ui/card";
import { Car, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VehicleInfoProps {
  vehicleData: {
    vin?: string;
    model?: string;
    year?: number;
    mileage?: number;
    frmType: string;
  };
  configurationData: Record<string, any>;
}

export default function VehicleInfo({ vehicleData, configurationData }: VehicleInfoProps) {
  const formatMileage = (mileage?: number) => {
    if (!mileage) return "Unknown";
    return `${mileage.toLocaleString()} miles`;
  };

  const getConfigStatus = (value: any) => {
    if (typeof value === 'boolean') {
      return value ? "Enabled" : "Disabled";
    }
    if (typeof value === 'number' && value > 0) {
      return `${value} seconds`;
    }
    return value?.toString() || "Unknown";
  };

  const getConfigStatusColor = (value: any) => {
    if (typeof value === 'boolean') {
      return value ? "text-green-600" : "text-gray-500";
    }
    return "text-green-600";
  };

  return (
    <div className="space-y-6">
      {/* Vehicle Information Card */}
      <Card className="p-6" data-testid="card-vehicle-info">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
          <Car className="text-blue-600 mr-3 w-5 h-5" />
          Vehicle Information
        </h3>
        
        <div className="space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <div className="text-sm text-gray-600 mb-1">VIN Number</div>
            <div className="font-mono text-slate-900" data-testid="text-vin">
              {vehicleData.vin || "Not detected"}
            </div>
          </div>
          
          <div className="border-b border-gray-100 pb-3">
            <div className="text-sm text-gray-600 mb-1">Model</div>
            <div className="font-medium text-slate-900" data-testid="text-model">
              {vehicleData.model || "BMW (Unknown model)"}
            </div>
          </div>
          
          <div className="border-b border-gray-100 pb-3">
            <div className="text-sm text-gray-600 mb-1">Year</div>
            <div className="font-medium text-slate-900" data-testid="text-year">
              {vehicleData.year || "Unknown"}
            </div>
          </div>
          
          <div className="border-b border-gray-100 pb-3">
            <div className="text-sm text-gray-600 mb-1">Mileage</div>
            <div className="font-medium text-slate-900" data-testid="text-mileage">
              {formatMileage(vehicleData.mileage)}
            </div>
          </div>
          
          <div className="pb-3">
            <div className="text-sm text-gray-600 mb-1">FRM Type</div>
            <div className="font-mono text-slate-900" data-testid="text-frm-type">
              {vehicleData.frmType}
            </div>
          </div>
        </div>
      </Card>

      {/* Configuration Data Card */}
      <Card className="p-6" data-testid="card-module-config">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
          <Settings className="text-blue-600 mr-3 w-5 h-5" />
          Module Configuration
        </h3>
        
        <div className="space-y-3">
          {Object.entries(configurationData).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100" data-testid={`config-${key.toLowerCase().replace(/\s+/g, '-')}`}>
              <span className="text-sm text-gray-600 capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <span className={`font-medium ${getConfigStatusColor(value)}`}>
                {getConfigStatus(value)}
              </span>
            </div>
          ))}
          
          {Object.keys(configurationData).length === 0 && (
            <div className="text-sm text-gray-500 py-4 text-center">
              No configuration data available
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
