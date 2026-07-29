const mongoose = require("mongoose");

const Payment = require("../models/Payment");
const ServiceProvider = require("../models/ServiceProvider");

const PAYMENT_TYPES = ["advance", "partial", "final", "reimbursement"];
const CONTRACT_PROGRESS_PAYMENT_TYPES = ["advance", "partial", "final"];
const PAYMENT_STATUSES = ["pending", "paid", "failed", "cancelled"];

const currencyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 2,
});

const formatCurrency = (value) => currencyFormatter.format(Number(value) || 0);

const toObjectId = (value) =>
  value instanceof mongoose.Types.ObjectId
    ? value
    : new mongoose.Types.ObjectId(value);

const buildFinancialSummary = (contractValue = 0, aggregate = {}) => {
  const safeContractValue = Math.max(Number(contractValue) || 0, 0);
  const contractPaymentsPaid = Number(aggregate.contractPaymentsPaid) || 0;
  const reimbursementsPaid = Number(aggregate.reimbursementsPaid) || 0;
  const pendingContractPayments = Number(aggregate.pendingContractPayments) || 0;
  const pendingReimbursements = Number(aggregate.pendingReimbursements) || 0;
  const outstandingBalance = Math.max(
    safeContractValue - contractPaymentsPaid,
    0
  );
  const overpaidAmount = Math.max(contractPaymentsPaid - safeContractValue, 0);

  return {
    contractValue: safeContractValue,
    contractPaymentsPaid,
    reimbursementsPaid,
    pendingContractPayments,
    pendingReimbursements,
    outstandingBalance,
    overpaidAmount,
    totalPaid: contractPaymentsPaid,
    pendingAmount: pendingContractPayments,
  };
};

const buildContractFinancialSummaryMap = async (contracts = []) => {
  const validContracts = contracts.filter((contract) => contract?._id);
  const contractIds = validContracts.map((contract) => toObjectId(contract._id));

  if (!contractIds.length) {
    return new Map();
  }

  const aggregates = await Payment.aggregate([
    {
      $match: {
        contract: { $in: contractIds },
      },
    },
    {
      $project: {
        contract: 1,
        amount: {
          $cond: [
            {
              $and: [
                { $ne: ["$amount", null] },
                { $isNumber: "$amount" },
              ],
            },
            "$amount",
            0,
          ],
        },
        status: "$status",
        paymentType: {
          $ifNull: ["$paymentType", "final"],
        },
      },
    },
    {
      $group: {
        _id: "$contract",
        contractPaymentsPaid: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", "paid"] },
                  { $in: ["$paymentType", CONTRACT_PROGRESS_PAYMENT_TYPES] },
                ],
              },
              "$amount",
              0,
            ],
          },
        },
        reimbursementsPaid: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", "paid"] },
                  { $eq: ["$paymentType", "reimbursement"] },
                ],
              },
              "$amount",
              0,
            ],
          },
        },
        pendingContractPayments: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", "pending"] },
                  { $in: ["$paymentType", CONTRACT_PROGRESS_PAYMENT_TYPES] },
                ],
              },
              "$amount",
              0,
            ],
          },
        },
        pendingReimbursements: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", "pending"] },
                  { $eq: ["$paymentType", "reimbursement"] },
                ],
              },
              "$amount",
              0,
            ],
          },
        },
      },
    },
  ]);

  const aggregateMap = new Map(
    aggregates.map((aggregate) => [String(aggregate._id), aggregate])
  );

  return new Map(
    validContracts.map((contract) => [
      String(contract._id),
      buildFinancialSummary(
        contract.contractValue,
        aggregateMap.get(String(contract._id))
      ),
    ])
  );
};

const attachFinancialSummaryToContract = (contract, summaryMap) => {
  if (!contract) {
    return contract;
  }

  const contractObject =
    typeof contract.toObject === "function" ? contract.toObject() : { ...contract };

  return {
    ...contractObject,
    financialSummary:
      summaryMap.get(String(contractObject._id)) ||
      buildFinancialSummary(contractObject.contractValue),
  };
};

const attachFinancialSummariesToContracts = async (contracts = []) => {
  const summaryMap = await buildContractFinancialSummaryMap(contracts);

  return contracts.map((contract) =>
    attachFinancialSummaryToContract(contract, summaryMap)
  );
};

