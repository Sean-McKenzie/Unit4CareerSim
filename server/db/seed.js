const { PrismaClient } = require("@prisma/client");
const { faker, ar } = require("@faker-js/faker");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

async function seed() {
  console.log("seeding the database");
  try {
    const itemData = Array.from({ length: 10 }).map(() => {
      return {
        productName: faker.commerce.productName(),
        product: faker.commerce.product(),
        description: faker.commerce.productDescription(),
        rating: faker.number.int({ min: 0, max: 5 }),
      };
    });
    await prisma.items.createMany({ data: itemData });

    //SEEDING USERS
    const userData = Array.from({ length: 10 }).map(() => {
      return {
        username: faker.internet.userName(),
        password: bcrypt.hashSync(faker.internet.password(), 10),
      };
    });
    await prisma.users.createMany({ data: userData });

    //GET USERS AND ITEMS
    const items = await prisma.items.findMany();
    const users = await prisma.users.findMany();

    //SEEDING REVIEWS
    const reviewData = Array.from({ length: 10 }).map(() => {
      return {
        review: faker.lorem.sentence(),
        rating: faker.number.int({ min: 0, max: 5 }),
      };
    });

    const reviews = [];
    const numReviewsToCreate = 10; 

    for (let j = 0; j < numReviewsToCreate; j++) {
      for (let i = 0; i < reviewData.length; i++) {
        const review = await prisma.reviews.create({
          data: {
            ...reviewData[i],
            userId: users[j % users.length].id,
            itemId: items[i % items.length].id,
          },
        });
        reviews.push(review);
        console.log(
          `Created review for user ${
            users[j % users.length].username
          } on item ${items[i % items.length].name}`
        );
      }
    }

    const commentData = Array.from({ length: 10 }).map(() => {
      return {
        username: users[Math.floor(Math.random() * users.length)].username,
        comment: faker.lorem.sentence(),
        rating: faker.number.int({ min: 0, max: 5 }),
        itemId: items[Math.floor(Math.random() * items.length)].id,
        reviewsId: reviews[Math.floor(Math.random() * reviews.length)].id,
      };
    });

    await prisma.comments.createMany({ data: commentData });

    console.log("Database seeding completed!");
  } catch (error) {
    console.error("Error seeding the database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seed();
}