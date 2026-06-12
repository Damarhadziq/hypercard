/**
 * Seed script to create the initial superadmin user.
 * Run with: npm run seed
 */

import { auth } from './lib/auth.js';
import { db } from './db/index.js';
import { customers, products, transactionItems, transactions, user } from './db/schema.js';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('Seeding database...\n');

  const SUPERADMIN_EMAIL = 'superadmin@hypercard.local';
  const SUPERADMIN_PASSWORD = 'Superadmin123';
  const SUPERADMIN_NAME = 'Owner';

  // Check if superadmin already exists
  const existing = await db
    .select()
    .from(user)
    .where(eq(user.email, SUPERADMIN_EMAIL))
    .limit(1);

  if (existing.length > 0) {
    console.log('Superadmin already exists. Skipping.\n');
  } else {
    // Create superadmin via Better Auth (so password is hashed)
    await auth.api.signUpEmail({
      body: {
        name: SUPERADMIN_NAME,
        email: SUPERADMIN_EMAIL,
        password: SUPERADMIN_PASSWORD,
      },
    });

    // Update role to superadmin (Better Auth creates with default 'admin')
    await db
      .update(user)
      .set({ role: 'superadmin' })
      .where(eq(user.email, SUPERADMIN_EMAIL));

    console.log(`Superadmin created:`);
    console.log(`   Email:    ${SUPERADMIN_EMAIL}`);
    console.log(`   Password: ${SUPERADMIN_PASSWORD}`);
    console.log(`   Role:     superadmin\n`);
  }

  // Create default admin
  const ADMIN_EMAIL = 'admin@hypercard.local';
  const ADMIN_PASSWORD = 'Admin123';
  const ADMIN_NAME = 'Admin Store';

  const existingAdmin = await db
    .select()
    .from(user)
    .where(eq(user.email, ADMIN_EMAIL))
    .limit(1);

  if (existingAdmin.length > 0) {
    console.log('Default admin already exists. Skipping.\n');
  } else {
    await auth.api.signUpEmail({
      body: {
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      },
    });

    console.log(`Default admin created:`);
    console.log(`   Email:    ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   Role:     admin\n`);
  }

  const existingProducts = await db.select().from(products).limit(1);
  const existingCustomers = await db.select().from(customers).limit(1);
  const existingTransactions = await db.select().from(transactions).limit(1);

  if (existingProducts.length > 0 || existingCustomers.length > 0 || existingTransactions.length > 0) {
    console.log('Demo application data already exists. Skipping.\n');
  } else {
    const createdProducts = await db
      .insert(products)
      .values([
        {
          name: 'Pikachu Promo',
          category: 'Promo Card',
          condition: 'Mint',
          setName: 'Scarlet & Violet Promo',
          rarity: 'Promo',
          language: 'Japanese',
          cardNumber: 'SV-P 001',
          finish: 'Holo',
          buyPrice: 150000,
          sellPrice: 250000,
          stock: 3,
        },
        {
          name: 'Charizard VMAX',
          category: 'Single Card',
          condition: 'Near Mint',
          setName: 'Shining Fates',
          rarity: 'Ultra Rare',
          language: 'English',
          cardNumber: 'SV107/SV122',
          finish: 'Full Art',
          buyPrice: 850000,
          sellPrice: 1200000,
          stock: 2,
        },
        {
          name: 'Mew ex',
          category: 'Single Card',
          condition: 'Near Mint',
          setName: 'Paldean Fates',
          rarity: 'Special Illustration Rare',
          language: 'English',
          cardNumber: '232/091',
          finish: 'Holo',
          buyPrice: 980000,
          sellPrice: 1350000,
          stock: 1,
        },
        {
          name: '151 Booster Pack',
          category: 'Booster Pack',
          condition: 'Mint',
          setName: 'Scarlet & Violet 151',
          rarity: 'Sealed Product',
          language: 'English',
          cardNumber: '',
          finish: 'Sealed',
          buyPrice: 95000,
          sellPrice: 135000,
          stock: 12,
        },
      ])
      .returning();

    const createdCustomers = await db
      .insert(customers)
      .values([
        {
          name: 'Hendri Suntono',
          phone: '08123456789',
          address: 'Kalideres, Jakarta Barat',
          postalCode: '11840',
          history: 'Pernah beli Pikachu Promo',
        },
        {
          name: 'Nadia Putri',
          phone: '081298765432',
          address: 'Tembalang, Semarang',
          postalCode: '50275',
          history: 'Kolektor kartu illustration rare',
        },
        {
          name: 'Rizky Pratama',
          phone: '085712340987',
          address: 'Sleman, Yogyakarta',
          postalCode: '55581',
          history: 'Pelanggan booster pack',
        },
      ])
      .returning();

    const [firstTransaction] = await db
      .insert(transactions)
      .values({
        invoiceNumber: 'INV-2026-001',
        customerId: createdCustomers[0]!.id,
        subtotal: 250000,
        discount: 0,
        total: 250000,
        status: 'Lunas',
        date: new Date('2026-06-02T09:15:00.000Z'),
      })
      .returning();

    const [secondTransaction] = await db
      .insert(transactions)
      .values({
        invoiceNumber: 'INV-2026-002',
        customerId: createdCustomers[1]!.id,
        subtotal: 1350000,
        discount: 50000,
        total: 1300000,
        status: 'Lunas',
        date: new Date('2026-06-04T06:40:00.000Z'),
      })
      .returning();

    const [thirdTransaction] = await db
      .insert(transactions)
      .values({
        invoiceNumber: 'INV-2026-003',
        customerId: createdCustomers[2]!.id,
        subtotal: 405000,
        discount: 0,
        total: 405000,
        status: 'Belum Dibayar',
        date: new Date('2026-06-06T11:20:00.000Z'),
      })
      .returning();

    await db.insert(transactionItems).values([
      {
        transactionId: firstTransaction!.id,
        productId: createdProducts[0]!.id,
        quantity: 1,
        price: 250000,
      },
      {
        transactionId: secondTransaction!.id,
        productId: createdProducts[2]!.id,
        quantity: 1,
        price: 1350000,
      },
      {
        transactionId: thirdTransaction!.id,
        productId: createdProducts[3]!.id,
        quantity: 3,
        price: 135000,
      },
    ]);

    console.log('Demo products, customers, and transactions created.\n');
  }

  const ensureProduct = async (product: typeof products.$inferInsert) => {
    const [existingProduct] = await db
      .select()
      .from(products)
      .where(eq(products.name, product.name))
      .limit(1);

    if (existingProduct) return existingProduct;

    const [createdProduct] = await db.insert(products).values(product).returning();
    return createdProduct!;
  };

  const ensureCustomer = async (customer: typeof customers.$inferInsert) => {
    const [existingCustomer] = await db
      .select()
      .from(customers)
      .where(eq(customers.phone, customer.phone ?? ''))
      .limit(1);

    if (existingCustomer) return existingCustomer;

    const [createdCustomer] = await db.insert(customers).values(customer).returning();
    return createdCustomer!;
  };

  const demoProducts = await Promise.all([
    ensureProduct({
      name: 'Pikachu Promo',
      category: 'Promo Card',
      condition: 'Mint',
      setName: 'Scarlet & Violet Promo',
      rarity: 'Promo',
      language: 'Japanese',
      cardNumber: 'SV-P 001',
      finish: 'Holo',
      buyPrice: 150000,
      sellPrice: 250000,
      stock: 8,
    }),
    ensureProduct({
      name: 'Charizard VMAX',
      category: 'Single Card',
      condition: 'Near Mint',
      setName: 'Shining Fates',
      rarity: 'Ultra Rare',
      language: 'English',
      cardNumber: 'SV107/SV122',
      finish: 'Full Art',
      buyPrice: 850000,
      sellPrice: 1200000,
      stock: 4,
    }),
    ensureProduct({
      name: 'Mew ex',
      category: 'Single Card',
      condition: 'Near Mint',
      setName: 'Paldean Fates',
      rarity: 'Special Illustration Rare',
      language: 'English',
      cardNumber: '232/091',
      finish: 'Holo',
      buyPrice: 980000,
      sellPrice: 1350000,
      stock: 3,
    }),
    ensureProduct({
      name: 'Iono',
      category: 'Single Card',
      condition: 'Near Mint',
      setName: 'Paldea Evolved',
      rarity: 'Special Illustration Rare',
      language: 'Indonesian',
      cardNumber: '269/193',
      finish: 'Holo',
      buyPrice: 450000,
      sellPrice: 625000,
      stock: 5,
    }),
    ensureProduct({
      name: '151 Booster Pack',
      category: 'Booster Pack',
      condition: 'Mint',
      setName: 'Scarlet & Violet 151',
      rarity: 'Sealed Product',
      language: 'English',
      cardNumber: '',
      finish: 'Sealed',
      buyPrice: 95000,
      sellPrice: 135000,
      stock: 20,
    }),
  ]);

  const demoCustomers = await Promise.all([
    ensureCustomer({
      name: 'Hendri Suntono',
      phone: '08123456789',
      address: 'Kalideres, Jakarta Barat',
      postalCode: '11840',
      history: 'Pernah beli Pikachu Promo',
    }),
    ensureCustomer({
      name: 'Nadia Putri',
      phone: '081298765432',
      address: 'Tembalang, Semarang',
      postalCode: '50275',
      history: 'Kolektor kartu illustration rare',
    }),
    ensureCustomer({
      name: 'Rizky Pratama',
      phone: '085712340987',
      address: 'Sleman, Yogyakarta',
      postalCode: '55581',
      history: 'Pelanggan booster pack',
    }),
    ensureCustomer({
      name: 'Kevin Wijaya',
      phone: '087812223333',
      address: 'Surabaya Barat, Surabaya',
      postalCode: '60226',
      history: 'Mengutamakan kartu kondisi Near Mint',
    }),
  ]);

  const productByName = new Map(demoProducts.map((product) => [product.name, product]));
  const customerByName = new Map(demoCustomers.map((customer) => [customer.name, customer]));

  const ensureTransaction = async ({
    invoiceNumber,
    customerName,
    date,
    discount,
    shippingCost,
    items,
  }: {
    invoiceNumber: string;
    customerName: string;
    date: string;
    discount: number;
    shippingCost: number;
    items: { productName: string; quantity: number; price: number }[];
  }) => {
    const [existingTransaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.invoiceNumber, invoiceNumber))
      .limit(1);

    if (existingTransaction) return;

    const subtotal = items.reduce((total, item) => total + (item.quantity * item.price), 0);
    const [createdTransaction] = await db
      .insert(transactions)
      .values({
        invoiceNumber,
        customerId: customerByName.get(customerName)!.id,
        subtotal,
        discount,
        shippingCost,
        total: subtotal - discount + shippingCost,
        status: 'Lunas',
        paymentMethod: invoiceNumber.endsWith('0') || invoiceNumber.endsWith('5') ? 'BCA' : 'Mandiri',
        date: new Date(date),
      })
      .returning();

    await db.insert(transactionItems).values(items.map((item) => ({
      transactionId: createdTransaction!.id,
      productId: productByName.get(item.productName)!.id,
      quantity: item.quantity,
      price: item.price,
    })));
  };

  await Promise.all([
    ensureTransaction({
      invoiceNumber: 'INV-2026-005',
      customerName: 'Rizky Pratama',
      date: '2026-06-03T03:35:00.000Z',
      discount: 0,
      shippingCost: 0,
      items: [{ productName: '151 Booster Pack', quantity: 2, price: 135000 }],
    }),
    ensureTransaction({
      invoiceNumber: 'INV-2026-006',
      customerName: 'Kevin Wijaya',
      date: '2026-06-05T08:05:00.000Z',
      discount: 0,
      shippingCost: 15000,
      items: [{ productName: 'Iono', quantity: 1, price: 625000 }],
    }),
    ensureTransaction({
      invoiceNumber: 'INV-2026-007',
      customerName: 'Hendri Suntono',
      date: '2026-06-06T12:25:00.000Z',
      discount: 100000,
      shippingCost: 0,
      items: [{ productName: 'Charizard VMAX', quantity: 1, price: 1200000 }],
    }),
    ensureTransaction({
      invoiceNumber: 'INV-2026-008',
      customerName: 'Nadia Putri',
      date: '2026-06-07T05:50:00.000Z',
      discount: 0,
      shippingCost: 0,
      items: [
        { productName: 'Pikachu Promo', quantity: 1, price: 250000 },
        { productName: '151 Booster Pack', quantity: 4, price: 135000 },
      ],
    }),
    ensureTransaction({
      invoiceNumber: 'INV-2026-009',
      customerName: 'Rizky Pratama',
      date: '2026-06-08T10:30:00.000Z',
      discount: 0,
      shippingCost: 0,
      items: [{ productName: 'Mew ex', quantity: 1, price: 1350000 }],
    }),
    ensureTransaction({
      invoiceNumber: 'INV-2026-010',
      customerName: 'Kevin Wijaya',
      date: '2026-06-09T06:15:00.000Z',
      discount: 0,
      shippingCost: 10000,
      items: [{ productName: '151 Booster Pack', quantity: 1, price: 135000 }],
    }),
    ensureTransaction({
      invoiceNumber: 'INV-2026-011',
      customerName: 'Hendri Suntono',
      date: '2026-06-10T02:45:00.000Z',
      discount: 75000,
      shippingCost: 0,
      items: [{ productName: 'Iono', quantity: 2, price: 625000 }],
    }),
    ensureTransaction({
      invoiceNumber: 'INV-2026-012',
      customerName: 'Nadia Putri',
      date: '2026-06-10T03:55:00.000Z',
      discount: 25000,
      shippingCost: 0,
      items: [{ productName: '151 Booster Pack', quantity: 5, price: 135000 }],
    }),
    ensureTransaction({
      invoiceNumber: 'INV-2026-013',
      customerName: 'Rizky Pratama',
      date: '2026-06-10T05:20:00.000Z',
      discount: 0,
      shippingCost: 0,
      items: [{ productName: 'Pikachu Promo', quantity: 1, price: 250000 }],
    }),
    ensureTransaction({
      invoiceNumber: 'INV-2026-014',
      customerName: 'Kevin Wijaya',
      date: '2026-06-10T07:05:00.000Z',
      discount: 120000,
      shippingCost: 0,
      items: [
        { productName: 'Mew ex', quantity: 1, price: 1350000 },
        { productName: '151 Booster Pack', quantity: 2, price: 135000 },
      ],
    }),
    ensureTransaction({
      invoiceNumber: 'INV-2026-101',
      customerName: 'Hendri Suntono',
      date: '2026-01-08T04:15:00.000Z',
      discount: 0,
      shippingCost: 0,
      items: [{ productName: 'Pikachu Promo', quantity: 1, price: 250000 }],
    }),
    ensureTransaction({
      invoiceNumber: 'INV-2026-102',
      customerName: 'Nadia Putri',
      date: '2026-01-23T09:30:00.000Z',
      discount: 25000,
      shippingCost: 10000,
      items: [{ productName: '151 Booster Pack', quantity: 3, price: 135000 }],
    }),
    ensureTransaction({
      invoiceNumber: 'INV-2026-103',
      customerName: 'Rizky Pratama',
      date: '2026-02-06T06:05:00.000Z',
      discount: 0,
      shippingCost: 0,
      items: [{ productName: 'Charizard VMAX', quantity: 1, price: 1200000 }],
    }),
    ensureTransaction({
      invoiceNumber: 'INV-2026-104',
      customerName: 'Kevin Wijaya',
      date: '2026-02-19T10:40:00.000Z',
      discount: 0,
      shippingCost: 15000,
      items: [{ productName: '151 Booster Pack', quantity: 4, price: 135000 }],
    }),
    ensureTransaction({
      invoiceNumber: 'INV-2026-105',
      customerName: 'Nadia Putri',
      date: '2026-03-04T08:25:00.000Z',
      discount: 50000,
      shippingCost: 0,
      items: [{ productName: 'Mew ex', quantity: 1, price: 1350000 }],
    }),
    ensureTransaction({
      invoiceNumber: 'INV-2026-106',
      customerName: 'Hendri Suntono',
      date: '2026-03-22T05:15:00.000Z',
      discount: 0,
      shippingCost: 0,
      items: [{ productName: '151 Booster Pack', quantity: 6, price: 135000 }],
    }),
    ensureTransaction({
      invoiceNumber: 'INV-2026-107',
      customerName: 'Rizky Pratama',
      date: '2026-04-09T03:45:00.000Z',
      discount: 0,
      shippingCost: 0,
      items: [{ productName: 'Iono', quantity: 1, price: 625000 }],
    }),
    ensureTransaction({
      invoiceNumber: 'INV-2026-108',
      customerName: 'Kevin Wijaya',
      date: '2026-04-27T12:10:00.000Z',
      discount: 75000,
      shippingCost: 0,
      items: [{ productName: '151 Booster Pack', quantity: 5, price: 135000 }],
    }),
    ensureTransaction({
      invoiceNumber: 'INV-2026-109',
      customerName: 'Nadia Putri',
      date: '2026-05-07T07:35:00.000Z',
      discount: 0,
      shippingCost: 0,
      items: [{ productName: 'Pikachu Promo', quantity: 2, price: 250000 }],
    }),
    ensureTransaction({
      invoiceNumber: 'INV-2026-110',
      customerName: 'Rizky Pratama',
      date: '2026-05-24T09:50:00.000Z',
      discount: 100000,
      shippingCost: 20000,
      items: [
        { productName: 'Charizard VMAX', quantity: 1, price: 1200000 },
        { productName: '151 Booster Pack', quantity: 2, price: 135000 },
      ],
    }),
  ]);

  console.log('Extra demo paid transactions ensured.\n');

  console.log('Seed complete!\n');
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
