import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// ─────────────── Categories ───────────────
const categoryData = [
  { name: "Apartment", description: "Self-contained unit within a larger building" },
  { name: "House", description: "Standalone residential property" },
  { name: "Studio", description: "Single-room unit with combined living and sleeping area" },
  { name: "Duplex", description: "Two-floor residential unit sharing one building" },
  { name: "Villa", description: "Spacious luxury property, often with private outdoor space" },
  { name: "Penthouse", description: "Top-floor luxury apartment with premium amenities" },
  { name: "Room", description: "A single room within a shared property" },
  { name: "Office Space", description: "Commercial space suitable for business operations" },
  { name: "Shop / Retail", description: "Commercial unit for retail or storefront use" },
  { name: "Warehouse", description: "Large commercial or industrial storage space" },
];

// ─────────────── Regions ───────────────
const regionData = [
  { name: "Dhaka" },
  { name: "Chittagong" },
  { name: "Rajshahi" },
  { name: "Khulna" },
  { name: "Barishal" },
  { name: "Sylhet" },
  { name: "Rangpur" },
  { name: "Mymensingh" },
];

async function cleanDb() {
  console.log("🧹 Cleaning database...");
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.rentalRequest.deleteMany();
  await prisma.property.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();
  await prisma.region.deleteMany();
  console.log("  ✔ All tables cleared\n");
}

