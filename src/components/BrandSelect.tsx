export function BrandSelect({ brands, name = "brandId", defaultValue }: { brands: { id: number; nama: string }[]; name?: string; defaultValue?: number }) {
  return (
    <select className="input" name={name} defaultValue={defaultValue ?? brands[0]?.id}>
      {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.nama}</option>)}
    </select>
  );
}