const getProviderIdsForUser = async (user) => {
  const providerEmail = String(user?.email || "").trim().toLowerCase();

  if (!providerEmail) {
    return [];
  }

  const providers = await ServiceProvider.find({ email: providerEmail }).select("_id");
  return providers.map((provider) => provider._id);
};

const getPaymentScopeMatch = async (user) => {
  if (user?.role === "admin") {
    return {};
  }

  if (user?.role === "service_provider") {
    const providerIds = await getProviderIdsForUser(user);

    if (!providerIds.length) {
      return { _id: null };
    }

    return {
      serviceProvider: { $in: providerIds },
    };
  }

  return null;
};

const calculateContractFinancialSnapshot = async ({
  contractId,
  contractValue,
  excludePaymentId,
}) => {
  const match = {
    contract: toObjectId(contractId),
  };

  if (excludePaymentId && mongoose.Types.ObjectId.isValid(String(excludePaymentId))) {
    match._id = { $ne: toObjectId(excludePaymentId) };
  }

  const [aggregate] = await Payment.aggregate([
    { $match: match },
    {
      $project: {
        amount: {
          $cond: [
            {
              $and: [
                { $ne: ["$amount", null] },
                { $isNumber: "$amount" },
              ],
            },
            "$amount",
            0,
          ],
        },
        status: "$status",
        paymentType: {
          $ifNull: ["$paymentType", "final"],
        },
      },
    },
    {
      $group: {
        _id: null,
        contractPaymentsPaid: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", "paid"] },
                  { $in: ["$paymentType", CONTRACT_PROGRESS_PAYMENT_TYPES] },
                ],
              },
              "$amount",
              0,
            ],
          },
        },
        reimbursementsPaid: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", "paid"] },
                  { $eq: ["$paymentType", "reimbursement"] },
                ],
              },
              "$amount",
              0,
            ],
          },
        },
        pendingContractPayments: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", "pending"] },
                  { $in: ["$paymentType", CONTRACT_PROGRESS_PAYMENT_TYPES] },
                ],
              },
              "$amount",
              0,
            ],
          },
        },
        pendingReimbursements: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", "pending"] },
                  { $eq: ["$paymentType", "reimbursement"] },
                ],
              },
              "$amount",
              0,
            ],
          },
        },
      },
    },
  ]);

  return buildFinancialSummary(contractValue, aggregate);
};

const buildPaymentWarnings = ({
  amount,
  paymentType,
  status,
  currentSummary,
  contractValue,
}) => {
  const warnings = [];
  const numericAmount = Number(amount) || 0;
  const safeContractValue = Number(contractValue) || 0;
  const isContractProgressPayment =
    CONTRACT_PROGRESS_PAYMENT_TYPES.includes(paymentType);

  if (!isContractProgressPayment) {
    return warnings;
  }

  if (status === "pending") {
    const projectedPending =
      (Number(currentSummary.pendingContractPayments) || 0) + numericAmount;

    if (projectedPending > safeContractValue) {
      warnings.push(
        "Pending contract payments now exceed the contract value. Review the payment schedule before marking them as paid."
      );
    }
  }

  if (paymentType === "final") {
    const projectedSettlement =
      (Number(currentSummary.contractPaymentsPaid) || 0) +
      (status === "paid" ? numericAmount : 0);
    const remainingAfterFinal = safeContractValue - projectedSettlement;

    if (remainingAfterFinal > 0) {
      warnings.push(
        `This final payment still leaves an outstanding balance of ${formatCurrency(
          remainingAfterFinal
        )}.`
      );
    }
  }

  return warnings;
};

module.exports = {
  PAYMENT_TYPES,
  PAYMENT_STATUSES,
  CONTRACT_PROGRESS_PAYMENT_TYPES,
  formatCurrency,
  buildFinancialSummary,
  buildContractFinancialSummaryMap,
  attachFinancialSummaryToContract,
  attachFinancialSummariesToContracts,
  getProviderIdsForUser,
  getPaymentScopeMatch,
  calculateContractFinancialSnapshot,
  buildPaymentWarnings,
};
