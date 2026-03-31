/**
 * Example Form Modal
 * Demonstrates usage of the enhanced modal system with form validation
 */

import FormModal from '../common/FormModal';
import { FormInput, FormTextarea, FormSelect, FormCheckbox } from '../common/FormField';

const ExampleFormModal = ({ isOpen, onClose, onSubmit }) => {
  const initialValues = {
    name: '',
    email: '',
    message: '',
    category: '',
    subscribe: false
  };

  const validationRules = {
    name: [
      { type: 'required', message: 'Nama wajib diisi' },
      { type: 'minLength', min: 2, message: 'Nama minimal 2 karakter' }
    ],
    email: [
      { type: 'required', message: 'Email wajib diisi' },
      { type: 'email' }
    ],
    message: [
      { type: 'required', message: 'Pesan wajib diisi' },
      { type: 'minLength', min: 10, message: 'Pesan minimal 10 karakter' }
    ],
    category: [
      { type: 'required', message: 'Kategori wajib dipilih' }
    ]
  };

  const categoryOptions = [
    { value: 'general', label: 'Umum' },
    { value: 'support', label: 'Dukungan Teknis' },
    { value: 'feedback', label: 'Saran & Masukan' },
    { value: 'bug', label: 'Laporan Bug' }
  ];

  const handleSubmit = async (values, form) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Form submitted:', values);
    
    if (onSubmit) {
      onSubmit(values);
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Contoh Form Modal"
      initialValues={initialValues}
      validationRules={validationRules}
      submitButtonText="Kirim Pesan"
      size="md"
    >
      {(form) => (
        <>
          <FormInput
            {...form.getFieldProps('name')}
            label="Nama Lengkap"
            placeholder="Masukkan nama lengkap Anda"
            required
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
          />

          <FormInput
            {...form.getFieldProps('email')}
            type="email"
            label="Email"
            placeholder="nama@perusahaan.com"
            required
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            }
          />

          <FormSelect
            {...form.getFieldProps('category')}
            label="Kategori"
            placeholder="Pilih kategori pesan"
            options={categoryOptions}
            required
          />

          <FormTextarea
            {...form.getFieldProps('message')}
            label="Pesan"
            placeholder="Tulis pesan Anda di sini..."
            rows={4}
            required
          />

          <FormCheckbox
            {...form.getFieldProps('subscribe')}
            label="Saya ingin menerima newsletter dan update terbaru"
          />

          {/* Display form state for debugging */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-gray-900/50 rounded-lg text-xs">
              <p className="text-gray-400 mb-2">Debug Info:</p>
              <p className="text-gray-500">Valid: {form.isValid ? 'Yes' : 'No'}</p>
              <p className="text-gray-500">Submitting: {form.isSubmitting ? 'Yes' : 'No'}</p>
              <p className="text-gray-500">Errors: {Object.keys(form.errors).length}</p>
            </div>
          )}
        </>
      )}
    </FormModal>
  );
};

export default ExampleFormModal;