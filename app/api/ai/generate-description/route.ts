import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, pickBody } from '@/lib/mobile-auth'

const CATEGORY_SLUGS = [
  'grafis',
  'ebook',
  'akun',
  'software',
  'template',
  'kursus',
  'jasa',
  'keanggotaan',
  'video',
  'music',
] as const

type DescriptionType = 'short' | 'long' | 'listing'

export async function POST(req: NextRequest) {
  let prompt = ''
  let type: DescriptionType = 'short'
  let title = ''
  let category = ''
  let productType = ''

  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Login diperlukan' },
        { status: 401 }
      )
    }

    const body = (await req.json()) as Record<string, unknown>
    prompt = String(pickBody(body, 'prompt') || '').trim()
    title = String(pickBody(body, 'title') || '').trim()
    category = String(pickBody(body, 'category') || '').trim()
    productType = String(pickBody(body, 'productType', 'product_type') || '').trim()
    const typeRaw = String(pickBody(body, 'type') || 'short').toLowerCase()
    type = typeRaw === 'long' || typeRaw === 'listing' ? (typeRaw as DescriptionType) : 'short'

    if (!prompt) {
      if (type === 'listing') {
        prompt = [title, category, productType].filter(Boolean).join(' ')
      } else if (title) {
        prompt =
          type === 'long'
            ? `Generate a detailed product description (max 500 characters) for: "${title}"${category ? ` in category "${category}"` : ''}. Include features, benefits, target audience, and usage instructions.`
            : `Generate a short, compelling product description (max 150 characters) for: "${title}"${category ? ` in category "${category}"` : ''}. Focus on key benefits and value proposition.`
      }
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Judul atau ide produk wajib diisi untuk bantuan AI' },
        { status: 400 }
      )
    }

    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      return listingOrDescriptionResponse(prompt, type, title, category, productType, true)
    }

    const isListing = type === 'listing'
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: isListing
              ? `You help Indonesian sellers list products on Jual Digital marketplace.
Return ONLY valid JSON with keys:
title (string, catchy Indonesian product title),
description (string, max 150 characters, sales-focused),
longDescription (string, professional Indonesian listing with features using ✅),
category (one of: ${CATEGORY_SLUGS.join(', ')}),
tags (array of 3-6 short Indonesian keywords).
No markdown, no extra text.`
              : `You are a helpful assistant that generates product descriptions for a digital marketplace. 
            Generate descriptions in Indonesian language that are compelling, professional, and optimized for sales.
            
            For SHORT descriptions: Keep concise (max 150 characters) and focus on key benefits.
            
            For LONG descriptions: Use this structured format:
            1. Start with a warning/note if needed (e.g., "⚠️ Wajib sertakan nomor WhatsApp saat checkout untuk proses aktivasi!")
            2. Main product title and tagline
            3. Detailed description paragraph
            4. List of key features with ✅ emoji (3-5 points)
            
            Make it attractive and sales-focused with proper emojis and formatting.`,
          },
          {
            role: 'user',
            content: isListing
              ? `Ide produk: ${prompt}
Jenis listing: ${productType || 'digital_product'}
Kategori saat ini: ${category || '-'}
Judul saat ini: ${title || '-'}`
              : prompt,
          },
        ],
        max_tokens: isListing ? 450 : type === 'short' ? 150 : 300,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const generatedText = data.choices[0]?.message?.content?.trim()
    if (!generatedText) {
      throw new Error('No content generated from OpenAI')
    }

    if (isListing) {
      const parsed = parseListingJSON(generatedText, prompt, category, productType)
      return NextResponse.json({ success: true, ...parsed })
    }

    return NextResponse.json({
      success: true,
      description: generatedText,
    })
  } catch (error) {
    console.error('[AI DESCRIPTION API] Error:', error)
    return listingOrDescriptionResponse(prompt, type, title, category, productType, false)
  }
}

function listingOrDescriptionResponse(
  prompt: string,
  type: DescriptionType,
  title: string,
  category: string,
  productType: string,
  usedTemplate: boolean
) {
  if (type === 'listing') {
    const parsed = templateListing(prompt, title, category, productType)
    return NextResponse.json({
      success: true,
      ...parsed,
      note: usedTemplate ? 'Using fallback template (OpenAI not available)' : 'Using fallback template',
    })
  }

  return NextResponse.json({
    success: true,
    description: generateTemplateDescription(prompt, type === 'long' ? 'long' : 'short'),
    note: usedTemplate ? 'Using fallback template (OpenAI not available)' : 'Using fallback template',
  })
}

