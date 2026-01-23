import { useState, useCallback, useRef, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, Center } from "@react-three/drei";
import { Upload, FileUp, X, Box, RotateCcw, ZoomIn, Minus, Plus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { MATERIALS, QUALITY_PRESETS } from "@/lib/constants";
import * as THREE from "three";

interface UploadedModel {
  file: File;
  geometry: THREE.BufferGeometry | null;
  name: string;
  config: ModelConfig;
}

interface ModelConfig {
  material: string;
  quality: string;
  color: string;
  infill: number;
  quantity: number;
  notes: string;
}

const COLORS = [
  { name: "White", value: "#FFFFFF" },
  { name: "Black", value: "#1a1a1a" },
  { name: "Red", value: "#ef4444" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#22c55e" },
  { name: "Yellow", value: "#eab308" },
  { name: "Orange", value: "#f97316" },
  { name: "Purple", value: "#a855f7" },
];

const defaultConfig: ModelConfig = {
  material: "pla",
  quality: "normal",
  color: "#FFFFFF",
  infill: 20,
  quantity: 1,
  notes: "",
};

function ModelMesh({ geometry, color }: { geometry: THREE.BufferGeometry; color: string }) {
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
    </mesh>
  );
}

function ModelViewer({ geometry, color }: { geometry: THREE.BufferGeometry; color: string }) {
  return (
    <Canvas shadows camera={{ position: [0, 0, 5], fov: 50 }} className="rounded-xl">
      <Suspense fallback={null}>
        <Stage environment="city" intensity={0.5} adjustCamera={false}>
          <Center>
            <ModelMesh geometry={geometry} color={color} />
          </Center>
        </Stage>
        <OrbitControls 
          enableZoom={true} 
          enablePan={false} 
          autoRotate 
          autoRotateSpeed={2}
          minDistance={2}
          maxDistance={10}
        />
      </Suspense>
    </Canvas>
  );
}

export function ModelUploadSection() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedModels, setUploadedModels] = useState<UploadedModel[]>([]);
  const [activeModel, setActiveModel] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const parseSTL = useCallback((arrayBuffer: ArrayBuffer): THREE.BufferGeometry => {
    const geometry = new THREE.BufferGeometry();
    const data = new DataView(arrayBuffer);
    
    const isBinary = arrayBuffer.byteLength > 84;
    
    if (isBinary) {
      const triangles = data.getUint32(80, true);
      const vertices: number[] = [];
      const normals: number[] = [];
      
      let offset = 84;
      for (let i = 0; i < triangles; i++) {
        const nx = data.getFloat32(offset, true);
        const ny = data.getFloat32(offset + 4, true);
        const nz = data.getFloat32(offset + 8, true);
        offset += 12;
        
        for (let j = 0; j < 3; j++) {
          const x = data.getFloat32(offset, true);
          const y = data.getFloat32(offset + 4, true);
          const z = data.getFloat32(offset + 8, true);
          vertices.push(x, y, z);
          normals.push(nx, ny, nz);
          offset += 12;
        }
        offset += 2;
      }
      
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    }
    
    geometry.computeBoundingSphere();
    geometry.center();
    
    const boundingSphere = geometry.boundingSphere;
    if (boundingSphere) {
      const scale = 2 / boundingSphere.radius;
      geometry.scale(scale, scale, scale);
    }
    
    return geometry;
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.stl') && 
        !file.name.toLowerCase().endsWith('.obj') &&
        !file.name.toLowerCase().endsWith('.3mf')) {
      return;
    }

    setIsLoading(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const geometry = parseSTL(arrayBuffer);
      
      setUploadedModels(prev => [...prev, {
        file,
        geometry,
        name: file.name,
        config: { ...defaultConfig }
      }]);
      setActiveModel(uploadedModels.length);
    } catch (error) {
      console.error("Error parsing model:", error);
    } finally {
      setIsLoading(false);
    }
  }, [parseSTL, uploadedModels.length]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    files.forEach(handleFile);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(handleFile);
  }, [handleFile]);

  const removeModel = (index: number) => {
    setUploadedModels(prev => prev.filter((_, i) => i !== index));
    if (activeModel >= index && activeModel > 0) {
      setActiveModel(activeModel - 1);
    }
  };

  const updateModelConfig = (key: keyof ModelConfig, value: string | number) => {
    setUploadedModels(prev => prev.map((model, i) => 
      i === activeModel 
        ? { ...model, config: { ...model.config, [key]: value } }
        : model
    ));
  };

  const handleSubmitOrder = () => {
    if (user) {
      navigate("/checkout", { state: { models: uploadedModels } });
    } else {
      navigate("/register", { state: { models: uploadedModels } });
    }
  };

  const currentModel = uploadedModels[activeModel];

  return (
    <section className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8" id="upload">
      <div className="container mx-auto px-4 h-full">
        <div className="grid lg:grid-cols-2 gap-6 h-full">
          {/* Left Side - Drag & Drop + 3D Viewer */}
          <div className="flex flex-col gap-4">
            <div className="text-center lg:text-left">
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
                Upload Your <span className="text-gradient">3D Model</span>
              </h1>
              <p className="text-muted-foreground">
                Drag and drop your STL file to preview and configure your order
              </p>
            </div>

            <Card className="flex-1 overflow-hidden border-2 border-dashed border-border hover:border-primary/50 transition-colors">
              <CardContent className="p-0 h-full">
                {uploadedModels.length === 0 ? (
                  <div
                    className={`relative h-full min-h-[400px] flex flex-col items-center justify-center p-8 transition-all duration-300 ${
                      isDragging ? "bg-primary/10 border-primary" : "bg-secondary/30"
                    }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileInput}
                      accept=".stl,.obj,.3mf"
                      multiple
                      className="hidden"
                    />
                    
                    <div className={`w-20 h-20 rounded-2xl bg-primary-gradient flex items-center justify-center mb-4 transition-transform ${isDragging ? "scale-110" : ""}`}>
                      {isLoading ? (
                        <div className="w-8 h-8 border-4 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      ) : (
                        <Upload className="w-10 h-10 text-primary-foreground" />
                      )}
                    </div>
                    
                    <h3 className="font-display text-xl font-semibold mb-2">
                      {isDragging ? "Drop your model here" : "Drag & Drop Your 3D Model"}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Supports STL, OBJ, and 3MF files up to 100MB
                    </p>
                    
                    <Button 
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-primary-gradient shadow-glow"
                    >
                      <FileUp className="w-4 h-4 mr-2" />
                      Browse Files
                    </Button>
                  </div>
                ) : (
                  <div className="h-full min-h-[400px] flex flex-col">
                    {/* 3D Viewer */}
                    <div className="relative flex-1 bg-gradient-to-br from-slate-900 to-slate-800">
                      {currentModel?.geometry && (
                        <ModelViewer geometry={currentModel.geometry} color={currentModel.config.color} />
                      )}
                      
                      <div className="absolute bottom-3 left-3 flex gap-2">
                        <div className="glass-dark px-2 py-1 rounded text-white/70 text-xs flex items-center gap-1">
                          <RotateCcw className="w-3 h-3" /> Drag to rotate
                        </div>
                        <div className="glass-dark px-2 py-1 rounded text-white/70 text-xs flex items-center gap-1">
                          <ZoomIn className="w-3 h-3" /> Scroll to zoom
                        </div>
                      </div>
                    </div>

                    {/* Model List */}
                    <div className="p-3 border-t border-border bg-card">
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {uploadedModels.map((model, index) => (
                          <div
                            key={index}
                            className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                              activeModel === index 
                                ? "bg-primary/10 border border-primary/30" 
                                : "bg-secondary hover:bg-secondary/80"
                            }`}
                            onClick={() => setActiveModel(index)}
                          >
                            <Box className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium truncate max-w-[100px]">{model.name}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeModel(index);
                              }}
                              className="p-0.5 hover:bg-destructive/20 rounded text-muted-foreground hover:text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex-shrink-0 px-3 py-2 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          <span className="text-sm">Add</span>
                        </button>
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileInput}
                        accept=".stl,.obj,.3mf"
                        multiple
                        className="hidden"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Order Configuration */}
          <div className="flex flex-col gap-4">
            <Card className="flex-1">
              <CardHeader className="pb-4">
                <CardTitle className="font-display text-xl">
                  {uploadedModels.length > 0 ? `Configure: ${currentModel?.name}` : "Order Configuration"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {uploadedModels.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Box className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>Upload a 3D model to configure your order</p>
                  </div>
                ) : (
                  <>
                    {/* Material Selection */}
                    <div className="space-y-2">
                      <Label>Material</Label>
                      <Select
                        value={currentModel?.config.material}
                        onValueChange={(v) => updateModelConfig("material", v)}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select material" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {Object.entries(MATERIALS).map(([key, mat]) => (
                            <SelectItem key={key} value={key}>
                              {mat.name} (+{mat.surcharge}%)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Quality Selection */}
                    <div className="space-y-2">
                      <Label>Print Quality</Label>
                      <Select
                        value={currentModel?.config.quality}
                        onValueChange={(v) => updateModelConfig("quality", v)}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select quality" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {Object.entries(QUALITY_PRESETS).map(([key, preset]) => (
                            <SelectItem key={key} value={key}>
                              {preset.name} - LKR {preset.pricePerGram}/g
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Color Selection */}
                    <div className="space-y-2">
                      <Label>Color</Label>
                      <div className="flex flex-wrap gap-2">
                        {COLORS.map((color) => (
                          <button
                            key={color.value}
                            onClick={() => updateModelConfig("color", color.value)}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${
                              currentModel?.config.color === color.value
                                ? "border-primary scale-110 shadow-md"
                                : "border-border hover:border-primary/50"
                            }`}
                            style={{ backgroundColor: color.value }}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Infill Percentage */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>Infill Percentage</Label>
                        <span className="text-sm text-muted-foreground">{currentModel?.config.infill}%</span>
                      </div>
                      <Slider
                        value={[currentModel?.config.infill || 20]}
                        onValueChange={([v]) => updateModelConfig("infill", v)}
                        min={10}
                        max={100}
                        step={5}
                        className="py-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Light (10%)</span>
                        <span>Solid (100%)</span>
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateModelConfig("quantity", Math.max(1, (currentModel?.config.quantity || 1) - 1))}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-12 text-center font-semibold text-lg">
                          {currentModel?.config.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateModelConfig("quantity", (currentModel?.config.quantity || 1) + 1)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label>Special Instructions (Optional)</Label>
                      <Textarea
                        placeholder="Any special requirements or notes..."
                        value={currentModel?.config.notes}
                        onChange={(e) => updateModelConfig("notes", e.target.value)}
                        rows={3}
                        className="bg-background"
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Submit Button */}
            <Button
              size="lg"
              disabled={uploadedModels.length === 0}
              onClick={handleSubmitOrder}
              className="w-full bg-primary-gradient shadow-glow text-lg h-14"
            >
              {user ? "Submit Order" : "Register to Order"}
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
