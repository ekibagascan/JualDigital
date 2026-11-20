import { containsProfanity, isSocialManipulationText } from '../lib/content-policy.ts'

const socialHits = [
  'Jasa naikkan followers Instagram',
  'Suntik followers murah',
  'SMM panel indonesia',
  'smmpanel premium',
  'Boost akun TikTok',
  'Buy 1000 likes',
  '1.000 likes',
  'YouTube subscribers',
  'Tambah views TikTok',
  'Jual followers',
  '10k likes instagram',
  'auto like facebook',
  'jasa tambah subscriber',
  'panel smm',
  'fake followers',
]

const socialMisses = [
  'Template Instagram untuk jualan',
  'E-book desain feed',
  'Kursus copywriting',
  'Preview template',
  'Subscription membership bulanan',
  'Jasa desain logo',
  'Naikkan penjualan toko',
  'Everyone likes this template',
  'Page views analytics',
  'Automatic invoice',
  'Paket keanggotaan komunitas',
]

const profanityHits = ['produk kontol', 'what the fuck', 'k0ntol murah', 'dasar bangsat']
const profanityMisses = ['template presentasi', 'kelas desain', 'password manager', 'cocktail recipe ebook', 'assignment template']

let failed = 0
function check(label, actual, expected) {
  if (actual !== expected) {
    failed += 1
    console.error(`FAIL ${label}: expected ${expected} got ${actual}`)
  }
}

for (const sample of socialHits) check(`social hit: ${sample}`, isSocialManipulationText(sample), true)
for (const sample of socialMisses) check(`social miss: ${sample}`, isSocialManipulationText(sample), false)
for (const sample of profanityHits) check(`profanity hit: ${sample}`, containsProfanity(sample), true)
for (const sample of profanityMisses) check(`profanity miss: ${sample}`, containsProfanity(sample), false)

if (failed) {
  console.error(`${failed} checks failed`)
  process.exit(1)
}
console.log('content policy checks passed')