async function main() {
  await cleanDb();

  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;

  // ─────────────── Upsert Categories ───────────────
  console.log("🌱 Seeding categories...");
  const categories: Record<string, string> = {};
  for (const cat of categoryData) {
    const c = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
    categories[cat.name] = c.id;
    console.log(`  ✔ ${cat.name}`);
  }

  // ─────────────── Upsert Regions ───────────────
  console.log("🌱 Seeding regions...");
  const regions: Record<string, string> = {};
  for (const reg of regionData) {
    const r = await prisma.region.upsert({
      where: { name: reg.name },
      update: {},
      create: reg,
    });
    regions[reg.name] = r.id;
    console.log(`  ✔ ${reg.name}`);
  }

  // ─────────────── Upsert Admin ───────────────
  const adminEmail = process.env.ADMIN_EMAIL || "admin@keyspace.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "AdminPassword123!";
  const adminHash = await bcrypt.hash(adminPassword, saltRounds);
  console.log(`🌱 Seeding admin user (${adminEmail})...`);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: adminHash, name: "Admin" },
    create: { email: adminEmail, password: adminHash, role: "ADMIN", name: "Admin" },
  });

  // ─────────────── Upsert Landlords ───────────────
  console.log("🌱 Seeding landlord users...");
  const landlordPassword = await bcrypt.hash("Landlord123!", saltRounds);
  const landlordRawData = [
    {
      email: "landlord1@keyspace.com",
      name: "Rafiq Hossain",
      phone: "+8801711111111",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=rafiq",
    },
    {
      email: "landlord2@keyspace.com",
      name: "Nusrat Jahan",
      phone: "+8801711222222",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=nusrat",
    },
    {
      email: "landlord3@keyspace.com",
      name: "Karim Uddin",
      phone: "+8801711333333",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=karim",
    },
  ];

  const landlords: Record<string, string> = {};
  for (const l of landlordRawData) {
    const landlord = await prisma.user.upsert({
      where: { email: l.email },
      update: {},
      create: { ...l, password: landlordPassword, role: "LANDLORD" },
    });
    landlords[l.name] = landlord.id;
    console.log(`  ✔ ${l.name}`);
  }

  // ─────────────── Upsert Tenants ───────────────
  console.log("🌱 Seeding tenant users...");
  const tenantPassword = await bcrypt.hash("Tenant123!", saltRounds);
  const tenantRawData = [
    {
      email: "tenant1@keyspace.com",
      name: "Anika Sultana",
      phone: "+8801922111111",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=anika",
    },
    {
      email: "tenant2@keyspace.com",
      name: "Fahim Islam",
      phone: "+8801922222222",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=fahim",
    },
    {
      email: "tenant3@keyspace.com",
      name: "Mitu Begum",
      phone: "+8801922333333",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=mitu",
    },
    {
      email: "tenant4@keyspace.com",
      name: "Sohel Rana",
      phone: "+8801922444444",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sohel",
    },
    {
      email: "tenant5@keyspace.com",
      name: "Priya Das",
      phone: "+8801922555555",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=priya",
    },
  ];

  const tenants: Record<string, string> = {};
  for (const t of tenantRawData) {
    const tenant = await prisma.user.upsert({
      where: { email: t.email },
      update: {},
      create: { ...t, password: tenantPassword, role: "TENANT" },
    });
    tenants[t.name] = tenant.id;
    console.log(`  ✔ ${t.name}`);
  }

  const landlordIds = Object.values(landlords);
  const tenantIds = Object.values(tenants);

  // ─────────────── Upsert Properties ───────────────
  console.log("🌱 Seeding properties...");

  const propertySeedData = [
    {
      title: "Modern 3-Bedroom Apartment in Gulshan",
      description:
        "A bright and spacious apartment in the heart of Gulshan featuring modern interiors, 24/7 security, and a rooftop garden.",
      address: "45 Gulshan Avenue, Gulshan-2",
      city: "Dhaka",
      area: "Gulshan",
      monthlyRent: 55000,
      securityDeposit: 110000,
      bedrooms: 3,
      bathrooms: 2,
      size: 1800,
      images: [
        "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
        "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800",
      ],
      amenities: ["WiFi", "Parking", "Generator", "Lift", "Security", "Gas"],
      status: "AVAILABLE" as const,
      category: "Apartment",
      region: "Dhaka",
      landlord: "Rafiq Hossain",
    },
    {
      title: "Cozy Studio Flat in Mirpur",
      description:
        "Affordable studio flat ideal for students and young professionals. Includes all utilities and is close to metro station.",
      address: "12/B Mirpur-10, Block A",
      city: "Dhaka",
      area: "Mirpur",
      monthlyRent: 12000,
      securityDeposit: 24000,
      bedrooms: 1,
      bathrooms: 1,
      size: 450,
      images: [
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
        "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800",
      ],
      amenities: ["WiFi", "Water", "Gas"],
      status: "RENTED" as const,
      category: "Studio",
      region: "Dhaka",
      landlord: "Nusrat Jahan",
    },
    {
      title: "Luxury Villa in Bashundhara",
      description:
        "An exquisite 5-bedroom villa with a private garden, swimming pool, and smart home features in Bashundhara Residential Area.",
      address: "Plot 33, Block G, Bashundhara R/A",
      city: "Dhaka",
      area: "Bashundhara",
      monthlyRent: 150000,
      securityDeposit: 300000,
      bedrooms: 5,
      bathrooms: 4,
      size: 5500,
      images: [
        "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800",
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800",
      ],
      amenities: [
        "WiFi",
        "Swimming Pool",
        "Parking",
        "Generator",
        "Garden",
        "Security",
        "Smart Home",
        "Gas",
      ],
      status: "AVAILABLE" as const,
      category: "Villa",
      region: "Dhaka",
      landlord: "Rafiq Hossain",
    },
    {
      title: "Penthouse with Sea View in Chittagong",
      description:
        "Breathtaking top-floor penthouse offering panoramic sea views, premium furnishings, and exclusive rooftop access.",
      address: "Ocean Tower, Patenga Road",
      city: "Chittagong",
      area: "Patenga",
      monthlyRent: 85000,
      securityDeposit: 170000,
      bedrooms: 4,
      bathrooms: 3,
      size: 3200,
      images: [
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
        "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800",
      ],
      amenities: ["WiFi", "Parking", "Generator", "Lift", "Sea View", "Rooftop", "Security"],
      status: "AVAILABLE" as const,
      category: "Penthouse",
      region: "Chittagong",
      landlord: "Karim Uddin",
    },
    {
      title: "Spacious Duplex in Sylhet City Center",
      description:
        "Two-story duplex in the center of Sylhet with a large living area, modern kitchen, and dedicated parking.",
      address: "Zindabazar Road, Upashahar",
      city: "Sylhet",
      area: "Upashahar",
      monthlyRent: 28000,
      securityDeposit: 56000,
      bedrooms: 3,
      bathrooms: 2,
      size: 1600,
      images: [
        "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800",
        "https://images.unsplash.com/photo-1599427303058-f04cbcf4756f?w=800",
      ],
      amenities: ["Parking", "Generator", "Gas", "WiFi"],
      status: "AVAILABLE" as const,
      category: "Duplex",
      region: "Sylhet",
      landlord: "Nusrat Jahan",
    },
    {
      title: "Budget Room near Rajshahi University",
      description:
        "Simple and clean room available near Rajshahi University campus, perfect for students. Shared common areas.",
      address: "University Road, Rajpara",
      city: "Rajshahi",
      area: "Rajpara",
      monthlyRent: 4500,
      securityDeposit: 9000,
      bedrooms: 1,
      bathrooms: 1,
      size: 150,
      images: ["https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800"],
      amenities: ["WiFi", "Water"],
      status: "AVAILABLE" as const,
      category: "Room",
      region: "Rajshahi",
      landlord: "Karim Uddin",
    },
    {
      title: "Modern Office Space in Khulna",
      description:
        "Commercial office space with high-speed internet, conference rooms, and dedicated parking in a prime business location.",
      address: "15 KDA Avenue, Khulna",
      city: "Khulna",
      area: "KDA Avenue",
      monthlyRent: 40000,
      securityDeposit: 80000,
      bedrooms: 0,
      bathrooms: 2,
      size: 2200,
      images: [
        "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
        "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800",
      ],
      amenities: ["WiFi", "Parking", "Generator", "Lift", "AC", "Security"],
      status: "AVAILABLE" as const,
      category: "Office Space",
      region: "Khulna",
      landlord: "Rafiq Hossain",
    },
    {
      title: "Family House in Uttara, Dhaka",
      description:
        "Fully furnished 4-bedroom family house in Uttara with a private garden, garage, and rooftop access.",
      address: "House 12, Road 7, Sector 4, Uttara",
      city: "Dhaka",
      area: "Uttara",
      monthlyRent: 45000,
      securityDeposit: 90000,
      bedrooms: 4,
      bathrooms: 3,
      size: 2800,
      images: [
        "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800",
        "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800",
      ],
      amenities: ["Parking", "Garden", "Generator", "Security", "Gas", "WiFi"],
      status: "RENTED" as const,
      category: "House",
      region: "Dhaka",
      landlord: "Nusrat Jahan",
    },
    {
      title: "Retail Shop in Barishal Market",
      description:
        "Prime ground-floor retail unit in Barishal central market area with high footfall and storage at the back.",
      address: "Sadar Road, Barishal City Center",
      city: "Barishal",
      area: "Sadar Road",
      monthlyRent: 18000,
      securityDeposit: 36000,
      bedrooms: 0,
      bathrooms: 1,
      size: 600,
      images: ["https://images.unsplash.com/photo-1534723328310-e82dad3ee43f?w=800"],
      amenities: ["Electricity", "Water"],
      status: "AVAILABLE" as const,
      category: "Shop / Retail",
      region: "Barishal",
      landlord: "Karim Uddin",
    },
    {
      title: "Industrial Warehouse in Rangpur",
      description:
        "Large warehouse facility suitable for manufacturing or storage with 24-hour access and dedicated loading docks.",
      address: "Industrial Zone, Rangpur Sadar",
      city: "Rangpur",
      area: "Industrial Zone",
      monthlyRent: 35000,
      securityDeposit: 70000,
      bedrooms: 0,
      bathrooms: 2,
      size: 8000,
      images: ["https://images.unsplash.com/photo-1553413077-190dd305871c?w=800"],
      amenities: ["Electricity", "Water", "Parking", "Loading Dock", "Security"],
      status: "AVAILABLE" as const,
      category: "Warehouse",
      region: "Rangpur",
      landlord: "Rafiq Hossain",
    },
    {
      title: "Affordable Apartment in Mymensingh",
      description:
        "Well-maintained 2-bedroom apartment on the 3rd floor with a balcony, natural light, and nearby bus access.",
      address: "Town Hall Road, Mymensingh",
      city: "Mymensingh",
      area: "Town Hall",
      monthlyRent: 10000,
      securityDeposit: 20000,
      bedrooms: 2,
      bathrooms: 1,
      size: 900,
      images: [
        "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800",
        "https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800",
      ],
      amenities: ["Water", "Gas", "WiFi"],
      status: "AVAILABLE" as const,
      category: "Apartment",
      region: "Mymensingh",
      landlord: "Nusrat Jahan",
    },
    {
      title: "Furnished Apartment in Dhanmondi",
      description:
        "Fully furnished 2-bedroom apartment near Dhanmondi Lake with premium interiors and easy access to restaurants and schools.",
      address: "Road 27, Dhanmondi, Dhaka",
      city: "Dhaka",
      area: "Dhanmondi",
      monthlyRent: 38000,
      securityDeposit: 76000,
      bedrooms: 2,
      bathrooms: 2,
      size: 1300,
      images: [
        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
        "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=800",
      ],
      amenities: ["WiFi", "Generator", "Lift", "Parking", "Security", "Gas"],
      status: "AVAILABLE" as const,
      category: "Apartment",
      region: "Dhaka",
      landlord: "Karim Uddin",
    },
  ];

  const propertyIds: string[] = [];

  for (const prop of propertySeedData) {
    const existing = await prisma.property.findFirst({
      where: { title: prop.title, address: prop.address },
    });

    if (existing) {
      propertyIds.push(existing.id);
      console.log(`  ↩ ${prop.title} (skipped)`);
      continue;
    }

    const p = await prisma.property.create({
      data: {
        title: prop.title,
        description: prop.description,
        address: prop.address,
        city: prop.city,
        area: prop.area,
        monthlyRent: prop.monthlyRent,
        securityDeposit: prop.securityDeposit,
        bedrooms: prop.bedrooms,
        bathrooms: prop.bathrooms,
        size: prop.size,
        images: prop.images,
        amenities: prop.amenities,
        status: prop.status,
        categoryId: categories[prop.category],
        regionId: regions[prop.region],
        landlordId: landlords[prop.landlord],
      },
    });
    propertyIds.push(p.id);
    console.log(`  ✔ ${prop.title}`);
  }

  // ─────────────── Rental Requests ───────────────
  console.log("🌱 Seeding rental requests...");

  // Deliberately map specific tenant ↔ property combos so FKs are consistent
  // and so reviews can be added only for properties with APPROVED/COMPLETED requests
  const rentalRequestData = [
    {
      tenantIdx: 0, // Anika Sultana
      propertyIdx: 0, // Gulshan Apartment
      message: "Hi, I'm looking for a 3-bedroom apartment for my family. Is it still available?",
      moveInDate: new Date("2026-09-01"),
      status: "APPROVED" as const,
    },
    {
      tenantIdx: 1, // Fahim Islam
      propertyIdx: 1, // Mirpur Studio
      message: "I'm a fresh graduate starting my first job. The studio looks perfect for me.",
      moveInDate: new Date("2026-08-15"),
      status: "COMPLETED" as const,
    },
    {
      tenantIdx: 2, // Mitu Begum
      propertyIdx: 2, // Bashundhara Villa
      message: "We are a large family looking for a spacious property. When can we visit?",
      moveInDate: new Date("2026-10-01"),
      status: "PENDING" as const,
    },
    {
      tenantIdx: 3, // Sohel Rana
      propertyIdx: 3, // Chittagong Penthouse
      message: "I'd love this penthouse! The sea view is exactly what I'm looking for.",
      moveInDate: new Date("2026-09-15"),
      status: "APPROVED" as const,
    },
    {
      tenantIdx: 4, // Priya Das
      propertyIdx: 4, // Sylhet Duplex
      message: "Moving to Sylhet for work. The duplex looks ideal for me and my partner.",
      moveInDate: new Date("2026-08-20"),
      status: "ACTIVE" as const,
    },
    {
      tenantIdx: 0, // Anika Sultana
      propertyIdx: 5, // Rajshahi Room
      message: "Looking for an affordable room near the university for short stay.",
      moveInDate: new Date("2026-09-01"),
      status: "REJECTED" as const,
    },
    {
      tenantIdx: 1, // Fahim Islam
      propertyIdx: 10, // Mymensingh Apartment
      message: "Need a reliable 2-bedroom flat close to the town center.",
      moveInDate: new Date("2026-09-01"),
      status: "APPROVED" as const,
    },
    {
      tenantIdx: 2, // Mitu Begum
      propertyIdx: 11, // Dhanmondi Apartment
      message: "The furnished apartment in Dhanmondi is perfect — near my children's school.",
      moveInDate: new Date("2026-10-15"),
      status: "ACTIVE" as const,
    },
  ];

  const rentalRequestIds: { id: string; tenantId: string; propertyIdx: number; status: string; amount: number }[] = [];

  for (const req of rentalRequestData) {
    const existing = await prisma.rentalRequest.findFirst({
      where: {
        tenantId: tenantIds[req.tenantIdx],
        propertyId: propertyIds[req.propertyIdx],
      },
    });

    if (existing) {
      rentalRequestIds.push({
        id: existing.id,
        tenantId: tenantIds[req.tenantIdx],
        propertyIdx: req.propertyIdx,
        status: req.status,
        amount: propertySeedData[req.propertyIdx].monthlyRent,
      });
      console.log(`  ↩ Rental request for property ${req.propertyIdx + 1} (skipped)`);
      continue;
    }

    const r = await prisma.rentalRequest.create({
      data: {
        message: req.message,
        moveInDate: req.moveInDate,
        status: req.status,
        tenantId: tenantIds[req.tenantIdx],
        propertyId: propertyIds[req.propertyIdx],
      },
    });

    rentalRequestIds.push({
      id: r.id,
      tenantId: tenantIds[req.tenantIdx],
      propertyIdx: req.propertyIdx,
      status: req.status,
      amount: propertySeedData[req.propertyIdx].monthlyRent,
    });

    console.log(`  ✔ Request for "${propertySeedData[req.propertyIdx].title}"`);
  }

  // ─────────────── Payments ───────────────
  // Only create payments for APPROVED, ACTIVE, or COMPLETED requests
  console.log("🌱 Seeding payments...");

  const payableStatuses = ["APPROVED", "ACTIVE", "COMPLETED"];

  for (const req of rentalRequestIds) {
    if (!payableStatuses.includes(req.status)) continue;

    const existing = await prisma.payment.findFirst({
      where: { rentalRequestId: req.id },
    });

    if (existing) {
      console.log(`  ↩ Payment for request ${req.id.slice(0, 8)} (skipped)`);
      continue;
    }

    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const isCompleted = req.status === "COMPLETED" || req.status === "ACTIVE";

    await prisma.payment.create({
      data: {
        transactionId,
        amount: req.amount,
        method: "CARD",
        provider: "STRIPE",
        status: isCompleted ? "COMPLETED" : "PENDING",
        paidAt: isCompleted ? new Date() : undefined,
        rentalRequestId: req.id,
        userId: req.tenantId,
        stripeEventId: isCompleted
          ? `evt_${Math.random().toString(36).slice(2, 18)}`
          : undefined,
        paymentGatewayData: isCompleted
          ? { sessionId: `cs_${Math.random().toString(36).slice(2, 20)}`, verified: true }
          : undefined,
      },
    });

    console.log(`  ✔ Payment for request ${req.id.slice(0, 8)} — ৳${req.amount}`);
  }

  // ─────────────── Reviews ───────────────
  // Only tenants with COMPLETED or ACTIVE requests can review
  console.log("🌱 Seeding reviews...");

  const reviewableStatuses = ["COMPLETED", "ACTIVE"];

  const reviewData: { rating: number; comment: string }[] = [
    {
      rating: 5,
      comment:
        "Amazing studio! Very clean, modern, and the landlord was incredibly responsive. Highly recommended for young professionals.",
    },
    {
      rating: 5,
      comment:
        "The penthouse is absolutely stunning. The sea view is unreal and the amenities are top-notch. Worth every taka!",
    },
    {
      rating: 4,
      comment:
        "Great duplex with plenty of space. Minor internet issue at first but was resolved quickly. Overall a very pleasant stay.",
    },
    {
      rating: 4,
      comment:
        "A well-maintained, comfortable apartment close to everything we needed. The landlord was helpful and professional.",
    },
  ];

  let reviewIdx = 0;
  for (const req of rentalRequestIds) {
    if (!reviewableStatuses.includes(req.status)) continue;
    if (reviewIdx >= reviewData.length) break;

    const existing = await prisma.review.findFirst({
      where: {
        tenantId: req.tenantId,
        propertyId: propertyIds[req.propertyIdx],
      },
    });

    if (existing) {
      console.log(`  ↩ Review for property ${req.propertyIdx + 1} (skipped)`);
      reviewIdx++;
      continue;
    }

    await prisma.review.create({
      data: {
        rating: reviewData[reviewIdx].rating,
        comment: reviewData[reviewIdx].comment,
        tenantId: req.tenantId,
        propertyId: propertyIds[req.propertyIdx],
      },
    });

    console.log(`  ✔ Review (${reviewData[reviewIdx].rating}★) for property ${req.propertyIdx + 1}`);
    reviewIdx++;
  }

  console.log("\n✅ Done — database seeded successfully!");
  console.log(
    `   • ${categoryData.length} categories, ${regionData.length} regions`
  );
  console.log(
    `   • 1 admin, ${landlordRawData.length} landlords, ${tenantRawData.length} tenants`
  );
  console.log(`   • ${propertySeedData.length} properties`);
  console.log(`   • ${rentalRequestData.length} rental requests`);
  console.log(`   • ${reviewIdx} reviews`);
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
