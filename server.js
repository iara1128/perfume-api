require("dotenv").config(); // Carrega as variáveis do .env
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Puxa a URL do arquivo .env
const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 10000;

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ Conectado ao MongoDB com sucesso!"))
  .catch((err) => console.error("❌ Erro ao conectar ao MongoDB:", err));

// Definindo o "Molde" da Venda (Schema)
const VendaSchema = new mongoose.Schema({
  cliente: String,
  perfume: String,
  valorOriginal: Number, // Este aqui NUNCA deve ser alterado no PATCH
  valor: Number, // Este aqui DIMINUI
  status: { type: String, default: "pendente" },
  data: { type: Date, default: Date.now },
});

const Venda = mongoose.model("Venda", VendaSchema);

// 3. ROTAS

// A. Buscar todas as vendas
app.get("/vendas", async (req, res) => {
  const vendas = await Venda.find();
  res.json(vendas);
});

// B. Registrar nova venda
app.post("/vendas", async (req, res) => {
  const novaVenda = new Venda(req.body);
  await novaVenda.save();
  res.status(201).json(novaVenda);
});

// C. Atualizar venda (Abatimento ou Pagamento Total)
// Rota para atualizar valor (Abatimento)
app.patch("/vendas/:id", async (req, res) => {
  try {
    // Pegamos apenas o que queremos mudar do corpo da requisição
    const { valor, status } = req.body;

    // Criamos um objeto de atualização APENAS com esses dois campos
    const camposParaAtualizar = {};
    if (valor !== undefined) camposParaAtualizar.valor = valor;
    if (status !== undefined) camposParaAtualizar.status = status;

    // O findByIdAndUpdate agora só mexerá no 'valor' e no 'status'
    const vendaAtualizada = await Venda.findByIdAndUpdate(
      req.params.id,
      { $set: camposParaAtualizar }, // O $set garante que ele não mexa no resto
      { new: true }
    );

    if (!vendaAtualizada) {
      return res.status(404).json({ error: "Venda não encontrada" });
    }

    res.json(vendaAtualizada);
  } catch (err) {
    console.error("Erro no PATCH:", err);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// D. Deletar (Para a função de zerar caixa ou limpar histórico)
app.delete("/vendas/limpar-pagos", async (req, res) => {
  await Venda.deleteMany({ status: "pago" });
  res.json({ message: "Caixa zerado no banco!" });
});

app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Servidor rodando na porta ${PORT}`)
);
