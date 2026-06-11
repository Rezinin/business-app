"use client";

import { deleteUser, verifyUser, toggleSalespersonProductAccess, toggleUserBlock } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash, CheckCircle, Loader2, Package, ShieldX, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export function UserManager({ users }: { users: any[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleVerify = async (userId: string) => {
      setLoadingId(userId);
      try {
          await verifyUser(userId);
      } catch (error) {
          console.error(error);
          alert("Failed to verify user. Please ensure database policies allow managers to update profiles.");
      } finally {
          setLoadingId(null);
      }
  };

  const handleDelete = async (userId: string) => {
      if (!confirm("Are you sure you want to remove this user? This action cannot be undone.")) return;
      
      setLoadingId(userId);
      try {
          await deleteUser(userId);
      } catch (error) {
          console.error(error);
          alert("Failed to delete user.");
      } finally {
          setLoadingId(null);
      }
  };

  const handleToggleProductAccess = async (userId: string, currentValue: boolean) => {
      setLoadingId(userId);
      try {
          await toggleSalespersonProductAccess(userId, !currentValue);
      } catch (error) {
          console.error(error);
          alert("Failed to update product access permissions.");
      } finally {
          setLoadingId(null);
      }
  };

  const handleToggleBlock = async (userId: string, currentlyBlocked: boolean) => {
      const action = currentlyBlocked ? "unblock" : "block";
      if (!currentlyBlocked && !confirm(`Are you sure you want to block this user? They will be unable to access the dashboard.`)) return;

      setLoadingId(userId);
      try {
          await toggleUserBlock(userId, !currentlyBlocked);
      } catch (error) {
          console.error(error);
          alert(`Failed to ${action} user.`);
      } finally {
          setLoadingId(null);
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Users</h2>
      </div>

      <div className="grid gap-4">
        {users.map((user) => (
          <Card key={user.id} className={user.blocked ? "border-red-300 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10" : ""}>
            <CardContent className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold">{user.full_name || "Unknown Name"}</h3>
                    {user.blocked && <Badge variant="destructive" className="bg-red-600">Blocked</Badge>}
                    {!user.blocked && !user.verified && <Badge variant="destructive">Pending</Badge>}
                    {!user.blocked && user.verified && <Badge variant="secondary">Verified</Badge>}
                    {user.role === "salesperson" && user.can_add_products && <Badge className="bg-blue-600">Can Add Products</Badge>}
                </div>
                <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
                <p className="text-xs text-muted-foreground">ID: {user.id}</p>
              </div>
              
              <div className="flex items-center gap-2">
                  {loadingId === user.id && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0" disabled={loadingId === user.id}>
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {/* Verify - only show if not verified */}
                      {!user.verified && (
                        <DropdownMenuItem
                          onClick={() => handleVerify(user.id)}
                          disabled={loadingId === user.id}
                        >
                          <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                          Verify User
                        </DropdownMenuItem>
                      )}

                      {/* Toggle Product Access - only for verified salespersons */}
                      {user.role === "salesperson" && user.verified && (
                        <DropdownMenuItem
                          onClick={() => handleToggleProductAccess(user.id, user.can_add_products)}
                          disabled={loadingId === user.id}
                        >
                          <Package className="mr-2 h-4 w-4 text-blue-600" />
                          {user.can_add_products ? "Revoke Product Access" : "Grant Product Access"}
                        </DropdownMenuItem>
                      )}

                      {/* Block / Unblock */}
                      {user.blocked ? (
                        <DropdownMenuItem
                          onClick={() => handleToggleBlock(user.id, true)}
                          disabled={loadingId === user.id}
                        >
                          <ShieldCheck className="mr-2 h-4 w-4 text-green-600" />
                          Unblock User
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => handleToggleBlock(user.id, false)}
                          disabled={loadingId === user.id}
                          className="text-orange-600 focus:text-orange-600"
                        >
                          <ShieldX className="mr-2 h-4 w-4" />
                          Block User
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator />

                      {/* Delete - always available, destructive */}
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => handleDelete(user.id)}
                        disabled={loadingId === user.id}
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Remove User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
         {users.length === 0 && (
            <div className="text-center p-8 text-muted-foreground">
                No users found.
            </div>
        )}
      </div>
    </div>
  );
}
