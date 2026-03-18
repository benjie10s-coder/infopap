// app/admin/features/page.tsx — Feature flag management page
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdminAuth } from "@/lib/hooks/useAdminAuth";
import { StatusBadge } from "@/components/admin/StatusBadge";

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  scope: "global" | "plan" | "user";
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export default function AdminFeaturesPage() {
  const { adminFetch } = useAdminAuth();
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFlag, setNewFlag] = useState({ key: "", name: "", description: "", scope: "global" as const });
  const [createError, setCreateError] = useState("");

  const fetchFeatures = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/features");
      if (res.ok) {
        const data = await res.json();
        setFeatures(data.features || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  const toggleFeature = async (feature: FeatureFlag) => {
    setToggling(feature.id);
    try {
      const res = await adminFetch("/api/admin/features", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: feature.id, enabled: !feature.enabled }),
      });
      if (res.ok) {
        setFeatures((prev) =>
          prev.map((f) =>
            f.id === feature.id ? { ...f, enabled: !f.enabled, updatedAt: new Date().toISOString() } : f
          )
        );
      }
    } catch {
      // silently fail
    } finally {
      setToggling(null);
    }
  };

  const updateScope = async (feature: FeatureFlag, scope: string) => {
    try {
      const res = await adminFetch("/api/admin/features", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: feature.id, scope }),
      });
      if (res.ok) {
        setFeatures((prev) =>
          prev.map((f) =>
            f.id === feature.id ? { ...f, scope: scope as FeatureFlag["scope"], updatedAt: new Date().toISOString() } : f
          )
        );
      }
    } catch {
      // silently fail
    }
  };

  const createFeature = async () => {
    setCreateError("");
    if (!newFlag.key || !newFlag.name) {
      setCreateError("Key and name are required");
      return;
    }
    try {
      const res = await adminFetch("/api/admin/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newFlag),
      });
      if (res.ok) {
        const data = await res.json();
        setFeatures((prev) => [...prev, data.feature]);
        setNewFlag({ key: "", name: "", description: "", scope: "global" });
        setShowCreateForm(false);
      } else {
        const data = await res.json();
        setCreateError(data.error || "Failed to create");
      }
    } catch {
      setCreateError("Network error");
    }
  };

  const enabledCount = features.filter((f) => f.enabled).length;
  const disabledCount = features.filter((f) => !f.enabled).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="h-8 w-8 rounded-full border-2 border-lagoon/30 border-t-lagoon animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Feature Flags</h1>
          <p className="text-sm text-white/30 mt-1">
            {enabledCount} enabled · {disabledCount} disabled · {features.length} total
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="rounded-lg bg-lagoon/15 border border-lagoon/20 px-4 py-2 text-sm text-lagoon font-medium hover:bg-lagoon/25 transition-colors"
        >
          {showCreateForm ? "Cancel" : "+ New Flag"}
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider">
            Create Feature Flag
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/30 mb-1">Key (unique identifier)</label>
              <input
                type="text"
                value={newFlag.key}
                onChange={(e) => setNewFlag({ ...newFlag, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
                placeholder="e.g., bulk_download"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-lagoon/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-white/30 mb-1">Name</label>
              <input
                type="text"
                value={newFlag.name}
                onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })}
                placeholder="e.g., Bulk Download"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-lagoon/50 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-white/30 mb-1">Description</label>
              <input
                type="text"
                value={newFlag.description}
                onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
                placeholder="What does this feature do?"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-lagoon/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-white/30 mb-1">Scope</label>
              <select
                value={newFlag.scope}
                onChange={(e) => setNewFlag({ ...newFlag, scope: e.target.value as "global" })}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:border-lagoon/50 focus:outline-none"
              >
                <option value="global">Global (all users)</option>
                <option value="plan">Plan-based</option>
                <option value="user">Per-user</option>
              </select>
            </div>
          </div>
          {createError && (
            <p className="text-sm text-red-400">{createError}</p>
          )}
          <button
            onClick={createFeature}
            className="rounded-lg bg-lagoon px-4 py-2 text-sm text-white font-medium hover:bg-lagoon/90 transition-colors"
          >
            Create Flag
          </button>
        </div>
      )}

      {/* Feature flags list */}
      <div className="space-y-3">
        {features.map((feature) => (
          <div
            key={feature.id}
            className={`rounded-xl border p-5 transition-colors ${
              feature.enabled
                ? "bg-green-500/5 border-green-500/20"
                : "bg-white/5 border-white/10"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-sm font-semibold text-white">{feature.name}</h3>
                  <code className="text-[11px] text-white/20 font-mono bg-white/5 rounded px-1.5 py-0.5">
                    {feature.key}
                  </code>
                  <StatusBadge status={feature.enabled ? "ACTIVE" : "DISABLED"} />
                </div>
                <p className="text-xs text-white/40 mt-1">{feature.description}</p>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/20 uppercase tracking-wider">Scope:</span>
                    <select
                      value={feature.scope}
                      onChange={(e) => updateScope(feature, e.target.value)}
                      className="rounded bg-white/5 border border-white/10 px-2 py-0.5 text-xs text-white/60 focus:border-lagoon/50 focus:outline-none"
                    >
                      <option value="global">Global</option>
                      <option value="plan">Plan-based</option>
                      <option value="user">Per-user</option>
                    </select>
                  </div>
                  {feature.scope === "plan" && Array.isArray(feature.metadata?.requiredPlans) ? (
                    <span className="text-[10px] text-white/30">
                      Plans: {(feature.metadata.requiredPlans as string[]).join(", ")}
                    </span>
                  ) : null}
                  <span className="text-[10px] text-white/20">
                    Updated {new Date(feature.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Toggle switch */}
              <button
                disabled={toggling === feature.id}
                onClick={() => toggleFeature(feature)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 disabled:opacity-50 ${
                  feature.enabled ? "bg-green-500" : "bg-white/20"
                }`}
                role="switch"
                aria-checked={feature.enabled}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition duration-200 ${
                    feature.enabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        ))}
      </div>

      {features.length === 0 && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-12 text-center text-white/20">
          No feature flags configured. Run the database migration to seed defaults.
        </div>
      )}
    </div>
  );
}
