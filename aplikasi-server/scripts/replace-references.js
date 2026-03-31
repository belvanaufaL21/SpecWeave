import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from parent directory
config({ path: path.join(__dirname, '..', '.env') });

// Verify environment variables are loaded
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing Supabase configuration');
  console.error('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Script untuk mengganti seluruh isi reference library dengan data baru
 * Data baru berisi user stories dari OmniX project
 */

const newReferences = [
  {
    title: 'Fetch Review from Google Maps & Distribute to Agent',
    description: 'Sebagai Admin, saya ingin sistem menarik review dari Google Maps Business dan mendistribusikannya ke agent yang available agar setiap review baru dapat segera ditindaklanjuti dari OmniX.',
    category: 'integration',
    tags: ['google-maps', 'review', 'distribution', 'agent'],
    gherkin_content: `Given Admin telah berhasil melakukan integrasi channel Google Maps Business ke OmniX
When Sistem melakukan proses sinkronisasi data awal
Then Setiap review yang ada ditarik bersama metadata seperti rating, nama reviewer, tanggal, lokasi, body review, foto, dan video

Given Ada review baru yang masuk di Google Maps Business
When Sistem mendeteksi review baru dalam interval waktu tertentu
Then Review baru didistribusikan ke workspace agent yang available secara otomatis dan muncul sebagai queue`
  },
  {
    title: 'Agent Route Summary',
    description: 'Sebagai user, saya ingin melihat ringkasan rute harian agen agar saya dapat mengevaluasi efisiensi perjalanan dan distribusi tugas di lapangan.',
    category: 'reporting',
    tags: ['agent', 'route', 'tracking', 'map'],
    gherkin_content: `Given Sistem mencatat data lokasi agen sepanjang hari
When User membuka laporan Agent Route Summary
Then Sistem menampilkan urutan kunjungan agen dalam bentuk daftar dan visualisasi map, termasuk waktu tiba di tiap titik`
  },
  {
    title: 'Absensi Harian',
    description: 'Sebagai user, saya ingin melihat absensi harian agen agar saya tahu siapa yang aktif bekerja dan siapa yang absen setiap hari.',
    category: 'attendance',
    tags: ['agent', 'attendance', 'check-in', 'check-out'],
    gherkin_content: `Given Agen melakukan check-in dan check-out
When User membuka laporan absensi harian
Then Sistem menampilkan daftar agen dengan status Hadir / Tidak Hadir serta waktu check-in/out dan lokasi`
  },
  {
    title: 'Agent/SPV Melakukan Reachout Call dari Menu Customer',
    description: 'Sebagai Agent/Supervisor saya ingin melakukan outbound call langsung dari menu customer management dapat menghubungi customer untuk follow-up.',
    category: 'communication',
    tags: ['call', 'outbound', 'customer', 'pbx'],
    gherkin_content: `Given Agent/Supervisor berada di menu Customer dan telah mencari customer berdasarkan Nama, Nomor telepon, Customer ID, atau Email
When Agent/Supervisor mengklik tombol "Call"
Then PBX melakukan dialing ke nomor customer sehingga agent/SPV terhubung melalui softphone/device dan sistem mencatat panggilan tersebut sebagai interaksi di journey customer`
  },
  {
    title: 'Agent/SPV Melakukan Reachout Call dari Menu Ticketing',
    description: 'Sebagai Agent/Supervisor saya ingin melakukan outbound call langsung dari menu ticketing system agar dapat menghubungi customer terkait ticket yang sedang ditangani.',
    category: 'communication',
    tags: ['call', 'outbound', 'ticketing', 'pbx'],
    gherkin_content: `Given Agent/Supervisor sedang membuka halaman detail ticket di menu ticketing system
When Agent/Supervisor mengklik tombol "Call Customer" yang terdapat pada detail ticket
Then sistem melakukan dialing ke nomor customer yang terkait dengan ticket tersebut serta otomatis mencatat panggilan sebagai activity di journey interaction`
  },
  {
    title: 'Supervisor Melihat Reporting Call Inbound',
    description: 'Sebagai Supervisor saya ingin melihat reporting untuk call inbound agar dapat menganalisis performa inbound service dan SLAs.',
    category: 'reporting',
    tags: ['supervisor', 'reporting', 'inbound', 'call', 'analytics'],
    gherkin_content: `Given Supervisor berada di dalam menu "Reporting"
When Supervisor menerapkan filter pencarian seperti rentang tanggal, agent/team, status call, atau handling time
Then sistem menampilkan data reporting inbound sesuai filter yang dipilih beserta akses untuk memutar playback recording secara langsung melalui browser`
  },
  {
    title: 'Agent Dapat Melakukan Transfer Call',
    description: 'Sebagai Agent saya ingin melakukan transfer call ke agent lain atau departemen lain agar dapat mengalihkan call kepada pihak yang lebih berkompeten sesuai permintaan customer.',
    category: 'communication',
    tags: ['call', 'transfer', 'cold-transfer', 'warm-transfer'],
    gherkin_content: `Given Agent sedang terhubung dalam panggilan dengan customer
When Agent mengklik tombol "Transfer", mencari agent tujuan berdasarkan nama, lalu memilih opsi "Cold Transfer"
Then panggilan langsung dialihkan ke agent tujuan dan Agent pertama otomatis terlepas dari panggilan

Given Agent sedang terhubung dalam panggilan dengan customer
When Agent mengklik tombol "Transfer", mencari agent tujuan berdasarkan nama, dan memilih opsi "Warm Transfer"
Then Agent pertama tetap terhubung dengan customer sementara sistem menghubungi agent tujuan

Given agent tujuan pada proses Warm Transfer telah menjawab panggilan
When Agent pertama selesai berbicara dengan agent tujuan untuk memberikan konteks
Then Agent pertama dapat menghubungkan customer ke agent tujuan atau membatalkan transfer tersebut

Given Agent pertama telah berhasil melakukan transfer Cold atau Warm
When panggilan bagi Agent pertama telah berakhir
Then sistem mengarahkan Agent pertama ke form CWC untuk mengisi summary interaksi yang akan tercatat di journey customer`
  },
  {
    title: 'SPV Melakukan Monitoring Interaksi Secara Realtime',
    description: 'Sebagai Supervisor saya ingin memantau aktivitas agent secara real-time dan dapat mendengarkan percakapan yang sedang berlangsung agar dapat melakukan quality control dan memberikan bantuan jika diperlukan.',
    category: 'monitoring',
    tags: ['supervisor', 'monitoring', 'realtime', 'quality-control'],
    gherkin_content: `Given Supervisor berada di Halaman monitoring yang menampilkan daftar agent aktif
When Supervisor mengklik tombol "Listen" pada agent yang sedang menelepon
Then sistem membuka koneksi audio streaming ke call yang sedang berlangsung tanpa mengganggu percakapan agent dan customer

Given Supervisor sedang mendengarkan panggilan agent secara real-time
When Supervisor menghentikan mode listen
Then koneksi audio streaming ditutup tanpa memutus panggilan agent`
  },
  {
    title: 'Agent Inbound Dapat Melakukan Break/AUX',
    description: 'Sebagai Agent (Inbound) saya ingin melakukan break/aux saat sedang dalam shift inbound agar dapat mengatur waktu istirahat atau menangani keperluan lain tanpa menerima inbound call.',
    category: 'agent-management',
    tags: ['agent', 'break', 'aux', 'status', 'queue'],
    gherkin_content: `Given Agent Inbound sedang dalam shift (status Ready/Available) dan tidak sedang dalam panggilan (idle)
When Agent mengklik tombol "Break/AUX" di OmniX lalu memilih reason break dari modal yang muncul dan mengirim request
Then OmniX mengirimkan request break ke PBX Yeastar untuk menghapus agent dari queue inbound sehingga status agent berubah menjadi "AUX" beserta reason-nya, dashboard supervisor memperbarui status secara otomatis, dan agent tidak menerima panggilan inbound dari sistem`
  }
];

async function replaceAllReferences() {
  try {
    console.log('🚀 Starting reference library replacement...\n');

    // Step 0: Get or create a system user
    console.log('📝 Step 0: Getting system user...');
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('❌ Error fetching users:', userError);
      throw userError;
    }

    let systemUserId;
    if (users && users.users && users.users.length > 0) {
      // Use the first user as system user
      systemUserId = users.users[0].id;
      console.log(`   Using existing user: ${users.users[0].email} (${systemUserId})`);
    } else {
      console.error('❌ No users found in database. Please create a user first.');
      process.exit(1);
    }

    // Step 1: Get all existing references
    console.log('\n📝 Step 1: Fetching existing references...');
    const { data: existingRefs, error: fetchError } = await supabase
      .from('scenario_references')
      .select('id, title');

    if (fetchError) {
      console.error('❌ Error fetching existing references:', fetchError);
      throw fetchError;
    }

    console.log(`   Found ${existingRefs?.length || 0} existing references`);

    // Step 2: Delete all existing references
    if (existingRefs && existingRefs.length > 0) {
      console.log('\n📝 Step 2: Deleting all existing references...');
      
      for (const ref of existingRefs) {
        const { error: deleteError } = await supabase
          .from('scenario_references')
          .delete()
          .eq('id', ref.id);

        if (deleteError) {
          console.error(`   ❌ Error deleting "${ref.title}":`, deleteError.message);
        } else {
          console.log(`   ✓ Deleted: ${ref.title}`);
        }
      }
      
      console.log(`✅ Deleted ${existingRefs.length} references\n`);
    } else {
      console.log('   No existing references to delete\n');
    }

    // Step 3: Insert new references
    console.log('📝 Step 3: Inserting new references...');
    
    const insertedRefs = [];
    
    for (const ref of newReferences) {
      const { data, error: insertError } = await supabase
        .from('scenario_references')
        .insert({
          ...ref,
          user_id: systemUserId, // Use valid user ID
          is_public: true,
          usage_count: 0,
          average_score: null
        })
        .select()
        .single();

      if (insertError) {
        console.error(`   ❌ Error inserting "${ref.title}":`, insertError.message);
      } else {
        console.log(`   ✓ Inserted: ${ref.title}`);
        insertedRefs.push(data);
      }
    }

    console.log(`\n✅ Successfully inserted ${insertedRefs.length} new references\n`);

    // Step 4: Display summary
    console.log('📊 Summary:');
    console.log('─'.repeat(70));
    insertedRefs.forEach((ref, index) => {
      console.log(`${index + 1}. ${ref.title}`);
      console.log(`   Category: ${ref.category}`);
      console.log(`   Tags: ${ref.tags.join(', ')}`);
      console.log(`   ID: ${ref.id}`);
      console.log('');
    });
    console.log('─'.repeat(70));
    console.log(`\n✅ Reference library replacement completed successfully!`);
    console.log(`   Total references: ${insertedRefs.length}`);

  } catch (error) {
    console.error('\n❌ Failed to replace references:', error.message);
    process.exit(1);
  }
}

// Run the script
replaceAllReferences()
  .then(() => {
    console.log('\n✨ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
