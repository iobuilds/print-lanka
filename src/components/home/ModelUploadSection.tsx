import { useState, useCallback, useRef, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, Center } from "@react-three/drei";
import { Upload, FileUp, X, Box, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import * as THREE from "three";

interface UploadedModel {
  file: File;
  geometry: THREE.BufferGeometry | null;
  name: string;
}

function ModelMesh({ geometry }: { geometry: THREE.BufferGeometry }) {
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color="#0d9488" metalness={0.3} roughness={0.4} />
    </mesh>
  );
}

function ModelViewer({ geometry }: { geometry: THREE.BufferGeometry }) {
  return (
    <Canvas shadows camera={{ position: [0, 0, 5], fov: 50 }} className="rounded-xl">
      <Suspense fallback={null}>
        <Stage environment="city" intensity={0.5} adjustCamera={false}>
          <Center>
            <ModelMesh geometry={geometry} />
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
    
    // Check if binary STL
    const isBinary = arrayBuffer.byteLength > 84;
    
    if (isBinary) {
      const triangles = data.getUint32(80, true);
      const vertices: number[] = [];
      const normals: number[] = [];
      
      let offset = 84;
      for (let i = 0; i < triangles; i++) {
        // Normal
        const nx = data.getFloat32(offset, true);
        const ny = data.getFloat32(offset + 4, true);
        const nz = data.getFloat32(offset + 8, true);
        offset += 12;
        
        // Vertices
        for (let j = 0; j < 3; j++) {
          const x = data.getFloat32(offset, true);
          const y = data.getFloat32(offset + 4, true);
          const z = data.getFloat32(offset + 8, true);
          vertices.push(x, y, z);
          normals.push(nx, ny, nz);
          offset += 12;
        }
        offset += 2; // attribute byte count
      }
      
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    }
    
    geometry.computeBoundingSphere();
    geometry.center();
    
    // Scale to fit
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
        name: file.name
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

  const handleContinue = () => {
    if (user) {
      navigate("/upload", { state: { files: uploadedModels.map(m => m.file) } });
    } else {
      navigate("/register");
    }
  };

  return (
    <section className="py-24 bg-background" id="upload">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Preview Your <span className="text-primary">3D Model</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Drag and drop your STL file to see it in 3D instantly
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <Card className="overflow-hidden border-2 border-dashed border-border hover:border-primary/50 transition-colors">
            <CardContent className="p-0">
              {uploadedModels.length === 0 ? (
                /* Dropzone */
                <div
                  className={`relative min-h-[500px] flex flex-col items-center justify-center p-12 transition-all duration-300 ${
                    isDragging ? "bg-primary/5 border-primary" : "bg-secondary/30"
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
                  
                  <div className={`w-24 h-24 rounded-3xl bg-primary-gradient flex items-center justify-center mb-6 transition-transform ${isDragging ? "scale-110" : ""}`}>
                    {isLoading ? (
                      <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-12 h-12 text-primary-foreground" />
                    )}
                  </div>
                  
                  <h3 className="font-display text-2xl font-semibold mb-2">
                    {isDragging ? "Drop your model here" : "Drag & Drop Your 3D Model"}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Supports STL, OBJ, and 3MF files up to 100MB
                  </p>
                  
                  <Button 
                    size="lg" 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-primary-gradient shadow-glow"
                  >
                    <FileUp className="w-5 h-5 mr-2" />
                    Browse Files
                  </Button>

                  {/* Visual hint */}
                  <div className="absolute inset-4 border-2 border-dashed border-primary/20 rounded-xl pointer-events-none" />
                </div>
              ) : (
                /* 3D Viewer */
                <div className="grid md:grid-cols-[1fr,300px] min-h-[500px]">
                  {/* Main Viewer */}
                  <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 min-h-[400px]">
                    {uploadedModels[activeModel]?.geometry && (
                      <ModelViewer geometry={uploadedModels[activeModel].geometry} />
                    )}
                    
                    {/* Viewer Controls Hint */}
                    <div className="absolute bottom-4 left-4 flex gap-2">
                      <div className="glass-dark px-3 py-2 rounded-lg text-white/70 text-sm flex items-center gap-2">
                        <RotateCcw className="w-4 h-4" /> Drag to rotate
                      </div>
                      <div className="glass-dark px-3 py-2 rounded-lg text-white/70 text-sm flex items-center gap-2">
                        <ZoomIn className="w-4 h-4" /> Scroll to zoom
                      </div>
                    </div>
                  </div>

                  {/* Sidebar */}
                  <div className="bg-card border-l border-border p-4 flex flex-col">
                    <h4 className="font-display font-semibold mb-4">Uploaded Models</h4>
                    
                    {/* Model List */}
                    <div className="flex-1 space-y-2 overflow-y-auto">
                      {uploadedModels.map((model, index) => (
                        <div
                          key={index}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            activeModel === index 
                              ? "bg-primary/10 border border-primary/30" 
                              : "bg-secondary hover:bg-secondary/80"
                          }`}
                          onClick={() => setActiveModel(index)}
                        >
                          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <Box className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{model.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(model.file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeModel(index);
                            }}
                            className="p-1 hover:bg-destructive/20 rounded text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add More */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-4 w-full p-3 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Add More Models
                    </button>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileInput}
                      accept=".stl,.obj,.3mf"
                      multiple
                      className="hidden"
                    />

                    {/* Continue Button */}
                    <Button
                      size="lg"
                      onClick={handleContinue}
                      className="mt-4 w-full bg-accent-gradient shadow-accent-glow"
                    >
                      {user ? "Configure & Order" : "Register to Order"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}