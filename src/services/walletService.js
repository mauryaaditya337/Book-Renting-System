const mongoose = require("mongoose");

const Wallet = require("../models/Wallet");
const WalletTransaction = require("../models/WalletTransaction");

const ensurePositiveAmount = (amount) => {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    const error = new Error("Amount must be greater than 0");
    error.statusCode = 400;
    throw error;
  }
};

const getOrCreateWallet = async (userId, options = {}) =>
  Wallet.findOneAndUpdate(
    { user: userId },
    {
      $setOnInsert: {
        user: userId,
        generalBalance: 0,
        lockedBalance: 0
      }
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
      session: options.session
    }
  );

const createWalletTransaction = async (
  { userId, type, amount, status = "success", referenceId = null, description = "", metadata },
  options = {}
) => {
  ensurePositiveAmount(amount);

  const [transaction] = await WalletTransaction.create(
    [
      {
        user: userId,
        type,
        amount,
        status,
        referenceId,
        description,
        metadata
      }
    ],
    { session: options.session }
  );

  return transaction;
};

const creditGeneralBalance = async (
  { userId, amount, description = "", referenceId = null, metadata },
  options = {}
) => {
  ensurePositiveAmount(amount);

  const wallet = await Wallet.findOneAndUpdate(
    { user: userId },
    {
      $setOnInsert: {
        user: userId,
        lockedBalance: 0
      },
      $inc: {
        generalBalance: amount
      }
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
      session: options.session
    }
  );

  const transaction = await createWalletTransaction(
    {
      userId,
      type: "credit",
      amount,
      status: "success",
      referenceId,
      description,
      metadata
    },
    options
  );

  return { wallet, transaction };
};

const debitGeneralBalance = async (
  { userId, amount, description = "", referenceId = null, metadata },
  options = {}
) => {
  ensurePositiveAmount(amount);

  await getOrCreateWallet(userId, options);

  const wallet = await Wallet.findOneAndUpdate(
    {
      user: userId,
      generalBalance: { $gte: amount }
    },
    {
      $inc: {
        generalBalance: -amount
      }
    },
    {
      new: true,
      session: options.session
    }
  );

  if (!wallet) {
    const error = new Error("Insufficient wallet balance");
    error.statusCode = 400;
    throw error;
  }

  const transaction = await createWalletTransaction(
    {
      userId,
      type: "debit",
      amount,
      status: "success",
      referenceId,
      description,
      metadata
    },
    options
  );

  return { wallet, transaction };
};

const lockFundsForRentalEscrow = async (
  {
    renterUserId,
    ownerUserId,
    amount,
    referenceId = null,
    renterDescription = "",
    ownerDescription = "",
    renterMetadata,
    ownerMetadata
  },
  options = {}
) => {
  ensurePositiveAmount(amount);

  await getOrCreateWallet(renterUserId, options);
  await getOrCreateWallet(ownerUserId, options);

  const renterWallet = await Wallet.findOneAndUpdate(
    {
      user: renterUserId,
      generalBalance: { $gte: amount }
    },
    {
      $inc: {
        generalBalance: -amount
      }
    },
    {
      new: true,
      session: options.session
    }
  );

  if (!renterWallet) {
    const error = new Error("Insufficient wallet balance");
    error.statusCode = 400;
    throw error;
  }

  const ownerWallet = await Wallet.findOneAndUpdate(
    { user: ownerUserId },
    {
      $inc: {
        lockedBalance: amount
      }
    },
    {
      new: true,
      session: options.session
    }
  );

  const renterTransaction = await createWalletTransaction(
    {
      userId: renterUserId,
      type: "debit",
      amount,
      status: "success",
      referenceId,
      description: renterDescription,
      metadata: renterMetadata
    },
    options
  );

  const ownerTransaction = await createWalletTransaction(
    {
      userId: ownerUserId,
      type: "lock",
      amount,
      status: "success",
      referenceId,
      description: ownerDescription,
      metadata: ownerMetadata
    },
    options
  );

  return {
    renterWallet,
    ownerWallet,
    renterTransaction,
    ownerTransaction
  };
};

