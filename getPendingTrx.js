const express = require("express");
const { ethers } = require("ethers");
const { utils } = ethers;
const path = require("path");
const { log } = require("console");

const EvmChainId = {
  ARBITRUM: 42161,
  POLYGON: 137,
  POLYGON_MUMBAI: 80001,
  BSC: 56,
  BSC_TESTNET: 97,
  ETHEREUM: 1,
  PULSE_CHAIN: 369,
  BASE: 8453,
};

const RPCS = {
  [EvmChainId.ETHEREUM]: "https://mainnet.infura.io/v3/YOUR_INFURA_KEY",
  [EvmChainId.BSC]: "https://bsc-dataseed.binance.org",
  [EvmChainId.BSC_TESTNET]: "https://data-seed-prebsc-1-s1.binance.org:8545",
  [EvmChainId.POLYGON]: "https://polygon-rpc.com",
  [EvmChainId.POLYGON_MUMBAI]: "https://rpc-mumbai.maticvigil.com",
  [EvmChainId.ARBITRUM]: "https://arb1.arbitrum.io/rpc",
  [EvmChainId.PULSE_CHAIN]: "https://rpc.pulsechain.com",
  [EvmChainId.BASE]: "https://mainnet.base.org",
};

const formatTxFromTxpool = (tx) => ({
  hash: tx.hash,
  nonce: parseInt(tx.nonce, 16),
  from: tx.from,
  to: tx.to,
  value: ethers.formatEther(tx.value),
  gasLimit: tx.gas,
  maxFeePerGas: tx.maxFeePerGas
    ? ethers.formatUnits(tx.maxFeePerGas, "gwei")
    : undefined,
  maxPriorityFeePerGas: tx.maxPriorityFeePerGas
    ? ethers.formatUnits(tx.maxPriorityFeePerGas, "gwei")
    : undefined,
  gasPrice: tx.gasPrice ? ethers.formatUnits(tx.gasPrice, "gwei") : undefined,
  timestamp: Math.floor(Date.now() / 1000),
  status: "pending",
});

const getProviderById = (chainId) => {
  const rpcUrl = RPCS[chainId];
  if (!rpcUrl) throw new Error(`RPC not found for chainId ${chainId}`);
  return new ethers.JsonRpcProvider(rpcUrl);
};

const getPendingAndLastestNonces = async (chainId, address) => {
  const provider = getProviderById(chainId);
  const [pendingNonce, latestNonce] = await Promise.all([
    provider.getTransactionCount(address, "pending"),
    provider.getTransactionCount(address, "latest"),
  ]);
  return { pendingNonce, latestNonce };
};

const getPendingTransactions = async (chainId, address) => {
  if (!ethers.isAddress(address)) {
    throw new Error("Invalid Ethereum address");
  }

  const provider = getProviderById(chainId);
  const { pendingNonce, latestNonce } = await getPendingAndLastestNonces(
    chainId,
    address
  );
  const expectedPendingCount = pendingNonce - latestNonce;
  const pendingTransactions = [];

  if (expectedPendingCount <= 0) {
    return {
      address,
      chainId,
      pendingCount: 0,
      latestNonce,
      pendingNonce,
      pendingTransactions,
    };
  }

  let foundTransactions = false;

  // 1. Try txpool_content first (get transaction in block pending and queued)
  try {
    const txpool = await provider.send("txpool_content", []);
    const pendingTxs = txpool?.pending?.[address.toLowerCase()] || {};

    if (Object.keys(pendingTxs).length > 0) {
      for (const nonce in pendingTxs) {
        const tx = pendingTxs[nonce];
        pendingTransactions.push(formatTxFromTxpool(tx));
      }
      foundTransactions = true;
    }
  } catch (error) {
    console.warn(
      "txpool_content not available or empty, fallback to pending block"
    );
  }

  // 2. If txpool_content failed → fallback to pending block (get transaction in block pending)
  if (!foundTransactions) {
    try {
      const pendingBlock = await provider.getBlockWithTransactions("pending");
      for (const tx of pendingBlock.transactions) {
        if (tx.from.toLowerCase() === address.toLowerCase()) {
          pendingTransactions.push(formatTxFromBlock(tx));
        }
      }
      if (pendingTransactions.length > 0) {
        foundTransactions = true;
      }
    } catch (error) {
      console.warn("Failed to fetch pending block", error);
    }
  }

  // baseFee
  if (!foundTransactions) {
    try {
      const checksumAddress = utils.getAddress(address);
      const txpool = await provider.send("txpool_content", []);
      const baseFeeTxs = txpool?.baseFee?.[checksumAddress] || {};

      if (Object.keys(baseFeeTxs).length > 0) {
        for (const nonce in baseFeeTxs) {
          const tx = baseFeeTxs[nonce];
          pendingTransactions.push(formatTxFromTxpool(tx));
        }
        foundTransactions = true;
      }
    } catch (error) {
      console.warn(
        "txpool_content not available or empty, fallback to baseFee block"
      );
    }
  }

  // 3. If still nothing → fake pending txs by nonce
  if (!foundTransactions) {
    for (let nonce = latestNonce; nonce < pendingNonce; nonce++) {
      pendingTransactions.push({
        nonce,
        from: address,
        status: "pending (predicted)",
        timestamp: Math.floor(Date.now() / 1000),
      });
    }
  }

  pendingTransactions.sort((a, b) => a.nonce - b.nonce);

  return {
    address,
    chainId,
    pendingCount: pendingTransactions.length,
    latestNonce,
    pendingNonce,
    pendingTransactions,
  };
};

const app = express();
const PORT = 3000;

// Thêm middleware để phục vụ file tĩnh và parse form data
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Thêm route để phục vụ trang HTML
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ Endpoint: GET /pending?chainId=56&address=0x...
app.get("/pending", async (req, res) => {
  const { chainId, address } = req.query;
  try {
    const result = await getPendingTransactions(parseInt(chainId), address);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

// ✅ Endpoint: GET
app.get("/test", async (req, res) => {
  const { number1, number2, operator } = req.query;
  const num1 = parseFloat(number1);
  const num2 = parseFloat(number2);
  log("operator", operator);
  log("num1", num1);
  log("num2", num2);
  try {
    let calculatorResult = 0;
    switch (operator) {
      case "plus":
        calculatorResult = num1 + num2;
        break;
      case "minus":
        calculatorResult = num1 - num2;
        break;
      case "multi":
        calculatorResult = num1 * num2;
        break;
      case "divide":
        calculatorResult = num1 / num2;
        break;
    }
    const result = {
      number1: num1, // Trả về dạng số đã được chuyển đổi
      number2: num2, // Trả về dạng số đã được chuyển đổi
      operator: operator,
      calculatorResult: calculatorResult,
    };
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

module.exports = app;
