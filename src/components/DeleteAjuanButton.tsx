'use client';

import { Trash2 } from 'lucide-react';

export function DeleteAjuanButton() {
  return (
    <button
      className="btn-danger"
      type="submit"
      onClick={(event) => {
        if (!window.confirm('Hapus ajuan ini? Data tidak akan tampil lagi di dashboard.')) {
          event.preventDefault();
        }
      }}
    >
      <Trash2 size={17} /> Hapus Ajuan Ini
    </button>
  );
}
