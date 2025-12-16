"use client";

import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

interface Deployment {
  id: string;
  appName: string;
  url: string;
  status: "ACTIVE" | "PAUSED";
  createdAt: string;
}

export default function Home() {
  const { data: session, status } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Deployment | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    if (session) {
      fetchDeployments();
    }
  }, [session]);

  const fetchDeployments = async () => {
    try {
      const res = await fetch("/api/deployments");
      if (res.ok) {
        const data = await res.json();
        setDeployments(data);
      }
    } catch (err) {
      console.error("Failed to fetch deployments:", err);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file");
      return;
    }

    setIsDeploying(true);
    setError(null);
    setDeployedUrl(null);

    try {
      const formData = new FormData();
      formData.append("htmlFile", file);

      const res = await fetch("/api/deploy", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.url) {
        setDeployedUrl(data.url);
        setFile(null);
        fetchDeployments();
      } else {
        setError(data.error || "Deployment failed");
      }
    } catch (err) {
      setError("An error occurred during deployment");
      console.error(err);
    } finally {
      setIsDeploying(false);
    }
  };

  const handlePauseResume = async (deployment: Deployment) => {
    setActionLoading(deployment.id);
    try {
      const action = deployment.status === "ACTIVE" ? "pause" : "resume";
      const res = await fetch(`/api/deployments/${deployment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        fetchDeployments();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update deployment");
      }
    } catch (err) {
      setError("An error occurred");
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteClick = (deployment: Deployment) => {
    setDeleteTarget(deployment);
    setDeleteStep(1);
    setConfirmText("");
  };

  const handleDeleteCancel = () => {
    setDeleteTarget(null);
    setDeleteStep(1);
    setConfirmText("");
  };

  const handleDeleteContinue = () => {
    setDeleteStep(2);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || confirmText !== "confirm") return;

    setActionLoading(deleteTarget.id);
    try {
      const res = await fetch(`/api/deployments/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchDeployments();
        handleDeleteCancel();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete deployment");
      }
    } catch (err) {
      setError("An error occurred");
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-zinc-800">
          <h1 className="mb-6 text-center text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            HTML Deployer
          </h1>
          <p className="mb-8 text-center text-zinc-600 dark:text-zinc-400">
            Deploy your HTML files or ZIP archives instantly
          </p>
          <button
            onClick={() => signIn("google")}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Login with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            HTML Deployer
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {session.user?.name}
            </span>
            <button
              onClick={() => signOut()}
              className="rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-600"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8 rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-800">
          <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Deploy New Site
          </h2>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="file-upload"
                className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Select HTML or ZIP File
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".html,.zip"
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                  setError(null);
                  setDeployedUrl(null);
                }}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 file:mr-4 file:rounded-md file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-zinc-700 hover:file:bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50 dark:file:bg-zinc-600 dark:file:text-zinc-50"
              />
              {file && (
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Selected: {file.name}
                </p>
              )}
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || isDeploying}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:disabled:bg-zinc-600"
            >
              {isDeploying ? "Deploying..." : "Deploy"}
            </button>

            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            {deployedUrl && (
              <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                <p className="mb-2 text-sm font-medium text-green-800 dark:text-green-400">
                  Deployment successful!
                </p>
                <a
                  href={deployedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 underline hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {deployedUrl}
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-800">
          <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Your Deployments
          </h2>

          {deployments.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No deployments yet. Deploy your first site above!
            </p>
          ) : (
            <div className="space-y-3">
              {deployments.map((deployment) => (
                <div
                  key={deployment.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-zinc-900 dark:text-zinc-50">
                          {deployment.appName}
                        </p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            deployment.status === "ACTIVE"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                          }`}
                        >
                          {deployment.status === "ACTIVE" ? "Active" : "Paused"}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {new Date(deployment.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePauseResume(deployment)}
                      disabled={actionLoading === deployment.id}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        deployment.status === "ACTIVE"
                          ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50"
                          : "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                      }`}
                    >
                      {actionLoading === deployment.id
                        ? "..."
                        : deployment.status === "ACTIVE"
                          ? "Pause"
                          : "Resume"}
                    </button>
                    <button
                      onClick={() => handleDeleteClick(deployment)}
                      disabled={actionLoading === deployment.id}
                      className="rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-800 transition-colors hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                    >
                      Delete
                    </button>
                    {deployment.status === "ACTIVE" ? (
                      <a
                        href={deployment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                      >
                        Visit
                      </a>
                    ) : (
                      <span className="rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                        Visit
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-800">
            {deleteStep === 1 ? (
              <>
                <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Delete Deployment
                </h3>
                <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
                  Are you sure you want to delete{" "}
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {deleteTarget.appName}
                  </span>
                  ? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleDeleteCancel}
                    className="rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteContinue}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Confirm Deletion
                </h3>
                <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                  Type{" "}
                  <span className="font-mono font-medium text-zinc-900 dark:text-zinc-50">
                    confirm
                  </span>{" "}
                  to permanently delete{" "}
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {deleteTarget.appName}
                  </span>
                  .
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type 'confirm'"
                  className="mb-6 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                />
                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleDeleteCancel}
                    className="rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={confirmText !== "confirm" || actionLoading === deleteTarget.id}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400"
                  >
                    {actionLoading === deleteTarget.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
