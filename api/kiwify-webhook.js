import admin from "firebase-admin";

export default async function handler(req, res) {
  try {
    // 🧪 LOG COMPLETO DE VARIÁVEIS
    console.log("🧪 Todas as variáveis disponíveis:", Object.keys(process.env).sort());

    // 🔍 Debug: verificar variáveis de ambiente específicas do Firebase
    const vars = {
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY:
        process.env.FIREBASE_PRIVATE_KEY &&
        process.env.FIREBASE_PRIVATE_KEY.startsWith("-----BEGIN")
          ? "OK (tem conteúdo)"
          : "❌ AUSENTE ou mal formatada",
      FIREBASE_DB_URL: process.env.FIREBASE_DB_URL,
    };

    console.log("🔎 Variáveis carregadas:", vars);

    // Se alguma variável essencial estiver faltando
    if (!process.env.FIREBASE_PROJECT_ID)
      throw new Error("❌ Variável FIREBASE_PROJECT_ID ausente!");
    if (!process.env.FIREBASE_CLIENT_EMAIL)
      throw new Error("❌ Variável FIREBASE_CLIENT_EMAIL ausente!");
    if (!process.env.FIREBASE_PRIVATE_KEY)
      throw new Error("❌ Variável FIREBASE_PRIVATE_KEY ausente!");
    if (!process.env.FIREBASE_DB_URL)
      throw new Error("❌ Variável FIREBASE_DB_URL ausente!");

    // Inicializar Firebase (com segurança, evitando duplicar apps)
    if (!admin.apps.length) {
      console.log("🚀 Inicializando Firebase...");
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
        databaseURL: process.env.FIREBASE_DB_URL,
      });
      console.log("✅ Firebase inicializado com sucesso!");
    }

    // Apenas mostrar o método acessado
    if (req.method !== "POST") {
      console.log("⚙️ Endpoint acessado com GET - OK");
      return res.status(200).json({ message: "Método não permitido (GET test OK)" });
    }

    // Se for POST, processar o webhook normalmente
    const { status, buyer_email, customer_email } = req.body;
    const email = buyer_email || customer_email;
    if (!email) throw new Error("❌ Nenhum email encontrado no payload da Kiwify!");

    if (status && status.toLowerCase() === "paid") {
      console.log(`💾 Gravando usuário: ${email}`);
      await admin.firestore().collection("usuarios").doc(email).set(
        {
          ativo: true,
          produto: "Pacote Completo",
          dataCompra: new Date().toISOString(),
        },
        { merge: true }
      );
      console.log("✅ Documento criado/atualizado com sucesso!");
      return res.status(200).json({ success: true });
    }

    console.log("⚠️ Status diferente de 'paid' - sem gravação.");
    return res.status(200).json({ success: false, motivo: "Pagamento não confirmado" });
  } catch (err) {
    console.error("❌ ERRO DETECTADO:", err.message);
    console.error(err.stack);
    return res.status(500).json({
      error: true,
      message: err.message,
      hint: "Verifique os logs no Vercel para detalhes",
    });
  }
}
