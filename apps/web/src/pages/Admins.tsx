import { useEffect, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@pokemon-finance/ui';
import { KeyRound, PlusCircle, ShieldCheck, Trash2, X } from 'lucide-react';
import type { AdminUser } from '../store/useStore';
import SideDrawer from '../components/SideDrawer';
import { useFeedback } from '../components/Feedback';
import Pagination from '../components/Pagination';
import { useAdminMutations, useAdmins } from '../hooks/useApiQueries';

function formatLoginDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Admins() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const adminsQuery = useAdmins({ page, limit: pageSize });
  const admins = adminsQuery.data?.data ?? [];
  const totalItems = adminsQuery.data?.pagination.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const { createAdmin, deleteAdmin, updateAdminPassword, toggleAdminStatus } = useAdminMutations();
  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});
  const { notify, confirm } = useFeedback();

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleAddAdmin = async () => {
    const email = newAdmin.email.trim().toLowerCase();
    if (!newAdmin.name.trim() || !email || !newAdmin.password.trim()) {
      notify('error', 'Form admin belum lengkap', 'Nama, email, dan password admin wajib diisi.');
      return;
    }

    try {
      await createAdmin.mutateAsync({
        name: newAdmin.name.trim(),
        email,
        password: newAdmin.password,
      });
      setNewAdmin({ name: '', email: '', password: '' });
      setIsAddOpen(false);
      notify('success', 'Admin ditambahkan', `${newAdmin.name} sekarang dapat mengakses dashboard.`);
    } catch (error) {
      notify('error', 'Admin gagal ditambahkan', error instanceof Error ? error.message : 'Terjadi kesalahan saat menambahkan admin.');
    }
  };

  const handleChangePassword = async (admin: AdminUser) => {
    const nextPassword = passwordDrafts[admin.id]?.trim();
    if (!nextPassword) {
      notify('error', 'Password belum diisi', 'Isi password baru terlebih dahulu.');
      return;
    }

    try {
      await updateAdminPassword.mutateAsync({ id: admin.id, password: nextPassword });
      setPasswordDrafts({ ...passwordDrafts, [admin.id]: '' });
      notify('success', 'Password diperbarui', `Password ${admin.name} berhasil diperbarui.`);
    } catch (error) {
      notify('error', 'Password gagal diperbarui', error instanceof Error ? error.message : 'Terjadi kesalahan saat memperbarui password.');
    }
  };

  const handleToggleStatus = async (admin: AdminUser) => {
    const action = admin.status === 'active' ? 'nonaktifkan' : 'aktifkan';
    const accepted = await confirm({
      title: `${action === 'aktifkan' ? 'Aktifkan' : 'Nonaktifkan'} admin?`,
      highlightLabel: 'Akun admin',
      highlight: admin.name,
      message: `Status akses akun ini akan diubah menjadi ${action === 'aktifkan' ? 'aktif' : 'nonaktif'}.`,
      confirmText: action === 'aktifkan' ? 'Aktifkan' : 'Nonaktifkan',
      danger: action === 'nonaktifkan',
    });
    if (!accepted) return;
    try {
      await toggleAdminStatus.mutateAsync(admin.id);
      notify('success', 'Status admin diperbarui', `${admin.name} berhasil di${action}.`);
    } catch (error) {
      notify('error', 'Status admin gagal diperbarui', error instanceof Error ? error.message : 'Terjadi kesalahan saat memperbarui status admin.');
    }
  };

  const handleDeleteAdmin = async (admin: AdminUser) => {
    const accepted = await confirm({
      title: 'Hapus admin?',
      highlightLabel: 'Admin yang akan dihapus',
      highlight: admin.name,
      message: 'Akun ini akan dihapus permanen dan tidak dapat dipulihkan.',
      confirmText: 'Hapus Admin',
      danger: true,
    });
    if (!accepted) return;
    try {
      await deleteAdmin.mutateAsync(admin.id);
      notify('success', 'Admin dihapus', `${admin.name} sudah dihapus.`);
    } catch (error) {
      notify('error', 'Admin gagal dihapus', error instanceof Error ? error.message : 'Terjadi kesalahan saat menghapus admin.');
    }
  };

  return (
    <div className="animate-soft-in space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-finance-950">Manajemen Admin</h1>
          <p className="mt-1 text-sm text-finance-500">Kelola akun admin, status akses, dan password.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="surface-pill inline-flex w-fit items-center gap-2 rounded-md px-3 py-2 text-sm font-medium">
            <ShieldCheck size={16} />
            Superadmin only
          </div>
          <Button onClick={() => setIsAddOpen(true)} className="gap-2">
            <PlusCircle size={17} />
            Tambah Admin
          </Button>
        </div>
      </div>
      <Card className="animate-soft-in">
        <CardHeader>
          <CardTitle>Daftar Admin</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admin</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Login Terakhir</TableHead>
                  <TableHead>Ganti Password</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-finance-500">
                      Memuat admin...
                    </TableCell>
                  </TableRow>
                ) : admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="min-w-56">
                      <div>
                        <p className="font-semibold text-finance-950">{admin.name}</p>
                        <p className="mt-1 text-sm text-finance-500">{admin.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{admin.role}</TableCell>
                    <TableCell>
                      <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${admin.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {admin.status === 'active' ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </TableCell>
                    <TableCell className="min-w-40 text-sm text-finance-500">{formatLoginDate(admin.lastLogin)}</TableCell>
                    <TableCell className="min-w-64">
                      <div className="flex gap-2">
                        <Input
                          type="password"
                          value={passwordDrafts[admin.id] || ''}
                          onChange={(event) => setPasswordDrafts({ ...passwordDrafts, [admin.id]: event.target.value })}
                          placeholder="Password baru"
                          className="h-9"
                        />
                        <Button variant="outline" size="sm" onClick={() => handleChangePassword(admin)} className="gap-1.5">
                          <KeyRound size={14} />
                          Simpan
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={admin.role === 'superadmin'}
                          onClick={() => handleToggleStatus(admin)}
                        >
                          {admin.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={admin.role === 'superadmin'}
                          onClick={() => handleDeleteAdmin(admin)}
                          aria-label={`Hapus ${admin.name}`}
                          className="h-9 w-9 text-primary hover:text-primary-hover"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
          </div>
        </CardContent>
      </Card>

      {isAddOpen && (
        <SideDrawer onClose={() => setIsAddOpen(false)} widthClassName="md:max-w-2xl">
          {(requestClose) => (
          <>
            <div className="sticky top-0 z-10 flex h-16 items-center justify-between bg-finance-50 px-5 md:px-8">
              <div>
                <h2 className="text-lg font-bold text-finance-950">Tambah Admin</h2>
                <p className="mt-0.5 text-sm text-finance-500">Buat akun admin operasional baru.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={requestClose} aria-label="Tutup tambah admin">
                <X size={18} />
              </Button>
            </div>

            <div className="space-y-5 p-4 md:px-8 md:py-5">
              <Card className="animate-soft-in border-finance-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Informasi Admin</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nama Admin</label>
                    <Input
                      value={newAdmin.name}
                      onChange={(event) => setNewAdmin({ ...newAdmin, name: event.target.value })}
                      placeholder="Nama admin"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      value={newAdmin.email}
                      onChange={(event) => setNewAdmin({ ...newAdmin, email: event.target.value })}
                      placeholder="email@hypercard.local"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Password Awal</label>
                    <Input
                      type="password"
                      value={newAdmin.password}
                      onChange={(event) => setNewAdmin({ ...newAdmin, password: event.target.value })}
                      placeholder="Password awal"
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-end gap-3 pb-0 pt-0">
                <Button onClick={handleAddAdmin} disabled={createAdmin.isPending}>
                  {createAdmin.isPending ? 'Menyimpan...' : 'Simpan Admin'}
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
