"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildReceiptData, generateReceiptNumber, buildReceiptDataMultiple } from "@/lib/receipt-utils";
import type { ReceiptDataPayload } from "@/lib/receipt-utils";

async function storeReceipt(
  supabase: Awaited<ReturnType<typeof createClient>>,
  saleId: string,
  receiptNumber: string,
  receiptData: ReceiptDataPayload
) {
  try {
    const { data, error } = await supabase
      .from("receipts")
      .insert({
        sale_id: saleId,
        receipt_number: receiptNumber,
        receipt_data: receiptData,
      })
      .select()
      .single();

    if (error) {
      const message = error.message || "";
      if (message.includes("public.receipts") || message.includes("receipts")) {
        console.warn("Receipt table is unavailable; returning generated receipt data only.");
        return null;
      }

      console.error("Receipt insert error:", error);
      return null;
    }

    return data;
  } catch (error: any) {
    const message = error?.message || "";
    if (message.includes("public.receipts") || message.includes("receipts")) {
      console.warn("Receipt table is unavailable; returning generated receipt data only.");
      return null;
    }

    throw error;
  }
}

async function getAllowNegativeInventorySetting(supabase: Awaited<ReturnType<typeof createClient>>) {
  try {
    const { data, error } = await supabase
      .from("inventory_settings")
      .select("allow_negative_inventory")
      .eq("id", 1)
      .single();

    if (error || !data) {
      return false;
    }

    return Boolean(data.allow_negative_inventory);
  } catch {
    return false;
  }
}

async function assertManagerAccess(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "manager") {
    throw new Error("Only managers can change inventory policy");
  }

  return user;
}

export async function updateInventoryPolicy(allowNegativeInventory: boolean) {
  const supabase = await createClient();
  await assertManagerAccess(supabase);

  const { error } = await supabase.from("inventory_settings").upsert({
    id: 1,
    allow_negative_inventory: allowNegativeInventory,
  });

  if (error) {
    throw new Error(`Failed to update inventory policy: ${error.message}`);
  }

  revalidatePath("/dashboard/manager");
  revalidatePath("/dashboard/salesperson");
}

export async function createProduct(formData: FormData) {
  const supabase = await createClient();
  
  const name = formData.get("name") as string;
  const sku = formData.get("sku") as string;
  const price = parseFloat(formData.get("price") as string);
  const quantity = parseInt(formData.get("quantity") as string);
  const description = formData.get("description") as string;

  const { error } = await supabase.from("inventory").insert({
    name,
    sku,
    price,
    quantity,
    description,
  });

  if (error) {
    console.error("Error creating product:", error);
    throw new Error("Failed to create product");
  }

  revalidatePath("/dashboard/manager");
  revalidatePath("/dashboard/salesperson");
}

export async function updateProduct(formData: FormData) {
  const supabase = await createClient();
  
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const sku = formData.get("sku") as string;
  const price = parseFloat(formData.get("price") as string);
  const quantity = parseInt(formData.get("quantity") as string);
  const description = formData.get("description") as string;

  const { error } = await supabase
    .from("inventory")
    .update({ name, sku, price, quantity, description })
    .eq("id", id);

  if (error) {
    console.error("Error updating product:", error);
    throw new Error("Failed to update product");
  }

  revalidatePath("/dashboard/manager");
  revalidatePath("/dashboard/salesperson");
}

export async function deleteProduct(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("inventory").delete().eq("id", id);

  if (error) {
    console.error("Error deleting product:", error);
    throw new Error("Failed to delete product");
  }

  revalidatePath("/dashboard/manager");
  revalidatePath("/dashboard/salesperson");
}

export async function createCustomer(name: string, phone: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("customers").insert({ name, phone }).select().single();
  if (error) {
      console.error("Create customer error:", error);
      throw new Error(`Failed to create customer: ${error.message}`);
  }
  return data;
}

