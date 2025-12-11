
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