function parseListingJSON(
  text: string,
  prompt: string,
  category: string,
  productType: string
) {
  const fallback = templateListing(prompt, '', category, productType)
  try {
    const match = text.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(match ? match[0] : text) as Record<string, unknown>
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 8)
      : fallback.tags
    const resolvedCategory = normalizeCategory(String(parsed.category || category || fallback.category))
    const description = String(parsed.description || fallback.description).slice(0, 180)
    return {
      title: String(parsed.title || fallback.title).trim(),
      description,
      longDescription: String(parsed.longDescription || parsed.long_description || fallback.longDescription),
      long_description: String(parsed.longDescription || parsed.long_description || fallback.longDescription),
      category: resolvedCategory,
      tags,
    }
  } catch {
    return fallback
  }
}

function templateListing(prompt: string, title: string, category: string, productType: string) {
  const idea = (title || prompt || 'Produk digital').trim()
  const resolvedCategory = normalizeCategory(category) || categoryFromType(productType)
  const short = generateTemplateDescription(`for: "${idea}" in category "${resolvedCategory}"`, 'short')
  const long = generateTemplateDescription(`for: "${idea}" in category "${resolvedCategory}"`, 'long')
  const tags = Array.from(
    new Set(
      [resolvedCategory, productType.replace('_', ' '), ...idea.split(/\s+/).slice(0, 3)]
        .map((t) => t.replace(/_/g, ' ').trim())
        .filter((t) => t.length > 1)
    )
  ).slice(0, 6)

  return {
    title: idea.length > 80 ? idea.slice(0, 77) + '…' : idea,
    description: short,
    longDescription: long,
    long_description: long,
    category: resolvedCategory,
    tags,
  }
}

function categoryFromType(productType: string) {
  if (productType === 'service') return 'jasa'
  if (productType === 'course') return 'kursus'
  if (productType === 'membership') return 'keanggotaan'
  return 'ebook'
}

function normalizeCategory(raw: string) {
  const value = raw.trim().toLowerCase()
  const aliases: Record<string, string> = {
    'e-book': 'ebook',
    'kursus online': 'kursus',
    musik: 'music',
    'jasa digital': 'jasa',
    membership: 'keanggotaan',
  }
  const mapped = aliases[value] || value
  return CATEGORY_SLUGS.includes(mapped as (typeof CATEGORY_SLUGS)[number]) ? mapped : 'ebook'
}

