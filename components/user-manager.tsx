"use client";

import { deleteUser, verifyUser } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash, UserPlus, CheckCircle, Loader2 } from "lucide-react";
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
      if (!confirm("Are you sure you want to remove this user?")) return;
      
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Users</h2>
      </div>

      <div className="grid gap-4">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                    <h3 className="font-bold">{user.full_name || "Unknown Name"}</h3>
                    {!user.verified && <Badge variant="destructive">Pending</Badge>}
                    {user.verified && <Badge variant="secondary">Verified</Badge>}
                </div>
                <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
                <p className="text-xs text-muted-foreground">ID: {user.id}</p>
              </div>
              
              <div className="flex items-center gap-2">
                  {!user.verified && (
                      <Button 
                        size="sm" 
                        onClick={() => handleVerify(user.id)}
                        disabled={loadingId === user.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                          {loadingId === user.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                              <CheckCircle className="mr-2 h-4 w-4" />
                          )}
                          Verify
                      </Button>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0" disabled={loadingId === user.id}>
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleDelete(user.id)}
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
