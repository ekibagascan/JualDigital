import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { prompt, type } = await req.json()
    
    // Check if OpenAI API key is available
    const openaiApiKey = process.env.OPENAI_API_KEY
    
    if (!openaiApiKey) {
      // Fallback to template-based generation if no OpenAI key
      return NextResponse.json({
        success: true,
        description: generateTemplateDescription(prompt, type)
      })
    }

    // Use OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant that generates product descriptions for a digital marketplace. 
            Generate descriptions in Indonesian language that are compelling, professional, and optimized for sales.
            
            For SHORT descriptions: Keep concise (max 150 characters) and focus on key benefits.
            
            For LONG descriptions: Use this structured format:
            1. Start with a warning/note if needed (e.g., "⚠️ Wajib sertakan nomor WhatsApp saat checkout untuk proses aktivasi!")
            2. Main product title and tagline
            3. Detailed description paragraph
            4. List of key features with ✅ emoji (3-5 points)
            
            Make it attractive and sales-focused with proper emojis and formatting.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: type === 'short' ? 150 : 300,
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

    return NextResponse.json({
      success: true,
      description: generatedText
    })
  } catch (error) {
    console.error('[AI DESCRIPTION API] Error:', error)
    
    // Fallback to template-based generation
    try {
      const { prompt, type } = await req.json()
      const fallbackDescription = generateTemplateDescription(prompt, type)
      
      return NextResponse.json({
        success: true,
        description: fallbackDescription,
        note: 'Using fallback template (OpenAI not available)'
      })
    } catch (fallbackError) {
      return NextResponse.json(
        { error: 'Failed to generate description' },
        { status: 500 }
      )
    }
  }
}

// Fallback template-based description generator
function generateTemplateDescription(prompt: string, type: 'short' | 'long') {
  const titleMatch = prompt.match(/for: "([^"]+)"/)
  const categoryMatch = prompt.match(/category "([^"]+)"/)
  
  const title = titleMatch ? titleMatch[1] : 'Produk Digital'
  const category = categoryMatch ? categoryMatch[1] : null
  
  const categoryTemplates = {
    'grafis': {
      short: `Desain ${title} berkualitas tinggi untuk kebutuhan kreatif Anda.`,
      long: `${title} - Desain Profesional & Kreatif

Desain berkualitas tinggi yang dibuat dengan detail sempurna dan kreativitas maksimal. Cocok untuk kebutuhan desain grafis, branding, dan proyek kreatif. File tersedia dalam format yang mudah diedit dan siap digunakan untuk berbagai keperluan.

✅ Desain berkualitas tinggi
✅ Format mudah diedit
✅ Cocok berbagai keperluan
✅ File siap pakai
✅ Support teknis tersedia`
    },
    'e-book': {
      short: `E-book ${title} dengan informasi lengkap dan mudah dipahami.`,
      long: `${title} - Panduan Lengkap & Praktis

E-book informatif yang berisi panduan lengkap dan tips praktis untuk menguasai topik dengan mudah. Ditulis dengan bahasa yang mudah dipahami, cocok untuk pemula hingga tingkat lanjut. Format PDF yang kompatibel dengan semua device.

✅ Informasi lengkap & detail
✅ Bahasa mudah dipahami
✅ Format PDF universal
✅ Cocok semua level
✅ Akses lifetime`
    },
    'akun': {
      short: `Akun ${title} premium dengan akses penuh dan aman.`,
      long: `⚠️ Wajib sertakan nomor WhatsApp saat checkout untuk proses aktivasi!

${title} - Akun Premium & Aman

Akun premium dengan akses penuh ke semua fitur dan konten eksklusif. Akun pribadi dan aman, tidak sharing dengan pengguna lain. Aktivasi cepat dan support 24/7 untuk bantuan teknis.

✅ Akun pribadi & aman
✅ Akses penuh semua fitur
✅ Aktivasi cepat
✅ Support 24/7
✅ Tidak sharing pengguna`
    },
    'software': {
      short: `Software ${title} dengan fitur lengkap dan performa optimal.`,
      long: `${title} - Software Berkualitas & Optimal

Software berkualitas dengan fitur lengkap dan performa optimal untuk memenuhi kebutuhan Anda. Kompatibel dengan berbagai sistem operasi, mudah diinstal dan digunakan. Support teknis tersedia untuk bantuan penggunaan.

✅ Fitur lengkap & optimal
✅ Kompatibel multi-platform
✅ Instalasi mudah
✅ Support teknis
✅ Update berkala`
    },
    'template': {
      short: `Template ${title} siap pakai dengan desain profesional.`,
      long: `${title} - Template Siap Pakai & Profesional

Template siap pakai dengan desain profesional dan modern yang dapat langsung digunakan. Mudah dikustomisasi sesuai kebutuhan, cocok untuk berbagai proyek. File dalam format yang mudah diedit dan kompatibel dengan software populer.

✅ Desain profesional
✅ Mudah dikustomisasi
✅ Format universal
✅ Cocok berbagai proyek
✅ Siap pakai langsung`
    },
    'kursus online': {
      short: `Kursus online ${title} dengan materi lengkap dan praktis.`,
      long: `${title} - Kursus Online Komprehensif

Kursus online komprehensif dengan materi lengkap dari dasar hingga lanjutan. Video berkualitas tinggi, praktik langsung, dan sertifikat penyelesaian. Akses lifetime untuk belajar kapan saja dan di mana saja.

✅ Materi lengkap & terstruktur
✅ Video berkualitas tinggi
✅ Praktik langsung
✅ Sertifikat penyelesaian
✅ Akses lifetime`
    },
    'video': {
      short: `Video ${title} berkualitas tinggi dengan konten edukatif.`,
      long: `${title} - Video Berkualitas & Edukatif

Video berkualitas tinggi dengan konten edukatif dan informatif yang dirancang untuk pembelajaran efektif. Durasi optimal, audio jernih, dan materi yang mudah dipahami. Cocok untuk pembelajaran dan referensi.

✅ Kualitas video tinggi
✅ Audio jernih & jelas
✅ Materi mudah dipahami
✅ Durasi optimal
✅ Cocok pembelajaran`
    },
    'musik': {
      short: `Musik ${title} dengan kualitas audio premium dan lisensi komersial.`,
      long: `${title} - Musik Premium & Lisensi Komersial

Musik berkualitas premium dengan kualitas audio tinggi dan lisensi komersial untuk penggunaan komersial. Bebas royalti dan cocok untuk proyek multimedia, iklan, dan konten kreatif.

✅ Kualitas audio premium
✅ Lisensi komersial
✅ Bebas royalti
✅ Cocok multimedia
✅ Format universal`
    }
  }

  if (category) {
    const template = categoryTemplates[category.toLowerCase() as keyof typeof categoryTemplates]
    
    if (template) {
      return template[type]
    }
  }

  // Fallback template
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