const settleLockedRentalFunds = async (
  {
    renterUserId,
    ownerUserId,
    lockedRent,
    lockedDeposit,
    totalLockedAmount,
    referenceId = null,
    bookTitle = ""
  },
  options = {}
) => {
  if (typeof lockedRent !== "number" || !Number.isFinite(lockedRent) || lockedRent < 0) {
    const error = new Error("Locked rent must be at least 0");
    error.statusCode = 400;
    throw error;
  }

  if (typeof lockedDeposit !== "number" || !Number.isFinite(lockedDeposit) || lockedDeposit < 0) {
    const error = new Error("Locked deposit must be at least 0");
    error.statusCode = 400;
    throw error;
  }

  if (
    typeof totalLockedAmount !== "number" ||
    !Number.isFinite(totalLockedAmount) ||
    totalLockedAmount <= 0
  ) {
    const error = new Error("Total locked amount must be greater than 0");
    error.statusCode = 400;
    throw error;
  }

  if (totalLockedAmount !== lockedRent + lockedDeposit) {
    const error = new Error("Locked amount breakdown is invalid");
    error.statusCode = 400;
    throw error;
  }

  await getOrCreateWallet(renterUserId, options);
  await getOrCreateWallet(ownerUserId, options);

  const ownerWallet = await Wallet.findOneAndUpdate(
    {
      user: ownerUserId,
      lockedBalance: { $gte: totalLockedAmount }
    },
    {
      $inc: {
        lockedBalance: -totalLockedAmount,
        generalBalance: lockedRent
      }
    },
    {
      new: true,
      session: options.session
    }
  );

  if (!ownerWallet) {
    const error = new Error("Owner locked wallet balance is insufficient for settlement");
    error.statusCode = 400;
    throw error;
  }

  const renterWallet = await Wallet.findOneAndUpdate(
    { user: renterUserId },
    {
      $inc: {
        generalBalance: lockedDeposit
      }
    },
    {
      new: true,
      session: options.session
    }
  );

  if (!renterWallet) {
    const error = new Error("Renter wallet could not be updated for settlement");
    error.statusCode = 400;
    throw error;
  }

  const settlementMetadata = {
    source: "rental_return_settlement",
    rentalRequestId: referenceId,
    bookTitle,
    lockedRent,
    lockedDeposit
  };

  if (totalLockedAmount > 0) {
    await createWalletTransaction(
      {
        userId: ownerUserId,
        type: "unlock",
        amount: totalLockedAmount,
        status: "success",
        referenceId,
        description: "Escrow unlocked after successful return",
        metadata: {
          ...settlementMetadata,
          component: "escrow_unlock"
        }
      },
      options
    );
  }

  if (lockedRent > 0) {
    await createWalletTransaction(
      {
        userId: ownerUserId,
        type: "credit",
        amount: lockedRent,
        status: "success",
        referenceId,
        description: "Rent released after return",
        metadata: {
          ...settlementMetadata,
          component: "rent_release"
        }
      },
      options
    );
  }

  if (lockedDeposit > 0) {
    await createWalletTransaction(
      {
        userId: renterUserId,
        type: "credit",
        amount: lockedDeposit,
        status: "success",
        referenceId,
        description: "Deposit refunded",
        metadata: {
          ...settlementMetadata,
          component: "deposit_refund"
        }
      },
      options
    );
  }

  return {
    renterWallet,
    ownerWallet
  };
};

const runWalletOperationInTransaction = async (callback) => {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      result = await callback(session);
    });

    return result;
  } finally {
    await session.endSession();
  }
};

module.exports = {
  ensurePositiveAmount,
  getOrCreateWallet,
  createWalletTransaction,
  creditGeneralBalance,
  debitGeneralBalance,
  lockFundsForRentalEscrow,
  settleLockedRentalFunds,
  runWalletOperationInTransaction
};
