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

// Adicione o modelo de Caixa
const Caixa = mongoose.model("Caixa", { total: { type: Number, default: 0 } });

// Rota para buscar o saldo do caixa
app.get("/caixa", async (req, res) => {
  let caixa = await Caixa.findOne();
  if (!caixa) caixa = await Caixa.create({ total: 0 });
  res.json(caixa);
});

// Rota para zerar o caixa no banco
app.post("/caixa/zerar", async (req, res) => {
  await Caixa.findOneAndUpdate({}, { total: 0 });
  res.json({ message: "Caixa zerado!" });
});

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
  const { valor, status, valorPago } = req.body;
  const venda = await Venda.findByIdAndUpdate(
    req.params.id,
    { valor, status },
    { new: true }
  );

  // Se houve pagamento, incrementa o total no banco
  if (valorPago > 0) {
    await Caixa.findOneAndUpdate(
      {},
      { $inc: { total: valorPago } },
      { upsert: true }
    );
  }
  res.json(venda);
});

// D. Deletar (Para a função de zerar caixa ou limpar histórico)
app.delete("/vendas/limpar-pagos", async (req, res) => {
  await Venda.deleteMany({ status: "pago" });
  res.json({ message: "Caixa zerado no banco!" });
});

app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Servidor rodando na porta ${PORT}`)
);