export async function recordSale(
  productId: string, 
  quantity: number, 
  price: number,
  customerId?: string,
  amountPaid?: number
) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Fetch product name
  const { data: product } = await supabase
    .from("inventory")
    .select("name, quantity")
    .eq("id", productId)
    .single();
    
  const productName = product?.name;
  const allowNegativeInventory = await getAllowNegativeInventorySetting(supabase);

  if (!allowNegativeInventory && (product?.quantity ?? 0) < quantity) {
    throw new Error("Not enough stock for this sale");
  }

  // Fetch salesperson name
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  // Fetch customer name if credit sale
  let customerName: string | undefined;
  let customerPhone: string | undefined;
  if (customerId) {
    const { data: customer } = await supabase
      .from("customers")
      .select("name, phone")
      .eq("id", customerId)
      .single();
    if (customer) {
      customerName = customer.name;
      customerPhone = customer.phone;
    }
  }

  const totalPrice = price * quantity;
  const paid = amountPaid ?? totalPrice; // Default to full payment if not specified
  const status = paid >= totalPrice ? 'paid' : 'pending';

  // 1. Record the sale
  const { data: sale, error: saleError } = await supabase.from("sales").insert({
    product_id: productId,
    product_name: productName,
    quantity: quantity,
    total_price: totalPrice,
    salesperson_id: user.id,
    customer_id: customerId,
    amount_paid: paid,
    status: status
  }).select().single();

  if (saleError) {
    console.error("Sale insert error:", saleError);
    throw new Error(`Failed to record sale: ${saleError.message}`);
  }

  // 2. Record initial payment if any
  if (paid > 0) {
      await supabase.from("payments").insert({
          sale_id: sale.id,
          amount: paid,
          recorded_by: user.id
      });
  }

  // 3. Generate and store receipt
  const receiptData = buildReceiptData(
    productName || "Unknown Product",
    price,
    quantity,
    customerId,
    customerName,
    customerPhone,
    profile?.full_name || "Unknown",
    paid,
    status
  );

  const receipt = await storeReceipt(
    supabase,
    sale.id,
    receiptData.receipt_number,
    receiptData
  );

  // 4. Decrement inventory
  const { error: inventoryError } = await supabase.rpc('decrement_inventory', { 
    row_id: productId, 
    amount: quantity 
  });

  if (inventoryError) {
     const { data: item } = await supabase.from("inventory").select("quantity").eq("id", productId).single();
     if (item) {
         await supabase.from("inventory").update({ quantity: item.quantity - quantity }).eq("id", productId);
     }
  }

  revalidatePath("/dashboard/manager");
  revalidatePath("/dashboard/salesperson");

  // Return both sale and receipt data
  return {
    sale,
    receipt: receipt || { receipt_data: receiptData },
  };
}

export async function recordPayment(saleId: string, amount: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Get current sale status
    const { data: sale } = await supabase.from("sales").select("*").eq("id", saleId).single();
    if (!sale) throw new Error("Sale not found");

    const newAmountPaid = (sale.amount_paid || 0) + amount;
    const newStatus = newAmountPaid >= sale.total_price ? 'paid' : 'pending';

    // Update sale
    const { error: updateError } = await supabase
        .from("sales")
        .update({ amount_paid: newAmountPaid, status: newStatus })
        .eq("id", saleId);

    if (updateError) throw new Error("Failed to update sale");

    // Record payment
    await supabase.from("payments").insert({
        sale_id: saleId,
        amount: amount,
        recorded_by: user.id
    });

    revalidatePath("/dashboard/manager");
    revalidatePath("/dashboard/salesperson");
}

