"use client";

import { useState, useEffect, useRef } from "react";
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
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      setError(null);
      setDeployedUrl(null);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0b0f]">
        <p className="text-sm text-white/40">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0b0f]">
        <div className="w-full max-w-md rounded-lg bg-[#1a1b1f] border border-white/[0.06] p-8">
          <h1 className="mb-4 text-center text-lg font-medium text-white/90">
            HTML Deployer
          </h1>
          <p className="mb-8 text-center text-sm text-white/40">
            Deploy your HTML files or ZIP archives instantly
          </p>
          <button
            onClick={() => signIn("google")}
            className="w-full rounded-md bg-[#5e6ad2] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#6e7ae2]"
          >
            Login with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0b0f]">
      <header className="border-b border-white/[0.06] bg-[#1a1b1f]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2.5">
          <h1 className="text-sm font-medium tracking-tight text-white/90">
            HTML Deployer
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/50">
              {session.user?.name}
            </span>
            <button
              onClick={() => signOut()}
              className="rounded-md bg-white/[0.06] px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/[0.1]"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Upload Section */}
        <div className="mb-6 rounded-lg bg-[#1a1b1f] border border-white/[0.06] p-5">
          <h2 className="mb-4 text-sm font-medium text-white/90">
            Deploy New Site
          </h2>

          <div className="space-y-4">
            <div
              className={`drop-zone ${isDragging ? "drag-over" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {/* Upload icon */}
              <svg
                className="mx-auto mb-3 h-8 w-8 text-white/20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="text-sm text-white/40">
                Drop .html or .zip file here
              </p>
              <p className="mt-1 text-xs text-white/25">or click to browse</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.zip"
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setError(null);
                setDeployedUrl(null);
              }}
            />

            {file && (
              <p className="text-xs text-white/50 font-mono">{file.name}</p>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleUpload}
                disabled={!file || isDeploying}
                className="rounded-md bg-[#5e6ad2] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#6e7ae2] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isDeploying ? "Deploying..." : "Deploy"}
              </button>
            </div>

            {error && (
              <div className="border-l-2 border-red-400 bg-red-400/[0.05] pl-3 py-2">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            {deployedUrl && (
              <div className="border-l-2 border-green-400 bg-green-400/[0.05] pl-3 py-2">
                <p className="mb-1 text-xs text-green-400">
                  Deployment successful!
                </p>
                <a
                  href={deployedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-[#5e6ad2] hover:text-[#7e8ae2]"
                >
                  {deployedUrl}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Deployments Section */}
        <div className="rounded-lg bg-[#1a1b1f] border border-white/[0.06]">
          <div className="px-4 py-3">
            <h2 className="text-sm font-medium text-white/90">
              Your Deployments
            </h2>
          </div>

          {deployments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              {/* Package/box icon */}
              <svg
                className="mb-3 h-10 w-10 text-white/10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
              <p className="text-sm text-white/30">
                No deployments yet. Deploy your first site above.
              </p>
            </div>
          ) : (
            <div>
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_100px_1fr_140px_120px] gap-4 items-center px-4 py-2 border-b border-white/[0.04]">
                <span className="text-[11px] uppercase tracking-wider text-white/30 font-medium">
                  Name
                </span>
                <span className="text-[11px] uppercase tracking-wider text-white/30 font-medium">
                  Status
                </span>
                <span className="text-[11px] uppercase tracking-wider text-white/30 font-medium">
                  URL
                </span>
                <span className="text-[11px] uppercase tracking-wider text-white/30 font-medium">
                  Created
                </span>
                <span className="text-[11px] uppercase tracking-wider text-white/30 font-medium text-right">
                  Actions
                </span>
              </div>

              {/* Deployment rows */}
              {deployments.map((deployment) => (
                <div
                  key={deployment.id}
                  className="grid grid-cols-[1fr_100px_1fr_140px_120px] gap-4 items-center px-4 py-2.5 hover:bg-white/[0.02] transition-colors border-t border-white/[0.04]"
                >
                  {/* App name */}
                  <span className="text-sm font-mono text-white/80 truncate">
                    {deployment.appName}
                  </span>

                  {/* Status */}
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        deployment.status === "ACTIVE"
                          ? "bg-green-400 animate-status-pulse"
                          : "bg-amber-400"
                      }`}
                    />
                    <span className="text-xs text-white/50">
                      {deployment.status === "ACTIVE" ? "Active" : "Paused"}
                    </span>
                  </div>

                  {/* URL */}
                  {deployment.status === "ACTIVE" ? (
                    <a
                      href={deployment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-[#5e6ad2] hover:text-[#7e8ae2] truncate"
                    >
                      {deployment.url}
                    </a>
                  ) : (
                    <span className="text-xs font-mono text-white/20 truncate">
                      {deployment.url}
                    </span>
                  )}

                  {/* Created */}
                  <span className="text-xs text-white/40">
                    {new Date(deployment.createdAt).toLocaleDateString()}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1">
                    {/* Pause/Resume button */}
                    <button
                      onClick={() => handlePauseResume(deployment)}
                      disabled={actionLoading === deployment.id}
                      className="p-1.5 rounded-md text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={deployment.status === "ACTIVE" ? "Pause" : "Resume"}
                    >
                      {actionLoading === deployment.id ? (
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                        </svg>
                      ) : deployment.status === "ACTIVE" ? (
                        /* Pause icon */
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                          <rect x="6" y="4" width="4" height="16" rx="1" />
                          <rect x="14" y="4" width="4" height="16" rx="1" />
                        </svg>
                      ) : (
                        /* Play icon */
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="6,4 20,12 6,20" />
                        </svg>
                      )}
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDeleteClick(deployment)}
                      disabled={actionLoading === deployment.id}
                      className="p-1.5 rounded-md text-white/30 hover:text-red-400 hover:bg-white/[0.06] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>

                    {/* Visit button */}
                    {deployment.status === "ACTIVE" ? (
                      <a
                        href={deployment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-md text-white/30 hover:text-[#5e6ad2] hover:bg-white/[0.06] transition-colors"
                        title="Visit"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                    ) : (
                      <span className="p-1.5 rounded-md text-white/10 cursor-not-allowed">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="mx-4 w-full max-w-md rounded-lg bg-[#1a1b1f] border border-white/[0.06] p-6 animate-slide-up">
            {deleteStep === 1 ? (
              <>
                <h3 className="mb-4 text-sm font-medium text-white/90">
                  Delete Deployment
                </h3>
                <p className="mb-6 text-sm text-white/50">
                  Are you sure you want to delete{" "}
                  <span className="text-white/90 font-mono">
                    {deleteTarget.appName}
                  </span>
                  ? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleDeleteCancel}
                    className="rounded-md bg-white/[0.06] px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/[0.1]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteContinue}
                    className="rounded-md bg-red-500/80 px-4 py-2 text-sm text-white transition-colors hover:bg-red-500"
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="mb-4 text-sm font-medium text-white/90">
                  Confirm Deletion
                </h3>
                <p className="mb-4 text-sm text-white/50">
                  Type{" "}
                  <span className="text-white/90 font-mono">confirm</span>{" "}
                  to permanently delete{" "}
                  <span className="text-white/90 font-mono">
                    {deleteTarget.appName}
                  </span>
                  .
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type 'confirm'"
                  className="mb-6 w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm text-white/90 focus:border-white/[0.15] focus:outline-none placeholder:text-white/20"
                />
                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleDeleteCancel}
                    className="rounded-md bg-white/[0.06] px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/[0.1]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={confirmText !== "confirm" || actionLoading === deleteTarget.id}
                    className="rounded-md bg-red-500/80 px-4 py-2 text-sm text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
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
