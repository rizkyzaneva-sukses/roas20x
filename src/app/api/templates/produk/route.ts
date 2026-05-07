import { csvTemplate } from "@/lib/import";
export function GET() { return new Response(csvTemplate(["nama_produk", "hpp", "aktif"]), { headers: { "content-type": "text/csv", "content-disposition": "attachment; filename=template-produk-roas20x.csv" } }); }