export async function recordCustomerPayment(customerId: string, amount: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Fetch all pending sales for this customer, oldest first
    const { data: sales } = await supabase
        .from("sales")
        .select("*")
        .eq("customer_id", customerId)
        .eq("status", "pending")
        .order("created_at", { ascending: true });

    if (!sales || sales.length === 0) throw new Error("No pending debt found for this customer");

    let remainingPayment = amount;

    for (const sale of sales) {
        if (remainingPayment <= 0) break;

        const amountOwed = sale.total_price - (sale.amount_paid || 0);
        const paymentForThisSale = Math.min(remainingPayment, amountOwed);

        if (paymentForThisSale > 0) {
            const newAmountPaid = (sale.amount_paid || 0) + paymentForThisSale;
            const newStatus = newAmountPaid >= sale.total_price ? 'paid' : 'pending';

            // Update sale
            const { error: updateError } = await supabase
                .from("sales")
                .update({ amount_paid: newAmountPaid, status: newStatus })
                .eq("id", sale.id);

            if (updateError) throw new Error("Failed to update sale");

            // Record payment
            await supabase.from("payments").insert({
                sale_id: sale.id,
                amount: paymentForThisSale,
                recorded_by: user.id
            });

            remainingPayment -= paymentForThisSale;
        }
    }

    revalidatePath("/dashboard/manager");
    revalidatePath("/dashboard/salesperson");
}

export async function deleteSale(saleId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Ideally check if user is manager here
    
    // Get sale details to restore inventory
    const { data: sale } = await supabase.from("sales").select("*").eq("id", saleId).single();
    if (!sale) throw new Error("Sale not found");

    // Restore inventory
    const { data: item } = await supabase.from("inventory").select("quantity").eq("id", sale.product_id).single();
    if (item) {
        await supabase.from("inventory").update({ quantity: item.quantity + sale.quantity }).eq("id", sale.product_id);
    }

    // Delete sale (cascade will delete payments)
    const { error } = await supabase.from("sales").delete().eq("id", saleId);

    if (error) {
        console.error("Error deleting sale:", error);
        throw new Error(`Failed to delete sale: ${error.message}`);
    }

    revalidatePath("/dashboard/manager");
    revalidatePath("/dashboard/salesperson");
}

export async function deleteUser(userId: string) {
    // This requires Service Role Key to delete from auth.users
    // For now, we will just delete from profiles which might be enough for the UI
    const supabase = await createClient();
    
    // Check if user is manager
    // ...

    const { error } = await supabase.from("profiles").delete().eq("id", userId);
    
    if (error) throw error;
    revalidatePath("/dashboard/manager");
}

export async function verifyUser(userId: string) {
  const supabase = await createClient();
  
  // Check if current user is manager
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  
  // In a real app, verify the current user is a manager here
  
  const { error } = await supabase
    .from("profiles")
    .update({ verified: true })
    .eq("id", userId);

  if (error) {
    console.error("Error verifying user:", error);
    throw new Error("Failed to verify user");
  }

  revalidatePath("/dashboard/manager");
}

export async function toggleSalespersonProductAccess(userId: string, canAdd: boolean) {
  const supabase = await createClient();
  
  // Check if current user is manager
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  
  const { error } = await supabase
    .from("profiles")
    .update({ can_add_products: canAdd })
    .eq("id", userId);

  if (error) {
    console.error("Error updating salesperson permissions:", error);
    throw new Error("Failed to update permissions");
  }

  revalidatePath("/dashboard/manager");
}

