import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio'; // Cheerio kütüphanesini içe aktar

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// YENİ FONKSİYON: Verilen Twitter kullanıcı adından profil resmini çeker
async function getTwitterPfp(username) {
  try {
    const response = await fetch(`https://vxtwitter.com/${username}` );
    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html); // HTML'i Cheerio ile yükle
    const pfpUrl = $('meta[property="og:image"]').attr('content'); // Meta etiketini bul ve 'content' özelliğini al
    
    return pfpUrl || null;
  } catch (error) {
    console.error('Twitter PFP alınırken hata:', error);
    return null;
  }
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { square_id, twitter_username, transaction_id } = request.body;

    // 1. Twitter profil resmini al
    const pfpUrl = await getTwitterPfp(twitter_username);
    if (!pfpUrl) {
      console.warn(`'${twitter_username}' için profil resmi bulunamadı.`);
      // İsteğe bağlı: Eğer resim bulunamazsa işlemi durdurabilir veya varsayılan bir resimle devam edebiliriz.
      // Şimdilik null olarak devam edelim.
    }

    // 2. Veritabanına yeni satırı, resim URL'si ile birlikte ekle
    const { data, error } = await supabase
      .from('squares')
      .insert([{ 
          square_id, 
          owner_twitter_username: twitter_username, 
          transaction_id,
          owner_twitter_pfp_url: pfpUrl // Yeni veriyi ekle
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase Error:', error);
      if (error.code === '23505') {
        return response.status(409).json({ message: 'Bu kare daha önce satın alınmış.' });
      }
      return response.status(500).json({ message: 'Veritabanı hatası.', error: error.message });
    }

    return response.status(200).json({ message: 'Kare başarıyla kaydedildi.', data: data });

  } catch (e) {
    console.error('Handler Error:', e);
    return response.status(500).json({ message: 'Sunucuda beklenmedik bir hata oluştu.' });
  }
}
