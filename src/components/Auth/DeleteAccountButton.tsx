// components/Employee/Auth/DeleteAccountButton.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Dialog } from "@headlessui/react";

export default function DeleteAccountButton({ }: { userId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    setError("");

    try {
      // Server uses the session; we don't need to send userId
      const res = await fetch("/api/auth/delete-account", {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Failed to delete account");
      }

      // Kill NextAuth session + redirect to signup
      await signOut({
        redirect: true,
        callbackUrl: "/auth/signup",
      });

      // Fallback (in case signOut redirect is blocked)
      router.replace("/auth/signup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deletion failed");
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
      >
        Delete Account
      </button>

      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        className="fixed inset-0 bg-black/30 flex items-center justify-center p-4"
      >
        <Dialog.Panel className="bg-white rounded-lg p-6 max-w-md w-full">
          <Dialog.Title className="text-xl font-bold mb-4">
            Confirm Account Deletion
          </Dialog.Title>

          <Dialog.Description className="mb-6">
            Are you sure you want to delete your account? This action cannot be
            undone. All your data will be permanently removed.
          </Dialog.Description>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 border rounded-md"
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </button>
          </div>
        </Dialog.Panel>
      </Dialog>
    </>
  );
}
