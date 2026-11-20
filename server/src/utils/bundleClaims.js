// Shared Prisma include for a buyer claim: who started it and the claimed items with a thumbnail
const CLAIM_INCLUDE = {
  creator: { select: { name: true, username: true } },
  items: {
    orderBy: [{ isBonus: 'asc' }, { id: 'asc' }],
    include: { boltSpec: { include: { images: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }], take: 1 } } } },
  },
};

module.exports = { CLAIM_INCLUDE };
