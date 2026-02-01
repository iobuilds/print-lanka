import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface InvoiceSettings {
  company_name: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  branch: string;
  footer_note: string;
}

const defaultInvoiceSettings: InvoiceSettings = {
  company_name: "IO Builds",
  company_address: "532/1/E, Gonahena Road, Kadawatha",
  company_phone: "0717367497",
  company_email: "contact@iobuilds.lk",
  bank_name: "Commercial Bank",
  account_number: "1234567890",
  account_name: "IO Builds",
  branch: "Kadawatha",
  footer_note: "Thank you for your business!",
};

export function useInvoiceSettings() {
  const [settings, setSettings] = useState<InvoiceSettings>(defaultInvoiceSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "invoice_settings")
        .single();

      if (!error && data?.value && typeof data.value === "object") {
        setSettings({ ...defaultInvoiceSettings, ...(data.value as unknown as InvoiceSettings) });
      }
      setIsLoading(false);
    };

    fetchSettings();

    // Subscribe to changes
    const channel = supabase
      .channel("invoice-settings")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "system_settings",
          filter: "key=eq.invoice_settings",
        },
        () => fetchSettings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { settings, isLoading };
}
