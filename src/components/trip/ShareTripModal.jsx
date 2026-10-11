import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Copy, MessageCircle, Share2 } from "lucide-react";

export function generateWhatsAppText(trip) {
  if (!trip) return "";
  const itinerary = trip.itinerary;

  let text = `🌴 *${trip.title || `${trip.city} Adventure`}*\n`;
  text += `📍 *Destination:* ${trip.city}\n`;
  text += `📅 *Duration:* ${trip.days} Days (${trip.month})\n`;
  text += `💰 *Budget:* ₹${trip.budget?.toLocaleString("en-IN")} INR\n`;
  if (trip.interests?.length) {
    text += `🎯 *Interests:* ${trip.interests.join(", ")}\n`;
  }

  if (itinerary?.summary) {
    text += `\n✨ *Summary:* ${itinerary.summary}\n`;
  }

  if (itinerary?.estimated_budget) {
    const b = itinerary.estimated_budget;
    text += `\n💵 *Estimated Budget Breakdown:*\n`;
    if (b.hotels) text += `• Accommodation: ₹${b.hotels.toLocaleString("en-IN")}\n`;
    if (b.food) text += `• Food & Dining: ₹${b.food.toLocaleString("en-IN")}\n`;
    if (b.transport) text += `• Transport: ₹${b.transport.toLocaleString("en-IN")}\n`;
    if (b.attractions) text += `• Attractions: ₹${b.attractions.toLocaleString("en-IN")}\n`;
    if (b.misc) text += `• Misc / Buffer: ₹${b.misc.toLocaleString("en-IN")}\n`;
    text += `*Total Est:* ₹${(b.total || 0).toLocaleString("en-IN")}\n`;
  }

  if (itinerary?.days?.length) {
    text += `\n🗓️ *DAY-BY-DAY ITINERARY:*\n`;
    itinerary.days.forEach((day) => {
      text += `\n📍 *Day ${day.day}: ${day.theme}*\n`;
      if (day.morning?.activity) {
        text += `  🌅 Morning: ${day.morning.activity}${day.morning.location ? ` (${day.morning.location})` : ""}\n`;
        if (day.morning.note) text += `     📝 ${day.morning.note}\n`;
      }
      if (day.afternoon?.activity) {
        text += `  ☀️ Afternoon: ${day.afternoon.activity}${day.afternoon.location ? ` (${day.afternoon.location})` : ""}\n`;
        if (day.afternoon.note) text += `     📝 ${day.afternoon.note}\n`;
      }
      if (day.evening?.activity) {
        text += `  🌙 Evening: ${day.evening.activity}${day.evening.location ? ` (${day.evening.location})` : ""}\n`;
        if (day.evening.note) text += `     📝 ${day.evening.note}\n`;
      }
    });
  }

  text += `\n✈️ _Planned with VoyagerAI_`;
  return text;
}

export default function ShareTripModal({ open, onOpenChange, trip }) {
  const [copied, setCopied] = useState(false);
  const shareText = generateWhatsAppText(trip);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = shareText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleWhatsAppShare = () => {
    const encoded = encodeURIComponent(shareText);
    const url = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-6 rounded-2xl">
        <DialogHeader className="mb-2">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <Share2 className="w-5 h-5 text-emerald-600" />
            Share Trip with Friends
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Share your complete {trip?.city} itinerary with your travel group via WhatsApp or copy it.
          </DialogDescription>
        </DialogHeader>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 my-2">
          <Button
            onClick={handleWhatsAppShare}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl gap-2 py-5 shadow-lg shadow-emerald-600/20"
          >
            <MessageCircle className="w-4 h-4 fill-white" />
            Share on WhatsApp
          </Button>

          <Button
            variant="outline"
            onClick={handleCopy}
            className="flex-1 rounded-xl gap-2 py-5 border-slate-200 hover:bg-slate-50 font-medium"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-600" />
                <span>Copy Summary Text</span>
              </>
            )}
          </Button>
        </div>

        {/* Preview Container */}
        <div className="flex-1 min-h-[220px] overflow-hidden flex flex-col mt-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Message Preview
          </span>
          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-4 overflow-y-auto font-mono text-xs text-slate-700 whitespace-pre-wrap leading-relaxed select-all">
            {shareText}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