function generateTemplateDescription(prompt: string, type: 'short' | 'long') {
  const titleMatch = prompt.match(/for: "([^"]+)"/)
  const categoryMatch = prompt.match(/category "([^"]+)"/)

  const title = titleMatch ? titleMatch[1] : prompt.split('\n')[0]?.slice(0, 80) || 'Produk Digital'
  const category = categoryMatch ? categoryMatch[1] : null

  const categoryTemplates: Record<string, { short: string; long: string }> = {
    grafis: {
      short: `Desain ${title} berkualitas tinggi untuk kebutuhan kreatif Anda.`,
      long: `${title} - Desain Profesional & Kreatif

Desain berkualitas tinggi yang dibuat dengan detail sempurna dan kreativitas maksimal. Cocok untuk kebutuhan desain grafis, branding, dan proyek kreatif. File tersedia dalam format yang mudah diedit dan siap digunakan untuk berbagai keperluan.

✅ Desain berkualitas tinggi
✅ Format mudah diedit
✅ Cocok berbagai keperluan
✅ File siap pakai
✅ Support teknis tersedia`,
    },
    ebook: {
      short: `E-book ${title} dengan informasi lengkap dan mudah dipahami.`,
      long: `${title} - Panduan Lengkap & Praktis

E-book informatif yang berisi panduan lengkap dan tips praktis untuk menguasai topik dengan mudah. Ditulis dengan bahasa yang mudah dipahami, cocok untuk pemula hingga tingkat lanjut. Format PDF yang kompatibel dengan semua device.

✅ Informasi lengkap & detail
✅ Bahasa mudah dipahami
✅ Format PDF universal
✅ Cocok semua level
✅ Akses lifetime`,
    },
    akun: {
      short: `Akun ${title} premium dengan akses penuh dan aman.`,
      long: `⚠️ Wajib sertakan nomor WhatsApp saat checkout untuk proses aktivasi!

${title} - Akun Premium & Aman

Akun premium dengan akses penuh ke semua fitur dan konten eksklusif. Akun pribadi dan aman, tidak sharing dengan pengguna lain. Aktivasi cepat dan support 24/7 untuk bantuan teknis.

✅ Akun pribadi & aman
✅ Akses penuh semua fitur
✅ Aktivasi cepat
✅ Support 24/7
✅ Tidak sharing pengguna`,
    },
    software: {
      short: `Software ${title} dengan fitur lengkap dan performa optimal.`,
      long: `${title} - Software Berkualitas & Optimal

Software berkualitas dengan fitur lengkap dan performa optimal untuk memenuhi kebutuhan Anda. Kompatibel dengan berbagai sistem operasi, mudah diinstal dan digunakan. Support teknis tersedia untuk bantuan penggunaan.

✅ Fitur lengkap & optimal
✅ Kompatibel multi-platform
✅ Instalasi mudah
✅ Support teknis
✅ Update berkala`,
    },
    template: {
      short: `Template ${title} siap pakai dengan desain profesional.`,
      long: `${title} - Template Siap Pakai & Profesional

Template siap pakai dengan desain profesional dan modern yang dapat langsung digunakan. Mudah dikustomisasi sesuai kebutuhan, cocok untuk berbagai proyek. File dalam format yang mudah diedit dan kompatibel dengan software populer.

✅ Desain profesional
✅ Mudah dikustomisasi
✅ Format universal
✅ Cocok berbagai proyek
✅ Siap pakai langsung`,
    },
    kursus: {
      short: `Kursus online ${title} dengan materi lengkap dan praktis.`,
      long: `${title} - Kursus Online Komprehensif

Kursus online komprehensif dengan materi lengkap dari dasar hingga lanjutan. Video berkualitas tinggi, praktik langsung, dan sertifikat penyelesaian. Akses lifetime untuk belajar kapan saja dan di mana saja.

✅ Materi lengkap & terstruktur
✅ Video berkualitas tinggi
✅ Praktik langsung
✅ Sertifikat penyelesaian
✅ Akses lifetime`,
    },
    jasa: {
      short: `Jasa ${title} profesional dengan hasil rapi dan komunikasi jelas.`,
      long: `${title} - Jasa Profesional

Layanan profesional yang dikerjakan sesuai brief, dengan komunikasi jelas dan hasil yang bisa direvisi. Cocok untuk kebutuhan bisnis maupun personal.

✅ Brief jelas & terarah
✅ Pengerjaan tepat waktu
✅ Revisi sesuai paket
✅ Komunikasi mudah
✅ Hasil siap pakai`,
    },
    keanggotaan: {
      short: `Keanggotaan ${title} dengan konten eksklusif setiap bulan.`,
      long: `${title} - Komunitas & Konten Eksklusif

Paket keanggotaan dengan update rutin, akses konten eksklusif, dan komunitas yang membantu kamu berkembang.

✅ Konten eksklusif
✅ Update berkala
✅ Akses komunitas
✅ Harga transparan
✅ Bisa dibatalkan kapan saja`,
    },
    video: {
      short: `Video ${title} berkualitas tinggi dengan konten edukatif.`,
      long: `${title} - Video Berkualitas & Edukatif

Video berkualitas tinggi dengan konten edukatif dan informatif yang dirancang untuk pembelajaran efektif. Durasi optimal, audio jernih, dan materi yang mudah dipahami. Cocok untuk pembelajaran dan referensi.

✅ Kualitas video tinggi
✅ Audio jernih & jelas
✅ Materi mudah dipahami
✅ Durasi optimal
✅ Cocok pembelajaran`,
    },
    music: {
      short: `Musik ${title} dengan kualitas audio premium dan lisensi komersial.`,
      long: `${title} - Musik Premium & Lisensi Komersial

Musik berkualitas premium dengan kualitas audio tinggi dan lisensi komersial untuk penggunaan komersial. Bebas royalti dan cocok untuk proyek multimedia, iklan, dan konten kreatif.

✅ Kualitas audio premium
✅ Lisensi komersial
✅ Bebas royalti
✅ Cocok multimedia
✅ Format universal`,
    },
  }

  const aliases: Record<string, string> = {
    'e-book': 'ebook',
    'kursus online': 'kursus',
    musik: 'music',
  }

  if (category) {
    const key = aliases[category.toLowerCase()] || category.toLowerCase()
    const template = categoryTemplates[key]
    if (template) return template[type]
  }

  return type === 'short'
    ? `${title} - Produk digital berkualitas untuk kebutuhan Anda.`
    : `${title} - Produk Digital Berkualitas

Produk digital berkualitas tinggi yang dirancang untuk memenuhi kebutuhan Anda dengan sempurna. Fitur lengkap, mudah digunakan, dan support teknis tersedia untuk memastikan pengalaman terbaik.

✅ Kualitas terjamin
✅ Fitur lengkap
✅ Mudah digunakan
✅ Support teknis
✅ Pengalaman terbaik`
}
