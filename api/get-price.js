// api/get-price.js
import { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

// --- ÖNEMLİ AYARLAR ---

// Kendi Pump.fun token'ınızın adresini buraya yapıştırın
const PUMP_TOKEN_ADDRESS = "ctQPRPpLY52CeEfmJqUEhYQ6SmMVHitkU3KKEDUpump";

// Pump.fun'ın ana program ve bonding curve kontrat adresleri (bunlar sabittir)
const PUMP_FUN_PROGRAM = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
const BONDING_CURVE_SEED = Buffer.from('bonding-curve');
const METADATA_SEED = Buffer.from('metadata');

// Solana'ya bağlanmak için bir RPC adresi. Helius veya QuickNode'dan ücretsiz alabilirsiniz.
// Vercel'in varsayılanı bazen yetersiz kalabilir.
const SOLANA_RPC_URL = "https://api.mainnet-beta.solana.com";

// --- FİYAT ALMA MANTIĞI ---

async function getSolPriceInUsd( ) {
  try {
    const response = await fetch('https://price.jup.ag/v4/price?ids=SOL&vsToken=USDC' );
    const data = await response.json();
    return data.data.SOL.price;
  } catch (error) {
    console.error("SOL/USD fiyatı alınamadı:", error);
    throw new Error("SOL/USD fiyatı alınamadı.");
  }
}

export default async function handler(request, response) {
  try {
    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    const tokenMint = new PublicKey(PUMP_TOKEN_ADDRESS);

    // Pump.fun bonding curve hesabının adresini türet
    const [bondingCurve] = PublicKey.findProgramAddressSync(
      [BONDING_CURVE_SEED, tokenMint.toBuffer()],
      PUMP_FUN_PROGRAM
    );

    // Bonding curve hesabının bilgilerini zincirden çek
    const accountInfo = await connection.getAccountInfo(bondingCurve);
    if (!accountInfo) {
      throw new Error("Token'ın bonding curve hesabı bulunamadı. Adresin doğru olduğundan emin olun.");
    }

    // Gelen ham veriden rezervleri ayıkla (bu offsetler Pump.fun kontratına özeldir)
    const virtualSolReserves = Number(accountInfo.data.readBigUInt64LE(8));
    const virtualTokenReserves = Number(accountInfo.data.readBigUInt64LE(16));
    
    if (virtualTokenReserves === 0) {
      throw new Error("Token rezervi sıfır, fiyat hesaplanamıyor.");
    }

    // 1. Token'ın SOL cinsinden fiyatını hesapla
    const priceInSol = virtualSolReserves / virtualTokenReserves;

    // 2. Anlık SOL/USD fiyatını al
    const solPriceUsd = await getSolPriceInUsd();

    // 3. Token'ın USD cinsinden fiyatını hesapla
    const priceInUsd = priceInSol * solPriceUsd;

    // Pump.fun token'larının genellikle sembolü olmaz, metadata'dan almak gerekir.
    // Şimdilik basit tutalım ve sabit bir isim verelim.
    const tokenSymbol = "BARRON"; // Kendi token sembolünüzü buraya yazabilirsiniz.

    return response.status(200).json({
      token: tokenSymbol,
      price_in_usd: priceInUsd,
    });

  } catch (error) {
    console.error("get-price API'sinde hata:", error);
    return response.status(500).json({
      message: "Token fiyatı alınırken sunucu tarafında bir hata oluştu.",
      error: error.message,
    });
  }
}