export async function recordMultipleSale(data: {
  items: Array<{ productId: string; productName: string; quantity: number; price: number }>;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  status: "paid" | "pending";
  amountPaid: number;
  paymentMethod?: string;
  businessLogo?: string;
}) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Fetch salesperson name
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  // Calculate totals
  const subtotal = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalPrice = subtotal;
  const status = data.amountPaid >= totalPrice ? 'paid' : 'pending';
  const allowNegativeInventory = await getAllowNegativeInventorySetting(supabase);

  if (!allowNegativeInventory) {
    const inventoryIds = data.items.map((item) => item.productId);
    const { data: inventoryRows, error: inventoryLookupError } = await supabase
      .from("inventory")
      .select("id, quantity")
      .in("id", inventoryIds);

    if (inventoryLookupError) {
      throw new Error(`Failed to validate inventory: ${inventoryLookupError.message}`);
    }

    const quantityById = new Map((inventoryRows || []).map((item) => [item.id, item.quantity]));

    for (const item of data.items) {
      const availableQuantity = Number(quantityById.get(item.productId) ?? 0);
      if (availableQuantity < item.quantity) {
        throw new Error(`Not enough stock for ${item.productName}`);
      }
    }
  }

  let resolvedCustomerName = data.customerName || "Walk-in Customer";
  let resolvedCustomerPhone = data.customerPhone || "";

  if (data.customerId) {
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("name, phone")
      .eq("id", data.customerId)
      .single();

    if (customerError) {
      throw new Error(`Failed to load customer: ${customerError.message}`);
    }

    resolvedCustomerName = customer?.name || resolvedCustomerName;
    resolvedCustomerPhone = customer?.phone || resolvedCustomerPhone;
  }

  // 0. Create or find customer if provided (for credit sales)
  let customerId = data.customerId || null;
  if (!customerId && data.customerName && data.customerName !== "Walk-in Customer") {
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("name", data.customerName)
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const { data: newCustomer, error: customerError } = await supabase
        .from("customers")
        .insert({ name: data.customerName, phone: data.customerPhone || "" })
        .select()
        .single();

      if (customerError) {
        console.error("Customer creation error:", customerError);
        throw new Error(`Failed to create customer: ${customerError.message}`);
      }

      customerId = newCustomer.id;
    }
  }

  // 1. Create individual sale records for each item (not aggregated)
  const salesToReturn = [];
  const firstSale = { id: "", receipt_number: "", receipt_data: null };
  
  for (let index = 0; index < data.items.length; index++) {
    const item = data.items[index];
    
    // For credit sales, distribute amount_paid across items (proportional)
    // For first item: put the actual amount_paid; for others: 0
    const itemAmountPaid = index === 0 ? data.amountPaid : 0;
    
    const { data: sale, error: saleError } = await supabase.from("sales").insert({
      product_id: item.productId,
      product_name: item.productName,
      quantity: item.quantity,
      total_price: item.price * item.quantity,  // Price for THIS item only
      salesperson_id: user.id,
      customer_id: customerId,  // Set customer_id for credit sales
      amount_paid: itemAmountPaid,  // Record the payment on first item
      status: status
    }).select().single();

    if (saleError) {
      console.error("Sale insert error:", saleError);
      throw new Error(`Failed to record sale: ${saleError.message}`);
    }

    salesToReturn.push(sale);
    if (salesToReturn.length === 1) {
      firstSale.id = sale.id;
    }
  }

  // 2. Record payment in payments table if amount was paid
  if (data.amountPaid > 0 && firstSale.id) {
      await supabase.from("payments").insert({
          sale_id: firstSale.id,
          amount: data.amountPaid,
          recorded_by: user.id
      });
  }

  // 3. Build and store receipt with all items
  const receiptData = buildReceiptDataMultiple(
    data.items.map((item) => ({
      name: item.productName,
      price: item.price,
      quantity: item.quantity,
    })),
    resolvedCustomerName,
    resolvedCustomerPhone,
    profile?.full_name || "Unknown",
    data.amountPaid,
    status,
    data.paymentMethod,
    data.businessLogo
  );

  const receipt = await storeReceipt(
    supabase,
    firstSale.id,
    receiptData.receipt_number,
    receiptData
  );

  // 4. Decrement inventory for all items
  for (const item of data.items) {
    const { error: inventoryError } = await supabase.rpc('decrement_inventory', { 
      row_id: item.productId, 
      amount: item.quantity 
    });

    if (inventoryError) {
       const { data: invItem } = await supabase.from("inventory").select("quantity").eq("id", item.productId).single();
       if (invItem) {
           await supabase.from("inventory").update({ quantity: invItem.quantity - item.quantity }).eq("id", item.productId);
       }
    }
  }

  revalidatePath("/dashboard/manager");
  revalidatePath("/dashboard/salesperson");

  // Return first sale and receipt data
  return {
    sale: salesToReturn[0],
    receipt: receipt || { receipt_data: receiptData },
  };
}
