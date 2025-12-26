import React, { useState } from 'react';

const UserGuideModal = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState('getting-started');

  if (!isOpen) return null;

  const guideContent = {
    'getting-started': {
      title: 'Getting Started',
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">🧵 Welcome to SpecWeave</h3>
            <p className="text-gray-300 mb-4">
              SpecWeave adalah aplikasi web yang mengubah User Story menjadi format Gherkin (Given-When-Then) menggunakan AI. 
              Platform ini membantu Anda membuat, mengelola, dan menguji skenario dengan bantuan kecerdasan buatan.
            </p>
          </div>

          <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-4">
            <h4 className="text-md font-medium text-white mb-3 flex items-center gap-2">
              <span className="text-lg">🚀</span>
              Quick Start Guide
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white">1</div>
                  <div>
                    <h5 className="font-medium text-white">Setup Profile</h5>
                    <p className="text-sm text-gray-400">Atur profil dan preferensi Anda</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white">2</div>
                  <div>
                    <h5 className="font-medium text-white">Connect JIRA</h5>
                    <p className="text-sm text-gray-400">Hubungkan dengan project JIRA (opsional)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white">3</div>
                  <div>
                    <h5 className="font-medium text-white">Start Chatting</h5>
                    <p className="text-sm text-gray-400">Mulai sesi chat pertama Anda</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-xs font-bold text-white">4</div>
                  <div>
                    <h5 className="font-medium text-white">Generate Scenarios</h5>
                    <p className="text-sm text-gray-400">Buat user stories dengan AI</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    'chat-features': {
      title: 'Chat & AI Features',
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">💬 AI-Powered Chat System</h3>
            <p className="text-gray-300 mb-4">
              Sistem chat cerdas yang membantu Anda membuat, memperbaiki, dan meningkatkan user stories dengan bantuan AI. 
              Platform ini menggunakan teknologi terdepan untuk mengkonversi user story menjadi format Gherkin yang terstruktur.
            </p>
          </div>

          <div>
            <h4 className="text-md font-medium text-white mb-3">🎯 Core Features</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h5 className="font-medium text-white mb-1">Smart AI Suggestions</h5>
                  <p className="text-gray-300 text-sm">AI memberikan rekomendasi cerdas untuk meningkatkan kualitas user story Anda, termasuk saran untuk acceptance criteria dan edge cases.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <h5 className="font-medium text-white mb-1">Template Library</h5>
                  <p className="text-gray-300 text-sm">Akses template siap pakai untuk pola user story umum seperti authentication, form validation, API integration, dan UI interactions.</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-md font-medium text-white mb-3">📝 Best Practices</h4>
            <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-300 text-sm"><strong>Be Specific:</strong> Gunakan role dan goal yang spesifik. Contoh: "Sebagai customer yang sudah login" bukan hanya "Sebagai user"</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-300 text-sm"><strong>Include Acceptance Criteria:</strong> Selalu sertakan kriteria penerimaan yang jelas dan terukur dalam user story Anda</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    'jira-integration': {
      title: 'JIRA Integration',
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">🔗 Seamless JIRA Integration</h3>
            <p className="text-gray-300 mb-4">
              Integrasikan secara mulus dengan project JIRA Anda untuk sinkronisasi user stories, epics, dan tracking progress. 
              SpecWeave mendukung JIRA Cloud dengan OAuth 2.0 authentication yang aman.
            </p>
          </div>

          <div>
            <h4 className="text-md font-medium text-white mb-3">🚀 Setup Process</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0">1</div>
                <div>
                  <h5 className="font-medium text-white mb-1">Access JIRA Settings</h5>
                  <p className="text-gray-300 text-sm">Klik "JIRA Setup" di sidebar atau dashboard untuk membuka modal konfigurasi JIRA.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0">2</div>
                <div>
                  <h5 className="font-medium text-white mb-1">Enter JIRA Server URL</h5>
                  <p className="text-gray-300 text-sm">Masukkan URL JIRA Cloud Anda (format: https://yourcompany.atlassian.net)</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0">3</div>
                <div>
                  <h5 className="font-medium text-white mb-1">OAuth Authentication</h5>
                  <p className="text-gray-300 text-sm">Klik "Connect with OAuth" untuk authorize SpecWeave mengakses JIRA Anda dengan aman.</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-md font-medium text-white mb-3">✨ Available Features</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-lg p-4">
                <h5 className="font-medium text-green-300 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Story Sync
                </h5>
                <p className="text-sm text-gray-300">Auto-create JIRA issues dari Gherkin scenarios dengan format yang terstruktur</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-4">
                <h5 className="font-medium text-purple-300 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Epic Linking
                </h5>
                <p className="text-sm text-gray-300">Link user stories ke existing epics untuk better project organization</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h5 className="font-medium text-yellow-300 mb-1">⚠️ Important Note</h5>
                <p className="text-yellow-200 text-sm">
                  Semua issues yang dibuat melalui SpecWeave akan muncul di JIRA sebagai "Created by" Anda, bukan sebagai bot. 
                  Pastikan Anda memiliki permission yang tepat di JIRA project yang akan digunakan.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    'meteor-testing': {
      title: 'METEOR Testing',
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">📊 Quality Evaluation with METEOR</h3>
            <p className="text-gray-300 mb-4">
              METEOR (Metric for Evaluation of Translation with Explicit ORdering) adalah sistem evaluasi kualitas yang membantu 
              mengukur seberapa baik user stories Anda dibandingkan dengan reference standards. Sistem ini memberikan metrics 
              terukur untuk meningkatkan kualitas skenario Gherkin.
            </p>
          </div>

          <div>
            <h4 className="text-md font-medium text-white mb-3">🔄 How METEOR Testing Works</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0">1</div>
                <div>
                  <h5 className="font-medium text-white mb-1">Select Scenarios</h5>
                  <p className="text-gray-300 text-sm">Pilih user stories yang ingin dievaluasi dari chat history atau generate scenario baru.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0">2</div>
                <div>
                  <h5 className="font-medium text-white mb-1">Provide Reference</h5>
                  <p className="text-gray-300 text-sm">Masukkan reference scenario (Given/When/Then) sebagai gold standard untuk comparison.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0">3</div>
                <div>
                  <h5 className="font-medium text-white mb-1">Run Analysis</h5>
                  <p className="text-gray-300 text-sm">Klik "RUN METEOR TEST" untuk memulai analisis kualitas dengan algoritma METEOR.</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-md font-medium text-white mb-3">📈 Understanding METEOR Metrics</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <span className="text-sm font-medium text-white">0.8-1.0</span>
                  <p className="text-xs text-gray-400">Excellent - Production ready</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div>
                  <span className="text-sm font-medium text-white">0.6-0.8</span>
                  <p className="text-xs text-gray-400">Good - Minor improvements needed</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <div>
                  <span className="text-sm font-medium text-white">0.4-0.6</span>
                  <p className="text-xs text-gray-400">Fair - Needs significant improvement</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div>
                  <span className="text-sm font-medium text-white">0.0-0.4</span>
                  <p className="text-xs text-gray-400">Poor - Major revision required</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    'knowledge-base': {
      title: 'Knowledge Base',
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">📚 Reference Library & Knowledge Base</h3>
            <p className="text-gray-300 mb-4">
              Knowledge Base adalah library referensi yang membantu meningkatkan akurasi AI dengan menyediakan contoh-contoh 
              skenario Gherkin yang sudah terkurasi. Fitur ini menggunakan few-shot prompting untuk memberikan context yang 
              lebih baik kepada AI dalam menggenerate user stories.
            </p>
          </div>

          <div>
            <h4 className="text-md font-medium text-white mb-3">🎯 Core Features</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-4">
                <h5 className="font-medium text-blue-300 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Smart Search & Filter
                </h5>
                <p className="text-sm text-gray-300">Cari referensi berdasarkan title, description, atau tags dengan filtering by category</p>
              </div>
              <div className="bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-lg p-4">
                <h5 className="font-medium text-green-300 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Beautiful Table Input
                </h5>
                <p className="text-sm text-gray-300">Interface tabel 3-kolom (Given/When/Then) yang visual dan terstruktur</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-md font-medium text-white mb-3">📝 Reference Categories</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-lg mb-1">🔐</div>
                <h5 className="text-sm font-medium text-white">Authentication</h5>
                <p className="text-xs text-gray-400">Login, signup, logout flows</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-lg mb-1">🧭</div>
                <h5 className="text-sm font-medium text-white">Navigation</h5>
                <p className="text-xs text-gray-400">Menu, routing, breadcrumbs</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-lg mb-1">📋</div>
                <h5 className="text-sm font-medium text-white">Forms</h5>
                <p className="text-xs text-gray-400">Input validation, submission</p>
              </div>
            </div>
          </div>

          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h5 className="font-medium text-green-300 mb-1">💡 Pro Tip</h5>
                <p className="text-green-200 text-sm">
                  Gunakan Knowledge Base untuk few-shot prompting - semakin banyak quality references yang Anda miliki, 
                  semakin akurat hasil AI generation. Build library references yang comprehensive untuk domain project Anda.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    'troubleshooting': {
      title: 'Troubleshooting',
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">🔧 Common Issues & Solutions</h3>
            <p className="text-gray-300 mb-4">
              Panduan troubleshooting untuk mengatasi masalah umum yang mungkin Anda temui saat menggunakan SpecWeave. 
              Sebagian besar masalah dapat diselesaikan dengan langkah-langkah sederhana berikut.
            </p>
          </div>

          <div>
            <h4 className="text-md font-medium text-white mb-3">🔗 JIRA Connection Issues</h4>
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 space-y-4">
              <div>
                <h5 className="font-medium text-red-300 mb-2">❌ Problem: Cannot connect to JIRA</h5>
                <div className="space-y-2">
                  <p className="text-sm text-gray-300"><strong>Possible Causes:</strong></p>
                  <ul className="list-disc list-inside ml-4 space-y-1 text-sm text-gray-300">
                    <li>JIRA URL format incorrect (harus https://company.atlassian.net)</li>
                    <li>User tidak memiliki Atlassian account yang valid</li>
                    <li>User bukan member dari JIRA site company</li>
                    <li>OAuth app belum dikonfigurasi dengan benar</li>
                  </ul>
                </div>
              </div>
              <div>
                <h5 className="font-medium text-green-300 mb-2">✅ Solutions:</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <h6 className="text-sm font-medium text-white mb-2">Basic Checks</h6>
                    <ul className="space-y-1 text-xs text-gray-300">
                      <li>• Verify JIRA URL format</li>
                      <li>• Test manual login ke JIRA web</li>
                      <li>• Check internet connection</li>
                      <li>• Clear browser cache & cookies</li>
                    </ul>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <h6 className="text-sm font-medium text-white mb-2">Permission Checks</h6>
                    <ul className="space-y-1 text-xs text-gray-300">
                      <li>• Confirm Atlassian account access</li>
                      <li>• Verify project membership</li>
                      <li>• Check Browse Projects permission</li>
                      <li>• Test Create Issues permission</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-md font-medium text-white mb-3">💬 Chat & AI Issues</h4>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 space-y-4">
              <div>
                <h5 className="font-medium text-yellow-300 mb-2">⚠️ Problem: AI chat not responding</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-300 mb-2"><strong>Quick Fixes:</strong></p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                      <li>Refresh browser page (F5)</li>
                      <li>Check internet connection stability</li>
                      <li>Try different browser atau incognito mode</li>
                      <li>Clear browser cache dan localStorage</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm text-gray-300 mb-2"><strong>Advanced Solutions:</strong></p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                      <li>Check browser console untuk error messages</li>
                      <li>Disable browser extensions temporarily</li>
                      <li>Verify server status (localhost:5000)</li>
                      <li>Restart development server jika local</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h5 className="font-medium text-purple-300 mb-1">🆘 Need More Help?</h5>
                <p className="text-purple-200 text-sm mb-3">
                  Jika masalah masih berlanjut setelah mencoba solusi di atas, berikut langkah selanjutnya:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <h6 className="text-sm font-medium text-white mb-1">Debug Information</h6>
                    <ul className="space-y-1 text-xs text-gray-300">
                      <li>• Check browser console (F12)</li>
                      <li>• Note exact error messages</li>
                      <li>• Document steps to reproduce</li>
                      <li>• Check network tab untuk failed requests</li>
                    </ul>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <h6 className="text-sm font-medium text-white mb-1">Contact Support</h6>
                    <ul className="space-y-1 text-xs text-gray-300">
                      <li>• Include browser dan OS version</li>
                      <li>• Provide screenshot jika applicable</li>
                      <li>• Describe expected vs actual behavior</li>
                      <li>• Mention any recent changes</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  };
  const sidebarItems = [
    { id: 'getting-started', label: 'Getting Started', icon: '🚀' },
    { id: 'chat-features', label: 'Chat & AI Features', icon: '💬' },
    { id: 'jira-integration', label: 'JIRA Integration', icon: '🔗' },
    { id: 'meteor-testing', label: 'METEOR Testing', icon: '📊' },
    { id: 'knowledge-base', label: 'Knowledge Base', icon: '📚' },
    { id: 'troubleshooting', label: 'Troubleshooting', icon: '🔧' }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a24] border border-white/10 rounded-2xl shadow-2xl w-full max-w-6xl h-[80vh] flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 bg-[#151520] border-r border-white/10 flex flex-col">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white">User Guide</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <nav className="space-y-2">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
                    activeSection === item.id
                      ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <div className="p-6 border-b border-white/10">
            <h1 className="text-2xl font-bold text-white">
              {guideContent[activeSection].title}
            </h1>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {guideContent[activeSection].content}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserGuideModal;