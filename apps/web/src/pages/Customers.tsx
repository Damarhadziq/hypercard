import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@pokemon-finance/ui';
import { PlusCircle, Search, Edit2, Trash2, MapPin, Phone, X } from 'lucide-react';
import type { Customer } from '../store/useStore';
import SideDrawer from '../components/SideDrawer';
import { useFeedback } from '../components/Feedback';
import Pagination from '../components/Pagination';
import { useCustomerMutations, useCustomers } from '../hooks/useApiQueries';
import useClampedPage from '../hooks/useClampedPage';
import useDebouncedValue from '../hooks/useDebouncedValue';
import AddressPicker, { type AddressPickerValue } from '../components/AddressPicker';
import { MobileListSkeleton, TableSkeletonRows } from '../components/LoadingSkeleton';
import { joinAddress, splitStoredAddress } from '../lib/indonesiaLocations';

export default function Customers() {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebouncedValue(searchQuery.trim());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const customersQuery = useCustomers({
    search: debouncedSearchQuery || undefined,
    page,
    limit: pageSize,
  });
  const customers = customersQuery.data?.data ?? [];
  const totalItems = customersQuery.data?.pagination.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const { createCustomer, updateCustomer, deleteCustomer } = useCustomerMutations();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const { notify, confirm } = useFeedback();

  const [customerForm, setCustomerForm] = useState<Partial<Customer>>({
    name: '', phone: '', address: '', postalCode: '', notes: '', history: ''
  });
  const [addressPicker, setAddressPicker] = useState<AddressPickerValue>({
    province: '', city: '', district: '',
  });

  useClampedPage(page, totalPages, setPage, !customersQuery.isFetching);

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingCustomer(null);
    setCustomerForm({ name: '', phone: '', address: '', postalCode: '', notes: '', history: '' });
    setAddressPicker({ province: '', city: '', district: '' });
  };

  const openAddForm = () => {
    setEditingCustomer(null);
    setCustomerForm({ name: '', phone: '', address: '', postalCode: '', notes: '', history: '' });
    setAddressPicker({ province: '', city: '', district: '' });
    setIsFormOpen(true);
  };

  const openEditForm = (customer: Customer) => {
    const storedAddress = splitStoredAddress(customer.address);
    setEditingCustomer(customer);
    setCustomerForm({ ...customer, address: storedAddress.detail });
    setAddressPicker({
      province: storedAddress.province,
      city: storedAddress.city,
      district: storedAddress.district,
    });
    setIsFormOpen(true);
  };

  const editingAddressBaseline = splitStoredAddress(editingCustomer?.address ?? '');
  const customerBaseline: Partial<Customer> = editingCustomer ? {
    ...editingCustomer,
    address: editingAddressBaseline.detail,
  } : {
    name: '', phone: '', address: '', postalCode: '', notes: '', history: '',
  };
  const hasChangedCustomerField = ['name', 'phone', 'address', 'postalCode', 'notes', 'history'].some(
    (key) => (customerForm[key as keyof Customer] ?? '') !== (customerBaseline[key as keyof Customer] ?? ''),
  );
  const isCustomerFormDirty = hasChangedCustomerField
    || addressPicker.province !== editingAddressBaseline.province
    || addressPicker.city !== editingAddressBaseline.city
    || addressPicker.district !== editingAddressBaseline.district;
  const canCloseCustomerForm = async () => {
    if (!isCustomerFormDirty) return true;
    return confirm({
      title: editingCustomer ? 'Batalkan edit pembeli?' : 'Batalkan tambah pembeli?',
      highlightLabel: editingCustomer ? 'Pembeli' : 'Draft pembeli',
      highlight: customerForm.name?.trim() || editingCustomer?.name || 'Pembeli baru',
      message: 'Data yang sudah diisi belum disimpan dan akan hilang.',
      confirmText: 'Tetap Batalkan',
      danger: true,
    });
  };

  const handleSave = async () => {
    if (!customerForm.name?.trim() || !customerForm.phone?.trim() || !customerForm.address?.trim() || !customerForm.postalCode?.trim()) {
      notify('error', 'Form pembeli belum lengkap', 'Nama, nomor handphone, alamat, dan kode pos wajib diisi.');
      return;
    }

    const payload = {
      ...customerForm,
      address: joinAddress({ detail: customerForm.address, ...addressPicker }),
    };

    try {
      if (editingCustomer) {
        await updateCustomer.mutateAsync({ id: editingCustomer.id, input: payload });
        notify('success', 'Pembeli diperbarui', `${customerForm.name} berhasil diperbarui.`);
        resetForm();
        return;
      }

      await createCustomer.mutateAsync(payload as Omit<Customer, 'id'>);
      notify('success', 'Pembeli ditambahkan', `${customerForm.name} berhasil disimpan.`);
      resetForm();
    } catch (error) {
      notify('error', 'Pembeli gagal disimpan', error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan pembeli.');
    }
  };

  const handleDelete = async (customer: Customer) => {
    const shouldDelete = await confirm({
      title: 'Hapus pembeli?',
      highlightLabel: 'Pembeli yang akan dihapus',
      highlight: customer.name,
      message: 'Data ini akan dihapus dari daftar pembeli.',
      confirmText: 'Hapus Pembeli',
      danger: true,
    });
    if (!shouldDelete) return;
    try {
      await deleteCustomer.mutateAsync(customer.id);
    } catch (error) {
      notify('error', 'Pembeli gagal dihapus', error instanceof Error ? error.message : 'Terjadi kesalahan saat menghapus pembeli.');
      return;
    }
    notify('success', 'Pembeli dihapus', `${customer.name} sudah dihapus.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-finance-950">Data Pembeli</h1>
          <p className="text-sm text-finance-500 mt-1">Kelola data pelanggan untuk mempercepat pembuatan invoice.</p>
        </div>
        <Button onClick={openAddForm} className="flex w-full items-center justify-center space-x-2 sm:w-auto">
          <PlusCircle size={18} />
          <span>Tambah Pembeli</span>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-2">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-finance-400" />
              <Input 
                placeholder="Cari nama atau nomor HP..." 
                className="pl-9"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 md:hidden">
            {customersQuery.isLoading ? (
              <MobileListSkeleton />
            ) : customers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-finance-200 py-10 text-center text-sm text-finance-500">
                Tidak ada pembeli ditemukan.
              </div>
            ) : (
              customers.map((customer) => (
                <article key={customer.id} className="rounded-lg border border-finance-200 bg-finance-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-finance-950">{customer.name}</h3>
                      <div className="mt-2 flex items-center gap-2 text-sm text-finance-500">
                        <Phone size={14} className="shrink-0" />
                        <span className="truncate">{customer.phone || 'Nomor belum tersedia'}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-finance-500"
                        onClick={() => openEditForm(customer)}
                        aria-label={`Edit ${customer.name}`}
                      >
                        <Edit2 size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-primary hover:text-primary-hover"
                        onClick={() => handleDelete(customer)}
                        aria-label={`Hapus ${customer.name}`}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-start gap-2 border-t border-finance-200 pt-3 text-sm text-finance-500">
                    <MapPin size={14} className="mt-0.5 shrink-0" />
                    <p className="min-w-0 break-words">
                      {customer.address || 'Alamat belum tersedia'}
                      {customer.postalCode ? ` (${customer.postalCode})` : ''}
                    </p>
                  </div>
                  {(customer.history || customer.notes) && (
                    <p className="mt-3 line-clamp-2 text-xs leading-5 text-finance-400">
                      {customer.history || customer.notes}
                    </p>
                  )}
                </article>
              ))
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Pembeli</TableHead>
                <TableHead>Kontak</TableHead>
                <TableHead>Alamat</TableHead>
                <TableHead>Riwayat / Catatan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customersQuery.isLoading ? (
                <TableSkeletonRows columns={5} rows={6} widths={['w-32', 'w-28', 'w-full', 'w-36', 'ml-auto w-20']} />
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-finance-500 py-8">
                    Tidak ada pembeli ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium text-finance-900">{customer.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1.5 text-finance-600">
                        <Phone size={14} />
                        <span>{customer.phone || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start space-x-1.5 text-finance-600 max-w-[250px]">
                        <MapPin size={14} className="mt-0.5 shrink-0" />
                        <span className="truncate">{customer.address} {customer.postalCode && `(${customer.postalCode})`}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-finance-600 max-w-[200px] truncate">
                        {customer.history || customer.notes || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-finance-500"
                          onClick={() => openEditForm(customer)}
                          aria-label={`Edit ${customer.name}`}
                        >
                          <Edit2 size={16} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary-hover" onClick={() => handleDelete(customer)}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            </Table>
          </div>
          {!customersQuery.isLoading && (
            <Pagination
              page={page}
              pageSize={pageSize}
              totalItems={totalItems}
              totalPages={totalPages}
              onPageChange={setPage}
              onPageSizeChange={(nextPageSize) => {
                setPageSize(nextPageSize);
                setPage(1);
              }}
            />
          )}
        </CardContent>
      </Card>

      {isFormOpen && (
        <SideDrawer onClose={resetForm} onBeforeClose={canCloseCustomerForm} widthClassName="md:max-w-2xl">
          {(requestClose) => (
          <>
            <div className="side-drawer-header sticky top-0 z-10 flex items-start justify-between gap-4 bg-finance-50 px-6 py-5 md:px-8">
              <div>
                <h2 className="text-lg font-bold text-finance-950">
                  {editingCustomer ? 'Edit Pembeli' : 'Tambah Pembeli Baru'}
                </h2>
                <p className="mt-0.5 text-sm text-finance-500">
                  {editingCustomer ? 'Perbarui informasi pembeli.' : 'Simpan kontak dan riwayat pembeli.'}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={requestClose} aria-label="Tutup form pembeli">
                <X size={18} />
              </Button>
            </div>

            <div className="space-y-5 p-4 md:px-8 md:py-5">
              <Card className="animate-soft-in border-finance-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Informasi Pembeli</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nama Pembeli <span className="text-primary">*</span></label>
                    <Input value={customerForm.name || ''} onChange={e => setCustomerForm({...customerForm, name: e.target.value})} placeholder="Contoh: Hendri Suntono" />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nomor Handphone <span className="text-primary">*</span></label>
                      <Input value={customerForm.phone || ''} onChange={e => setCustomerForm({...customerForm, phone: e.target.value})} placeholder="Contoh: 0812xxxx" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Kode Pos <span className="text-primary">*</span></label>
                      <Input value={customerForm.postalCode || ''} onChange={e => setCustomerForm({...customerForm, postalCode: e.target.value})} placeholder="Contoh: 11840" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Detail Alamat <span className="text-primary">*</span></label>
                    <Input value={customerForm.address || ''} onChange={e => setCustomerForm({...customerForm, address: e.target.value})} placeholder="Nama jalan, nomor rumah, RT/RW" />
                  </div>
                  <AddressPicker value={addressPicker} onChange={setAddressPicker} />
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Riwayat Pembelian / Catatan</label>
                    <Input value={customerForm.history || ''} onChange={e => setCustomerForm({...customerForm, history: e.target.value})} placeholder="Pernah beli Pikachu Promo..." />
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-end gap-3 pb-0 pt-0">
                <Button onClick={handleSave} disabled={createCustomer.isPending || updateCustomer.isPending}>
                  {createCustomer.isPending || updateCustomer.isPending ? 'Menyimpan...' : editingCustomer ? 'Update Pembeli' : 'Simpan Pembeli'}
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
