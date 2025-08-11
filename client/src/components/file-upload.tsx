import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { FrmAnalysis } from "@shared/schema";

interface FileUploadProps {
  onFileUploaded: (repairId: string, analysis: FrmAnalysis) => void;
}

export default function FileUpload({ onFileUploaded }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiRequest('POST', '/api/frm/upload', formData);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "File uploaded successfully",
        description: "D-Flash analysis completed",
      });
      onFileUploaded(data.repairId, data.analysis);
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to process file",
        variant: "destructive",
      });
    },
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Validate file type
    const validExtensions = ['.bin', '.hex', '.eep'];
    const hasValidExtension = validExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );
    
    if (!hasValidExtension) {
      toast({
        title: "Invalid file type",
        description: "Only .bin, .hex, and .eep files are supported",
        variant: "destructive",
      });
      return;
    }
    
    // Validate file size (should be around 32KB)
    if (file.size > 64 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 64KB",
        variant: "destructive",
      });
      return;
    }
    
    setUploadedFile(file);
    uploadMutation.mutate(file);
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="p-6" data-testid="card-file-upload">
      <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center">
        <Upload className="text-blue-600 mr-3 w-5 h-5" />
        Upload Corrupted D-Flash Dump
      </h2>
      
      {/* File Upload Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          dragActive 
            ? "border-blue-600 bg-blue-50" 
            : uploadedFile && !uploadMutation.isPending
            ? "border-green-300 bg-green-50"
            : "border-gray-300 hover:border-blue-600"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        data-testid="zone-file-upload"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".bin,.hex,.eep"
          onChange={handleChange}
          className="hidden"
          data-testid="input-file-hidden"
        />
        
        <div className="mb-4">
          {uploadMutation.isPending ? (
            <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
          ) : uploadedFile ? (
            <CheckCircle className="w-10 h-10 text-green-600 mx-auto" />
          ) : (
            <Upload className="w-10 h-10 text-gray-400 mx-auto" />
          )}
        </div>
        
        <h3 className="text-lg font-medium text-slate-800 mb-2">
          {uploadMutation.isPending 
            ? "Processing file..." 
            : "Drop D-Flash file here or click to browse"
          }
        </h3>
        
        <p className="text-gray-600 mb-4">
          Supports .bin, .hex files (32KB expected)
        </p>
        
        {!uploadedFile && (
          <Button 
            type="button" 
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="button-browse-files"
          >
            Browse Files
          </Button>
        )}
        
        <div className="mt-4 text-xs text-gray-500">
          Maximum file size: 64KB • Accepted formats: .bin, .hex, .eep
        </div>
      </div>

      {/* File Info Panel */}
      {uploadedFile && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4" data-testid="panel-file-info">
          <h4 className="font-medium text-slate-800 mb-3 flex items-center">
            <FileText className="text-blue-600 mr-2 w-4 h-4" />
            File Information
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Filename:</span>
              <span className="font-mono ml-2" data-testid="text-filename">
                {uploadedFile.name}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Size:</span>
              <span className="font-mono ml-2" data-testid="text-file-size">
                {uploadedFile.size.toLocaleString()} bytes
              </span>
            </div>
            <div>
              <span className="text-gray-600">Format:</span>
              <span className="font-mono ml-2" data-testid="text-file-format">
                {uploadedFile.name.split('.').pop()?.toUpperCase()} (.{uploadedFile.name.split('.').pop()})
              </span>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <span className={`font-medium ml-2 ${
                uploadMutation.isError 
                  ? "text-red-600" 
                  : uploadMutation.isSuccess 
                  ? "text-green-600" 
                  : "text-blue-600"
              }`} data-testid="text-file-status">
                {uploadMutation.isError ? (
                  <>
                    <XCircle className="inline w-4 h-4 mr-1" />
                    Upload Failed
                  </>
                ) : uploadMutation.isSuccess ? (
                  <>
                    <CheckCircle className="inline w-4 h-4 mr-1" />
                    Valid D-Flash
                  </>
                ) : uploadMutation.isPending ? (
                  "Processing..."
                ) : (
                  "Ready to Upload"
                )}
              </span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
