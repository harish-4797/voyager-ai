import { jsPDF } from "jspdf";

/**
 * Generate and download a beautifully styled PDF travel guide for a trip.
 */
export function exportTripToPdf(trip) {
  if (!trip) return;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPageBreak = (neededHeight) => {
    if (y + neededHeight > pageHeight - margin - 10) {
      doc.addPage();
      y = margin + 5;
      drawHeaderBanner();
    }
  };

  const drawHeaderBanner = () => {
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(margin, y, contentWidth, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`VOYAGER AI — ${trip.city.toUpperCase()} TRAVEL GUIDE`, margin + 3, y + 5.5);
    y += 12;
  };

  // 1. Cover / Top Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(margin, y, contentWidth, 38, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(trip.title || `${trip.days}-Day ${trip.city} Adventure`, margin + 6, y + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225); // slate-300
  const metaLine = `Destination: ${trip.city}  |  Duration: ${trip.days} Days  |  Month: ${trip.month}  |  Budget: Rs. ${trip.budget?.toLocaleString("en-IN") || "N/A"}`;
  doc.text(metaLine, margin + 6, y + 21);

  const interestsLine = `Interests: ${(trip.interests || []).join(", ") || "General Sightseeing"}`;
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(interestsLine, margin + 6, y + 29);

  y += 44;

  const itinerary = trip.itinerary;

  // 2. Summary
  if (itinerary?.summary) {
    checkPageBreak(25);
    doc.setFillColor(238, 242, 255); // indigo-50
    doc.roundedRect(margin, y, contentWidth, 20, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(67, 56, 202); // indigo-700
    doc.text("AI TRIP SUMMARY", margin + 5, y + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85); // slate-700
    const summaryLines = doc.splitTextToSize(itinerary.summary, contentWidth - 10);
    doc.text(summaryLines, margin + 5, y + 12);

    y += 24;
  }

  // 3. Estimated Budget Breakdown Table
  if (itinerary?.estimated_budget) {
    checkPageBreak(35);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("Estimated Budget Breakdown", margin, y);
    y += 5;

    const b = itinerary.estimated_budget;
    const items = [
      { label: "Accommodation", val: b.hotels },
      { label: "Food & Dining", val: b.food },
      { label: "Local Transport", val: b.transport },
      { label: "Attractions & Activities", val: b.attractions },
      { label: "Miscellaneous & Tips", val: b.misc },
    ];

    const colWidth = contentWidth / 3;
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Category", margin + 4, y + 5);
    doc.text("Estimated Cost (INR)", margin + colWidth * 2, y + 5);
    y += 8;

    doc.setFont("helvetica", "normal");
    items.forEach((item) => {
      if (item.val === undefined) return;
      doc.text(item.label, margin + 4, y + 4.5);
      doc.text(`Rs. ${Number(item.val).toLocaleString("en-IN")}`, margin + colWidth * 2, y + 4.5);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + 6, margin + contentWidth, y + 6);
      y += 6.5;
    });

    // Total Row
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, contentWidth, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.text("Total Estimated Expense", margin + 4, y + 5);
    doc.text(`Rs. ${Number(b.total || 0).toLocaleString("en-IN")}`, margin + colWidth * 2, y + 5);
    y += 12;
  }

  // 4. Day by Day Detailed Plan
  if (itinerary?.days && itinerary.days.length > 0) {
    checkPageBreak(15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text("Day-by-Day Itinerary", margin, y);
    y += 7;

    itinerary.days.forEach((day) => {
      checkPageBreak(40);

      // Day Title Banner
      doc.setFillColor(30, 41, 59); // slate-800
      doc.roundedRect(margin, y, contentWidth, 8, 1.5, 1.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(255, 255, 255);
      doc.text(`Day ${day.day}: ${day.theme || "Explore"}`, margin + 4, y + 5.5);
      y += 11;

      const periods = [
        { label: "Morning", data: day.morning, color: [217, 119, 6] },
        { label: "Afternoon", data: day.afternoon, color: [2, 132, 199] },
        { label: "Evening", data: day.evening, color: [99, 102, 241] },
      ];

      periods.forEach((p) => {
        if (!p.data) return;
        checkPageBreak(25);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(p.color[0], p.color[1], p.color[2]);
        doc.text(p.label.toUpperCase(), margin + 2, y);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text(p.data.activity || "Free Exploration", margin + 24, y);
        y += 4.5;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        if (p.data.description) {
          const descLines = doc.splitTextToSize(p.data.description, contentWidth - 26);
          doc.text(descLines, margin + 24, y);
          y += descLines.length * 4;
        }

        const details = [];
        if (p.data.location) details.push(`Location: ${p.data.location}`);
        if (p.data.duration) details.push(`Duration: ${p.data.duration}`);
        if (p.data.estimated_cost > 0) details.push(`Est. Cost: Rs. ${p.data.estimated_cost.toLocaleString("en-IN")}`);
        if (p.data.tips) details.push(`Tip: ${p.data.tips}`);
        if (p.data.note) details.push(`My note: ${p.data.note}`);

        if (details.length > 0) {
          doc.setFontSize(7.5);
          doc.setTextColor(100, 116, 139);
          const metaLines = doc.splitTextToSize(details.join("  |  "), contentWidth - 26);
          doc.text(metaLines, margin + 24, y);
          y += metaLines.length * 3.5;
        }

        y += 3;
      });

      y += 3;
    });
  }

  // 5. Packing Checklist (if available)
  if (trip.packing_list && trip.packing_list.categories?.length > 0) {
    checkPageBreak(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text("Trip Packing Checklist", margin, y);
    y += 7;

    trip.packing_list.categories.forEach((cat) => {
      checkPageBreak(20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text(cat.name, margin + 2, y);
      y += 4.5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);

      (cat.items || []).forEach((item) => {
        checkPageBreak(6);
        const checkMark = item.packed ? "[X]" : "[ ]";
        doc.text(`${checkMark}  ${item.text}`, margin + 4, y);
        y += 4;
      });

      y += 3;
    });
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `VoyagerAI — Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    );
  }

  const safeCity = (trip.city || "Trip").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`${safeCity}_Itinerary_VoyagerAI.pdf`);
}
