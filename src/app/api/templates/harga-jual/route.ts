import { csvTemplate } from "@/lib/import";
export function GET() { return new Response(csvTemplate(["produk_1", "produk_2", "produk_3", "harga_jual", "platform", "tanggal"]), { headers: { "content-type": "text/csv", "content-disposition": "attachment; filename=template-harga-jual-roas20x.csv" } }); }
