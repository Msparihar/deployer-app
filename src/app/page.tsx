"use client";

import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

interface Deployment {
  id: string;
  appName: string;
  url: string;
  createdAt: string;
}

export default function Home() {
  const { data: session, status } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deployments, setDeployments] = useState<Deployment[]>([]);

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
            Deploy your HTML files instantly with Dokploy
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
            Deploy New HTML File
          </h2>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="file-upload"
                className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Select HTML File
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".html"
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
              No deployments yet. Deploy your first HTML file above!
            </p>
          ) : (
            <div className="space-y-3">
              {deployments.map((deployment) => (
                <div
                  key={deployment.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
                >
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">
                      {deployment.appName}
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {new Date(deployment.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <a
                    href={deployment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    Visit
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
