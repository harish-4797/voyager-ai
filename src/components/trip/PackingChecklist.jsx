import React, { useState } from "react";
import {
  Luggage,
  Sparkles,
  Loader2,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Shirt,
  Droplet,
  Smartphone,
  FileText,
  Compass,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { voyager } from "@/api/voyagerClient";

const CATEGORY_ICONS = {
  "Clothing & Footwear": Shirt,
  "Toiletries & Sun Care": Droplet,
  "Toiletries & Health": Droplet,
  "Toiletries & Sun Protection": Droplet,
  "Electronics & Gadgets": Smartphone,
  "Electronics & Gear": Smartphone,
  "Documents & Cash": FileText,
  "Documents & Money": FileText,
  "Destination Essentials": Compass,
  "Goa Essentials": Compass,
};

export default function PackingChecklist({ trip, onTripUpdate }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newItemText, setNewItemText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [filter, setFilter] = useState("all"); // 'all' | 'unpacked' | 'packed'

  const packingList = trip?.packing_list;
  const categories = packingList?.categories || [];

  // Calculate statistics
  const allItems = categories.flatMap((c) => c.items || []);
  const totalItems = allItems.length;
  const packedItems = allItems.filter((i) => i.packed).length;
  const percentPacked = totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 0;

  const generatePackingList = async () => {
    setLoading(true);
    setError(null);

    try {
      const prompt = `You are an expert travel assistant. Generate a highly tailored packing checklist for a ${trip.days}-day trip to ${trip.city} in ${trip.month}.
Trip Details:
- Interests: ${(trip.interests || []).join(", ") || "sightseeing, food"}
- Budget Tier: ₹${trip.budget} INR
- Duration: ${trip.days} days

OUTPUT: Return ONLY a valid JSON object. Every item MUST have a unique id (e.g. "c1", "t1"), text (concise, specific with recommended counts e.g. "3x t-shirts"), and packed: false.
Structure:
{
  "categories": [
    {
      "name": "Clothing & Footwear",
      "items": [
        { "id": "c1", "text": "Lightweight cotton shirts / tops (4-5)", "packed": false },
        { "id": "c2", "text": "Comfortable walking shoes / sneakers", "packed": false },
        { "id": "c3", "text": "Swimwear & beach sandals", "packed": false }
      ]
    },
    {
      "name": "Toiletries & Sun Protection",
      "items": [
        { "id": "t1", "text": "Sunscreen (SPF 50+)", "packed": false },
        { "id": "t2", "text": "Mosquito / bug repellent spray", "packed": false },
        { "id": "t3", "text": "Travel toiletries & personal hygiene kit", "packed": false }
      ]
    },
    {
      "name": "Electronics & Gear",
      "items": [
        { "id": "e1", "text": "Power bank (10,000mAh+)", "packed": false },
        { "id": "e2", "text": "Waterproof phone cover", "packed": false },
        { "id": "e3", "text": "Charging cables & adapters", "packed": false }
      ]
    },
    {
      "name": "Documents & Money",
      "items": [
        { "id": "d1", "text": "Govt Photo ID (Aadhaar / Voter ID / Passport)", "packed": false },
        { "id": "d2", "text": "Cash in small denominations (₹500, ₹100) for beach shacks & autos", "packed": false },
        { "id": "d3", "text": "Booking confirmations / tickets", "packed": false }
      ]
    },
    {
      "name": "${trip.city} Essentials",
      "items": [
        { "id": "dest1", "text": "UV Protection Sunglasses", "packed": false },
        { "id": "dest2", "text": "Reusable water bottle", "packed": false }
      ]
    }
  ]
}`;

      const result = await voyager.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            categories: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        text: { type: "string" },
                        packed: { type: "boolean" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (result && result.categories) {
        const updated = await voyager.entities.Trip.update(trip.id, {
          packing_list: result,
        });
        if (onTripUpdate) onTripUpdate(updated);
      }
    } catch (err) {
      setError(err.message || "Failed to generate packing list.");
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = async (catIndex, itemId) => {
    const newCategories = categories.map((cat, ci) => {
      if (ci !== catIndex) return cat;
      return {
        ...cat,
        items: cat.items.map((item) =>
          item.id === itemId ? { ...item, packed: !item.packed } : item
        ),
      };
    });

    const updated = await voyager.entities.Trip.update(trip.id, {
      packing_list: { categories: newCategories },
    });
    if (onTripUpdate) onTripUpdate(updated);
  };

  const deleteItem = async (catIndex, itemId) => {
    const newCategories = categories.map((cat, ci) => {
      if (ci !== catIndex) return cat;
      return {
        ...cat,
        items: cat.items.filter((item) => item.id !== itemId),
      };
    });

    const updated = await voyager.entities.Trip.update(trip.id, {
      packing_list: { categories: newCategories },
    });
    if (onTripUpdate) onTripUpdate(updated);
  };

  const addItem = async (catIndex) => {
    if (!newItemText.trim()) return;

    const newCategories = categories.map((cat, ci) => {
      if (ci !== catIndex) return cat;
      return {
        ...cat,
        items: [
          ...(cat.items || []),
          {
            id: `custom_${Date.now()}`,
            text: newItemText.trim(),
            packed: false,
          },
        ],
      };
    });

    setNewItemText("");
    setSelectedCategory("");

    const updated = await voyager.entities.Trip.update(trip.id, {
      packing_list: { categories: newCategories },
    });
    if (onTripUpdate) onTripUpdate(updated);
  };

  return (
    <div className="surface p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sunset to-coral flex items-center justify-center shadow-md shadow-sunset/30">
            <Luggage className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900">Smart Packing Checklist</h3>
            <p className="text-xs text-slate-500">
              Tailored for {trip.city} in {trip.month} ({trip.days} days)
            </p>
          </div>
        </div>

        {totalItems > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={generatePackingList}
            disabled={loading}
            className="rounded-full border-ink/10 text-xs font-semibold gap-1.5 self-start sm:self-auto"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-sunset" />
            )}
            Regenerate with AI
          </Button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium">
          {error}
        </div>
      )}

      {/* Empty State */}
      {totalItems === 0 && (
        <div className="text-center py-8 px-4 bg-slate-50/70 border border-dashed border-slate-200 rounded-xl space-y-3">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <Sparkles className="w-6 h-6 text-sunset" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-800 text-sm">No packing list generated yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Let AI analyze your destination, season, activities, and duration to create a personalized packing guide.
            </p>
          </div>
          <Button
            onClick={generatePackingList}
            disabled={loading}
            className="bg-ink hover:bg-sunset transition-colors text-white text-xs font-semibold rounded-full px-5 py-2.5 shadow-md"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Checklist...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2 text-sun" />
                Generate Packing List with AI
              </>
            )}
          </Button>
        </div>
      )}

      {/* Progress & Filters */}
      {totalItems > 0 && (
        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">
                Packing Progress: {packedItems} of {totalItems} items packed
              </span>
              <span className="font-bold text-sunset">{percentPacked}%</span>
            </div>
            <Progress value={percentPacked} className="h-2 rounded-full" />
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex gap-2 text-xs">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                filter === "all"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All ({totalItems})
            </button>
            <button
              onClick={() => setFilter("unpacked")}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                filter === "unpacked"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              To Pack ({totalItems - packedItems})
            </button>
            <button
              onClick={() => setFilter("packed")}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                filter === "packed"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Packed ({packedItems})
            </button>
          </div>
        </div>
      )}

      {/* Category List */}
      {totalItems > 0 && (
        <div className="space-y-5">
          {categories.map((cat, catIdx) => {
            const Icon = CATEGORY_ICONS[cat.name] || CheckSquare;
            const filteredItems = (cat.items || []).filter((item) => {
              if (filter === "packed") return item.packed;
              if (filter === "unpacked") return !item.packed;
              return true;
            });

            if (filteredItems.length === 0 && filter !== "all") return null;

            const catPacked = (cat.items || []).filter((i) => i.packed).length;
            const catTotal = (cat.items || []).length;

            return (
              <div
                key={cat.name || catIdx}
                className="border border-ink/[0.06] rounded-2xl overflow-hidden bg-white/70"
              >
                {/* Category Header */}
                <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-slate-600" />
                    <span className="text-sm font-bold text-slate-800">{cat.name}</span>
                  </div>
                  <Badge variant="outline" className="text-[11px] font-semibold border-slate-200">
                    {catPacked}/{catTotal}
                  </Badge>
                </div>

                {/* Items */}
                <div className="p-3 space-y-1">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="group flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                      onClick={() => toggleItem(catIdx, item.id)}
                    >
                      <div className="flex items-center gap-3">
                        {item.packed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-300 group-hover:text-slate-400 shrink-0" />
                        )}
                        <span
                          className={`text-xs select-none transition ${
                            item.packed
                              ? "line-through text-slate-400 font-normal"
                              : "text-slate-700 font-medium"
                          }`}
                        >
                          {item.text}
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteItem(catIdx, item.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition"
                        title="Delete item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Inline Add Item Input */}
                  {selectedCategory === cat.name ? (
                    <div className="flex items-center gap-2 pt-2">
                      <Input
                        size="sm"
                        placeholder="Add custom item..."
                        value={newItemText}
                        onChange={(e) => setNewItemText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addItem(catIdx);
                        }}
                        className="h-8 text-xs rounded-lg"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => addItem(catIdx)}
                        className="h-8 px-3 text-xs rounded-lg bg-slate-900 text-white"
                      >
                        Add
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedCategory("");
                          setNewItemText("");
                        }}
                        className="h-8 px-2 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedCategory(cat.name)}
                      className="flex items-center gap-1.5 text-xs text-sunset hover:text-coral font-semibold p-2 rounded-lg hover:bg-sunset/5 transition w-full"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add item to {cat.name}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
