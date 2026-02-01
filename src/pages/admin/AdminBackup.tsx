import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, Upload, RefreshCw, Clock, Database, HardDrive, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface BackupSettings {
  autoBackupEnabled: boolean;
  frequency: "daily" | "weekly" | "monthly";
  lastBackupAt: string | null;
  retainCount: number;
}

interface BackupData {
  version: string;
  createdAt: string;
  type: "data_only" | "full";
  tables: {
    available_colors: unknown[];
    bank_details: unknown[];
    coupons: unknown[];
    product_categories: unknown[];
    shop_products: unknown[];
    shop_product_images: unknown[];
    system_settings: unknown[];
  };
  storage?: {
    buckets: string[];
    files: { bucket: string; path: string; url: string }[];
  };
}

// Tables to backup in data-only mode
const DATA_TABLES = [
  "available_colors",
  "bank_details", 
  "coupons",
  "product_categories",
  "shop_products",
  "shop_product_images",
  "system_settings",
] as const;

export default function AdminBackup() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<BackupSettings>({
    autoBackupEnabled: false,
    frequency: "daily",
    lastBackupAt: null,
    retainCount: 5,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "backup_settings")
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data?.value) {
        const value = data.value as Record<string, unknown>;
        setSettings({
          autoBackupEnabled: value.autoBackupEnabled as boolean ?? false,
          frequency: value.frequency as "daily" | "weekly" | "monthly" ?? "daily",
          lastBackupAt: value.lastBackupAt as string ?? null,
          retainCount: value.retainCount as number ?? 5,
        });
      }
    } catch (error) {
      console.error("Error fetching backup settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings: BackupSettings) => {
    setIsSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      // Check if setting exists
      const { data: existing } = await supabase
        .from("system_settings")
        .select("id")
        .eq("key", "backup_settings")
        .maybeSingle();

      if (existing) {
        await fetch(`${supabaseUrl}/rest/v1/system_settings?key=eq.backup_settings`, {
          method: "PATCH",
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            value: newSettings,
            updated_by: user.user?.id,
            updated_at: new Date().toISOString(),
          }),
        });
      } else {
        await fetch(`${supabaseUrl}/rest/v1/system_settings`, {
          method: "POST",
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            key: "backup_settings",
            value: newSettings,
            updated_by: user.user?.id,
          }),
        });
      }

      setSettings(newSettings);
      toast({ title: "Settings saved", description: "Backup settings have been updated." });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const performBackup = async (includeFiles: boolean) => {
    setIsBackingUp(true);
    try {
      const backup: BackupData = {
        version: "1.0",
        createdAt: new Date().toISOString(),
        type: includeFiles ? "full" : "data_only",
        tables: {
          available_colors: [],
          bank_details: [],
          coupons: [],
          product_categories: [],
          shop_products: [],
          shop_product_images: [],
          system_settings: [],
        },
      };

      // Fetch all table data
      for (const table of DATA_TABLES) {
        const { data, error } = await supabase.from(table).select("*");
        if (error) {
          console.error(`Error fetching ${table}:`, error);
          continue;
        }
        backup.tables[table] = data || [];
      }

      // If including files, get storage info
      if (includeFiles) {
        backup.storage = {
          buckets: ["shop-products", "site-assets"],
          files: [],
        };

        for (const bucket of backup.storage.buckets) {
          const { data: files, error } = await supabase.storage.from(bucket).list("", { limit: 1000 });
          if (error) {
            console.error(`Error listing ${bucket}:`, error);
            continue;
          }

          for (const file of files || []) {
            if (file.name) {
              const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(file.name);
              backup.storage.files.push({
                bucket,
                path: file.name,
                url: urlData.publicUrl,
              });
            }
          }
        }
      }

      // Download as JSON file
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-${includeFiles ? "full" : "data"}-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Update last backup timestamp
      const newSettings = { ...settings, lastBackupAt: new Date().toISOString() };
      await saveSettings(newSettings);

      toast({ 
        title: "Backup complete", 
        description: `${includeFiles ? "Full" : "Data"} backup downloaded successfully.` 
      });
    } catch (error) {
      console.error("Backup error:", error);
      toast({ title: "Backup failed", description: "Could not create backup.", variant: "destructive" });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedFile) return;

    setIsRestoring(true);
    try {
      const text = await selectedFile.text();
      const backup: BackupData = JSON.parse(text);

      if (!backup.version || !backup.tables) {
        throw new Error("Invalid backup file format");
      }

      // Restore each table using raw fetch for dynamic table names
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      for (const [tableName, rows] of Object.entries(backup.tables)) {
        if (!Array.isArray(rows) || rows.length === 0) continue;

        // Clear existing data first (for config tables)
        if (["available_colors", "bank_details", "coupons", "product_categories", "system_settings"].includes(tableName)) {
          await fetch(`${supabaseUrl}/rest/v1/${tableName}?id=neq.00000000-0000-0000-0000-000000000000`, {
            method: "DELETE",
            headers: {
              "apikey": supabaseKey,
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              "Prefer": "return=minimal",
            },
          });
        }

        // Insert backup data using upsert
        const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}`, {
          method: "POST",
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates",
          },
          body: JSON.stringify(rows),
        });
        
        if (!response.ok) {
          console.error(`Error restoring ${tableName}:`, await response.text());
        }
      }

      toast({ 
        title: "Restore complete", 
        description: "Data has been restored from backup." 
      });
      setRestoreDialogOpen(false);
      setSelectedFile(null);
    } catch (error) {
      console.error("Restore error:", error);
      toast({ 
        title: "Restore failed", 
        description: error instanceof Error ? error.message : "Could not restore backup.", 
        variant: "destructive" 
      });
    } finally {
      setIsRestoring(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Backup & Restore</h1>
        <p className="text-muted-foreground">Manage automatic and manual backups of your data</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Auto Backup Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Automatic Backup
            </CardTitle>
            <CardDescription>
              Configure automatic backups for your settings and configuration data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-backup">Enable Auto Backup</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically backup settings data
                </p>
              </div>
              <Switch
                id="auto-backup"
                checked={settings.autoBackupEnabled}
                onCheckedChange={(checked) => {
                  const newSettings = { ...settings, autoBackupEnabled: checked };
                  saveSettings(newSettings);
                }}
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label>Backup Frequency</Label>
              <Select
                value={settings.frequency}
                onValueChange={(value: "daily" | "weekly" | "monthly") => {
                  const newSettings = { ...settings, frequency: value };
                  saveSettings(newSettings);
                }}
                disabled={!settings.autoBackupEnabled || isSaving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {settings.lastBackupAt && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                Last backup: {new Date(settings.lastBackupAt).toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manual Backup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Manual Backup
            </CardTitle>
            <CardDescription>
              Create an immediate backup of your data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full"
              onClick={() => performBackup(false)}
              disabled={isBackingUp}
            >
              {isBackingUp ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Database className="w-4 h-4 mr-2" />
              )}
              Download Data Backup
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Includes: Colors, coupons, bank details, categories, products, settings
            </p>

            <div className="border-t pt-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => performBackup(true)}
                disabled={isBackingUp}
              >
                {isBackingUp ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <HardDrive className="w-4 h-4 mr-2" />
                )}
                Download Full Backup
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Includes data + file storage references
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Restore */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Restore from Backup
            </CardTitle>
            <CardDescription>
              Restore your data from a previous backup file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Restoring will overwrite existing data. Make sure to create a backup first before restoring.
              </AlertDescription>
            </Alert>

            <Button variant="outline" onClick={() => setRestoreDialogOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Backup File
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Restore Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore from Backup</DialogTitle>
            <DialogDescription>
              Select a backup JSON file to restore your data. This will overwrite existing configuration data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="backup-file">Backup File</Label>
              <Input
                id="backup-file"
                type="file"
                accept=".json"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>

            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRestore}
              disabled={!selectedFile || isRestoring}
            >
              {isRestoring ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Restore Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
