import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, ImagePlus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  main_image: string;
  is_active: boolean;
  stock: number;
  created_at: string;
  category_id: string | null;
}

interface ProductImage {
  id: string;
  image_path: string;
  sort_order: number;
}

interface Category {
  id: string;
  name: string;
}

export default function AdminShopProducts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    is_active: true,
    category_id: "",
  });
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [additionalImages, setAdditionalImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("id, name")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as Category[];
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-shop-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

  const getImageUrl = (path: string) => {
    if (path.startsWith("http")) return path;
    const { data } = supabase.storage.from("shop-products").getPublicUrl(path);
    return data.publicUrl;
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", price: "", stock: "", is_active: true, category_id: "" });
    setMainImage(null);
    setAdditionalImages([]);
    setEditingProduct(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      stock: product.stock.toString(),
      is_active: product.is_active,
      category_id: product.category_id || "",
    });
    setIsDialogOpen(true);
  };

  const uploadImage = async (file: File, folder: string): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const { error } = await supabase.storage.from("shop-products").upload(path, file);
    if (error) throw error;
    return path;
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.price) {
      toast({ title: "Error", description: "Name and price are required", variant: "destructive" });
      return;
    }

    if (!editingProduct && !mainImage) {
      toast({ title: "Error", description: "Main image is required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      let mainImagePath = editingProduct?.main_image || "";

      // Upload main image if provided
      if (mainImage) {
        mainImagePath = await uploadImage(mainImage, "products");
      }

      if (editingProduct) {
        // Update existing product
        const { error } = await supabase
          .from("shop_products")
          .update({
            name: formData.name,
            description: formData.description || null,
            price: parseFloat(formData.price),
            stock: parseInt(formData.stock) || 0,
            is_active: formData.is_active,
            category_id: formData.category_id || null,
            ...(mainImage ? { main_image: mainImagePath } : {}),
          })
          .eq("id", editingProduct.id);

        if (error) throw error;

        // Upload additional images
        if (additionalImages.length > 0) {
          for (let i = 0; i < additionalImages.length; i++) {
            const imgPath = await uploadImage(additionalImages[i], `products/${editingProduct.id}`);
            await supabase.from("shop_product_images").insert({
              product_id: editingProduct.id,
              image_path: imgPath,
              sort_order: i,
            });
          }
        }

        toast({ title: "Success", description: "Product updated successfully" });
      } else {
        // Create new product
        const { data: newProduct, error } = await supabase
          .from("shop_products")
          .insert({
            name: formData.name,
            description: formData.description || null,
            price: parseFloat(formData.price),
            stock: parseInt(formData.stock) || 0,
            is_active: formData.is_active,
            category_id: formData.category_id || null,
            main_image: mainImagePath,
            created_by: user?.id,
          })
          .select()
          .single();

        if (error) throw error;

        // Upload additional images
        for (let i = 0; i < additionalImages.length; i++) {
          const imgPath = await uploadImage(additionalImages[i], `products/${newProduct.id}`);
          await supabase.from("shop_product_images").insert({
            product_id: newProduct.id,
            image_path: imgPath,
            sort_order: i,
          });
        }

        toast({ title: "Success", description: "Product created successfully" });
      }

      queryClient.invalidateQueries({ queryKey: ["admin-shop-products"] });
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Error", description: "Failed to save product", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    const { error } = await supabase.from("shop_products").delete().eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to delete product", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Product deleted" });
      queryClient.invalidateQueries({ queryKey: ["admin-shop-products"] });
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from("shop_products")
      .update({ is_active: !isActive })
      .eq("id", id);

    if (!error) {
      queryClient.invalidateQueries({ queryKey: ["admin-shop-products"] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display text-3xl font-bold">Shop Products</h1>
          <p className="text-muted-foreground">Manage your product catalog</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Product Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Product name"
                  />
                </div>
                <div>
                  <Label>Price (LKR) *</Label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Stock</Label>
                  <Input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Product description"
                    rows={3}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Main Image {!editingProduct && "*"}</Label>
                <div className="mt-2 flex items-center gap-4">
                  {editingProduct && !mainImage && (
                    <img
                      src={getImageUrl(editingProduct.main_image)}
                      alt="Current"
                      className="w-20 h-20 object-cover rounded"
                    />
                  )}
                  {mainImage && (
                    <img
                      src={URL.createObjectURL(mainImage)}
                      alt="New"
                      className="w-20 h-20 object-cover rounded"
                    />
                  )}
                  <label className="cursor-pointer border-2 border-dashed rounded-lg p-4 hover:border-primary transition-colors">
                    <ImagePlus className="w-6 h-6 mx-auto text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setMainImage(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              </div>

              <div>
                <Label>Additional Images (Max 4)</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {additionalImages.map((img, idx) => (
                    <div key={idx} className="relative">
                      <img
                        src={URL.createObjectURL(img)}
                        alt={`Additional ${idx + 1}`}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setAdditionalImages(additionalImages.filter((_, i) => i !== idx))
                        }
                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {additionalImages.length < 4 && (
                    <label className="cursor-pointer border-2 border-dashed rounded-lg w-16 h-16 flex items-center justify-center hover:border-primary transition-colors">
                      <Plus className="w-5 h-5 text-muted-foreground" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && additionalImages.length < 4) {
                            setAdditionalImages([...additionalImages, file]);
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Active (visible in shop)</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingProduct ? "Update" : "Create"} Product
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : products?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No products yet. Add your first product!
                  </TableCell>
                </TableRow>
              ) : (
                products?.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <img
                        src={getImageUrl(product.main_image)}
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>LKR {product.price.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={product.stock > 0 ? "secondary" : "destructive"}>
                        {product.stock}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={product.is_active}
                        onCheckedChange={() => toggleActive(product.id, product.is_active)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(product)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => deleteProduct(product.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
