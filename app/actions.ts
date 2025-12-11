"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

  const totalPrice = price * quantity;
  const paid = amountPaid ?? totalPrice; // Default to full payment if not specified
  const status = paid >= totalPrice ? 'paid' : 'pending';

  // 1. Record the sale
  const { data: sale, error: saleError } = await supabase.from("sales").insert({
    product_id: productId,
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

  // 3. Decrement inventory
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
