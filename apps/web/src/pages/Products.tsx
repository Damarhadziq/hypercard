import { memo, useCallback, useDeferredValue, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '@pokemon-finance/ui';
import { Pencil, PlusCircle, Search, Trash2, X } from 'lucide-react';
import type { Product } from '../store/useStore';
import CleanSelect from '../components/CleanSelect';
import SideDrawer from '../components/SideDrawer';
import { useFeedback } from '../components/Feedback';
import { getRarityCode, getRarityLabel, rarityOptions } from '../lib/rarity';
import PokemonCardPicker from '../components/PokemonCardPicker';
import { ProductGridSkeleton } from '../components/LoadingSkeleton';
import type { PokemonTcgCard } from '../lib/pokemonTcg';
import CurrencyInput from '../components/CurrencyInput';
import { useProductMutations, useProducts } from '../hooks/useApiQueries';
import type { ProductInput } from '../services/types';

const languageOptions = [
  'Indonesian', 'English', 'Japanese', 'Korean', 'Simplified Chinese',
  'Traditional Chinese', 'Thai', 'French', 'German', 'Italian', 'Spanish', 'Portuguese',
];

const conditionOptions = [
  'Mint', 'Near Mint', 'Excellent', 'Good', 'Played', 'Damaged',
];

const conditionBadgeClasses: Record<string, string> = {
  Mint: 'border-green-400/35 bg-green-500/12 text-green-400',
  'Near Mint': 'border-emerald-400/35 bg-emerald-500/12 text-emerald-400',
  Excellent: 'border-sky-400/35 bg-sky-500/12 text-sky-400',
  Good: 'border-accent/40 bg-accent/12 text-accent',
  Played: 'border-orange-400/40 bg-orange-500/12 text-orange-400',
  Damaged: 'border-red-500/40 bg-red-500/10 text-red-500',
};

function getConditionBadgeClass(condition: string) {
  return conditionBadgeClasses[condition] || 'border-finance-300 bg-finance-100 text-finance-600';
}

function getProfitTextClass(sellPrice = 0, buyPrice = 0) {
  const margin = sellPrice - buyPrice;
  if (margin > 0) return 'text-green-500';
  if (margin < 0) return 'text-red-500';
  return 'text-finance-950';
}

const emptyProduct: Partial<Product> = {
  name: '',
  category: 'Single Card',
  condition: 'Near Mint',
  setName: '',
  rarity: '',
  language: 'English',
  cardNumber: '',
  finish: 'Regular',
  buyPrice: 0,
  sellPrice: 0,
  stock: 1,
};

function buildProductPayload(product: Partial<Product>): ProductInput {
  return {
    name: product.name?.trim() ?? '',
    category: product.category?.trim() || 'Single Card',
    condition: product.condition?.trim() || 'Near Mint',
    setName: product.setName?.trim() || '',
    rarity: product.rarity?.trim() || '',
    language: product.language?.trim() || 'English',
    cardNumber: product.cardNumber?.trim() || '',
    finish: product.finish?.trim() || 'Regular',
    buyPrice: Number(product.buyPrice) || 0,
    sellPrice: Number(product.sellPrice) || 0,
    stock: Number(product.stock) || 0,
    image: product.image?.trim() || '',
    notes: product.notes?.trim() || '',
  };
}

const cardGradientByName: Record<string, string> = {
  pikachu: 'from-yellow-200 via-amber-300 to-orange-400',
  charizard: 'from-orange-300 via-red-400 to-slate-900',
};

function getCardGradient(name: string) {
  const normalizedName = name.toLowerCase();
  const key = Object.keys(cardGradientByName).find((item) => normalizedName.includes(item));
  return key ? cardGradientByName[key] : 'from-sky-200 via-indigo-300 to-slate-800';
}

function ProductImage({ product, compact = false }: { product: Product; compact?: boolean }) {
  if (product.image) {
    return (
      <img
        src={product.image}
        alt={product.name}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-contain"
      />
    );
  }

  return (
    <div className={`relative flex h-full w-full flex-col justify-between overflow-hidden bg-gradient-to-br ${getCardGradient(product.name)} p-3 text-white`}>
      <div className="flex items-center justify-between gap-2 text-[10px] font-semibold tracking-wide text-white/80">
        <span>{product.category}</span>
        <span className="truncate">{getRarityCode(product.rarity || 'Card')}</span>
      </div>
      <div className="absolute inset-x-5 top-10 aspect-square rounded-full bg-accent/15 blur-sm" />
      <div className={`${compact ? 'h-16 w-16 text-4xl' : 'h-16 w-16 text-3xl'} relative mx-auto mt-6 flex items-center justify-center rounded-full bg-primary/20 font-black shadow-inner`}>
        {product.name.charAt(0)}
      </div>
      <div className="relative">
        <p className={`${compact ? 'text-sm' : 'text-base'} line-clamp-2 font-bold leading-tight`}>{product.name}</p>
        <p className="mt-1 text-[11px] text-white/80">{product.cardNumber || product.setName || product.condition}</p>
      </div>
    </div>
  );
}

function SpecPill({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-md bg-finance-50 px-3 py-2">
      <p className="text-[11px] font-medium tracking-wide text-finance-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-finance-900">{value || '-'}</p>
    </div>
  );
}

const ProductGridCard = memo(function ProductGridCard({
  product,
  onSelect,
}: {
  product: Product;
  onSelect: (product: Product) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      className="group overflow-hidden rounded-lg border border-finance-200 bg-white text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#d6b39f] focus:outline-none active:translate-y-0 active:border-[#c89f88] active:bg-finance-50 [contain-intrinsic-size:360px] [content-visibility:auto]"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-finance-100">
        <div className="h-full w-full transition-transform duration-300 ease-out group-hover:scale-[1.045]">
          <ProductImage product={product} compact />
        </div>
        <span className={`absolute right-2 top-2 rounded-md px-2 py-1 text-[11px] font-bold shadow-sm ${product.stock > 0 ? 'bg-white text-green-700' : 'bg-white text-red-700'}`}>
          {product.stock > 0 ? `Stok ${product.stock}` : 'Habis'}
        </span>
      </div>

      <div className="grid h-36 grid-rows-[22px_18px_42px_24px] gap-1 p-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold leading-5 text-finance-950" title={product.name}>{product.name}</h3>
        </div>

        <p className="truncate text-xs text-finance-500">{product.setName || product.category}</p>

        <div className="flex min-w-0 flex-wrap content-start gap-1 overflow-hidden">
          <span className="surface-pill h-fit rounded px-1.5 py-0.5 text-[11px] font-medium">{product.condition}</span>
          <span
            title={getRarityLabel(product.rarity)}
            className="surface-pill h-fit max-w-full truncate rounded px-1.5 py-0.5 text-[11px] font-semibold"
          >
            {getRarityCode(product.rarity)}
          </span>
        </div>

        <p className={`self-end whitespace-nowrap text-base font-extrabold tracking-tight ${getProfitTextClass(product.sellPrice, product.buyPrice)}`}>Rp {product.sellPrice.toLocaleString('id-ID')}</p>
      </div>
    </button>
  );
});

export default function Products() {
  const productsQuery = useProducts({ limit: 1000, inStock: true });
  const products = productsQuery.data?.data ?? [];
  const { createProduct, updateProduct, deleteProduct } = useProductMutations();
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState<Partial<Product>>(emptyProduct);
  const [selectedApiCard, setSelectedApiCard] = useState<PokemonTcgCard | null>(null);
  const { notify, confirm } = useFeedback();

  const filteredProducts = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase();

    return products.filter((product) => {
      if (product.stock <= 0) return false;
      if (!query) return true;

      return [
        product.name,
        product.category,
        product.condition,
        product.setName,
        product.rarity,
        product.cardNumber,
      ].some((value) => value?.toLowerCase().includes(query));
    });
  }, [deferredSearchQuery, products]);

  const selectProduct = useCallback((product: Product) => {
    setSelectedProduct(product);
  }, []);

  const openAddDrawer = () => {
    setEditingProduct(null);
    setNewProduct(emptyProduct);
    setSelectedApiCard(null);
    setIsAddOpen(true);
  };

  const openEditDrawer = (product: Product) => {
    setEditingProduct(product);
    setNewProduct({ ...product });
    setSelectedApiCard(null);
    setSelectedProduct(null);
    setIsAddOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!newProduct.name?.trim() || !newProduct.setName?.trim() || !newProduct.image || !newProduct.language || !newProduct.condition || !newProduct.rarity || !newProduct.sellPrice || !newProduct.stock || newProduct.stock < 1) {
      notify('error', 'Form produk belum lengkap', 'Pilih kartu, bahasa, kondisi, rarity, stok, dan harga jual.');
      return;
    }

    try {
      const productPayload = buildProductPayload(newProduct);

      if (editingProduct) {
        await updateProduct.mutateAsync({ id: editingProduct.id, input: productPayload });
        setIsAddOpen(false);
        setEditingProduct(null);
        setNewProduct(emptyProduct);
        setSelectedApiCard(null);
        notify('success', 'Produk diperbarui', `${newProduct.name} berhasil diperbarui.`);
        return;
      }

      await createProduct.mutateAsync(productPayload);
      setIsAddOpen(false);
      setNewProduct(emptyProduct);
      setSelectedApiCard(null);
      notify('success', 'Produk ditambahkan', `${newProduct.name} sudah masuk ke katalog.`);
    } catch (error) {
      notify('error', 'Produk gagal disimpan', error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan produk.');
    }
  };

  const isAddFormDirty = Object.entries(newProduct).some(([key, value]) => {
    const baseline = editingProduct ?? emptyProduct;
    const initialValue = baseline[key as keyof Product];
    return value !== initialValue;
  });

  const finalizeAddDrawerClose = () => {
    setIsAddOpen(false);
    setEditingProduct(null);
    setNewProduct(emptyProduct);
    setSelectedApiCard(null);
  };

  const canCloseAddDrawer = async () => {
    if (!isAddFormDirty) return true;
    const shouldClose = await confirm({
      title: editingProduct ? 'Batalkan edit produk?' : 'Batalkan tambah produk?',
      highlightLabel: editingProduct ? 'Produk yang sedang diedit' : 'Draft produk',
      highlight: editingProduct?.name || newProduct.name || 'Produk baru',
      message: 'Data yang sudah diisi belum disimpan. Jika dibatalkan, perubahan akan hilang.',
      confirmText: 'Tetap Batalkan',
      danger: true,
    });
    return shouldClose;
  };

  const confirmDeleteProduct = async (product: Product) => {
    const shouldDelete = await confirm({
      title: 'Hapus produk?',
      highlightLabel: 'Produk yang akan dihapus',
      highlight: product.name,
      message: 'Produk akan dihapus dari katalog. Aksi ini tidak bisa dibatalkan.',
      confirmText: 'Hapus Produk',
      danger: true,
    });
    if (!shouldDelete) return;
    try {
      await deleteProduct.mutateAsync(product.id);
    } catch (error) {
      notify('error', 'Produk gagal dihapus', error instanceof Error ? error.message : 'Terjadi kesalahan saat menghapus produk.');
      return;
    }
    setSelectedProduct(null);
    notify('success', 'Produk dihapus', `${product.name} sudah dihapus dari katalog.`);
  };

  const handleSelectApiCard = (card: PokemonTcgCard) => {
    setSelectedApiCard(card);
    setNewProduct((current) => ({
      ...current,
      name: card.name,
      setName: card.set.name,
      image: card.images.large || card.images.small,
      category: 'Single Card',
      condition: 'Near Mint',
      rarity: '',
      cardNumber: '',
      finish: 'Regular',
      stock: current.stock || 1,
      sourceCardId: card.id,
      sourceCardUrl: `https://api.pokemontcg.io/v2/cards/${card.id}`,
    }));
  };

  return (
    <div className="animate-soft-in space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-finance-950">Katalog Produk</h1>
          <p className="mt-1 text-sm text-finance-500">Kelola stok, harga, foto, dan spesifikasi kartu Pokemon.</p>
        </div>
        <Button onClick={openAddDrawer} className="flex w-full items-center justify-center space-x-2 md:w-auto">
          <PlusCircle size={18} />
          <span>Tambah Produk</span>
        </Button>
      </div>

      <div className="flex flex-col gap-3 border-b border-finance-100 pb-4 md:pb-5 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-finance-400" />
          <Input
            placeholder="Cari nama, set, rarity, nomor kartu..."
            className="h-11 pl-10"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
        <p className="text-sm font-medium text-finance-500">{filteredProducts.length} produk tersedia</p>
      </div>

      {productsQuery.isLoading ? (
        <ProductGridSkeleton />
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-finance-200 py-14 text-center text-sm text-finance-500">
          Tidak ada produk ditemukan.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {filteredProducts.map((product) => (
            <ProductGridCard key={product.id} product={product} onSelect={selectProduct} />
          ))}
        </div>
      )}

      {selectedProduct && (
        <SideDrawer onClose={() => setSelectedProduct(null)}>
          {(requestClose) => (
          <>
            <div className="side-drawer-header sticky top-0 z-30 flex items-start justify-between gap-4 bg-finance-50 px-6 py-5 md:px-8">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-finance-950">{selectedProduct.name}</h2>
                <p className="mt-0.5 truncate text-sm text-finance-500">{selectedProduct.setName || selectedProduct.category}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => openEditDrawer(selectedProduct)} aria-label="Edit produk" className="text-finance-500 hover:text-finance-900">
                  <Pencil size={18} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => confirmDeleteProduct(selectedProduct)} aria-label="Hapus produk" className="text-red-500 hover:text-red-400">
                  <Trash2 size={18} />
                </Button>
                <Button variant="ghost" size="icon" onClick={requestClose} aria-label="Tutup detail">
                  <X size={18} />
                </Button>
              </div>
            </div>

            <div className="space-y-5 p-4 md:px-8 md:py-5">
              <Card className="animate-soft-in overflow-hidden border-finance-200 shadow-sm">
                <CardContent className="p-0">
                  <div className="grid gap-0 md:grid-cols-[240px_1fr]">
                    <div className="flex items-center justify-center bg-white p-5">
                      <div className="mx-auto aspect-[2.5/3.5] w-full max-w-[220px] overflow-hidden rounded-[10px]">
                        <ProductImage product={selectedProduct} />
                      </div>
                    </div>
                    <div className="relative min-w-0 border-t border-finance-100 p-5 pb-20 md:border-l md:border-t-0">
                      <div className="relative z-10 flex flex-wrap gap-2">
                        <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{getRarityLabel(selectedProduct.rarity)}</span>
                        <span className={`rounded-md border px-2.5 py-1 text-xs font-bold ${getConditionBadgeClass(selectedProduct.condition)}`}>
                          {selectedProduct.condition}
                        </span>
                        <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${selectedProduct.stock > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          {selectedProduct.stock > 0 ? `Stok ${selectedProduct.stock}` : 'Habis'}
                        </span>
                      </div>

                      <div className="relative z-10 mt-5">
                        <p className={`text-3xl font-extrabold tracking-tight ${getProfitTextClass(selectedProduct.sellPrice, selectedProduct.buyPrice)}`}>Rp {selectedProduct.sellPrice.toLocaleString('id-ID')}</p>
                      </div>

                      <div className="relative z-10 mt-5 grid grid-cols-2 gap-4 border-t border-finance-100 pt-5">
                        <div>
                          <p className="text-xs font-semibold tracking-wide text-finance-400">Harga modal</p>
                          <p className="mt-1 text-lg font-bold text-finance-950">Rp {selectedProduct.buyPrice.toLocaleString('id-ID')}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold tracking-wide text-finance-400">Margin</p>
                          <p className={`mt-1 text-lg font-bold ${getProfitTextClass(selectedProduct.sellPrice, selectedProduct.buyPrice)}`}>Rp {(selectedProduct.sellPrice - selectedProduct.buyPrice).toLocaleString('id-ID')}</p>
                        </div>
                      </div>
                      <img
                        src="/hypercard-logo.png"
                        alt=""
                        aria-hidden="true"
                        className="pointer-events-none absolute bottom-4 right-4 h-16 w-16 object-contain opacity-25"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="animate-soft-in border-finance-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Detail Input Produk</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    <SpecPill label="Kartu Pokemon" value={selectedProduct.name} />
                    <SpecPill label="Set" value={selectedProduct.setName} />
                    <SpecPill label="Bahasa" value={selectedProduct.language} />
                    <SpecPill label="Kondisi" value={selectedProduct.condition} />
                    <SpecPill label="Rarity" value={getRarityLabel(selectedProduct.rarity)} />
                    <SpecPill label="Stok" value={selectedProduct.stock > 0 ? `${selectedProduct.stock}` : 'Habis'} />
                    <SpecPill label="Harga Modal" value={`Rp ${selectedProduct.buyPrice.toLocaleString('id-ID')}`} />
                    <SpecPill label="Harga Jual" value={`Rp ${selectedProduct.sellPrice.toLocaleString('id-ID')}`} />
                    <SpecPill label="Margin" value={`Rp ${(selectedProduct.sellPrice - selectedProduct.buyPrice).toLocaleString('id-ID')}`} />
                  </div>
                </CardContent>
              </Card>

              <Card className="animate-soft-in border-finance-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Catatan Produk</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-finance-500">
                    {selectedProduct.notes || 'Belum ada catatan tambahan untuk produk ini.'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
          )}
        </SideDrawer>
      )}

      {isAddOpen && (
        <SideDrawer onClose={finalizeAddDrawerClose} onBeforeClose={canCloseAddDrawer}>
          {(requestClose) => (
          <>
            <div className="side-drawer-header sticky top-0 z-30 flex items-start justify-between gap-4 bg-finance-50 px-6 py-5 md:px-8">
              <div>
                <h2 className="text-lg font-bold text-finance-950">{editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}</h2>
                <p className="mt-0.5 text-sm text-finance-500">{editingProduct ? 'Perbarui data dan spesifikasi kartu.' : 'Lengkapi data dan spesifikasi kartu.'}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={requestClose} aria-label="Tutup tambah produk">
                <X size={18} />
              </Button>
            </div>

            <div className="space-y-5 p-4 md:px-8 md:py-5">
              <Card className="animate-soft-in border-finance-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Informasi Produk</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pilih Kartu Pokémon <span className="text-primary">*</span></label>
                    <PokemonCardPicker
                      selectedCard={selectedApiCard}
                      currentName={newProduct.name}
                      currentSet={newProduct.setName}
                      currentImage={newProduct.image}
                      onSelect={handleSelectApiCard}
                    />
                  </div>

                  <div className="grid gap-4 border-t border-finance-100 pt-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Bahasa <span className="text-primary">*</span></label>
                      <CleanSelect
                        value={newProduct.language || ''}
                        onChange={(value) => setNewProduct({ ...newProduct, language: value })}
                        placeholder="Pilih bahasa"
                        searchable
                        options={languageOptions.map((value) => ({ value, label: value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Kondisi Saat Ini <span className="text-primary">*</span></label>
                      <CleanSelect
                        value={newProduct.condition || ''}
                        onChange={(value) => setNewProduct({ ...newProduct, condition: value })}
                        placeholder="Pilih kondisi"
                        options={conditionOptions.map((value) => ({ value, label: value }))}
                      />
                    </div>
                    <div className="min-w-0 space-y-2">
                      <label className="text-sm font-medium">Rarity <span className="text-primary">*</span></label>
                      <CleanSelect
                        value={newProduct.rarity || ''}
                        onChange={(value) => setNewProduct({ ...newProduct, rarity: value })}
                        placeholder="Pilih rarity"
                        searchable
                        searchPlaceholder="Cari kode atau nama rarity..."
                        options={rarityOptions.map((option) => ({ ...option }))}
                      />
                    </div>
                    <div className="min-w-0 space-y-2">
                      <label className="text-sm font-medium">Stok Produk <span className="text-primary">*</span></label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 w-11 shrink-0 px-0"
                          onClick={() => setNewProduct({ ...newProduct, stock: Math.max(1, (newProduct.stock || 1) - 1) })}
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          min={1}
                          value={newProduct.stock || 1}
                          onChange={(event) => setNewProduct({ ...newProduct, stock: Math.max(1, Number(event.target.value) || 1) })}
                          className="h-11 text-center text-base font-semibold"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 w-11 shrink-0 px-0"
                          onClick={() => setNewProduct({ ...newProduct, stock: (newProduct.stock || 1) + 1 })}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                    <CurrencyInput
                      label="Harga Modal (Opsional)"
                      value={newProduct.buyPrice || 0}
                      onChange={(value) => setNewProduct({ ...newProduct, buyPrice: value })}
                    />
                    <CurrencyInput
                      label="Harga Jual"
                      required
                      value={newProduct.sellPrice || 0}
                      onChange={(value) => setNewProduct({ ...newProduct, sellPrice: value })}
                    />
                    {(newProduct.buyPrice || newProduct.sellPrice) ? (
                      <div className="md:col-span-2 grid grid-cols-2 gap-3 rounded-lg bg-finance-50 p-3">
                        <div>
                          <p className="text-xs font-medium text-finance-500">Margin per kartu</p>
                          <p className={`mt-1 text-base font-bold ${(newProduct.sellPrice || 0) >= (newProduct.buyPrice || 0) ? 'text-green-700' : 'text-red-500'}`}>
                            Rp {((newProduct.sellPrice || 0) - (newProduct.buyPrice || 0)).toLocaleString('id-ID')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-finance-500">Persentase margin</p>
                          <p className={`mt-1 text-base font-bold ${(newProduct.sellPrice || 0) >= (newProduct.buyPrice || 0) ? 'text-green-700' : 'text-red-500'}`}>
                            {newProduct.buyPrice
                              ? `${((((newProduct.sellPrice || 0) - newProduct.buyPrice) / newProduct.buyPrice) * 100).toFixed(1)}%`
                              : '0%'}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-end gap-3 pb-0 pt-0">
                <Button onClick={handleSaveProduct} disabled={createProduct.isPending || updateProduct.isPending}>
                  {createProduct.isPending || updateProduct.isPending ? 'Menyimpan...' : editingProduct ? 'Update Produk' : 'Simpan Produk'}
                </Button>
              </div>
            </div>
          </>
          )}
        </SideDrawer>
      )}
    </div>
  );
}
