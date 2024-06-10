require("dotenv").config();

const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const findUserWithToken = async (token) => {
  let id;
  try {
    const payload = await jwt.verify(token, process.env.JWT_SECRET);
    id = payload.id;
    console.log("payload is:", payload);
  } catch (error) {
    console.error("Error verifying JWT:", error);
    throw new Error("Not authorized");
  }

  const user = await prisma.users.findUnique({
    where: {
      id: id,
    },
    select: {
      id: true,
      username: true,
    },
  });

  if (!user) {
    const error = new Error("Not Authorized");
    error.status = 401;
    throw new Error("User not found");
  }
  return user;
};

const isLoggedIn = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    req.user = await findUserWithToken(token);
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = isLoggedIn;
