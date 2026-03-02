import { createClient } from '@supabase/supabase-js';

// Unavatar.io, bir kullanıcı adından doğrudan profil resmi URL'sini verir.
// ?fallback=false -> eğer resim bulamazsa hata vermesi veya boş dönmesi için.
const getPfpUrl = (username) => `https://unavatar.io/twitter/${username}?fallback=false`;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
 );

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { square_id, twitter_username, transaction_id } = request.body;

    // 1. Unavatar'dan doğrudan profil resmi URL'sini al.
    const pfpUrl = getPfpUrl(twitter_username);

    // Unavatar, kullanıcı bulunamazsa genellikle bir yönlendirme veya hata döndürür.
    // Bunu doğrulamak için URL'ye bir HEAD isteği atabiliriz, ama şimdilik basit tutalım.
    // Eğer kullanıcı adı yanlışsa, kırık bir resim linki kaydedilir, bu da kabul edilebilir bir başlangıç.

    // 2. Veritabanına yeni satırı, resim URL'si ile birlikte ekle.
    const { data, error } = await supabase
      .from('squares')
      .insert([{ 
          square_id, 
          owner_twitter_username: twitter_username, 
          transaction_id,
          owner_twitter_pfp_url: pfpUrl 
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

    // Başarılı cevaba pfpUrl'i de ekleyelim ki ön yüz anında kullansın.
    return response.status(200).json({ message: 'Kare başarıyla kaydedildi.', data: data });

  } catch (e) {
    console.error('Handler Error:', e);
    return response.status(500).json({ message: 'Sunucuda beklenmedik bir hata oluştu.' });
  }
}
