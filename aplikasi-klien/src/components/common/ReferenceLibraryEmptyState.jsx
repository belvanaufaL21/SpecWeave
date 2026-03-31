import React from 'react';

/**
 * Component untuk empty state Reference Library
 * Menampilkan opsi untuk menambah reference manual
 */
const ReferenceLibraryEmptyState = ({ onAddReference }) => {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="w-24 h-24 mx-auto mb-6 bg-gray-700 rounded-full flex items-center justify-center">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-white mb-3">
          Tidak ada referensi ditemukan
        </h3>

        {/* Description */}
        <p className="text-gray-400 mb-8 leading-relaxed">
          Mulai dengan menambahkan referensi pertama Anda untuk mendapatkan scenario berkualitas tinggi yang siap digunakan.
        </p>

        {/* Action Buttons */}
        <div className="space-y-4">
          {/* Add Manual Reference Button */}
          <button
            onClick={onAddReference}
            className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Tambah Referensi Manual</span>
            </div>
          </button>
        </div>

        {/* Benefits */}
        <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-center justify-center space-x-2 mb-3">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h4 className="text-sm font-semibold text-blue-400">Mengapa Perlu References?</h4>
          </div>
          <div className="text-sm text-blue-300 space-y-1 text-left">
            <p>• <strong>Auto Reference System:</strong> Meningkatkan akurasi scenario generation</p>
            <p>• <strong>Pattern Learning:</strong> LLM belajar dari contoh berkualitas tinggi</p>
            <p>• <strong>Konsistensi:</strong> Memastikan format dan struktur yang seragam</p>
            <p>• <strong>Efisiensi:</strong> Mengurangi waktu editing manual</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferenceLibraryEmptyState;
