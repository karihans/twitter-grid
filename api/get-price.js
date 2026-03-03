// api/get-price.js
import { Connection, PublicKey } from '@solana/web3.js';

// --- AYARLAR ---
const PUMP_TOKEN_ADDRESS = "ctQPRPpLY52CeEfmJqUEhYQ6SmMVHitkU3KKEDUpump";

// Pump.fun'ın ana program ve bonding curve kontrat adresleri (sabit)
const PUMP_FUN_PROGRAM = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
const BONDING_CURVE_SEED = Buffer.from('bonding-curve');

// Güvenilir bir RPC adresi. Helius'tan ücretsiz bir hesap açıp almanızı şiddetle tavsiye ederim.
// Ücretsiz Helius RPC'si, genel amaçlı olanlardan çok daha performanslıdır.
const SOLANA_RPC_URL = process.env.HELIUS_RPC_URL || "https://api.mainnet-beta.solana.com";

// --- YARDIMCI FONKSİYONLAR ---
async function getSolPriceInUsd( ) {
  try {
    // Jupiter, SOL fiyatı için hala en güvenilir kaynaklardan biridir.
    const response = await fetch('https://price.jup.ag/v4/price?ids=SOL&vsToken=USDC' );
    if (!response.ok) throw new Error('Jupiter API for SOL price failed');
    const data = await response.json();
    return data.data.SOL.price;
  } catch (error) {
    console.error("SOL/USD fiyatı alınamadı:", error);
    throw new Error("SOL/USD fiyatı alınamadı.");
  }
}

// --- ANA API HANDLER ---
export default async function handler(request, response) {
  try {
    console.log("RPC İsteği Başlatıldı. RPC URL:", SOLANA_RPC_URL);
    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    const tokenMint = new PublicKey(PUMP_TOKEN_ADDRESS);

    // Bonding curve hesabının adresini zincir üstünde bul
    const [bondingCurveKey] = PublicKey.findProgramAddressSync(
      [BONDING_CURVE_SEED, tokenMint.toBuffer()],
      PUMP_FUN_PROGRAM
    );

    console.log("Türetilen Bonding Curve Adresi:", bondingCurveKey.toBase58());

    // Bonding curve hesabının bilgilerini zincirden çek
    const accountInfo = await connection.getAccountInfo(bondingCurveKey);
    if (!accountInfo) {
      throw new Error(`Token'ın bonding curve hesabı bulunamadı (${bondingCurveKey.toBase58()}). Adresin doğru olduğundan veya token'ın oluşturulduğundan emin olun.`);
    }

    // Gelen ham veriden (Buffer) rezervleri oku.
    // Bu offsetler (8 ve 16) Pump.fun kontratının veri yapısına özeldir.
    const virtualSolReserves = Number(accountInfo.data.readBigUInt64LE(8));
    const virtualTokenReserves = Number(accountInfo.data.readBigUInt64LE(16));
    
    console.log("Sanal SOL Rezervi:", virtualSolReserves);
    console.log("Sanal Token Rezervi:", virtualTokenReserves);

    if (virtualTokenReserves === 0) {
      throw new Error("Token rezervi sıfır, fiyat hesaplanamıyor (henüz hiç alım yapılmamış olabilir).");
    }

    // 1. Token'ın anlık fiyatını SOL cinsinden hesapla
    const priceInSol = virtualSolReserves / virtualTokenReserves;

    // 2. Anlık SOL/USD fiyatını al
    const solPriceUsd = await getSolPriceInUsd();
    console.log("Anlık SOL/USD Fiyatı:", solPriceUsd);

    // 3. Token'ın USD cinsinden nihai fiyatını hesapla
    const priceInUsd = priceInSol * solPriceUsd;
    console.log("Hesaplanan USD Fiyatı:", priceInUsd);

    // Ön yüzde görünecek token sembolü
    const tokenSymbol = "YOUR_TOKEN"; // Kendi token sembolünüzü buraya yazın

    return response.status(200).json({
      token: tokenSymbol,
      price_in_usd: priceInUsd,
    });

  } catch (error) {
    console.error("get-price API'sinde KÖK HATA:", error);
    return response.status(500).json({
      message: "Token fiyatı alınırken sunucu tarafında bir hata oluştu.",
      error: error.message,
    });
  }
}
