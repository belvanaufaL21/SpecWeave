import React from 'react';

/**
 * Component untuk empty state Reference Library
 * Menampilkan opsi untuk menambah reference manual
 */
const ReferenceLibraryEmptyState = ({ onAddReference }) => {
  return (
    <div className="flex-1 flex items-center justify-center px-8 h-full">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="w-24 h-24 mx-auto mb-6 bg-[#09090A] border border-white/5 rounded-full flex items-center justify-center">
          <svg className="w-12 h-12 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-white mb-3">
          Tidak ada referensi ditemukan
        </h3>

        {/* Description */}
        <p className="text-gray-400 leading-relaxed">
          Mulai dengan menambahkan referensi Anda untuk mendapatkan scenario sesuai dengan konteks Anda.
        </p>


      </div>
    </div>
  );
};

export default ReferenceLibraryEmptyState;