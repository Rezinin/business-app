import { createClient } from "@/lib/supabase/server";

export const DEFAULT_ALLOW_NEGATIVE_INVENTORY = false;

export async function getAllowNegativeInventory(): Promise<boolean> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("inventory_settings")
      .select("allow_negative_inventory")
      .eq("id", 1)
      .single();

    if (error || !data) {
      return DEFAULT_ALLOW_NEGATIVE_INVENTORY;
    }

    return Boolean(data.allow_negative_inventory);
  } catch {
    return DEFAULT_ALLOW_NEGATIVE_INVENTORY;
  }
}